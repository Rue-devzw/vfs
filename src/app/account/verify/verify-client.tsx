"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import { sendEmailVerification } from "firebase/auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getFirebaseAuthErrorMessage } from "@/lib/firebase-auth-errors";
import { firebaseAuth } from "@/lib/firebase";

export function VerifyClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const email = useMemo(() => searchParams.get("email") ?? firebaseAuth.currentUser?.email ?? "", [searchParams]);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [resending, setResending] = useState(false);

  async function handleRefresh() {
    setError("");
    setNotice("");
    setRefreshing(true);
    try {
      const user = firebaseAuth.currentUser;
      if (!user) {
        throw new Error("Sign in again to continue verification.");
      }

      await user.reload();
      if (!user.emailVerified) {
        setNotice("Verification is still pending. Open the link in your email, then try again.");
        return;
      }

      const idToken = await user.getIdToken(true);
      const response = await fetch("/api/account/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Unable to activate your account.");
      }

      router.push("/account");
      router.refresh();
    } catch (err) {
      setError(getFirebaseAuthErrorMessage(err));
    } finally {
      setRefreshing(false);
    }
  }

  async function handleResend() {
    setError("");
    setNotice("");
    setResending(true);
    try {
      const user = firebaseAuth.currentUser;
      if (!user) {
        throw new Error("Sign in again to resend the verification email.");
      }
      await sendEmailVerification(user);
      setNotice("Verification email sent again.");
    } catch (err) {
      setError(getFirebaseAuthErrorMessage(err));
    } finally {
      setResending(false);
    }
  }

  return (
    <Card className="w-full max-w-md rounded-3xl shadow-sm">
      <CardHeader>
        <CardTitle className="font-headline text-3xl">Verify your email</CardTitle>
        <CardDescription>
          We sent a verification link to {email || "your email address"}. Open it first, then return here to activate your account.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {error ? <p className="text-sm text-destructive">{error}</p> : null}
        {notice ? <p className="text-sm text-primary">{notice}</p> : null}
        <Button className="w-full" onClick={handleRefresh} disabled={refreshing}>
          {refreshing ? "Checking verification..." : "I have verified my email"}
        </Button>
        <Button className="w-full" variant="outline" onClick={handleResend} disabled={resending}>
          {resending ? "Resending..." : "Resend verification email"}
        </Button>
        <p className="text-sm text-muted-foreground">
          Already verified? <Link href="/account/login" className="text-primary underline-offset-4 hover:underline">Sign in</Link>
        </p>
      </CardContent>
    </Card>
  );
}
