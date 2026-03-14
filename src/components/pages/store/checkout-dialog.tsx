"use client";

import React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Input } from "@/components/ui/input";
import { useCart } from "./cart-context";
import { useToast } from "@/hooks/use-toast";
import { Separator } from "@/components/ui/separator";
import { Loader2 } from "lucide-react";
import { convertFromUsd, formatMoney } from "@/lib/currency";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

type DeliveryZone = {
  id: string;
  name: string;
  cities: string[];
  baseFeeUsd: number;
  etaMinHours: number;
  etaMaxHours: number;
  active: boolean;
};

type DeliveryQuote = {
  id: string;
  zoneId: string;
  zoneName: string;
  feeUsd: number;
  fee: number;
  currencyCode: "840" | "924";
  etaMinHours: number;
  etaMaxHours: number;
  expiresAt: string;
};

const formSchema = z.object({
  isDiasporaGift: z.boolean().default(false),
  recipientName: z.string().optional(),
  recipientPhone: z.string().optional(),
  deliveryMethod: z.enum(["collect", "delivery"]).default("collect"),
  customerName: z.string().trim().min(2, "Your name is required."),
  customerPhone: z.string().trim().min(7, "Your phone is required."),
  deliveryZoneId: z.string().optional(),
  customerAddress: z.string().optional(),
  deliveryInstructions: z.string().optional(),
  customerEmail: z.string().email("A valid email is required."),
  paymentMethod: z.enum(["WALLETPLUS", "ECOCASH", "INNBUCKS", "OMARI", "CARD"]).default("WALLETPLUS"),
  customerMobile: z.string().optional(),
  otp: z.string().optional(),
}).superRefine((data, ctx) => {
  if (data.isDiasporaGift) {
    if (!data.recipientName) ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Recipient name is required.", path: ["recipientName"] });
    if (!data.recipientPhone) ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Recipient phone is required.", path: ["recipientPhone"] });
  } else if (data.deliveryMethod === "delivery") {
    if (!data.customerName) ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Your name is required for delivery.", path: ["customerName"] });
    if (!data.customerPhone) ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Your phone is required for delivery.", path: ["customerPhone"] });
    if (!data.deliveryZoneId) ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Choose a delivery zone.", path: ["deliveryZoneId"] });
    if (!data.customerAddress) ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Your address is required for delivery.", path: ["customerAddress"] });
  }

  if (data.paymentMethod !== "CARD" && !data.customerMobile) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Mobile number is required for this payment method.", path: ["customerMobile"] });
  }

  if (data.otp && data.otp.length > 0 && data.otp.length < 4) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: "OTP must be at least 4 digits.", path: ["otp"] });
  }
});

interface CheckoutDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CheckoutDialog({ isOpen, onOpenChange }: CheckoutDialogProps) {
  const { state, dispatch } = useCart();
  const { toast } = useToast();
  const [awaitingOtp, setAwaitingOtp] = React.useState(false);
  const [transactionReference, setTransactionReference] = React.useState<string | null>(null);
  const [orderReference, setOrderReference] = React.useState<string | null>(null);
  const [lastOrderReference, setLastOrderReference] = React.useState<string | null>(null);
  const [paymentStatus, setPaymentStatus] = React.useState<string | null>(null);
  const [isAwaitingGatewayStatus, setIsAwaitingGatewayStatus] = React.useState(false);
  const [savedAddresses, setSavedAddresses] = React.useState<Array<{
    address: string;
    label?: string;
    instructions?: string;
    recipientName?: string;
    recipientPhone?: string;
  }>>([]);
  const [profileHydrated, setProfileHydrated] = React.useState(false);
  const [deliveryZones, setDeliveryZones] = React.useState<DeliveryZone[]>([]);
  const [deliveryQuote, setDeliveryQuote] = React.useState<DeliveryQuote | null>(null);
  const [isFetchingQuote, setIsFetchingQuote] = React.useState(false);
  const submitKeyRef = React.useRef<string | null>(null);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      isDiasporaGift: false,
      deliveryMethod: "collect",
      paymentMethod: "WALLETPLUS",
      deliveryZoneId: "",
      customerMobile: "",
      deliveryInstructions: "",
      otp: "",
    },
  });

  const { isSubmitting } = form.formState;
  const { watch } = form;
  const isDiasporaGift = watch("isDiasporaGift");
  const deliveryMethod = watch("deliveryMethod");
  const deliveryZoneId = watch("deliveryZoneId");
  const customerAddress = watch("customerAddress");
  const paymentMethod = watch("paymentMethod");
  const subtotalUsd = state.items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const deliveryFeeUsd = deliveryMethod === "delivery" ? (deliveryQuote?.feeUsd ?? 0) : 0;
  const totalUsd = subtotalUsd + deliveryFeeUsd;
  const subtotal = convertFromUsd(subtotalUsd, state.currencyCode);
  const total = convertFromUsd(totalUsd, state.currencyCode);

  const needsOtp = paymentMethod === "WALLETPLUS" || paymentMethod === "OMARI";

  React.useEffect(() => {
    const raw = window.localStorage.getItem("vfs.checkout.profile");
    if (!raw) return;
    try {
      const parsed = JSON.parse(raw) as Partial<z.infer<typeof formSchema>>;
      form.reset({ ...form.getValues(), ...parsed });
    } catch {
      // Ignore malformed profile cache.
    }
  }, [form]);

  React.useEffect(() => {
    if (!isOpen) {
      setIsAwaitingGatewayStatus(false);
      setPaymentStatus(null);
      setProfileHydrated(false);
      setSavedAddresses([]);
      setDeliveryQuote(null);
      submitKeyRef.current = null;
    }
  }, [isOpen]);

  React.useEffect(() => {
    if (!isOpen) return;

    const controller = new AbortController();
    async function loadZones() {
      try {
        const response = await fetch("/api/checkout/delivery-quote", {
          cache: "no-store",
          signal: controller.signal,
        });
        if (!response.ok) return;
        const data = await response.json();
        setDeliveryZones(Array.isArray(data?.data) ? data.data : []);
      } catch (error) {
        if (!(error instanceof DOMException && error.name === "AbortError")) {
          setDeliveryZones([]);
        }
      }
    }

    loadZones();
    return () => controller.abort();
  }, [isOpen]);

  React.useEffect(() => {
    if (!isOpen) {
      return;
    }

    const controller = new AbortController();
    async function hydrateFromAccount() {
      try {
        const response = await fetch("/api/account/profile", {
          cache: "no-store",
          signal: controller.signal,
        });
        if (!response.ok) {
          return;
        }

        const data = await response.json();
        const profile = data?.profile as {
          name?: string;
          phone?: string;
          email?: string;
          address?: string;
          preferredDeliveryMethod?: "collect" | "delivery";
          shippingAddresses?: Array<{
            address: string;
            label?: string;
            instructions?: string;
            recipientName?: string;
            recipientPhone?: string;
          }>;
          paymentMethodsUsed?: string[];
        };

        setSavedAddresses(Array.isArray(profile.shippingAddresses) ? profile.shippingAddresses : []);
        setProfileHydrated(true);

        if (!form.getValues("customerName") && profile.name) {
          form.setValue("customerName", profile.name, { shouldDirty: false });
        }
        if (!form.getValues("customerPhone") && profile.phone) {
          form.setValue("customerPhone", profile.phone, { shouldDirty: false });
        }
        if (!form.getValues("customerEmail") && profile.email) {
          form.setValue("customerEmail", profile.email, { shouldDirty: false });
        }
        if (!form.getValues("customerAddress") && profile.address) {
          form.setValue("customerAddress", profile.address, { shouldDirty: false });
        }
        if (profile.preferredDeliveryMethod && form.getValues("deliveryMethod") === "collect" && profile.address) {
          form.setValue("deliveryMethod", profile.preferredDeliveryMethod, { shouldDirty: false });
        }
      } catch (error) {
        if (!(error instanceof DOMException && error.name === "AbortError")) {
          // Ignore account hydration failures; checkout remains usable.
        }
      }
    }

    hydrateFromAccount();
    return () => controller.abort();
  }, [form, isOpen]);

  React.useEffect(() => {
    if (deliveryMethod !== "delivery") {
      setDeliveryQuote(null);
      return;
    }

    if (!deliveryZoneId || !customerAddress?.trim() || customerAddress.trim().length < 3) {
      setDeliveryQuote(null);
      return;
    }

    const controller = new AbortController();
    const timeout = window.setTimeout(async () => {
      try {
        setIsFetchingQuote(true);
        const response = await fetch("/api/checkout/delivery-quote", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            zoneId: deliveryZoneId,
            address: customerAddress.trim(),
            currencyCode: state.currencyCode,
          }),
          signal: controller.signal,
        });
        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.error || "Unable to quote delivery.");
        }
        setDeliveryQuote(data.data as DeliveryQuote);
      } catch (error) {
        if (!(error instanceof DOMException && error.name === "AbortError")) {
          setDeliveryQuote(null);
        }
      } finally {
        setIsFetchingQuote(false);
      }
    }, 350);

    return () => {
      controller.abort();
      window.clearTimeout(timeout);
    };
  }, [customerAddress, deliveryMethod, deliveryZoneId, state.currencyCode]);

  async function waitForFinalPaymentStatus(reference: string) {
    const startedAt = Date.now();
    const timeoutMs = 3 * 60 * 1000;
    const terminalStatuses = ["PAID", "SUCCESS", "FAILED", "EXPIRED", "CANCELED", "CANCELLED"];
    let status = "PENDING";
    let previousStatus = "";

    while (Date.now() - startedAt < timeoutMs) {
      const statusRes = await fetch(`/api/zb/status/${encodeURIComponent(reference)}`, { cache: "no-store" });
      const statusData = await statusRes.json();
      status = String(statusData?.data?.status ?? status).toUpperCase();

      if (status !== previousStatus) {
        previousStatus = status;
        setPaymentStatus(status);
      }

      if (terminalStatuses.includes(status)) {
        return status;
      }

      await new Promise(resolve => setTimeout(resolve, 2500));
    }

    return status;
  }

  async function onSubmit(values: z.infer<typeof formSchema>) {
    try {
      if (!awaitingOtp) {
        if (!submitKeyRef.current) {
          submitKeyRef.current = crypto.randomUUID();
        }

        const response = await fetch("/api/zb/checkout/initiate", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-idempotency-key": submitKeyRef.current,
          },
          body: JSON.stringify({
            items: state.items.map(item => ({ productId: String(item.id), quantity: item.quantity })),
                email: values.customerEmail,
                customerMobile: values.customerMobile,
                paymentMethod: values.paymentMethod,
                currencyCode: state.currencyCode,
                deliveryMethod: values.deliveryMethod,
                deliveryQuoteId: deliveryQuote?.id,
                deliveryInstructions: values.deliveryInstructions,
            customerName: values.customerName,
            customerPhone: values.customerPhone,
            customerAddress: values.customerAddress,
            recipientName: values.recipientName,
            recipientPhone: values.recipientPhone,
            notes: values.isDiasporaGift
              ? `Gift order for ${values.recipientName ?? "recipient"} (${values.recipientPhone ?? "no-phone"})`
              : undefined,
          }),
        });

        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.error || "Failed to initiate payment");
        }

        window.localStorage.setItem("vfs.checkout.profile", JSON.stringify({
          customerName: values.customerName,
          customerPhone: values.customerPhone,
          customerAddress: values.customerAddress,
          deliveryInstructions: values.deliveryInstructions,
          customerEmail: values.customerEmail,
        }));

        if (values.paymentMethod === "CARD") {
          if (data.paymentUrl) {
            window.location.href = data.paymentUrl;
            return;
          }
          throw new Error("Missing Card payment URL");
        }

        if (needsOtp) {
          setAwaitingOtp(true);
          setTransactionReference(data.transactionReference ?? null);
          setOrderReference(data.reference ?? null);
          setLastOrderReference(data.reference ?? null);
          toast({
            title: "OTP required",
            description: data.message ?? "Enter the OTP sent to your account to complete payment.",
          });
          return;
        }

        const reference = String(data.reference ?? "");
        if (reference) {
          setLastOrderReference(reference);
          setPaymentStatus(String(data.status ?? "PENDING").toUpperCase());
          setIsAwaitingGatewayStatus(true);
          const finalStatus = await waitForFinalPaymentStatus(reference);
          setIsAwaitingGatewayStatus(false);
          if (finalStatus === "PAID" || finalStatus === "SUCCESS") {
            submitKeyRef.current = null;
            dispatch({ type: "CLEAR_CART" });
            toast({
              title: "Payment successful",
              description: "Transaction confirmed. You can now download your receipt.",
            });
            return;
          }
          if (["FAILED", "EXPIRED", "CANCELED", "CANCELLED"].includes(finalStatus)) {
            submitKeyRef.current = null;
          }
        }

        toast({
          title: "Payment processing",
          description: "Awaiting final confirmation from gateway. Use the transaction report link below.",
        });
        return;
      }

      // Leg 2 Confirmation
      if (!values.otp || !transactionReference || !orderReference) {
        throw new Error("Missing confirmation data. Restart checkout.");
      }

      const response = await fetch("/api/zb/checkout/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reference: orderReference,
          transactionReference,
          otp: values.otp,
          paymentMethod: values.paymentMethod,
        }),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to confirm payment");
      }

      const status = String(data.status ?? "PENDING").toUpperCase();
      if (status === "PAID" || status === "SUCCESS") {
        submitKeyRef.current = null;
        dispatch({ type: "CLEAR_CART" });
        setAwaitingOtp(false);
        setTransactionReference(null);
        setOrderReference(null);
        setLastOrderReference(orderReference);
        setPaymentStatus(status);
        toast({ title: "Payment successful", description: "Your order has been placed. You can download the receipt." });
      } else {
        setPaymentStatus(status);
        setIsAwaitingGatewayStatus(true);
        const finalStatus = await waitForFinalPaymentStatus(orderReference);
        setIsAwaitingGatewayStatus(false);
        toast({
          title: finalStatus === "PAID" || finalStatus === "SUCCESS" ? "Payment successful" : "Payment processing",
          description: data.message ?? `Current status: ${finalStatus}`,
        });
        if (finalStatus === "PAID" || finalStatus === "SUCCESS") {
          submitKeyRef.current = null;
          dispatch({ type: "CLEAR_CART" });
          setAwaitingOtp(false);
          setTransactionReference(null);
          setOrderReference(null);
          setLastOrderReference(orderReference);
        } else if (["FAILED", "EXPIRED", "CANCELED", "CANCELLED"].includes(finalStatus)) {
          submitKeyRef.current = null;
        }
      }
    } catch (error) {
      submitKeyRef.current = null;
      const message = error instanceof Error ? error.message : "Something went wrong while placing your order.";
      toast({ title: "Order failed", description: message, variant: "destructive" });
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col p-0 overflow-hidden">
        <DialogHeader className="p-6 pb-2">
          <DialogTitle className="font-headline text-3xl">Checkout</DialogTitle>
          <DialogDescription>Please confirm your details to complete the order.</DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex-1 overflow-y-auto p-6 pt-0 space-y-6">
            <div className="space-y-4">
              <FormField name="isDiasporaGift" control={form.control} render={({ field }) => (
                <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-xl border p-4 bg-muted/5">
                  <FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel className="cursor-pointer">This is a gift for someone in Zimbabwe</FormLabel>
                    <FormDescription>We&apos;ll notify the recipient on your behalf.</FormDescription>
                  </div>
                </FormItem>
              )} />

              {isDiasporaGift ? (
                <div className="space-y-4 p-4 border rounded-xl animate-fade-in-up bg-background shadow-sm">
                  <FormField name="recipientName" control={form.control} render={({ field }) => (
                    <FormItem><FormLabel>Recipient&apos;s Name</FormLabel><FormControl><Input placeholder="Jane Doe" {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField name="recipientPhone" control={form.control} render={({ field }) => (
                    <FormItem><FormLabel>Recipient&apos;s Phone</FormLabel><FormControl><Input placeholder="+263 7..." {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <div className="grid grid-cols-2 gap-4">
                    <FormField name="customerName" control={form.control} render={({ field }) => (<FormItem><FormLabel>Your Name</FormLabel><FormControl><Input placeholder="John Doe" {...field} /></FormControl><FormMessage /></FormItem>)} />
                    <FormField name="customerPhone" control={form.control} render={({ field }) => (<FormItem><FormLabel>Your Phone</FormLabel><FormControl><Input placeholder="+263 7..." {...field} /></FormControl><FormMessage /></FormItem>)} />
                  </div>
                  <FormField name="customerEmail" control={form.control} render={({ field }) => (<FormItem><FormLabel>Your Email</FormLabel><FormControl><Input placeholder="me@example.com" {...field} /></FormControl><FormMessage /></FormItem>)} />
                </div>
              ) : (
                <div className="space-y-4 p-4 border rounded-xl animate-fade-in-up bg-background shadow-sm">
                  <FormField name="deliveryMethod" control={form.control} render={({ field }) => (
                    <FormItem><FormLabel className="text-base font-semibold">Delivery/Pickup</FormLabel>
                      <RadioGroup onValueChange={field.onChange} defaultValue={field.value} className="grid grid-cols-2 gap-4 pt-2">
                        <FormItem>
                          <FormControl><RadioGroupItem value="collect" className="peer sr-only" /></FormControl>
                          <FormLabel className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer">
                            <span className="text-sm font-semibold">Self Collection</span>
                            <span className="text-xs text-muted-foreground">Free of charge</span>
                          </FormLabel>
                        </FormItem>
                        <FormItem>
                          <FormControl><RadioGroupItem value="delivery" className="peer sr-only" /></FormControl>
                          <FormLabel className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer">
                            <span className="text-sm font-semibold">Biker Delivery</span>
                            <span className="text-xs text-muted-foreground">Zone-based quote</span>
                          </FormLabel>
                        </FormItem>
                      </RadioGroup><FormMessage />
                    </FormItem>
                  )} />
                  <div className="space-y-4 animate-fade-in-up pt-4">
                    <div className="grid grid-cols-2 gap-4">
                      <FormField name="customerName" control={form.control} render={({ field }) => (<FormItem><FormLabel>Your Name</FormLabel><FormControl><Input placeholder="John Doe" {...field} /></FormControl><FormMessage /></FormItem>)} />
                      <FormField name="customerPhone" control={form.control} render={({ field }) => (<FormItem><FormLabel>Your Phone</FormLabel><FormControl><Input placeholder="+263 7..." {...field} /></FormControl><FormMessage /></FormItem>)} />
                    </div>
                    <FormField name="customerEmail" control={form.control} render={({ field }) => (<FormItem><FormLabel>Your Email</FormLabel><FormControl><Input placeholder="me@example.com" {...field} /></FormControl><FormMessage /></FormItem>)} />
                    {profileHydrated && (
                      <div className="rounded-lg border border-primary/20 bg-primary/5 px-3 py-2 text-xs text-muted-foreground">
                        Returning customer profile found. Saved shipping details are ready to reuse below.
                      </div>
                    )}
                    {deliveryMethod === "delivery" && (
                      <>
                        {savedAddresses.length > 0 && (
                          <FormItem>
                            <FormLabel>Use Saved Address</FormLabel>
                            <Select
                              onValueChange={(value) => {
                                const selected = savedAddresses.find(address => address.address === value);
                                if (!selected) return;
                                form.setValue("customerAddress", selected.address, { shouldDirty: true, shouldValidate: true });
                                form.setValue("deliveryInstructions", selected.instructions ?? "", { shouldDirty: true });
                                if (!isDiasporaGift) {
                                  if (selected.recipientName) form.setValue("recipientName", selected.recipientName, { shouldDirty: false });
                                  if (selected.recipientPhone) form.setValue("recipientPhone", selected.recipientPhone, { shouldDirty: false });
                                }
                              }}
                            >
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Choose a saved delivery address" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {savedAddresses.map(address => (
                                  <SelectItem key={address.address} value={address.address}>
                                    {address.label ? `${address.label} - ` : ""}{address.address}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </FormItem>
                        )}
                        <FormField
                          name="deliveryZoneId"
                          control={form.control}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Delivery Zone</FormLabel>
                              <Select onValueChange={field.onChange} value={field.value}>
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Choose a delivery zone" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  {deliveryZones.map(zone => (
                                    <SelectItem key={zone.id} value={zone.id}>
                                      {zone.name} • {formatMoney(convertFromUsd(zone.baseFeeUsd, state.currencyCode), state.currencyCode)}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <FormDescription>
                                Delivery fee and ETA are calculated from the selected zone.
                              </FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField name="customerAddress" control={form.control} render={({ field }) => (<FormItem><FormLabel>Delivery Address</FormLabel><FormControl><Input placeholder="123 Main St, Harare" {...field} /></FormControl><FormMessage /></FormItem>)} />
                        <FormField name="deliveryInstructions" control={form.control} render={({ field }) => (
                          <FormItem>
                            <FormLabel>Delivery Instructions</FormLabel>
                            <FormControl><Textarea placeholder="Gate code, landmark, unit number, or preferred handover notes." rows={3} {...field} /></FormControl>
                            <FormMessage />
                          </FormItem>
                        )} />
                      </>
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-4 p-4 border rounded-xl bg-background shadow-sm">
              <FormField name="paymentMethod" control={form.control} render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-base font-semibold">Select Payment Method</FormLabel>
                  <RadioGroup onValueChange={(val) => { field.onChange(val); setAwaitingOtp(false); }} defaultValue={field.value} className="grid grid-cols-2 md:grid-cols-3 gap-2 pt-2">
                    {[
                      { id: "WALLETPLUS", label: "SmileCash" },
                      { id: "ECOCASH", label: "EcoCash" },
                      { id: "INNBUCKS", label: "Innbucks" },
                      { id: "OMARI", label: "Omari" },
                      { id: "CARD", label: "Visa/Mastercard" }
                    ].map((m) => (
                      <FormItem key={m.id}>
                        <FormControl><RadioGroupItem value={m.id} className="peer sr-only" /></FormControl>
                        <FormLabel className="flex flex-col items-center justify-center h-16 rounded-md border-2 border-muted bg-popover p-2 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary/5 [&:has([data-state=checked])]:border-primary cursor-pointer text-xs font-bold transition-all">
                          {m.label}
                        </FormLabel>
                      </FormItem>
                    ))}
                  </RadioGroup>
                  <FormMessage />
                </FormItem>
              )} />

              {paymentMethod !== "CARD" && (
                <FormField name="customerMobile" control={form.control} render={({ field }) => (
                  <FormItem className="animate-fade-in-up">
                    <FormLabel>{paymentMethod} Mobile Number</FormLabel>
                    <FormControl><Input placeholder="+263 7..." {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              )}

              {awaitingOtp && needsOtp && (
                <FormField name="otp" control={form.control} render={({ field }) => (
                  <FormItem className="animate-fade-in-up">
                    <FormLabel>OTP Confirmation</FormLabel>
                    <FormControl><Input placeholder="Enter 4-6 digit OTP" {...field} /></FormControl>
                    <FormMessage />
                    <FormDescription>Verify the payment with the code sent to your mobile.</FormDescription>
                  </FormItem>
                )} />
              )}
            </div>

            <Separator />

            <div className="space-y-2 bg-muted/20 p-4 rounded-xl">
              <div className="flex justify-between text-sm text-muted-foreground"><p>Subtotal</p><p>{formatMoney(subtotal, state.currencyCode)}</p></div>
              {deliveryMethod === "delivery" && (
                <div className="space-y-2">
                  <div className="flex justify-between text-sm text-muted-foreground">
                    <p>Delivery Fee</p>
                    <p>{deliveryQuote ? formatMoney(deliveryQuote.fee, state.currencyCode) : "Waiting for quote..."}</p>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {isFetchingQuote
                      ? "Calculating delivery quote..."
                      : deliveryQuote
                        ? `${deliveryQuote.zoneName} • ETA ${deliveryQuote.etaMinHours}-${deliveryQuote.etaMaxHours} hours`
                        : "Choose a delivery zone and address to get live pricing."}
                  </div>
                </div>
              )}
              <div className="flex justify-between text-xl font-headline font-bold pt-2 border-t"><p>Total</p><p>{formatMoney(total, state.currencyCode)}</p></div>
            </div>

            {lastOrderReference && (
              <div className="rounded-xl border bg-muted/20 p-3 text-sm">
                <p className="font-medium">Transaction Report</p>
                {paymentStatus && <p className="text-muted-foreground">Current status: {paymentStatus}</p>}
                {isAwaitingGatewayStatus && <p className="text-muted-foreground">Waiting for payment system confirmation...</p>}
                <a
                  className="text-primary underline"
                  href={`/api/orders/${encodeURIComponent(lastOrderReference)}/report?format=pdf`}
                  target="_blank"
                  rel="noreferrer"
                >
                  Download receipt PDF
                </a>
              </div>
            )}

            <div className="sticky bottom-0 bg-background pt-4 pb-2 border-t mt-auto">
              <Button
                type="submit"
                size="lg"
                className="w-full text-lg h-12"
                disabled={isSubmitting || (deliveryMethod === "delivery" && (!deliveryQuote || isFetchingQuote))}
              >
                {isSubmitting ? (<><Loader2 className="mr-2 h-5 w-5 animate-spin" />Processing...</>) : (
                  awaitingOtp ? "Verify Payment" : (paymentMethod === "CARD" ? "Proceed to Secure Pay" : `Pay with ${paymentMethod}`)
                )}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
