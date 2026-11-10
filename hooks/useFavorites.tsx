"use client";

import { useRouter } from "next/navigation";
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useToast } from "@/components/ui";
import { errorMessage, getSupabase } from "@/lib/supabase";
import { useAuth } from "./useAuth";

interface FavoritesState {
  ids: Set<string>;
  ready: boolean;
  isFavorite: (animalId: string) => boolean;
  toggle: (animalId: string) => Promise<void>;
}

const FavoritesContext = createContext<FavoritesState | null>(null);

/** Favoris de l'utilisateur connecté (table `favorites`), partagés par toutes les cartes. */
export function FavoritesProvider({ children }: { children: React.ReactNode }) {
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
      const { data } = await getSupabase().from("favorites").select("animal_id").eq("user_id", userId);
      if (active) {
        setIds(new Set((data ?? []).map((r: { animal_id: string }) => r.animal_id)));
        setLoadedFor(userId);
      }
    })();
    return () => {
      active = false;
    };
  }, [userId]);

  const toggle = useCallback(
    async (animalId: string) => {
      if (!userId) return;
      const supabase = getSupabase();
      const had = ids.has(animalId);
      setIds((prev) => {
        const next = new Set(prev);
        if (had) next.delete(animalId);
        else next.add(animalId);
        return next;
      });
      const { error } = had
        ? await supabase.from("favorites").delete().eq("user_id", userId).eq("animal_id", animalId)
        : await supabase.from("favorites").insert({ user_id: userId, animal_id: animalId });
      if (error) {
        setIds((prev) => {
          const next = new Set(prev);
          if (had) next.add(animalId);
          else next.delete(animalId);
          return next;
        });
        throw error;
      }
    },
    [ids, userId],
  );

  const value = useMemo<FavoritesState>(
    () => ({
      ids,
      ready: !!userId && loadedFor === userId,
      isFavorite: (id) => ids.has(id),
      toggle,
    }),
    [ids, toggle, userId, loadedFor],
  );
  return <FavoritesContext.Provider value={value}>{children}</FavoritesContext.Provider>;
}

/** Bouton favori : redirige vers /connexion si l'utilisateur n'est pas connecté. */
export function useFavoriteToggle() {
  const ctx = useContext(FavoritesContext);
  if (!ctx) throw new Error("useFavoriteToggle doit être utilisé dans <FavoritesProvider>");
  const { user } = useAuth();
  const router = useRouter();
  const toast = useToast();

  const toggle = useCallback(
    async (animalId: string) => {
      if (!user) {
        router.push(`/connexion?next=${encodeURIComponent(window.location.pathname + window.location.search)}`);
        return;
      }
      const wasFav = ctx.isFavorite(animalId);
      try {
        await ctx.toggle(animalId);
        toast(wasFav ? "Retiré de vos favoris" : "Ajouté à vos favoris", "info");
      } catch (e) {
        toast(errorMessage(e), "error");
      }
    },
    [ctx, user, router, toast],
  );

  return { isFavorite: ctx.isFavorite, toggle, count: ctx.ids.size, ready: ctx.ready };
}

/**
 * Nombre de favoris d'un animal à afficher : compteur serveur (animals.favorites_count),
 * corrigé en direct quand l'utilisateur ajoute / retire ce favori depuis la page.
 */
export function useFavoriteCount(animalId: string, serverCount: number | null | undefined) {
  const ctx = useContext(FavoritesContext);
  const fav = !!ctx?.isFavorite(animalId);
  const ready = !!ctx?.ready;
  const server = serverCount ?? 0;
  // état « favori » au moment où le compteur serveur a été lu (capturé une fois les favoris chargés)
  const [base, setBase] = useState<{ server: number; fav: boolean | null }>({ server, fav: ready ? fav : null });
  if (base.server !== server) setBase({ server, fav: ready ? fav : null });
  else if (base.fav === null && ready) setBase({ server, fav });
  if (base.fav === null || base.server !== server) return server;
  return Math.max(0, server + (fav ? 1 : 0) - (base.fav ? 1 : 0));
}
