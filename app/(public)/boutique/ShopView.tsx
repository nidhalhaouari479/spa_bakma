"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { Package, Search, Truck } from "lucide-react";
import { CategoryBubble } from "@/components/site/CategoryIcon";
import { PRODUCT_CARD, ProductCard, ProductCardSkeleton } from "@/components/shop/ShopBits";
import { Alert, Button, Card, cn, EmptyState, Pagination, Select } from "@/components/ui";
import { useShopSettings } from "@/hooks/useCart";
import { unwrap, useQuery } from "@/hooks/useQuery";
import { cleanSearch } from "@/lib/catalog";
import { formatTND } from "@/lib/labels";
import { getSupabase } from "@/lib/supabase";
import type { Product, ShopBrand, ShopCategory } from "@/lib/types";

const PAGE_SIZE = 20;
const SORTS = [
  { value: "recent", label: "Nouveautés" },
  { value: "populaire", label: "Meilleures ventes" },
  { value: "prix_asc", label: "Prix croissant" },
  { value: "prix_desc", label: "Prix décroissant" },
];

export function ShopView() {
  const sp = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const shop = useShopSettings();
  const categorie = sp.get("categorie") ?? "";
  const marque = sp.get("marque") ?? "";
  const q = sp.get("q") ?? "";
  const sort = sp.get("tri") ?? "recent";
  const page = Math.max(1, Number(sp.get("page")) || 1);
  const [term, setTerm] = useState(q);
  const spKey = sp.toString();

  const update = (patch: Record<string, string | null>, keepPage = false) => {
    const next = new URLSearchParams(sp.toString());
    Object.entries(patch).forEach(([k, v]) => (v ? next.set(k, v) : next.delete(k)));
    if (!keepPage) next.delete("page");
    const qs = next.toString();
    router.replace(`${pathname}${qs ? `?${qs}` : ""}`, { scroll: false });
  };

  const categories = useQuery(
    async () => unwrap<ShopCategory[]>(await getSupabase().from("shop_categories").select("*").eq("is_active", true).order("sort_order")),
    [],
  );
  const catId = categories.data?.find((c) => c.slug === categorie)?.id;

  // Marques actives qui ont au moins un produit visible
  const brands = useQuery(async () => {
    const supabase = getSupabase();
    const [b, used] = await Promise.all([
      supabase.from("shop_brands").select("*").eq("is_active", true).order("sort_order").order("name"),
      supabase.from("products").select("brand_id").eq("is_active", true).not("brand_id", "is", null).limit(5000),
    ]);
    const ids = new Set(unwrap<{ brand_id: number }[]>(used).map((r) => r.brand_id));
    return unwrap<ShopBrand[]>(b).filter((x) => ids.has(x.id));
  }, []);
  const brand = brands.data?.find((b) => b.slug === marque);

  const results = useQuery(
    async () => {
      let qb = getSupabase().from("products").select(PRODUCT_CARD, { count: "exact" }).eq("is_active", true);
      if (categorie) qb = qb.eq("category_id", catId ?? -1);
      if (marque) qb = qb.eq("brand_id", brand?.id ?? -1);
      const t = cleanSearch(q);
      if (t) qb = qb.or(`name.ilike.%${t}%,brand.ilike.%${t}%,short_description.ilike.%${t}%`);
      if (sort === "prix_asc") qb = qb.order("price", { ascending: true });
      else if (sort === "prix_desc") qb = qb.order("price", { ascending: false });
      else if (sort === "populaire") qb = qb.order("sold_count", { ascending: false });
      qb = qb.order("is_featured", { ascending: false }).order("created_at", { ascending: false });
      const from = (page - 1) * PAGE_SIZE;
      const res = await qb.range(from, from + PAGE_SIZE - 1);
      if (res.error) {
        if ((res.error as { code?: string }).code === "PGRST103") return { rows: [] as Product[], count: 0 };
        throw res.error;
      }
      return { rows: (res.data ?? []) as unknown as Product[], count: res.count ?? 0 };
    },
    [spKey, catId, brand?.id],
    (!categorie || !categories.loading) && (!marque || !brands.loading),
  );

  const count = results.data?.count ?? 0;
  const pageCount = Math.max(1, Math.ceil(count / PAGE_SIZE));

  return (
    <>
      {/* ------------------------------------------------------------ En-tête */}
      <section className="bg-gradient-to-b from-[#e6f4fa] to-page">
        <div className="mx-auto max-w-7xl px-4 pb-6 pt-8 sm:px-6">
          <h1 className="text-[2.1rem] font-extrabold leading-tight tracking-tight sm:text-5xl">Boutique</h1>
          <p className="mt-2 max-w-xl text-base text-body sm:text-lg">Alimentation, accessoires et soins pour vos compagnons, livrés partout en Tunisie.</p>
          <p className="mt-3 inline-flex items-center gap-2 rounded-full bg-white px-3 py-1.5 text-sm font-semibold text-navy shadow-sm">
            <Truck className="size-4 text-primary" />
            Paiement à la livraison
            {!shop.loading && (shop.freeFrom ? <span className="text-muted">· livraison offerte dès {formatTND(shop.freeFrom)}</span> : shop.fee > 0 ? <span className="text-muted">· livraison {formatTND(shop.fee)}</span> : <span className="text-muted">· livraison gratuite</span>)}
          </p>

          <form
            role="search"
            className="relative mt-5 max-w-2xl"
            onSubmit={(e) => {
              e.preventDefault();
              update({ q: term.trim() || null });
            }}
          >
            <Search className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-primary" />
            <input
              value={term}
              onChange={(e) => setTerm(e.target.value)}
              placeholder="Rechercher un produit, une marque…"
              aria-label="Rechercher un produit"
              className="h-12 w-full rounded-full border border-line bg-white pl-12 pr-28 text-sm text-navy shadow-sm outline-none placeholder:text-muted focus:border-primary focus:ring-4 focus:ring-primary/10"
            />
            <Button type="submit" size="sm" className="absolute right-1.5 top-1/2 -translate-y-1/2">
              Rechercher
            </Button>
          </form>

          <div className="scrollbar-none -mx-4 mt-5 flex gap-2.5 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0">
            <Chip active={!categorie} label="Tout" icon="box" onClick={() => update({ categorie: null })} />
            {(categories.data ?? []).map((c) => (
              <Chip key={c.id} active={categorie === c.slug} label={c.name} icon={c.icon} onClick={() => update({ categorie: c.slug })} />
            ))}
          </div>

          {(brands.data?.length ?? 0) > 0 && (
            <div className="mt-4">
              <p className="mb-2 text-xs font-bold uppercase tracking-wide text-muted">Marques</p>
              <div className="scrollbar-none -mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:px-0">
                {brands.data!.map((b) => {
                  const on = marque === b.slug;
                  return (
                    <button
                      key={b.id}
                      type="button"
                      aria-pressed={on}
                      onClick={() => update({ marque: on ? null : b.slug })}
                      className={cn(
                        "flex h-10 shrink-0 items-center gap-2 rounded-full border bg-white pl-1.5 pr-3.5 text-sm font-semibold transition",
                        on ? "border-primary text-primary ring-2 ring-primary/20" : "border-line text-navy hover:border-primary/50",
                      )}
                    >
                      {b.logo_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={b.logo_url} alt="" className="size-7 rounded-full bg-white object-contain" />
                      ) : (
                        <span className="grid size-7 place-items-center rounded-full bg-primary-soft text-xs font-bold text-primary">{b.name.charAt(0).toUpperCase()}</span>
                      )}
                      {b.name}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </section>

      {/* ------------------------------------------------------------ Produits */}
      <section className="mx-auto max-w-7xl px-4 pb-14 pt-4 sm:px-6">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-base font-extrabold sm:text-lg">
            {results.loading && !results.data ? "Chargement…" : `${count} ${count > 1 ? "produits" : "produit"}`}
          </h2>
          <div className="flex flex-wrap items-center gap-2">
            <span className="hidden text-sm text-muted sm:inline">Trier par</span>
            <Select aria-label="Trier par" value={sort} onChange={(e) => update({ tri: e.target.value === "recent" ? null : e.target.value })} className="h-10 w-48 text-sm">
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
          <div className="grid grid-cols-2 gap-3 sm:gap-5 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {Array.from({ length: 10 }).map((_, i) => (
              <ProductCardSkeleton key={i} />
            ))}
          </div>
        ) : results.data && results.data.rows.length > 0 ? (
          <div className={cn("grid grid-cols-2 gap-3 transition sm:gap-5 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5", results.loading && "opacity-60")}>
            {results.data.rows.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        ) : (
          !results.error && (
            <Card>
              <EmptyState
                icon={<Package />}
                title={q || categorie || marque ? "Aucun produit ne correspond à votre recherche" : "La boutique ouvre bientôt"}
                text={q || categorie || marque ? "Essayez un autre mot-clé ou une autre catégorie." : "Nos premiers produits arrivent très vite."}
                action={
                  (q || categorie || marque) && (
                    <Button
                      variant="outline"
                      onClick={() => {
                        setTerm("");
                        router.replace(pathname, { scroll: false });
                      }}
                    >
                      Voir tous les produits
                    </Button>
                  )
                }
              />
            </Card>
          )
        )}

        <div className="mt-8 flex justify-center">
          <Pagination page={page} pageCount={pageCount} onChange={(p) => update({ page: String(p) }, true)} />
        </div>
      </section>
    </>
  );
}

function Chip({ active, label, icon, onClick }: { active: boolean; label: string; icon: string | null; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
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
