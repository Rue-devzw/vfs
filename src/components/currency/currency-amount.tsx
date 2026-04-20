"use client";

import * as React from "react";
import {
  convertCurrencyAmount,
  formatMoney,
  type CurrencyCode,
} from "@/lib/currency";
import { useCurrency } from "./currency-provider";

export function CurrencyAmount({
  amount,
  sourceCurrencyCode = "840",
  className,
}: {
  amount: number;
  sourceCurrencyCode?: CurrencyCode;
  className?: string;
}) {
  const { currencyCode } = useCurrency();
  const displayAmount = React.useMemo(
    () => convertCurrencyAmount(amount, sourceCurrencyCode, currencyCode),
    [amount, currencyCode, sourceCurrencyCode],
  );

  return (
    <span className={className}>
      {formatMoney(displayAmount, currencyCode)}
    </span>
  );
}
