"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

export function CopyTokenButton({ token }: { token: string }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    await navigator.clipboard.writeText(token);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <Button size="sm" variant="outline" onClick={handleCopy}>
      {copied ? "Token copied" : "Copy token"}
    </Button>
  );
}
