"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Loader2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";

const formSchema = z.object({
    organizationName: z.string().min(2, "Organisation/Producer Name is required"),
    contactPerson: z.string().min(2, "Contact person is required"),
    phone: z.string().min(10, "A valid phone number is required"),
    email: z.string().email("Invalid email address"),
    message: z.string().min(10, "Please provide some details in your proposal.").max(1000),
});

export function PartnerForm() {
    const { toast } = useToast();
    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            organizationName: "",
            contactPerson: "",
            phone: "",
            email: "",
            message: "",
        },
    });
    const { isSubmitting } = form.formState;

    async function onSubmit(values: z.infer<typeof formSchema>) {
        try {
            const response = await fetch("/api/partners", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(values),
            });

            if (!response.ok) {
                throw new Error("Failed to submit partnership proposal");
            }

            toast({
                title: "✅ Thank you for submitting your partnership proposal to Valley Farm Secrets.",
                description: "Our team will review it and get back to you within 5–7 working days. For urgent queries: +263 788 679 000 | +263 711 406 919.",
            });
            form.reset();
        } catch (error) {
            toast({
                title: "Submission failed",
                description: "Please try again later.",
                variant: "destructive",
            });
        }
    }

    return (
        <Card className="mt-10 p-6 sm:p-8">
            <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                        <FormField control={form.control} name="organizationName" render={({ field }) => (
                            <FormItem><FormLabel>Organisation / Producer Name</FormLabel><FormControl><Input placeholder="Your Organisation" {...field} /></FormControl><FormMessage /></FormItem>
                        )} />
                        <FormField control={form.control} name="contactPerson" render={({ field }) => (
                            <FormItem><FormLabel>Contact Person</FormLabel><FormControl><Input placeholder="John Doe" {...field} /></FormControl><FormMessage /></FormItem>
                        )} />
                    </div>
                    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                        <FormField control={form.control} name="phone" render={({ field }) => (
                            <FormItem><FormLabel>Phone</FormLabel><FormControl><Input placeholder="+263 7..." {...field} /></FormControl><FormMessage /></FormItem>
                        )} />
                        <FormField control={form.control} name="email" render={({ field }) => (
                            <FormItem><FormLabel>Email</FormLabel><FormControl><Input placeholder="you@company.com" {...field} /></FormControl><FormMessage /></FormItem>
                        )} />
                    </div>
                    <FormField control={form.control} name="message" render={({ field }) => (
                        <FormItem><FormLabel>Proposal or Message</FormLabel><FormControl><Textarea placeholder="Tell us about your proposal or how you'd like to partner with us..." rows={6} {...field} /></FormControl><FormMessage /></FormItem>
                    )} />
                    <Button
                        type="submit"
                        size="lg"
                        className="w-full"
                        style={{ backgroundColor: '#4CAF50' }}
                        disabled={isSubmitting}
                    >
                        {isSubmitting ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Submitting...
                            </>
                        ) : (
                            "Submit Proposal"
                        )}
                    </Button>
                    <p aria-live="polite" className="sr-only" role="status">
                        {isSubmitting ? "Submitting..." : ""}
                    </p>
                </form>
            </Form>
        </Card>
    );
}
