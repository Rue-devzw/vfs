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
  isHydrated: boolean;
  setCurrencyCode: (code: CurrencyCode) => void;
};

const CurrencyContext = React.createContext<CurrencyContextValue | undefined>(undefined);

export function CurrencyProvider({ children }: { children: React.ReactNode }) {
  const [currencyCode, setCurrencyCodeState] = React.useState<CurrencyCode>(DEFAULT_CURRENCY_CODE);
  const [isHydrated, setIsHydrated] = React.useState(false);

  React.useEffect(() => {
    const storedCode = window.localStorage.getItem(STORAGE_KEY);
    if (isCurrencyCode(storedCode)) {
      setCurrencyCodeState(storedCode);
    }
    setIsHydrated(true);
  }, []);

  const setCurrencyCode = React.useCallback((code: CurrencyCode) => {
    setCurrencyCodeState(code);
    window.localStorage.setItem(STORAGE_KEY, code);
  }, []);

  const value = React.useMemo(() => ({
    currencyCode,
    isHydrated,
    setCurrencyCode,
  }), [currencyCode, isHydrated, setCurrencyCode]);

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
