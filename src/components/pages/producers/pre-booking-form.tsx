"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { format } from "date-fns";
import { CalendarIcon, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";

const formSchema = z.object({
  fullName: z.string().min(2, "Full name is required."),
  phone: z.string().min(10, "A valid phone number is required."),
  email: z.string().email("Invalid email address.").optional().or(z.literal("")),
  produceType: z.string().min(3, "Type of produce is required."),
  quantity: z.string().min(1, "Estimated quantity is required."),
  harvestDate: z.date({ required_error: "Please select an expected harvest date." }),
  transportRequired: z.boolean().default(false).optional(),
  pickupAddress: z.string().optional(),
  notes: z.string().optional(),
}).refine(data => {
  if (data.transportRequired && !data.pickupAddress) {
    return false;
  }
  return true;
}, {
  message: "Pickup address is required if you need transport.",
  path: ["pickupAddress"],
});

export function PreBookingForm() {
  const { toast } = useToast();
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      fullName: "",
      phone: "",
      email: "",
      produceType: "",
      quantity: "",
      transportRequired: false,
      pickupAddress: "",
      notes: "",
    },
  });
  const { isSubmitting } = form.formState;

  const transportRequired = form.watch("transportRequired");

  async function onSubmit(values: z.infer<typeof formSchema>) {
    try {
      const response = await fetch("/api/prebookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });

      if (!response.ok) {
        throw new Error("Failed to submit pre-booking form");
      }

      toast({
        title: "Booking Submitted!",
        description: "Thank you for pre-booking your harvest with us. We'll be in touch.",
      });
      form.reset();
    } catch {
      toast({
        title: "Submission failed",
        description: "Please try again later.",
        variant: "destructive",
      });
    }
  }

  return (
    <Card className="shadow-lg">
      <CardHeader>
        <CardTitle className="font-headline text-2xl">Producer Pre-booking Form</CardTitle>
        <CardDescription>
          Secure a spot for your harvest. Fill out the form below to let us know what you&rsquo;re bringing.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              <FormField name="fullName" control={form.control} render={({ field }) => (
                <FormItem><FormLabel>Full Name</FormLabel><FormControl><Input placeholder="John Doe" {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField name="phone" control={form.control} render={({ field }) => (
                <FormItem><FormLabel>Phone Number</FormLabel><FormControl><Input placeholder="+263 777 123 456" {...field} /></FormControl><FormMessage /></FormItem>
              )} />
            </div>
            <FormField name="email" control={form.control} render={({ field }) => (
              <FormItem><FormLabel>Email Address (Optional)</FormLabel><FormControl><Input placeholder="john.doe@email.com" {...field} /></FormControl><FormMessage /></FormItem>
            )} />
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              <FormField name="produceType" control={form.control} render={({ field }) => (
                <FormItem><FormLabel>Type of Produce</FormLabel><FormControl><Input placeholder="e.g., Tomatoes, Maize" {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField name="quantity" control={form.control} render={({ field }) => (
                <FormItem><FormLabel>Estimated Quantity</FormLabel><FormControl><Input placeholder="e.g., 50 Crates, 2 Tonnes" {...field} /></FormControl><FormMessage /></FormItem>
              )} />
            </div>
            <FormField name="harvestDate" control={form.control} render={({ field }) => (
              <FormItem className="flex flex-col"><FormLabel>Expected Harvest Date</FormLabel>
                <Popover>
                  <PopoverTrigger asChild>
                    <FormControl>
                      <Button variant={"outline"} className={cn("pl-3 text-left font-normal", !field.value && "text-muted-foreground")}>
                        {field.value ? format(field.value, "PPP") : <span>Pick a date</span>}
                        <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                      </Button>
                    </FormControl>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar mode="single" selected={field.value} onSelect={field.onChange} disabled={(date) => date < new Date()} initialFocus />
                  </PopoverContent>
                </Popover><FormMessage />
              </FormItem>
            )} />
            <FormField name="transportRequired" control={form.control} render={({ field }) => (
              <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                <FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                <div className="space-y-1 leading-none"><FormLabel>Transport Required</FormLabel><FormDescription>Check this box if you need us to arrange transport for your produce.</FormDescription></div>
              </FormItem>
            )} />
            {transportRequired && (
              <FormField name="pickupAddress" control={form.control} render={({ field }) => (
                <FormItem className="animate-fade-in-up">
                  <FormLabel>Pickup Address</FormLabel>
                  <FormControl><Textarea placeholder="Please provide the full address for pickup." {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            )}
            <FormField name="notes" control={form.control} render={({ field }) => (
              <FormItem><FormLabel>Additional Notes</FormLabel><FormControl><Textarea placeholder="Any other details we should know?" {...field} /></FormControl><FormMessage /></FormItem>
            )} />

            <Button
              type="submit"
              className="w-full bg-accent text-accent-foreground hover:bg-accent/90"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Submitting...
                </>
              ) : (
                "Submit Pre-booking"
              )}
            </Button>
            <p aria-live="polite" className="sr-only" role="status">
              {isSubmitting ? "Submitting..." : ""}
            </p>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
