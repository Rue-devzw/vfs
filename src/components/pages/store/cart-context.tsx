"use client";

import React, { createContext, useContext, useEffect, useMemo, useReducer, type ReactNode } from "react";
import type { Product } from "@/app/store/data";
import type { CurrencyCode } from "@/lib/currency";

export interface CartItem extends Product {
  quantity: number;
}

type CartState = {
  sessionId: string | null;
  items: CartItem[];
  currencyCode: CurrencyCode;
  isHydrated: boolean;
  isSyncing: boolean;
};

type CartAction =
  | { type: "SET_SESSION"; payload: string }
  | { type: "SET_CART"; payload: { items: CartItem[]; currencyCode: CurrencyCode } }
  | { type: "ADD_ITEM"; payload: Product }
  | { type: "REMOVE_ITEM"; payload: { id: string | number } }
  | { type: "UPDATE_QUANTITY"; payload: { id: string | number; quantity: number } }
  | { type: "CLEAR_CART" }
  | { type: "SET_CURRENCY"; payload: CurrencyCode }
  | { type: "SET_HYDRATED"; payload: boolean }
  | { type: "SET_SYNCING"; payload: boolean };

const initialState: CartState = {
  sessionId: null,
  items: [],
  currencyCode: "840",
  isHydrated: false,
  isSyncing: false,
};

const CartContext = createContext<{
  state: CartState;
  dispatch: React.Dispatch<CartAction>;
} | undefined>(undefined);

function cartReducer(state: CartState, action: CartAction): CartState {
  switch (action.type) {
    case "SET_SESSION":
      return { ...state, sessionId: action.payload };
    case "SET_CART":
      return { ...state, items: action.payload.items, currencyCode: action.payload.currencyCode };
    case "ADD_ITEM": {
      const existingItem = state.items.find(item => item.id === action.payload.id);
      if (existingItem) {
        return {
          ...state,
          items: state.items.map(item =>
            item.id === action.payload.id ? { ...item, quantity: item.quantity + 1 } : item,
          ),
        };
      }
      return {
        ...state,
        items: [...state.items, { ...action.payload, quantity: 1 }],
      };
    }
    case "REMOVE_ITEM":
      return { ...state, items: state.items.filter(item => item.id !== action.payload.id) };
    case "UPDATE_QUANTITY":
      if (action.payload.quantity <= 0) {
        return { ...state, items: state.items.filter(item => item.id !== action.payload.id) };
      }
      return {
        ...state,
        items: state.items.map(item =>
          item.id === action.payload.id ? { ...item, quantity: action.payload.quantity } : item,
        ),
      };
    case "CLEAR_CART":
      return { ...state, items: [] };
    case "SET_CURRENCY":
      return { ...state, currencyCode: action.payload };
    case "SET_HYDRATED":
      return { ...state, isHydrated: action.payload };
    case "SET_SYNCING":
      return { ...state, isSyncing: action.payload };
    default:
      return state;
  }
}

function getOrCreateSessionId() {
  const existing = window.localStorage.getItem("vfs.cart.sessionId");
  if (existing) {
    return existing;
  }

  const next = crypto.randomUUID();
  window.localStorage.setItem("vfs.cart.sessionId", next);
  return next;
}

export const CartProvider = ({ children }: { children: ReactNode }) => {
  const [state, dispatch] = useReducer(cartReducer, initialState);

  useEffect(() => {
    const sessionId = getOrCreateSessionId();
    const storedCurrency = window.localStorage.getItem("vfs.currency.code");
    dispatch({ type: "SET_SESSION", payload: sessionId });

    async function hydrate() {
      try {
        const response = await fetch(`/api/cart?sessionId=${encodeURIComponent(sessionId)}`, { cache: "no-store" });
        const payload = await response.json();
        if (response.ok && payload?.cart) {
          dispatch({
            type: "SET_CART",
            payload: {
              items: payload.cart.items ?? [],
              currencyCode: payload.cart.currencyCode ?? (storedCurrency === "924" ? "924" : "840"),
            },
          });
        } else if (storedCurrency === "840" || storedCurrency === "924") {
          dispatch({ type: "SET_CURRENCY", payload: storedCurrency });
        }
      } catch (error) {
        console.error("Failed to hydrate cart:", error);
      } finally {
        dispatch({ type: "SET_HYDRATED", payload: true });
      }
    }

    hydrate();
  }, []);

  useEffect(() => {
    if (!state.isHydrated || !state.sessionId) {
      return;
    }

    window.localStorage.setItem("vfs.currency.code", state.currencyCode);
    dispatch({ type: "SET_SYNCING", payload: true });

    const timeout = window.setTimeout(async () => {
      try {
        await fetch("/api/cart", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sessionId: state.sessionId,
            currencyCode: state.currencyCode,
            items: state.items.map(item => ({
              productId: String(item.id),
              quantity: item.quantity,
            })),
          }),
        });
      } catch (error) {
        console.error("Failed to sync cart:", error);
      } finally {
        dispatch({ type: "SET_SYNCING", payload: false });
      }
    }, 300);

    return () => window.clearTimeout(timeout);
  }, [state.currencyCode, state.isHydrated, state.items, state.sessionId]);

  const contextValue = useMemo(() => ({ state, dispatch }), [state]);

  return (
    <CartContext.Provider value={contextValue}>
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error("useCart must be used within a CartProvider");
  }
  return context;
};
