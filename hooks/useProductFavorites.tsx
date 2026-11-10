"use client";

import { useRouter } from "next/navigation";
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useToast } from "@/components/ui";
import { errorMessage, getSupabase } from "@/lib/supabase";
import { useAuth } from "./useAuth";

interface ProductFavoritesState {
  ids: Set<string>;
  ready: boolean;
  toggle: (productId: string) => Promise<void>;
}

const Ctx = createContext<ProductFavoritesState | null>(null);

/** Produits favoris de l'utilisateur connecté (table `product_favorites`), partagés par toutes les cartes. */
export function ProductFavoritesProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [ids, setIds] = useState<Set<string>>(new Set());
  const [loadedFor, setLoadedFor] = useState<string | null>(null);
  const userId = user?.id;

  useEffect(() => {
    let active = true;
    (async () => {
      if (!userId) {
        if (active) setIds(new Set());
        return;
      }
      const { data } = await getSupabase().from("product_favorites").select("product_id").eq("user_id", userId);
      if (active) {
        setIds(new Set((data ?? []).map((r: { product_id: string }) => r.product_id)));
        setLoadedFor(userId);
      }
    })();
    return () => {
      active = false;
    };
  }, [userId]);

  const toggle = useCallback(
    async (productId: string) => {
      if (!userId) return;
      const supabase = getSupabase();
      const had = ids.has(productId);
      const flip = (add: boolean) =>
        setIds((prev) => {
          const next = new Set(prev);
          if (add) next.add(productId);
          else next.delete(productId);
          return next;
        });
      flip(!had);
      const { error } = had
        ? await supabase.from("product_favorites").delete().eq("user_id", userId).eq("product_id", productId)
        : await supabase.from("product_favorites").insert({ user_id: userId, product_id: productId });
      if (error) {
        flip(had);
        throw error;
      }
    },
    [ids, userId],
  );

  const value = useMemo<ProductFavoritesState>(() => ({ ids, ready: !!userId && loadedFor === userId, toggle }), [ids, toggle, userId, loadedFor]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

/** Bouton favori produit : redirige vers /connexion si l'utilisateur n'est pas connecté. */
export function useProductFavorite() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useProductFavorite doit être utilisé dans <ProductFavoritesProvider>");
  const { user } = useAuth();
  const router = useRouter();
  const toast = useToast();

  const toggle = useCallback(
    async (productId: string) => {
      if (!user) {
        router.push(`/connexion?next=${encodeURIComponent(window.location.pathname + window.location.search)}`);
        return;
      }
      const wasFav = ctx.ids.has(productId);
      try {
        await ctx.toggle(productId);
        toast(wasFav ? "Retiré de vos favoris" : "Ajouté à vos favoris", "info");
      } catch (e) {
        toast(errorMessage(e), "error");
      }
    },
    [ctx, user, router, toast],
  );

  const isFavorite = useCallback((id: string) => ctx.ids.has(id), [ctx.ids]);
  return { isFavorite, toggle, count: ctx.ids.size, ready: ctx.ready };
}
