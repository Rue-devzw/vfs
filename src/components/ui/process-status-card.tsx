"use client";

import { Loader2, Sparkles } from "lucide-react";

import { Progress } from "@/components/ui/progress";

type ProcessStatusCardProps = {
  title: string;
  description: string;
  detail?: string;
  progress?: number;
};

export function ProcessStatusCard({
  title,
  description,
  detail,
  progress = 45,
}: ProcessStatusCardProps) {
  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary shadow-sm">
          <Loader2 className="h-7 w-7 animate-spin" />
        </div>
        <h2 className="text-2xl font-semibold">{title}</h2>
        <p className="mt-2 text-sm text-muted-foreground">{description}</p>
      </div>

      <div className="space-y-3 rounded-2xl border border-primary/10 bg-muted/20 p-5">
        <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
          <span>Background Process</span>
          <span>{Math.max(10, Math.min(99, Math.round(progress)))}%</span>
        </div>
        <Progress value={progress} className="h-2 bg-primary/10" />
        <div className="flex items-start gap-3 rounded-xl bg-background/80 px-4 py-3 text-sm text-muted-foreground">
          <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
          <p>{detail ?? "Keep this page open while we complete the next step for you."}</p>
        </div>
      </div>
    </div>
  );
}
