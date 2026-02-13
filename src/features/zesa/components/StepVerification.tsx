
import { Button } from "@/components/ui/button";
import { CheckCircle2, AlertCircle } from "lucide-react";
import { CustomerDetails } from "../services/zb-service";

interface StepVerificationProps {
    customer: CustomerDetails;
    onConfirm: () => void;
    onCancel: () => void;
}

export function StepVerification({
    customer,
    onConfirm,
    onCancel,
}: StepVerificationProps) {
    return (
        <div className="space-y-6">
            <div className="text-center">
                <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-green-100 text-green-600">
                    <CheckCircle2 className="h-6 w-6" />
                </div>
                <h2 className="text-xl font-semibold">Confirm Details</h2>
                <p className="text-sm text-muted-foreground">
                    Please verify the meter ownership before proceeding.
                </p>
            </div>

            <div className="rounded-xl border bg-card p-6 shadow-sm">
                <div className="space-y-4">
                    <div className="flex justify-between border-b pb-3">
                        <span className="text-sm text-muted-foreground">Meter Number</span>
                        <span className="font-mono font-medium">{customer.meterNumber}</span>
                    </div>
                    <div className="flex justify-between border-b pb-3">
                        <span className="text-sm text-muted-foreground">Customer Name</span>
                        <span className="font-medium">{customer.name}</span>
                    </div>
                    <div className="flex justify-between pb-1">
                        <span className="text-sm text-muted-foreground">Address</span>
                        <span className="font-medium text-right max-w-[60%]">{customer.address}</span>
                    </div>

                    {customer.balance < 0 && (
                        <div className="mt-4 rounded-lg bg-orange-50 p-3 text-xs text-orange-800 flex items-start gap-2">
                            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                            <p>
                                This meter has an outstanding balance of <strong>${Math.abs(customer.balance).toFixed(2)}</strong>.
                                This amount will be deducted from your token purchase.
                            </p>
                        </div>
                    )}
                </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
                <Button variant="outline" onClick={onCancel}>
                    Not my meter
                </Button>
                <Button onClick={onConfirm}>
                    Confirm & Pay
                </Button>
            </div>
        </div>
    );
}
