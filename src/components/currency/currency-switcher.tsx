"use client";

import * as React from "react";
import { CURRENCY_OPTIONS } from "@/lib/currency";
import { cn } from "@/lib/utils";
import { useCurrency } from "./currency-provider";

export function CurrencySwitcher({
  className,
  label = "Currency",
}: {
  className?: string;
  label?: string;
}) {
  const { currencyCode, isHydrated, setCurrencyCode } = useCurrency();

  return (
    <div
      className={cn(
        "inline-flex items-center gap-1 rounded-full border border-border/60 bg-background/95 p-1 shadow-sm backdrop-blur",
        className,
      )}
      role="radiogroup"
      aria-label={label}
    >
      {CURRENCY_OPTIONS.map((option) => {
        const isActive = currencyCode === option.code;

        return (
          <button
            key={option.code}
            type="button"
            role="radio"
            aria-checked={isActive}
            disabled={!isHydrated}
            onClick={() => setCurrencyCode(option.code)}
            className={cn(
              "rounded-full px-3 py-1.5 text-xs font-semibold transition-colors disabled:cursor-wait disabled:opacity-70",
              isActive
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
