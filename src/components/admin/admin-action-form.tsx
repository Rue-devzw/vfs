"use client";

import * as React from "react";
import { Loader2 } from "lucide-react";
import { useFormStatus } from "react-dom";

import { cn } from "@/lib/utils";

type AdminActionFormProps = Omit<React.FormHTMLAttributes<HTMLFormElement>, "action"> & {
  action: NonNullable<React.FormHTMLAttributes<HTMLFormElement>["action"]>;
  pendingTitle?: string;
  pendingMessage?: string;
};

function AdminActionFormBody({
  children,
  pendingTitle,
  pendingMessage,
}: Pick<AdminActionFormProps, "children" | "pendingTitle" | "pendingMessage">) {
  const { pending } = useFormStatus();

  return (
    <>
      <div className={cn("transition-opacity", pending && "pointer-events-none opacity-70")}>
        {children}
      </div>
      {pending ? (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-background/78 px-4 backdrop-blur-md">
          <div className="w-full max-w-md rounded-3xl border border-border/60 bg-card/95 p-7 shadow-2xl shadow-black/20">
            <div className="flex items-start gap-4">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-primary/12 text-primary">
                <Loader2 className="h-7 w-7 animate-spin" />
              </div>
              <div className="space-y-3">
                <div className="space-y-1">
                  <div className="text-lg font-semibold tracking-tight">{pendingTitle}</div>
                  <p className="text-sm text-muted-foreground">{pendingMessage}</p>
                </div>
                <div className="overflow-hidden rounded-full bg-muted">
                  <div className="h-2 w-full origin-left rounded-full bg-primary animate-[pulse_1.2s_ease-in-out_infinite]" />
                </div>
                <div className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-[0.24em] text-muted-foreground">
                  <span
                    className="h-2.5 w-2.5 rounded-full bg-primary animate-[bounce_0.9s_infinite]"
                    style={{ animationDelay: "0ms" }}
                  />
                  <span
                    className="h-2.5 w-2.5 rounded-full bg-primary/80 animate-[bounce_0.9s_infinite]"
                    style={{ animationDelay: "120ms" }}
                  />
                  <span
                    className="h-2.5 w-2.5 rounded-full bg-primary/60 animate-[bounce_0.9s_infinite]"
                    style={{ animationDelay: "240ms" }}
                  />
                  <span className="ml-2">Please wait</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}

export function AdminActionForm({
  action,
  className,
  children,
  pendingTitle = "Please wait",
  pendingMessage = "We are processing this admin request now.",
  ...props
}: AdminActionFormProps) {
  return (
    <form action={action} className={className} {...props}>
      <AdminActionFormBody pendingTitle={pendingTitle} pendingMessage={pendingMessage}>
        {children}
      </AdminActionFormBody>
    </form>
  );
}
