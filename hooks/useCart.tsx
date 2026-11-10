"use client";

import { createContext, useCallback, useContext, useMemo, useSyncExternalStore } from "react";
import type { Product, ProductVariant, ShopSettings } from "@/lib/types";
import { unwrap, useQuery } from "./useQuery";
import { getSupabase } from "@/lib/supabase";

/*
 * Panier de la boutique, conservé dans le navigateur (localStorage, clé « bakma:cart »).
 * Les prix et le stock affichés viennent d'un instantané : ils sont relus en base sur la page
 * panier, et recalculés côté serveur par place_order() au moment de commander.
 */

export interface CartLine {
  /** Identifiant de ligne : produit + déclinaison (voir lineKey). */
  key: string;
  id: string; // product id
  variantId: string | null;
  variantLabel: string | null;
  qty: number;
  name: string;
  price: number;
  image: string | null;
  stock: number;
}

const KEY = "bakma:cart";
const EVENT = "bakma:cart-change";
const EMPTY = "[]";

function read(): string {
  try {
    return window.localStorage.getItem(KEY) ?? EMPTY;
  } catch {
    return EMPTY;
  }
}

function write(lines: CartLine[]) {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(lines));
  } catch {
    /* stockage indisponible (navigation privée) : panier non conservé */
  }
  window.dispatchEvent(new Event(EVENT));
}

function subscribe(cb: () => void) {
  const onStorage = (e: StorageEvent) => e.key === KEY && cb();
  window.addEventListener(EVENT, cb);
  window.addEventListener("storage", onStorage); // synchro entre onglets
  return () => {
    window.removeEventListener(EVENT, cb);
    window.removeEventListener("storage", onStorage);
  };
}

export function lineKey(productId: string, variantId?: string | null) {
  return variantId ? `${productId}:${variantId}` : productId;
}

function parse(raw: string): CartLine[] {
  try {
    const v = JSON.parse(raw) as Partial<CartLine>[];
    if (!Array.isArray(v)) return [];
    // paniers enregistrés avant les déclinaisons : pas de key / variantId
    return v
      .filter((l): l is CartLine => !!l && typeof l.id === "string" && (l.qty ?? 0) > 0)
      .map((l) => ({ ...l, variantId: l.variantId ?? null, variantLabel: l.variantLabel ?? null, key: lineKey(l.id, l.variantId) }));
  } catch {
    return [];
  }
}

export type CartProduct = Pick<Product, "id" | "name" | "price" | "images" | "stock">;
export type CartVariant = Pick<ProductVariant, "id" | "label" | "price" | "stock" | "image">;
export type FreshProduct = Pick<Product, "id" | "name" | "price" | "images" | "stock" | "is_active" | "options"> & {
  variants?: Pick<ProductVariant, "id" | "label" | "price" | "stock" | "image" | "is_active">[];
};

type CartApi = {
  lines: CartLine[];
  count: number;
  subtotal: number;
  /** Quantité déjà au panier pour ce produit / cette déclinaison. */
  qtyOf: (productId: string, variantId?: string | null) => number;
  add: (p: CartProduct, qty?: number, variant?: CartVariant | null) => void;
  setQty: (key: string, qty: number) => void;
  remove: (key: string) => void;
  clear: () => void;
  /** Remplace les instantanés par les données fraîches (prix, stock) ; retire les articles indisponibles. */
  sync: (fresh: FreshProduct[]) => void;
};

const Ctx = createContext<CartApi | null>(null);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const raw = useSyncExternalStore(subscribe, read, () => EMPTY);
  const lines = useMemo(() => parse(raw), [raw]);

  const update = useCallback((fn: (l: CartLine[]) => CartLine[]) => write(fn(parse(read()))), []);

  const api = useMemo<CartApi>(
    () => ({
      lines,
      count: lines.reduce((n, l) => n + l.qty, 0),
      subtotal: lines.reduce((n, l) => n + l.qty * l.price, 0),
      qtyOf: (productId, variantId) => lines.find((l) => l.key === lineKey(productId, variantId))?.qty ?? 0,
      add: (p, qty = 1, variant = null) =>
        update((ls) => {
          const key = lineKey(p.id, variant?.id);
          const stock = variant ? variant.stock : p.stock;
          const price = Number(variant?.price ?? p.price);
          const max = Math.max(0, stock);
          const existing = ls.find((l) => l.key === key);
          if (existing) return ls.map((l) => (l.key === key ? { ...l, qty: Math.min(max, l.qty + qty), price, stock } : l));
          return [
            ...ls,
            {
              key,
              id: p.id,
              variantId: variant?.id ?? null,
              variantLabel: variant?.label ?? null,
              qty: Math.min(max, qty),
              name: p.name,
              price,
              image: variant?.image ?? p.images[0] ?? null,
              stock,
            },
          ];
        }),
      setQty: (key, qty) => update((ls) => ls.map((l) => (l.key === key ? { ...l, qty: Math.max(1, Math.min(l.stock || 99, Math.floor(qty))) } : l))),
      remove: (key) => update((ls) => ls.filter((l) => l.key !== key)),
      clear: () => write([]),
      sync: (fresh) =>
        update((ls) =>
          ls.flatMap((l) => {
            const p = fresh.find((f) => f.id === l.id);
            if (!p || !p.is_active) return [];
            const hasVariants = (p.options?.length ?? 0) > 0;
            if (hasVariants || l.variantId) {
              const v = p.variants?.find((x) => x.id === l.variantId);
              if (!hasVariants || !v || !v.is_active || v.stock <= 0) return [];
              return [
                {
                  ...l,
                  name: p.name,
                  variantLabel: v.label,
                  price: Number(v.price ?? p.price),
                  image: v.image ?? p.images[0] ?? null,
                  stock: v.stock,
                  qty: Math.min(l.qty, v.stock),
                },
              ];
            }
            if (p.stock <= 0) return [];
            return [{ ...l, name: p.name, price: Number(p.price), image: p.images[0] ?? null, stock: p.stock, qty: Math.min(l.qty, p.stock) }];
          }),
        ),
    }),
    [lines, update],
  );

  return <Ctx.Provider value={api}>{children}</Ctx.Provider>;
}

export function useCart(): CartApi {
  const c = useContext(Ctx);
  if (!c) throw new Error("useCart doit être utilisé dans <CartProvider>");
  return c;
}

/** Réglages de livraison (settings.shop) + calcul des frais pour un sous-total. */
export function useShopSettings() {
  const q = useQuery(async () => {
    const row = unwrap<{ value: ShopSettings } | null>(await getSupabase().from("settings").select("value").eq("key", "shop").maybeSingle());
    return row?.value ?? {};
  }, []);
  const s = q.data ?? {};
  const fee = Math.max(0, Number(s.delivery_fee ?? 0));
  const freeFrom = s.free_delivery_from ? Number(s.free_delivery_from) : null;
  return {
    loading: q.loading,
    fee,
    freeFrom,
    /** Frais pour un sous-total donné (même règle que place_order côté serveur). */
    deliveryFor: (subtotal: number) => (freeFrom != null && subtotal >= freeFrom ? 0 : fee),
  };
}
