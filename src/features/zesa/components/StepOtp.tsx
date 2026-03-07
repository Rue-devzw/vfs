import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface StepOtpProps {
  onConfirm: (otp: string) => void;
  onBack: () => void;
  isLoading: boolean;
}

export function StepOtp({ onConfirm, onBack, isLoading }: StepOtpProps) {
  const [otp, setOtp] = useState("");
  const [error, setError] = useState("");

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (otp.trim().length < 4) {
      setError("Enter a valid OTP.");
      return;
    }
    setError("");
    onConfirm(otp.trim());
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-xl font-semibold">Enter OTP</h2>
        <p className="text-sm text-muted-foreground">Use the OTP sent to your WalletPlus account.</p>
      </div>

      <form onSubmit={submit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="otp">OTP Code</Label>
          <Input
            id="otp"
            value={otp}
            onChange={(e) => {
              setOtp(e.target.value.replace(/[^0-9]/g, ""));
              setError("");
            }}
            placeholder="Enter OTP"
            disabled={isLoading}
            autoFocus
          />
          {error ? <p className="text-xs text-destructive">{error}</p> : null}
        </div>
        <div className="flex gap-3">
          <Button type="button" variant="secondary" onClick={onBack} disabled={isLoading} className="flex-1">
            Back
          </Button>
          <Button type="submit" disabled={isLoading || otp.length < 4} className="flex-[2]">
            {isLoading ? "Confirming..." : "Confirm Payment"}
          </Button>
        </div>
      </form>
    </div>
  );
}
