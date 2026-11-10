"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useMemo, useRef, useState } from "react";
import { ChevronDown, PawPrint, SlidersHorizontal, X } from "lucide-react";
import { AnimalCard, AnimalCardSkeleton } from "@/components/site/AnimalCard";
import { CategoryBubble } from "@/components/site/CategoryIcon";
import { HeroArt } from "@/components/site/HeroArt";
import { SearchBar } from "@/components/site/SearchBar";
import { Alert, Button, Card, Checkbox, cn, EmptyState, Pagination, Select } from "@/components/ui";
import { useQuery } from "@/hooks/useQuery";
import { useCategories, useCities } from "@/hooks/useRefData";
import { AGE_FILTERS, ANIMAL_CARD, PAGE_SIZE, SORTS, VISIBLE_STATUSES, ageFilterExpression, cleanSearch, type AgeFilter, type SortValue } from "@/lib/catalog";
import { getSupabase } from "@/lib/supabase";
import type { Animal, ListingType } from "@/lib/types";

const PRICE_MAX = 5000;

interface Filters {
  q: string;
  ville: string;
  categorie: string[];
  type: ListingType | "";
  age: AgeFilter | "";
  sexe: "male" | "femelle" | "";
  prixMin: number | null;
  prixMax: number | null;
  sort: SortValue;
  page: number;
}

function readFilters(sp: URLSearchParams): Filters {
  const num = (k: string) => {
    const v = sp.get(k);
    if (v == null || v === "") return null;
    const n = Number(v);
    return Number.isFinite(n) && n >= 0 ? n : null;
  };
  const type = sp.get("type");
  const age = sp.get("age");
  const sexe = sp.get("sexe");
  const sort = sp.get("sort");
  return {
    q: sp.get("q") ?? "",
    ville: sp.get("ville") ?? "",
    categorie: (sp.get("categorie") ?? "").split(",").filter(Boolean),
    type: type === "adoption" || type === "vente" ? type : "",
    age: AGE_FILTERS.some((a) => a.value === age) ? (age as AgeFilter) : "",
    sexe: sexe === "male" || sexe === "femelle" ? sexe : "",
    prixMin: num("prixMin"),
    prixMax: num("prixMax"),
    sort: SORTS.some((s) => s.value === sort) ? (sort as SortValue) : "recent",
    page: Math.max(1, Math.floor(num("page") ?? 1)),
  };
}

export function AnimalsView() {
  const sp = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const spKey = sp.toString();
  const filters = useMemo(() => readFilters(new URLSearchParams(spKey)), [spKey]);
  const { categories, loading: catLoading } = useCategories();
  const [mobileFilters, setMobileFilters] = useState(false);

  /** Met à jour l'URL (les filtres réinitialisent la page à 1). */
  const update = (patch: Partial<Record<keyof Filters, string | null>>, keepPage = false) => {
    const next = new URLSearchParams(spKey);
    Object.entries(patch).forEach(([k, v]) => {
      if (v == null || v === "") next.delete(k);
      else next.set(k, v);
    });
    if (!keepPage) next.delete("page");
    const qs = next.toString();
    router.replace(`${pathname}${qs ? `?${qs}` : ""}`, { scroll: false });
  };

  const needsCategories = filters.categorie.length > 0;
  const results = useQuery(
    async () => {
      const supabase = getSupabase();
      // Les animaux vendus restent affichés (bouton « Vendu »), après les annonces disponibles.
      let qb = supabase.from("animals").select(ANIMAL_CARD, { count: "exact" }).in("status", VISIBLE_STATUSES);
      const term = cleanSearch(filters.q);
      if (term) qb = qb.or(`name.ilike.%${term}%,breed.ilike.%${term}%,short_description.ilike.%${term}%`);
      if (filters.ville) qb = qb.eq("city", filters.ville);
      if (filters.categorie.length) {
        const ids = categories.filter((c) => filters.categorie.includes(c.slug)).map((c) => c.id);
        qb = qb.in("category_id", ids.length ? ids : [-1]);
      }
      if (filters.type) qb = qb.eq("listing_type", filters.type);
      if (filters.age) qb = qb.or(ageFilterExpression(filters.age));
      if (filters.sexe) qb = qb.eq("sex", filters.sexe);
      if (filters.prixMin != null) qb = qb.gte("price", filters.prixMin);
      if (filters.prixMax != null) qb = qb.lte("price", filters.prixMax);
      qb = qb.order("status", { ascending: true }); // publiee avant vendue (ordre de l'enum)
      if (filters.sort === "prix_asc") qb = qb.order("price", { ascending: true });
      else if (filters.sort === "prix_desc") qb = qb.order("price", { ascending: false });
      else if (filters.sort === "populaire") qb = qb.order("views_count", { ascending: false });
      qb = qb.order("published_at", { ascending: false, nullsFirst: false }).order("created_at", { ascending: false });
      const from = (filters.page - 1) * PAGE_SIZE;
      const res = await qb.range(from, from + PAGE_SIZE - 1);
      if (res.error) {
        // Page hors limites → on renvoie une liste vide plutôt qu'une erreur
        if ((res.error as { code?: string }).code === "PGRST103") return { rows: [] as Animal[], count: 0 };
        throw res.error;
      }
      return { rows: (res.data ?? []) as unknown as Animal[], count: res.count ?? 0 };
    },
    [spKey, categories.length],
    !needsCategories || !catLoading,
  );

  const typeCounts = useQuery(async () => {
    const supabase = getSupabase();
    const [a, v] = await Promise.all(
      (["adoption", "vente"] as const).map((t) =>
        supabase.from("animals").select("id", { count: "exact", head: true }).eq("status", "publiee").eq("listing_type", t),
      ),
    );
    return { adoption: a.count ?? 0, vente: v.count ?? 0 };
  }, []);

  const count = results.data?.count ?? 0;
  const pageCount = Math.max(1, Math.ceil(count / PAGE_SIZE));
  const activeCount =
    filters.categorie.length + (filters.ville ? 1 : 0) + (filters.type ? 1 : 0) + (filters.age ? 1 : 0) + (filters.sexe ? 1 : 0) + (filters.prixMin != null || filters.prixMax != null ? 1 : 0);

  const filterPanel = (
    <FilterPanel
      filters={filters}
      categories={categories}
      typeCounts={typeCounts.data}
      update={update}
      reset={() => router.replace(filters.q ? `${pathname}?q=${encodeURIComponent(filters.q)}` : pathname, { scroll: false })}
    />
  );

  return (
    <>
      {/* ------------------------------------------------------------ Hero */}
      <section className="relative overflow-hidden bg-gradient-to-b from-[#e6f4fa] to-page">
        <div className="mx-auto grid max-w-7xl items-center gap-4 px-4 pt-8 sm:px-6 lg:grid-cols-[1.3fr_1fr]">
          <div>
            <h1 className="text-[2.1rem] font-extrabold leading-tight tracking-tight sm:text-5xl lg:text-[3.6rem]">Tous les animaux</h1>
            <p className="mt-3 max-w-xl text-base text-body sm:text-lg">
              Découvrez des animaux en bonne santé, vérifiés et prêts à rejoindre leur nouvelle famille.
            </p>
          </div>
          <HeroArt className="ml-auto hidden w-full max-w-sm lg:block" />
        </div>
        <div className="mx-auto max-w-7xl px-4 pb-6 pt-6 sm:px-6 lg:-mt-10 lg:pt-0">
          <SearchBar
            key={`${filters.q}|${filters.ville}`}
            initialQ={filters.q}
            initialCity={filters.ville}
            onOpenFilters={() => setMobileFilters(true)}
            onSearch={(q, ville) => update({ q, ville })}
            className="lg:max-w-5xl"
          />
          {/* Chips catégories */}
          <div className="scrollbar-none -mx-4 mt-5 flex gap-2.5 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0">
            <CategoryChip active={filters.categorie.length === 0} label="Tous" icon="paw-print" onClick={() => update({ categorie: null })} />
            {categories.map((c) => (
              <CategoryChip
                key={c.id}
                active={filters.categorie.length === 1 && filters.categorie[0] === c.slug}
                label={c.name}
                icon={c.icon}
                onClick={() => update({ categorie: c.slug })}
              />
            ))}
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------ Résultats */}
      <section className="mx-auto grid max-w-7xl gap-6 px-4 pb-14 pt-4 sm:px-6 lg:grid-cols-[260px_1fr]">
        <aside className="hidden lg:block">
          <Card className="sticky top-24 p-5">{filterPanel}</Card>
        </aside>

        <div className="min-w-0">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-base font-extrabold sm:text-lg">
              {results.loading && !results.data ? "Recherche…" : `${count} ${count > 1 ? "animaux trouvés" : "animal trouvé"}`}
            </h2>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setMobileFilters(true)}
                className="hidden items-center gap-2 rounded-full border border-line bg-white px-3 py-2 text-sm font-semibold text-navy sm:flex lg:hidden"
              >
                <SlidersHorizontal className="size-4" /> Filtres{activeCount ? ` (${activeCount})` : ""}
              </button>
              <span className="hidden text-sm text-muted sm:inline">Trier par</span>
              <Select
                aria-label="Trier par"
                value={filters.sort}
                onChange={(e) => update({ sort: e.target.value === "recent" ? null : e.target.value })}
                className="h-10 w-44 text-sm"
              >
                {SORTS.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </Select>
            </div>
          </div>

          {results.error && <Alert>{results.error}</Alert>}

          {results.loading && !results.data ? (
            <div className="grid grid-cols-2 gap-3 sm:gap-5 md:grid-cols-3 xl:grid-cols-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <AnimalCardSkeleton key={i} />
              ))}
            </div>
          ) : results.data && results.data.rows.length > 0 ? (
            <div className={cn("grid grid-cols-2 gap-3 transition sm:gap-5 md:grid-cols-3 xl:grid-cols-4", results.loading && "opacity-60")}>
              {results.data.rows.map((a) => (
                <AnimalCard key={a.id} animal={a} />
              ))}
            </div>
          ) : (
            !results.error && (
              <Card>
                <EmptyState
                  icon={<PawPrint />}
                  title="Aucun animal ne correspond à votre recherche"
                  text="Essayez d'élargir vos critères ou de réinitialiser les filtres."
                  action={
                    <Button variant="outline" onClick={() => router.replace(pathname, { scroll: false })}>
                      Réinitialiser les filtres
                    </Button>
                  }
                />
              </Card>
            )
          )}

          <div className="mt-8 flex justify-center">
            <Pagination
              page={filters.page}
              pageCount={pageCount}
              onChange={(p) => {
                update({ page: p > 1 ? String(p) : null }, true);
                window.scrollTo({ top: 0, behavior: "smooth" });
              }}
            />
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------ Filtres mobile */}
      {mobileFilters && (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="Filtres">
          <div className="absolute inset-0 bg-navy/40 backdrop-blur-sm" onClick={() => setMobileFilters(false)} />
          <div className="absolute inset-x-0 bottom-0 flex max-h-[88vh] flex-col rounded-t-[28px] bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-line px-5 py-4">
              <span className="text-lg font-extrabold text-navy">Filtres</span>
              <button onClick={() => setMobileFilters(false)} className="rounded-full p-1.5 text-muted hover:bg-page" aria-label="Fermer">
                <X className="size-5" />
              </button>
            </div>
            <div className="overflow-y-auto px-5 py-4">{filterPanel}</div>
            <div className="border-t border-line p-4">
              <Button className="w-full" onClick={() => setMobileFilters(false)}>
                Voir {count} résultat{count > 1 ? "s" : ""}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function CategoryChip({ active, label, icon, onClick }: { active: boolean; label: string; icon: string | null; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex shrink-0 items-center gap-2 rounded-full border py-1.5 pl-1.5 pr-4 text-sm font-semibold transition max-sm:flex-col max-sm:rounded-2xl max-sm:px-3 max-sm:py-2 max-sm:text-xs",
        active ? "border-primary bg-gradient-to-b from-primary to-primary-dark text-white shadow-md" : "border-line bg-white text-navy hover:border-primary/50",
      )}
    >
      <CategoryBubble icon={icon} size={30} className={cn(active && "!bg-white/20 !text-white")} />
      {label}
    </button>
  );
}

function Section({ title, children, collapsible = true }: { title: string; children: React.ReactNode; collapsible?: boolean }) {
  const [open, setOpen] = useState(true);
  return (
    <div className="border-t border-line/70 py-4 first:border-t-0 first:pt-0">
      <button
        type="button"
        onClick={() => collapsible && setOpen((o) => !o)}
        className="flex w-full items-center justify-between text-left text-[15px] font-extrabold text-navy"
      >
        {title}
        {collapsible && <ChevronDown className={cn("size-4 text-muted transition", open && "rotate-180")} />}
      </button>
      {open && <div className="mt-3">{children}</div>}
    </div>
  );
}

function FilterPanel({
  filters,
  categories,
  typeCounts,
  update,
  reset,
}: {
  filters: Filters;
  categories: { id: number; slug: string; name: string; total: number }[];
  typeCounts: { adoption: number; vente: number } | null;
  update: (patch: Partial<Record<keyof Filters, string | null>>) => void;
  reset: () => void;
}) {
  const cities = useCities();
  const toggleCat = (slug: string) => {
    const set = new Set(filters.categorie);
    if (set.has(slug)) set.delete(slug);
    else set.add(slug);
    update({ categorie: [...set].join(",") || null });
  };

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <span className="flex items-center gap-2 text-lg font-extrabold text-navy">
          <SlidersHorizontal className="size-[18px] text-primary" /> Filtres
        </span>
        <button onClick={reset} className="text-sm font-semibold text-primary hover:underline">
          Réinitialiser
        </button>
      </div>

      <Section title="Catégorie">
        <div className="space-y-2.5">
          {categories.map((c) => (
            <Checkbox
              key={c.id}
              checked={filters.categorie.includes(c.slug)}
              onChange={() => toggleCat(c.slug)}
              label={
                <>
                  {c.name} <span className="text-muted">({c.total})</span>
                </>
              }
            />
          ))}
        </div>
      </Section>

      <Section title="Ville" collapsible={false}>
        <Select value={filters.ville} onChange={(e) => update({ ville: e.target.value })} className="h-11" aria-label="Ville">
          <option value="">Toutes les villes</option>
          {cities.map((c) => (
            <option key={c.id} value={c.name}>
              {c.name}
            </option>
          ))}
        </Select>
      </Section>

      <Section title="Type">
        <div className="space-y-2.5">
          {(["adoption", "vente"] as const).map((t) => (
            <Checkbox
              key={t}
              checked={filters.type === t}
              onChange={() => update({ type: filters.type === t ? null : t })}
              label={
                <>
                  {t === "adoption" ? "À adopter" : "À vendre"} {typeCounts && <span className="text-muted">({typeCounts[t]})</span>}
                </>
              }
            />
          ))}
        </div>
      </Section>

      <Section title="Âge" collapsible={false}>
        <Select value={filters.age} onChange={(e) => update({ age: e.target.value })} className="h-11" aria-label="Âge">
          <option value="">Tous les âges</option>
          {AGE_FILTERS.map((a) => (
            <option key={a.value} value={a.value}>
              {a.label}
            </option>
          ))}
        </Select>
      </Section>

      <Section title="Sexe" collapsible={false}>
        <Select value={filters.sexe} onChange={(e) => update({ sexe: e.target.value })} className="h-11" aria-label="Sexe">
          <option value="">Tous</option>
          <option value="male">Mâle</option>
          <option value="femelle">Femelle</option>
        </Select>
      </Section>

      <Section title="Prix" collapsible={false}>
        <PriceRange
          key={`${filters.prixMin}-${filters.prixMax}`}
          min={filters.prixMin ?? 0}
          max={filters.prixMax ?? PRICE_MAX}
          onCommit={(lo, hi) => update({ prixMin: lo > 0 ? String(lo) : null, prixMax: hi < PRICE_MAX ? String(hi) : null })}
        />
      </Section>
    </div>
  );
}

/** Double curseur de prix (0 → 5000 TND) */
function PriceRange({ min, max, onCommit }: { min: number; max: number; onCommit: (lo: number, hi: number) => void }) {
  const [lo, setLo] = useState(Math.min(min, PRICE_MAX));
  const [hi, setHi] = useState(Math.min(max, PRICE_MAX));
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const schedule = (a: number, b: number) => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => onCommit(a, b), 500);
  };

  const thumb =
    "pointer-events-none absolute inset-x-0 top-0 h-5 w-full appearance-none bg-transparent [&::-moz-range-thumb]:pointer-events-auto [&::-moz-range-thumb]:size-5 [&::-moz-range-thumb]:cursor-pointer [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-white [&::-moz-range-thumb]:bg-primary [&::-webkit-slider-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:size-5 [&::-webkit-slider-thumb]:cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-white [&::-webkit-slider-thumb]:bg-primary [&::-webkit-slider-thumb]:shadow";

  return (
    <div>
      <div className="relative h-5">
        <div className="absolute inset-x-0 top-1/2 h-1.5 -translate-y-1/2 rounded-full bg-line" />
        <div
          className="absolute top-1/2 h-1.5 -translate-y-1/2 rounded-full bg-primary"
          style={{ left: `${(lo / PRICE_MAX) * 100}%`, right: `${100 - (hi / PRICE_MAX) * 100}%` }}
        />
        <input
          type="range"
          min={0}
          max={PRICE_MAX}
          step={50}
          value={lo}
          aria-label="Prix minimum"
          onChange={(e) => {
            const v = Math.min(Number(e.target.value), hi - 50);
            setLo(v);
            schedule(v, hi);
          }}
          className={thumb}
        />
        <input
          type="range"
          min={0}
          max={PRICE_MAX}
          step={50}
          value={hi}
          aria-label="Prix maximum"
          onChange={(e) => {
            const v = Math.max(Number(e.target.value), lo + 50);
            setHi(v);
            schedule(lo, v);
          }}
          className={thumb}
        />
      </div>
      <p className="mt-3 text-sm font-semibold text-body">
        {lo} TND – {hi}
        {hi >= PRICE_MAX ? "+" : ""} TND
      </p>
    </div>
  );
}
