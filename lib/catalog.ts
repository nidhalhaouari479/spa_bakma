import type { AgeUnit } from "./types";

/** Sélections PostgREST (FK toujours nommées). */
/** Statuts visibles dans les listes publiques : disponibles + vendus (affichés « Vendu »). */
export const VISIBLE_STATUSES = ["publiee", "vendue"] as const;

export const ANIMAL_CARD = "*, category:categories!animals_category_id_fkey(*)";
export const ANIMAL_FULL =
  "*, category:categories!animals_category_id_fkey(*), owner:profiles!animals_owner_id_fkey(*), photos:animal_photos!animal_photos_animal_id_fkey(*)";

export const PAGE_SIZE = 12;

export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
export const ADMIN_URL = process.env.NEXT_PUBLIC_ADMIN_URL || "http://localhost:3001";
export const VET_URL = process.env.NEXT_PUBLIC_VET_URL || "http://localhost:3002";

// ------------------------------------------------------------------ Âge
export type AgeFilter = "lt3m" | "3to12m" | "1to3y" | "gt3y";

export const AGE_FILTERS: { value: AgeFilter; label: string }[] = [
  { value: "lt3m", label: "Moins de 3 mois" },
  { value: "3to12m", label: "3 à 12 mois" },
  { value: "1to3y", label: "1 à 3 ans" },
  { value: "gt3y", label: "Plus de 3 ans" },
];

/** Nombre d'unités par mois */
const UNITS_PER_MONTH: Record<AgeUnit, number> = { jours: 30.44, semaines: 4.345, mois: 1, ans: 1 / 12 };

type Bound = { months: number; inclusive: boolean } | null;
const AGE_BOUNDS: Record<AgeFilter, [Bound, Bound]> = {
  lt3m: [null, { months: 3, inclusive: true }],
  "3to12m": [{ months: 3, inclusive: false }, { months: 12, inclusive: false }],
  "1to3y": [{ months: 12, inclusive: true }, { months: 36, inclusive: true }],
  gt3y: [{ months: 36, inclusive: false }, null],
};

/**
 * Construit le filtre PostgREST `or(...)` correspondant à une tranche d'âge,
 * en convertissant les bornes (en mois) dans chaque unité (age_unit).
 */
export function ageFilterExpression(filter: AgeFilter): string {
  const [lo, hi] = AGE_BOUNDS[filter];
  const parts: string[] = [];
  (Object.keys(UNITS_PER_MONTH) as AgeUnit[]).forEach((unit) => {
    const u = UNITS_PER_MONTH[unit];
    let min = 0;
    let max = Number.POSITIVE_INFINITY;
    if (lo) min = lo.inclusive ? Math.ceil(lo.months * u - 1e-9) : Math.floor(lo.months * u + 1e-9) + 1;
    if (hi) max = hi.inclusive ? Math.floor(hi.months * u + 1e-9) : Math.ceil(hi.months * u - 1e-9) - 1;
    if (max < min) return;
    const conds = [`age_unit.eq.${unit}`, `age_value.gte.${min}`];
    if (Number.isFinite(max)) conds.push(`age_value.lte.${max}`);
    parts.push(`and(${conds.join(",")})`);
  });
  return parts.join(",");
}

/** Âge converti en mois (approx.). */
export function ageInMonths(value: number | null, unit: AgeUnit | null): number | null {
  if (value == null) return null;
  return value / UNITS_PER_MONTH[unit ?? "mois"];
}

export const SORTS = [
  { value: "recent", label: "Plus récents" },
  { value: "prix_asc", label: "Prix croissant" },
  { value: "prix_desc", label: "Prix décroissant" },
  { value: "populaire", label: "Plus populaires" },
] as const;
export type SortValue = (typeof SORTS)[number]["value"];

/** Nettoie un terme de recherche pour un filtre PostgREST `or()` / `ilike`. */
export function cleanSearch(q: string): string {
  return q.replace(/[,()*%\\:]/g, " ").replace(/\s+/g, " ").trim();
}

export const REPORT_REASONS = [
  "Annonce frauduleuse ou arnaque",
  "Informations trompeuses",
  "Maltraitance animale suspectée",
  "Contenu inapproprié",
  "Animal déjà adopté / vendu",
  "Autre",
];

export const SIZE_OPTIONS = ["Très petite", "Petite", "Moyenne", "Grande", "Très grande"];
