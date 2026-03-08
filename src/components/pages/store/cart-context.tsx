"use client";

import React, { createContext, useContext, useReducer, ReactNode } from 'react';
import { Product } from '@/app/store/data';
import { CurrencyCode } from '@/lib/currency';

export interface CartItem extends Product {
  quantity: number;
}

type CartState = {
  items: CartItem[];
  currencyCode: CurrencyCode;
};

type CartAction =
  | { type: 'ADD_ITEM'; payload: Product }
  | { type: 'REMOVE_ITEM'; payload: { id: string | number } }
  | { type: 'UPDATE_QUANTITY'; payload: { id: string | number; quantity: number } }
  | { type: 'CLEAR_CART' }
  | { type: 'SET_CURRENCY'; payload: CurrencyCode };

const initialState: CartState = {
  items: [],
  currencyCode: "840",
};

const CartContext = createContext<{
  state: CartState;
  dispatch: React.Dispatch<CartAction>;
} | undefined>(undefined);

function cartReducer(state: CartState, action: CartAction): CartState {
  switch (action.type) {
    case 'ADD_ITEM':
      const existingItem = state.items.find(item => item.id === action.payload.id);
      if (existingItem) {
        return {
          ...state,
          items: state.items.map(item =>
            item.id === action.payload.id ? { ...item, quantity: item.quantity + 1 } : item
          ),
        };
      }
      return {
        ...state,
        items: [...state.items, { ...action.payload, quantity: 1 }],
      };
    case 'REMOVE_ITEM':
      return {
        ...state,
        items: state.items.filter(item => item.id !== action.payload.id),
      };
    case 'UPDATE_QUANTITY':
      if (action.payload.quantity <= 0) {
        return {
          ...state,
          items: state.items.filter(item => item.id !== action.payload.id),
        };
      }
      return {
        ...state,
        items: state.items.map(item =>
          item.id === action.payload.id ? { ...item, quantity: action.payload.quantity } : item
        ),
      };
    case 'CLEAR_CART':
      return {
        ...state,
        items: []
      }
    case 'SET_CURRENCY':
      return {
        ...state,
        currencyCode: action.payload,
      };
    default:
      return state;
  }
}

export const CartProvider = ({ children }: { children: ReactNode }) => {
  const [state, dispatch] = useReducer(cartReducer, initialState);

  React.useEffect(() => {
    const stored = window.localStorage.getItem("vfs.currency.code");
    if (stored === "840" || stored === "924") {
      dispatch({ type: "SET_CURRENCY", payload: stored });
    }
  }, []);

  React.useEffect(() => {
    window.localStorage.setItem("vfs.currency.code", state.currencyCode);
  }, [state.currencyCode]);

  return (
    <CartContext.Provider value={{ state, dispatch }}>
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
};
