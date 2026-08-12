import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { CartItem } from '../types';

interface CartState {
  merchantId: number | null;
  merchantName: string | null;
  items: CartItem[];
}

interface CartContextValue extends CartState {
  subtotal: number;
  hasColdItems: boolean;
  addItem: (merchantId: number, merchantName: string, item: CartItem) => void;
  updateQuantity: (menu_item_id: number, quantity: number) => void;
  removeItem: (menu_item_id: number) => void;
  clearCart: () => void;
}

const STORAGE_KEY = 'stateside_cart';

const CartContext = createContext<CartContextValue | null>(null);

function loadInitialState(): CartState {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return { merchantId: null, merchantName: null, items: [] };
  try {
    return JSON.parse(raw);
  } catch {
    return { merchantId: null, merchantName: null, items: [] };
  }
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<CartState>(loadInitialState);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [state]);

  const addItem = (merchantId: number, merchantName: string, item: CartItem) => {
    setState((prev) => {
      const base = prev.merchantId !== null && prev.merchantId !== merchantId
        ? { merchantId, merchantName, items: [] }
        : { merchantId, merchantName, items: prev.items };

      const existing = base.items.find((i) => i.menu_item_id === item.menu_item_id);
      const items = existing
        ? base.items.map((i) =>
            i.menu_item_id === item.menu_item_id ? { ...i, quantity: i.quantity + item.quantity } : i
          )
        : [...base.items, item];

      return { ...base, items };
    });
  };

  const updateQuantity = (menu_item_id: number, quantity: number) => {
    setState((prev) => ({
      ...prev,
      items:
        quantity <= 0
          ? prev.items.filter((i) => i.menu_item_id !== menu_item_id)
          : prev.items.map((i) => (i.menu_item_id === menu_item_id ? { ...i, quantity } : i)),
    }));
  };

  const removeItem = (menu_item_id: number) => {
    setState((prev) => ({ ...prev, items: prev.items.filter((i) => i.menu_item_id !== menu_item_id) }));
  };

  const clearCart = () => setState({ merchantId: null, merchantName: null, items: [] });

  const subtotal = useMemo(
    () => state.items.reduce((sum, i) => sum + i.price_per_unit * i.quantity, 0),
    [state.items]
  );

  const hasColdItems = useMemo(() => state.items.some((i) => i.is_cold_item), [state.items]);

  return (
    <CartContext.Provider
      value={{ ...state, subtotal, hasColdItems, addItem, updateQuantity, removeItem, clearCart }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used within CartProvider');
  return ctx;
}
