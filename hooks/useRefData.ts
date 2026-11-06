"use client";

import { getSupabase } from "@/lib/supabase";
import type { Category, CategoryCount, CharacteristicGroup, City } from "@/lib/types";
import { unwrap, useQuery } from "./useQuery";

let citiesCache: City[] | null = null;
let categoriesCache: CategoryCount[] | null = null;
let characteristicsCache: CharacteristicGroup[] | null = null;

/** Villes (table `cities`), mises en cache pour la session. */
export function useCities(): City[] {
  const { data } = useQuery(async () => {
    if (citiesCache) return citiesCache;
    const rows = unwrap<City[]>(await getSupabase().from("cities").select("*").order("name"));
    citiesCache = rows;
    return rows;
  }, []);
  return data ?? citiesCache ?? [];
}

/** Catégories avec le nombre d'annonces publiées (vue `category_counts`). */
export function useCategories(): { categories: CategoryCount[]; loading: boolean } {
  const { data, loading } = useQuery(async () => {
    if (categoriesCache) return categoriesCache;
    const rows = unwrap<CategoryCount[]>(await getSupabase().from("category_counts").select("*").order("sort_order"));
    categoriesCache = rows.map((r) => ({ ...r, total: Number(r.total) || 0 }));
    return categoriesCache;
  }, []);
  return { categories: data ?? categoriesCache ?? [], loading: loading && !categoriesCache };
}

/** Rubriques de caractéristiques (Santé, Caractère, Besoins…) avec leurs options, triées. */
export function useCharacteristics(): { groups: CharacteristicGroup[]; loading: boolean } {
  const { data, loading } = useQuery(async () => {
    if (characteristicsCache) return characteristicsCache;
    const rows = unwrap<CharacteristicGroup[]>(
      await getSupabase()
        .from("characteristic_groups")
        .select("*, options:characteristic_options!characteristic_options_group_id_fkey(*)")
        .order("sort_order"),
    );
    characteristicsCache = rows.map((g) => ({ ...g, options: [...(g.options ?? [])].sort((a, b) => a.sort_order - b.sort_order || a.id - b.id) }));
    return characteristicsCache;
  }, []);
  return { groups: data ?? characteristicsCache ?? [], loading: loading && !characteristicsCache };
}

export type { Category };
