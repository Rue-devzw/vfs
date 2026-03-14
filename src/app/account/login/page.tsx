"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { sendPasswordResetEmail, signInWithEmailAndPassword } from "firebase/auth";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getFirebaseAuthErrorMessage } from "@/lib/firebase-auth-errors";
import { firebaseAuth } from "@/lib/firebase";

export default function AccountLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(false);
  const [resetting, setResetting] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setNotice("");
    setLoading(true);

    try {
      const credential = await signInWithEmailAndPassword(firebaseAuth, email.trim(), password);
      await credential.user.reload();

      if (!credential.user.emailVerified) {
        router.push(`/account/verify?email=${encodeURIComponent(email.trim())}`);
        return;
      }

      const idToken = await credential.user.getIdToken(true);
      const response = await fetch("/api/account/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Unable to sign in.");
      }

      router.push("/account");
      router.refresh();
    } catch (err) {
      setError(getFirebaseAuthErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  async function handleResetPassword() {
    if (!email.trim()) {
      setError("Enter your email address first.");
      return;
    }

    setError("");
    setNotice("");
    setResetting(true);
    try {
      await sendPasswordResetEmail(firebaseAuth, email.trim());
      setNotice("Password reset email sent. Check your inbox.");
    } catch (err) {
      setError(getFirebaseAuthErrorMessage(err));
    } finally {
      setResetting(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Header />
      <main className="flex flex-1 items-center justify-center bg-muted/10 px-4 py-10">
        <Card className="w-full max-w-md rounded-3xl shadow-sm">
          <CardHeader>
            <CardTitle className="font-headline text-3xl">Customer sign in</CardTitle>
            <CardDescription>
              Use your registered email and password. Verified accounts can access orders, receipts, saved addresses, and refunds.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email address</Label>
                <Input id="email" type="email" value={email} onChange={event => setEmail(event.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input id="password" type="password" value={password} onChange={event => setPassword(event.target.value)} required />
              </div>
              {error ? <p className="text-sm text-destructive">{error}</p> : null}
              {notice ? <p className="text-sm text-primary">{notice}</p> : null}
              <Button type="submit" className="w-full" disabled={loading || !email || !password}>
                {loading ? "Signing in..." : "Sign in"}
              </Button>
            </form>

            <div className="mt-4 flex flex-col gap-3 text-sm">
              <button type="button" onClick={handleResetPassword} disabled={resetting} className="text-left text-primary underline-offset-4 hover:underline">
                {resetting ? "Sending reset email..." : "Forgot your password?"}
              </button>
              <p className="text-muted-foreground">
                No account yet? <Link href="/account/register" className="text-primary underline-offset-4 hover:underline">Create one</Link>
              </p>
            </div>
          </CardContent>
        </Card>
      </main>
      <Footer />
    </div>
  );
}
