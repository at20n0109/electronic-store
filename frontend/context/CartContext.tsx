'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import type { Cart } from '@/lib/types';
import {
  addToCart,
  addToCartBulk,
  clearCart,
  getAccessToken,
  getCart,
  removeCartItem,
  updateCartItem,
} from '@/lib/api';

export interface CartContextValue {
  cart: Cart | null;
  loading: boolean;
  open: boolean;
  error: string | null;
  openCart: () => void;
  closeCart: () => void;
  refresh: () => Promise<void>;
  addItem: (productId: string, quantity?: number) => Promise<void>;
  addItems: (productIds: string[]) => Promise<void>;
  updateItem: (itemId: string, quantity: number) => Promise<void>;
  removeItem: (itemId: string) => Promise<void>;
  clear: () => Promise<void>;
}

export const CartContext = createContext<CartContextValue | undefined>(undefined);

export function useCart(): CartContextValue {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used within CartProvider');
  return ctx;
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [cart, setCart] = useState<Cart | null>(null);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      if (!getAccessToken()) {
        setCart(null);
        setError(null);
        return;
      }
      setCart(await getCart());
      setError(null);
    } catch {
      setCart(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const addItem = useCallback(async (productId: string, quantity = 1) => {
    setError(null);
    try {
      const next = await addToCart(productId, quantity);
      setCart(next);
    } catch (err) {
      const raw = err instanceof Error ? err.message : '';
      setError(
        raw.includes('401') && raw.includes('/api/v1/cart')
          ? 'Bạn cần đăng nhập để thêm sản phẩm vào giỏ hàng.'
          : raw || 'Không thể thêm vào giỏ hàng.',
      );
    } finally {
      setOpen(true);
    }
  }, []);

  const addItems = useCallback(async (productIds: string[]) => {
    setError(null);
    try {
      const next = await addToCartBulk(productIds.map((productId) => ({ productId })));
      setCart(next);
    } catch (err) {
      const raw = err instanceof Error ? err.message : '';
      setError(
        raw.includes('401') && raw.includes('/api/v1/cart')
          ? 'Bạn cần đăng nhập để thêm sản phẩm vào giỏ hàng.'
          : raw || 'Không thể thêm sản phẩm vào giỏ hàng.',
      );
    } finally {
      setOpen(true);
    }
  }, []);

  const updateItem = useCallback(
    async (itemId: string, quantity: number) => {
      setError(null);
      setCart(await updateCartItem(itemId, quantity));
    },
    [],
  );

  const removeItem = useCallback(async (itemId: string) => {
    setError(null);
    setCart(await removeCartItem(itemId));
  }, []);

  const clear = useCallback(async () => {
    setError(null);
    setCart(await clearCart());
  }, []);

  const value: CartContextValue = {
    cart,
    loading,
    open,
    error,
    openCart: () => {
      setError(null);
      setOpen(true);
    },
    closeCart: () => {
      setError(null);
      setOpen(false);
    },
    refresh,
    addItem,
    addItems,
    updateItem,
    removeItem,
    clear,
  };

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}
