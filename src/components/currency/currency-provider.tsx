"use client";

import * as React from "react";
import {
  DEFAULT_CURRENCY_CODE,
  isCurrencyCode,
  type CurrencyCode,
} from "@/lib/currency";

const STORAGE_KEY = "vfs.currency.code";

type CurrencyContextValue = {
  currencyCode: CurrencyCode;
  exchangeRate: number | null;
  isHydrated: boolean;
  setCurrencyCode: (code: CurrencyCode) => void;
};

const CurrencyContext = React.createContext<CurrencyContextValue | undefined>(undefined);

export function CurrencyProvider({ children }: { children: React.ReactNode }) {
  const [currencyCode, setCurrencyCodeState] = React.useState<CurrencyCode>(DEFAULT_CURRENCY_CODE);
  const [isHydrated, setIsHydrated] = React.useState(false);
  const [exchangeRate, setExchangeRate] = React.useState<number | null>(null);

  React.useEffect(() => {
    const storedCode = window.localStorage.getItem(STORAGE_KEY);
    if (isCurrencyCode(storedCode)) {
      setCurrencyCodeState(storedCode);
    }
    setIsHydrated(true);
    fetch("/api/exchange-rate")
      .then(response => response.ok ? response.json() : Promise.reject(new Error("Rate unavailable")))
      .then(payload => {
        if (typeof payload.rate === "number" && Number.isFinite(payload.rate) && payload.rate > 0) {
          setExchangeRate(payload.rate);
        }
      })
      .catch(() => {
        setExchangeRate(null);
        setCurrencyCodeState(DEFAULT_CURRENCY_CODE);
        window.localStorage.setItem(STORAGE_KEY, DEFAULT_CURRENCY_CODE);
      });
  }, []);

  const setCurrencyCode = React.useCallback((code: CurrencyCode) => {
    setCurrencyCodeState(code);
    window.localStorage.setItem(STORAGE_KEY, code);
  }, []);

  const value = React.useMemo(() => ({
    currencyCode,
    exchangeRate,
    isHydrated,
    setCurrencyCode,
  }), [currencyCode, exchangeRate, isHydrated, setCurrencyCode]);

  return (
    <CurrencyContext.Provider value={value}>
      {children}
    </CurrencyContext.Provider>
  );
}

export function useCurrency() {
  const context = React.useContext(CurrencyContext);

  if (!context) {
    throw new Error("useCurrency must be used within a CurrencyProvider");
  }

  return context;
}
