"use client";

import { createContext, useContext, useState, ReactNode } from "react";

type Cart = Record<string, number>;

type CartContextType = {
  cart: Cart;
  addItem: (id: string) => void;
  removeItem: (id: string) => void;
  totalItems: number;
};

const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: ReactNode }) {
  const [cart, setCart] = useState<Cart>({});

  const addItem = (id: string) => {
    setCart((prev) => ({
      ...prev,
      [id]: (prev[id] || 0) + 1,
    }));
  };

  const removeItem = (id: string) => {
    setCart((prev) => {
      if (!prev[id]) return prev;

      const updated = { ...prev };

      if (updated[id] === 1) {
        delete updated[id];
      } else {
        updated[id] -= 1;
      }

      return updated;
    });
  };

  const totalItems = Object.values(cart).reduce((sum, qty) => sum + qty, 0);

  return (
    <CartContext.Provider
      value={{ cart, addItem, removeItem, totalItems }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error("useCart must be used within a CartProvider");
  }
  return context;
}

// Guest-cart helpers (read/delete) using cookie storage.
// These are intentionally side-effecting utilities that pages can call
// when the app's add-to-cart flow writes the `guest_cart` cookie.
export function readGuestCartFromCookie(): Array<{ ID: string | number; Quantity: number; Size?: string; AddedOn?: any }>{
  if (typeof document === "undefined") return [];
  try {
    const match = document.cookie.match('(^|;)\\s*' + "guest_cart" + "=([^;]+)");
    if (!match) return [];
    const raw = decodeURIComponent(match[2]);
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    return [];
  }
}

export function removeGuestItemFromCookie(id: string | number) {
  if (typeof document === "undefined") return;
  try {
    const cart = readGuestCartFromCookie();
    const next = cart.filter((it) => String(it.ID) !== String(id));
    const d = new Date();
    d.setTime(d.getTime() + 30 * 24 * 60 * 60 * 1000);
    document.cookie = `guest_cart=${encodeURIComponent(JSON.stringify(next))};path=/;expires=${d.toUTCString()}`;
  } catch (e) {
    // no-op
  }
}

export function clearGuestCartCookie() {
  if (typeof document === "undefined") return;
  document.cookie = `guest_cart=;path=/;expires=Thu, 01 Jan 1970 00:00:00 GMT`;
}
