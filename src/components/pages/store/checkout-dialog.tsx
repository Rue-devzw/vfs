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
import { Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2, ChevronRight, Download, Camera, MapPin, CreditCard, ChevronLeft, ReceiptText } from "lucide-react";

import { convertFromUsd, formatMoney } from "@/lib/currency";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  getDefaultPaymentMethod,
  getEnabledPaymentMethodOptions,
  getPaymentMethodLabel,
  getPaymentMethodMobileHint,
  PAYMENT_METHOD_VALUES,
  requiresMobileNumber,
  type PaymentMethod,
} from "@/lib/payment-methods";
import { renderGatewayRedirectHtml } from "@/lib/payments/browser";
import { getPaymentProgressContent, isSuccessfulGatewayStatus, resolvePurchaseFlowAction } from "@/lib/payment-flow";
import { useCurrency } from "@/components/currency/currency-provider";

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
  paymentMethod: z.enum(PAYMENT_METHOD_VALUES).default("WALLETPLUS"),
  customerMobile: z.string().optional(),
  cardPan: z.string().optional(),
  cardExpMonth: z.string().optional(),
  cardExpYear: z.string().optional(),
  cardSecurityCode: z.string().optional(),
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

  if (requiresMobileNumber(data.paymentMethod) && !data.customerMobile) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Mobile number is required for this payment method.", path: ["customerMobile"] });
  }

  if (data.paymentMethod === "CARD") {
    if (!data.cardPan || data.cardPan.replace(/\s/g, "").length < 12) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Card number is required.", path: ["cardPan"] });
    }
    if (!data.cardExpMonth || !/^\d{2}$/.test(data.cardExpMonth)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Expiry month must be 2 digits.", path: ["cardExpMonth"] });
    }
    if (!data.cardExpYear || !/^\d{2,4}$/.test(data.cardExpYear)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Expiry year must be 2 or 4 digits.", path: ["cardExpYear"] });
    }
    if (!data.cardSecurityCode || !/^\d{3,4}$/.test(data.cardSecurityCode)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Security code must be 3 or 4 digits.", path: ["cardSecurityCode"] });
    }
  }

  if (data.otp && data.otp.length > 0 && data.otp.length < 4) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: "OTP must be at least 4 digits.", path: ["otp"] });
  }
});

const enabledPaymentMethodOptions = getEnabledPaymentMethodOptions();
const defaultPaymentMethod = getDefaultPaymentMethod();

interface CheckoutDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CheckoutDialog({ isOpen, onOpenChange }: CheckoutDialogProps) {
  const { state, dispatch } = useCart();
  const { currencyCode } = useCurrency();
  const [currentStep, setCurrentStep] = React.useState(0);
  const [receiptItemsSnapshot, setReceiptItemsSnapshot] = React.useState<typeof state.items>([]);
  const [receiptDeliveryFeeUsdSnapshot, setReceiptDeliveryFeeUsdSnapshot] = React.useState<number | null>(null);
  const [receiptTotalUsdSnapshot, setReceiptTotalUsdSnapshot] = React.useState<number | null>(null);

  const { toast } = useToast();
  const [awaitingOtp, setAwaitingOtp] = React.useState(false);
  const [transactionReference, setTransactionReference] = React.useState<string | null>(null);
  const [orderReference, setOrderReference] = React.useState<string | null>(null);
  const [lastOrderReference, setLastOrderReference] = React.useState<string | null>(null);
  const [paymentStatus, setPaymentStatus] = React.useState<string | null>(null);
  const [isAwaitingGatewayStatus, setIsAwaitingGatewayStatus] = React.useState(false);
  const [activePaymentMethod, setActivePaymentMethod] = React.useState<PaymentMethod>(defaultPaymentMethod);
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
  const [, setIsFetchingQuote] = React.useState(false);
  const submitKeyRef = React.useRef<string | null>(null);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      isDiasporaGift: false,
      deliveryMethod: "collect",
      paymentMethod: defaultPaymentMethod,
      deliveryZoneId: "",
      customerMobile: "",
      cardPan: "",
      cardExpMonth: "",
      cardExpYear: "",
      cardSecurityCode: "",
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
  const subtotal = convertFromUsd(subtotalUsd, currencyCode);
  const total = convertFromUsd(totalUsd, currencyCode);

  const captureReceiptSnapshot = React.useCallback(() => {
    setReceiptItemsSnapshot([...state.items]);
    setReceiptDeliveryFeeUsdSnapshot(deliveryMethod === "delivery" ? deliveryQuote?.feeUsd ?? 0 : null);
    setReceiptTotalUsdSnapshot(totalUsd);
  }, [deliveryMethod, deliveryQuote?.feeUsd, state.items, totalUsd]);

  React.useEffect(() => {
    if (!enabledPaymentMethodOptions.some(option => option.id === paymentMethod)) {
      form.setValue("paymentMethod", defaultPaymentMethod, { shouldDirty: false });
    }
  }, [form, paymentMethod]);

  React.useEffect(() => {
    const raw = window.localStorage.getItem("vfs.checkout.profile");
    if (!raw) return;
    try {
      const parsed = JSON.parse(raw) as Partial<z.infer<typeof formSchema>>;
      const nextPaymentMethod = parsed.paymentMethod && enabledPaymentMethodOptions.some(option => option.id === parsed.paymentMethod)
        ? parsed.paymentMethod
        : form.getValues("paymentMethod");
      form.reset({ ...form.getValues(), ...parsed, paymentMethod: nextPaymentMethod });
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
      setCurrentStep(0);
      setReceiptItemsSnapshot([]);
      setReceiptDeliveryFeeUsdSnapshot(null);
      setReceiptTotalUsdSnapshot(null);
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
            currencyCode,
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
  }, [currencyCode, customerAddress, deliveryMethod, deliveryZoneId]);

  async function waitForFinalPaymentStatus(reference: string) {
    const startedAt = Date.now();
    const timeoutMs = 3 * 60 * 1000;
    const terminalStatuses = ["PAID", "SUCCESS", "FAILED", "EXPIRED", "CANCELED", "CANCELLED"];
    let status = "PENDING";
    let previousStatus = "";

    while (Date.now() - startedAt < timeoutMs) {
      const statusRes = await fetch(`/api/payments/status/${encodeURIComponent(reference)}`, { cache: "no-store" });
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

  
  const handleNextStep = async (e: React.MouseEvent) => {
    e.preventDefault();
    const valid = await form.trigger([
      "isDiasporaGift",
      "recipientName",
      "recipientPhone",
      "deliveryMethod",
      "customerName",
      "customerPhone",
      "deliveryZoneId",
      "customerAddress",
      "deliveryInstructions",
      "customerEmail"
    ]);
    if (valid) {
      setCurrentStep(1);
    } else {
      toast({ title: "Incomplete Details", description: "Please check all required fields in the Delivery section before proceeding.", variant: "destructive" });
    }
  };

  async function onSubmit(values: z.infer<typeof formSchema>) {
    try {
      if (!awaitingOtp) {
        if (!submitKeyRef.current) {
          submitKeyRef.current = crypto.randomUUID();
        }

        const response = await fetch("/api/payments/initiate", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-idempotency-key": submitKeyRef.current,
          },
          body: JSON.stringify({
            items: state.items.map(item => ({ productId: String(item.id), quantity: item.quantity })),
                email: values.customerEmail,
                customerMobile: values.paymentMethod === "CARD" ? undefined : (values.customerMobile || undefined),
                paymentMethod: values.paymentMethod,
                currencyCode,
                deliveryMethod: values.deliveryMethod,
                deliveryQuoteId: deliveryQuote?.id,
                deliveryInstructions: values.deliveryInstructions,
            customerName: values.customerName,
            customerPhone: values.customerPhone,
            customerAddress: values.customerAddress,
            cardDetails: values.paymentMethod === "CARD" ? {
              pan: values.cardPan?.replace(/\s/g, "") ?? "",
              expMonth: values.cardExpMonth ?? "",
              expYear: values.cardExpYear ?? "",
              securityCode: values.cardSecurityCode ?? "",
            } : undefined,
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

        setActivePaymentMethod(values.paymentMethod);
        setLastOrderReference(data.reference ?? null);
        setPaymentStatus(String(data.status ?? "PENDING").toUpperCase());

        window.localStorage.setItem("vfs.checkout.profile", JSON.stringify({
          customerName: values.customerName,
          customerPhone: values.customerPhone,
          customerAddress: values.customerAddress,
          deliveryInstructions: values.deliveryInstructions,
          customerEmail: values.customerEmail,
        }));

        const action = resolvePurchaseFlowAction(data);
        const engagement = getPaymentProgressContent(data.status, {
          paymentMethod: values.paymentMethod,
          subject: "your order",
        });

        if (action.type === "redirect") {
          window.location.href = action.url;
          return;
        }

        if (action.type === "html") {
          renderGatewayRedirectHtml(action.html);
          return;
        }

        if (action.type === "otp") {
          setAwaitingOtp(true);
          setTransactionReference(data.transactionReference ?? null);
          setOrderReference(data.reference ?? null);
          toast({
            title: engagement.title,
            description: data.message ?? engagement.description,
          });
          return;
        }

        const reference = String(data.reference ?? "");
        if (reference) {
          setPaymentStatus(String(data.status ?? "PENDING").toUpperCase());
          setIsAwaitingGatewayStatus(true);
          const finalStatus = await waitForFinalPaymentStatus(reference);
          setIsAwaitingGatewayStatus(false);
          if (isSuccessfulGatewayStatus(finalStatus)) {
            submitKeyRef.current = null;
            captureReceiptSnapshot();
            dispatch({ type: "CLEAR_CART" });
            setCurrentStep(2);
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

      const response = await fetch("/api/payments/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reference: orderReference,
          transactionReference,
          otp: values.otp,
          paymentMethod: activePaymentMethod,
          customerMobile: values.customerMobile,
        }),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to confirm payment");
      }

      const status = String(data.status ?? "PENDING").toUpperCase();
      if (isSuccessfulGatewayStatus(status)) {
        submitKeyRef.current = null;
        captureReceiptSnapshot();
        dispatch({ type: "CLEAR_CART" });
        setCurrentStep(2);
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
          title: isSuccessfulGatewayStatus(finalStatus) ? "Payment successful" : "Payment processing",
          description: data.message ?? `Current status: ${finalStatus}`,
        });
        if (isSuccessfulGatewayStatus(finalStatus)) {
          submitKeyRef.current = null;
          captureReceiptSnapshot();
          dispatch({ type: "CLEAR_CART" });
          setCurrentStep(2);
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
    <Dialog open={isOpen} onOpenChange={(val) => {
        if (!val) { onOpenChange(false); }
    }}>
      <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col p-0 overflow-hidden bg-background border-none shadow-2xl rounded-2xl">
        
        {/* Modern Stepper Header */}
        <div className="bg-muted/30 pt-8 pb-6 px-6 border-b">
            <DialogHeader>
                <DialogTitle className="font-headline text-3xl text-center mb-6">Checkout</DialogTitle>
                <DialogDescription className="sr-only">Checkout process</DialogDescription>
            </DialogHeader>
            <div className="flex items-center justify-center gap-2 max-w-sm mx-auto">
                {[ { label: "Details", icon: MapPin }, { label: "Payment", icon: CreditCard }, { label: "Complete", icon: ReceiptText } ].map((step, idx) => {
                   const Icon = step.icon;
                   const isActive = currentStep >= idx;
                   return (
                     <React.Fragment key={idx}>
                       <div className={`flex flex-col items-center gap-2 ${isActive ? "text-primary" : "text-muted-foreground opacity-50"}`}>
                         <div className={`h-12 w-12 rounded-full flex items-center justify-center border-2 transition-all duration-500 shadow-sm ${isActive ? "bg-primary text-primary-foreground border-primary" : "bg-card border-muted-foreground/30"}`}>
                           <Icon className="h-5 w-5" />
                         </div>
                         <span className="text-xs font-semibold">{step.label}</span>
                       </div>
                       {idx < 2 && <div className={`w-10 sm:w-20 h-[3px] transition-all duration-500 rounded-full mb-6 ${currentStep > idx ? "bg-primary" : "bg-muted-foreground/20"}`} />}
                     </React.Fragment>
                   );
                })}
            </div>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex-1 flex flex-col overflow-hidden relative bg-muted/10">
            <div className="flex-1 overflow-y-auto px-6 py-6 custom-scrollbar">
                <AnimatePresence mode="wait" initial={false}>
                  {currentStep === 0 && (
                    <motion.div key="step0" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} className="max-w-xl mx-auto space-y-8 pb-10">
                      
                      <div className="space-y-6 bg-card p-6 rounded-2xl border shadow-sm">
                          <h3 className="text-lg font-headline font-bold flex items-center gap-2 border-b pb-3"><MapPin className="h-5 w-5 text-primary" /> Delivery Options</h3>
                          <FormField name="isDiasporaGift" control={form.control} render={({ field }) => (
                            <FormItem className="flex flex-row items-center space-x-3 rounded-xl border p-4 bg-muted/10 transition-colors hover:bg-muted/20">
                              <FormControl><Checkbox className="h-5 w-5 rounded-sm" checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                              <div className="space-y-1 leading-none">
                                <FormLabel className="cursor-pointer font-semibold text-base">This is a gift for someone in Zimbabwe</FormLabel>
                                <FormDescription>We&apos;ll notify the recipient on your behalf.</FormDescription>
                              </div>
                            </FormItem>
                          )} />

                          {isDiasporaGift ? (
                            <div className="space-y-5 animate-fade-in-up">
                              <FormField name="recipientName" control={form.control} render={({ field }) => (
                                <FormItem><FormLabel>Recipient&apos;s Name</FormLabel><FormControl><Input className="h-12 bg-background" placeholder="Jane Doe" {...field} /></FormControl><FormMessage /></FormItem>
                              )} />
                              <FormField name="recipientPhone" control={form.control} render={({ field }) => (
                                <FormItem><FormLabel>Recipient&apos;s Phone</FormLabel><FormControl><Input className="h-12 bg-background" placeholder="+263 7..." {...field} /></FormControl><FormMessage /></FormItem>
                              )} />
                              <div className="grid grid-cols-2 gap-4">
                                <FormField name="customerName" control={form.control} render={({ field }) => (<FormItem><FormLabel>Your Name</FormLabel><FormControl><Input className="h-12 bg-background" placeholder="John Doe" {...field} /></FormControl><FormMessage /></FormItem>)} />
                                <FormField name="customerPhone" control={form.control} render={({ field }) => (<FormItem><FormLabel>Your Phone</FormLabel><FormControl><Input className="h-12 bg-background" placeholder="+263 7..." {...field} /></FormControl><FormMessage /></FormItem>)} />
                              </div>
                              <FormField name="customerEmail" control={form.control} render={({ field }) => (<FormItem><FormLabel>Your Email</FormLabel><FormControl><Input className="h-12 bg-background" placeholder="me@example.com" {...field} /></FormControl><FormMessage /></FormItem>)} />
                            </div>
                          ) : (
                            <div className="space-y-5 animate-fade-in-up">
                              <FormField name="deliveryMethod" control={form.control} render={({ field }) => (
                                <FormItem>
                                  <RadioGroup onValueChange={field.onChange} defaultValue={field.value} className="grid grid-cols-2 gap-4 pt-2">
                                    <FormItem>
                                      <FormControl><RadioGroupItem value="collect" className="peer sr-only" /></FormControl>
                                      <FormLabel className="flex flex-col items-center justify-between rounded-xl border-2 border-muted bg-background p-5 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary/5 transition-all cursor-pointer">
                                        <span className="text-base font-bold">Self Collection</span>
                                        <span className="text-xs text-muted-foreground mt-1">Free of charge</span>
                                      </FormLabel>
                                    </FormItem>
                                    <FormItem>
                                      <FormControl><RadioGroupItem value="delivery" className="peer sr-only" /></FormControl>
                                      <FormLabel className="flex flex-col items-center justify-between rounded-xl border-2 border-muted bg-background p-5 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary/5 transition-all cursor-pointer">
                                        <span className="text-base font-bold">Biker Delivery</span>
                                        <span className="text-xs text-muted-foreground mt-1">Zone-based quote</span>
                                      </FormLabel>
                                    </FormItem>
                                  </RadioGroup><FormMessage />
                                </FormItem>
                              )} />
                              
                              <div className="space-y-5 animate-fade-in-up pt-2">
                                <div className="grid grid-cols-2 gap-4">
                                  <FormField name="customerName" control={form.control} render={({ field }) => (<FormItem><FormLabel>Your Name</FormLabel><FormControl><Input className="h-12 bg-background" placeholder="John Doe" {...field} /></FormControl><FormMessage /></FormItem>)} />
                                  <FormField name="customerPhone" control={form.control} render={({ field }) => (<FormItem><FormLabel>Your Phone</FormLabel><FormControl><Input className="h-12 bg-background" placeholder="+263 7..." {...field} /></FormControl><FormMessage /></FormItem>)} />
                                </div>
                                <FormField name="customerEmail" control={form.control} render={({ field }) => (<FormItem><FormLabel>Your Email</FormLabel><FormControl><Input className="h-12 bg-background" placeholder="me@example.com" {...field} /></FormControl><FormMessage /></FormItem>)} />
                                
                                {profileHydrated && (
                                  <div className="rounded-lg border border-primary/20 bg-primary/5 px-4 py-3 text-xs text-primary flex items-center gap-2 font-medium">
                                    <CheckCircle2 className="h-4 w-4" /> Returning customer profile found. Details auto-filled.
                                  </div>
                                )}

                                {deliveryMethod === "delivery" && (
                                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} className="space-y-5 p-4 bg-muted/20 border rounded-xl">
                                    {savedAddresses.length > 0 && (
                                      <FormItem>
                                        <FormLabel>Use Saved Address</FormLabel>
                                        <Select
                                          onValueChange={(value) => {
                                            const selected = savedAddresses.find(address => address.address === value);
                                            if (!selected) return;
                                            form.setValue("customerAddress", selected.address, { shouldDirty: true, shouldValidate: true });
                                            form.setValue("deliveryInstructions", selected.instructions ?? "", { shouldDirty: true });
                                          }}
                                        >
                                          <FormControl>
                                            <SelectTrigger className="h-12 bg-background">
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
                                              <SelectTrigger className="h-12 bg-background">
                                                <SelectValue placeholder="Choose a delivery zone" />
                                              </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                              {deliveryZones.map(zone => (
                                                  <SelectItem key={zone.id} value={zone.id}>
                                                  {zone.name} • {formatMoney(convertFromUsd(zone.baseFeeUsd, currencyCode), currencyCode)}
                                                </SelectItem>
                                              ))}
                                            </SelectContent>
                                          </Select>
                                          <FormMessage />
                                        </FormItem>
                                      )}
                                    />
                                    <FormField name="customerAddress" control={form.control} render={({ field }) => (<FormItem><FormLabel>Delivery Address</FormLabel><FormControl><Input className="h-12 bg-background" placeholder="123 Main St, Harare" {...field} /></FormControl><FormMessage /></FormItem>)} />
                                    <FormField name="deliveryInstructions" control={form.control} render={({ field }) => (
                                      <FormItem>
                                        <FormLabel>Delivery Instructions</FormLabel>
                                        <FormControl><Textarea className="bg-background" placeholder="Gate code, landmark, unit number, or preferred handover notes." rows={3} {...field} /></FormControl>
                                        <FormMessage />
                                      </FormItem>
                                    )} />
                                  </motion.div>
                                )}
                              </div>
                            </div>
                          )}
                      </div>
                    </motion.div>
                  )}

                  {currentStep === 1 && (
                    <motion.div key="step1" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} className="max-w-xl mx-auto space-y-6 pb-10">
                      
                      <div className="bg-card p-6 rounded-2xl border shadow-sm">
                          <h3 className="text-lg font-headline font-bold flex items-center gap-2 border-b pb-3 mb-5"><CreditCard className="h-5 w-5 text-primary" /> Payment Method</h3>
                          <FormField name="paymentMethod" control={form.control} render={({ field }) => (
                            <FormItem>
                              <RadioGroup onValueChange={(val) => { field.onChange(val); setAwaitingOtp(false); }} defaultValue={field.value} className="grid grid-cols-2 gap-3">
                                {enabledPaymentMethodOptions.map((m) => (
                                  <FormItem key={m.id}>
                                    <FormControl><RadioGroupItem value={m.id} className="peer sr-only" /></FormControl>
                                    <FormLabel className="flex flex-col items-center justify-center h-20 rounded-xl border-2 border-muted bg-background p-2 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary/5 transition-all text-sm font-bold cursor-pointer">
                                      {m.label}
                                    </FormLabel>
                                  </FormItem>
                                ))}
                              </RadioGroup>
                              <FormMessage />
                            </FormItem>
                          )} />

                          {requiresMobileNumber(paymentMethod) && (
                            <FormField name="customerMobile" control={form.control} render={({ field }) => (
                              <FormItem className="animate-fade-in-up mt-6">
                                <FormLabel>{getPaymentMethodLabel(paymentMethod)} Mobile Number</FormLabel>
                                <FormControl><Input className="h-12 bg-background text-lg" placeholder="+263 7..." {...field} /></FormControl>
                                <FormDescription>{getPaymentMethodMobileHint(paymentMethod)}</FormDescription>
                                <FormMessage />
                              </FormItem>
                            )} />
                          )}

                          {paymentMethod === "CARD" && (
                            <div className="mt-6 space-y-4 rounded-xl border bg-muted/20 p-5 animate-fade-in-up">
                              <FormField name="cardPan" control={form.control} render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Card Number</FormLabel>
                                  <FormControl>
                                    <Input
                                      className="h-12 bg-background"
                                      inputMode="numeric"
                                      autoComplete="cc-number"
                                      placeholder="2223 0000 0000 0007"
                                      {...field}
                                      onChange={(event) => field.onChange(event.target.value.replace(/\D/g, ""))}
                                    />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )} />
                              <div className="grid grid-cols-3 gap-3">
                                <FormField name="cardExpMonth" control={form.control} render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Exp Month</FormLabel>
                                    <FormControl><Input className="h-12 bg-background" inputMode="numeric" autoComplete="cc-exp-month" placeholder="01" maxLength={2} {...field} onChange={(event) => field.onChange(event.target.value.replace(/\D/g, ""))} /></FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )} />
                                <FormField name="cardExpYear" control={form.control} render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Exp Year</FormLabel>
                                    <FormControl><Input className="h-12 bg-background" inputMode="numeric" autoComplete="cc-exp-year" placeholder="39" maxLength={4} {...field} onChange={(event) => field.onChange(event.target.value.replace(/\D/g, ""))} /></FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )} />
                                <FormField name="cardSecurityCode" control={form.control} render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>CVV</FormLabel>
                                    <FormControl><Input className="h-12 bg-background" inputMode="numeric" autoComplete="cc-csc" placeholder="100" maxLength={4} {...field} onChange={(event) => field.onChange(event.target.value.replace(/\D/g, ""))} /></FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )} />
                              </div>
                              <p className="text-xs text-muted-foreground">
                                Your card is submitted directly to Smile Pay for bank verification. If your bank requires 3D Secure, we will hand you off to the challenge automatically.
                              </p>
                            </div>
                          )}

                          {awaitingOtp && (
                            <FormField name="otp" control={form.control} render={({ field }) => (
                              <FormItem className="animate-fade-in-up mt-6 p-5 bg-muted/30 border rounded-xl">
                                <FormLabel className="text-lg text-primary flex items-center gap-2"><CheckCircle2 className="h-5 w-5"/> Enter OTP to Confirm</FormLabel>
                                <FormControl><Input className="h-14 text-center tracking-widest text-2xl font-bold bg-background shadow-inner" placeholder="0000" {...field} /></FormControl>
                                <FormMessage />
                                <FormDescription className="text-center mt-2">Verify the payment with the code sent to your mobile.</FormDescription>
                              </FormItem>
                            )} />
                          )}
                      </div>

                      <div className="bg-gradient-to-br from-primary/10 to-primary/5 p-6 rounded-2xl border border-primary/20 shadow-sm">
                        <h4 className="font-semibold mb-4 text-foreground/80">Order Summary</h4>
                        <div className="space-y-3">
                            <div className="flex justify-between text-base font-medium"><span>Subtotal ({state.items.reduce((s, i) => s + i.quantity, 0)} items)</span><span>{formatMoney(subtotal, currencyCode)}</span></div>
                            {deliveryMethod === "delivery" && (
                              <div className="flex justify-between text-base font-medium italic text-muted-foreground">
                                <span>Delivery {!deliveryQuote && "(Waiting)"}</span>
                                <span>{deliveryQuote ? formatMoney(deliveryQuote.fee, currencyCode) : "..."}</span>
                              </div>
                            )}
                            <div className="flex justify-between text-2xl font-headline font-bold pt-4 border-t border-primary/20"><p>Total</p><p className="text-primary">{formatMoney(total, currencyCode)}</p></div>
                        </div>
                      </div>

                      {(isAwaitingGatewayStatus || (paymentStatus && !awaitingOtp)) && (lastOrderReference || orderReference) ? (
                        <div className="rounded-2xl border border-primary/20 bg-primary/5 p-5 shadow-sm">
                          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                            <div className="space-y-1">
                              <p className="text-sm font-semibold text-foreground">Transaction report</p>
                              <p className="text-sm text-muted-foreground">
                                Payment is still being confirmed. You can open the current invoice or report while we keep tracking the gateway update.
                              </p>
                              <p className="text-xs text-muted-foreground">
                                Order reference: {(lastOrderReference || orderReference || "").replace(/^order_/, "")}
                              </p>
                            </div>
                            <Button asChild variant="outline" className="shrink-0">
                              <a
                                href={`/api/orders/${encodeURIComponent(lastOrderReference || orderReference || "")}/report?format=invoice-pdf`}
                                target="_blank"
                                rel="noreferrer"
                              >
                                <Download className="mr-2 h-4 w-4" />
                                Open Transaction Report
                              </a>
                            </Button>
                          </div>
                        </div>
                      ) : null}

                    </motion.div>
                  )}

                  {currentStep === 2 && (
                    <motion.div key="step3" initial={{ opacity: 0, scale: 0.95, y: 10 }} animate={{ opacity: 1, scale: 1, y: 0 }} className="max-w-md mx-auto py-4">
                        <div className="bg-white dark:bg-card rounded-2xl overflow-hidden shadow-2xl border border-muted/50 relative">
                            {/* Receipt Header styling */}
                            <div className="bg-primary/5 p-8 text-center border-b border-dashed border-primary/20">
                                <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4 ring-8 ring-primary/5">
                                    <CheckCircle2 className="h-8 w-8 text-primary" />
                                </div>
                                <h2 className="font-headline text-3xl font-bold text-foreground">Order Confirmed!</h2>
                                <p className="text-muted-foreground mt-2 font-medium">Thank you for your purchase.</p>
                                <div className="mt-6 py-3 bg-white dark:bg-background rounded-lg border flex flex-col">
                                    <span className="text-xs text-muted-foreground uppercase tracking-widest mb-1">Order Number</span>
                                    <span className="font-mono text-xl font-bold tracking-wider uppercase">{lastOrderReference?.replace(/^order_/, "") || "N/A"}</span>
                                </div>
                            </div>

                            {/* Receipt Body */}
                            <div className="p-8">
                                <h4 className="border-b pb-2 mb-4 font-bold text-sm tracking-widest text-muted-foreground uppercase">Items Summary</h4>
                                <div className="space-y-4 mb-8">
                                    {receiptItemsSnapshot.map(item => (
                                        <div key={item.id} className="flex justify-between items-start text-sm">
                                            <span className="font-medium pr-4">{item.quantity}x {item.name}</span>
                                            <span className="font-semibold">{formatMoney(convertFromUsd(item.price * item.quantity, currencyCode), currencyCode)}</span>
                                        </div>
                                    ))}
                                    {typeof receiptDeliveryFeeUsdSnapshot === "number" && receiptDeliveryFeeUsdSnapshot > 0 ? (
                                      <div className="flex justify-between items-start text-sm">
                                        <span className="font-medium pr-4">Delivery</span>
                                        <span className="font-semibold">{formatMoney(convertFromUsd(receiptDeliveryFeeUsdSnapshot, currencyCode), currencyCode)}</span>
                                      </div>
                                    ) : null}
                                </div>

                                <div className="pt-4 border-t-2 border-dashed flex justify-between items-center bg-muted/10 -mx-8 px-8 pb-4">
                                    <span className="font-bold text-lg">Total Paid</span>
                                    <span className="text-2xl font-bold text-primary">{formatMoney(convertFromUsd(receiptTotalUsdSnapshot ?? totalUsd, currencyCode), currencyCode)}</span>
                                </div>
                            </div>
                        </div>

                        <div className="mt-8 space-y-4">
                            <div className="bg-primary/5 border border-primary/20 p-4 rounded-xl flex gap-4 items-start">
                                <Camera className="w-6 h-6 text-primary shrink-0" />
                                <p className="text-sm font-medium text-foreground">Please take a screenshot of this receipt or download it below. You will need your Order Number for collection or delivery tracking.</p>
                            </div>
                            
                            {lastOrderReference && (
                                <Button asChild size="lg" className="w-full text-lg h-14 rounded-xl shadow-xl transition-all hover:scale-[1.02]">
                                    <a href={`/api/orders/${encodeURIComponent(lastOrderReference)}/report?format=invoice-pdf`} target="_blank" rel="noreferrer">
                                        <Download className="mr-2 h-6 w-6" />
                                        Download PDF Receipt
                                    </a>
                                </Button>
                            )}
                        </div>

                    </motion.div>
                  )}
                </AnimatePresence>
            </div>

            {/* Bottom Sticky Action Bar */}
            {currentStep < 2 && (
                <div className="bg-background px-6 pt-5 pb-6 border-t shadow-[0_-10px_40px_-15px_rgba(0,0,0,0.1)] relative z-10 flex items-center justify-between">
                  {currentStep === 1 && (
                      <Button type="button" variant="ghost" className="text-muted-foreground font-semibold" onClick={() => setCurrentStep(0)}>
                          <ChevronLeft className="w-4 h-4 mr-1" /> Back
                      </Button>
                  )}
                  {currentStep === 0 && <span/>}
                  
                  {currentStep === 0 && (
                      <Button type="button" size="lg" onClick={handleNextStep} className="font-bold px-8 shadow-md rounded-full">
                          Continue to Payment <ChevronRight className="w-4 h-4 ml-1" />
                      </Button>
                  )}
                  {currentStep === 1 && (
                      <Button type="submit" size="lg" disabled={isSubmitting} className="font-bold px-10 shadow-lg rounded-full h-12 w-full sm:w-auto mt-0">
                          {isSubmitting ? (<><Loader2 className="mr-2 h-5 w-5 animate-spin" />Processing...</>) : (
                             awaitingOtp ? "Verify Payment" : (paymentMethod === "CARD" ? "Continue to Bank Verification" : `Pay ${formatMoney(total, currencyCode)}`)
                          )}
                      </Button>
                  )}
                </div>
            )}
            
            {/* Close button for Receipt Step */}
            {currentStep === 2 && (
                <div className="bg-background px-6 pt-4 pb-6 border-t relative z-10">
                    <Button type="button" variant="outline" size="lg" onClick={() => onOpenChange(false)} className="w-full font-bold h-12 rounded-xl">
                        Done
                    </Button>
                </div>
            )}

          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
