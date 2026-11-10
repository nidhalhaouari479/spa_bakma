"use client";

import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import { ArrowLeft, Banknote, Package, ShieldCheck, ShoppingCart, Truck, Zap } from "lucide-react";
import { PRODUCT_CARD, Price, ProductCard, ProductFavButton, ProductImage, QtyStepper, Stars, StockLabel } from "@/components/shop/ShopBits";
import { ProductReviews } from "@/components/shop/ProductReviews";
import { Button, Card, cn, EmptyState, PageLoader, useToast } from "@/components/ui";
import { useCart, useShopSettings } from "@/hooks/useCart";
import { unwrap, useQuery } from "@/hooks/useQuery";
import { formatTND } from "@/lib/labels";
import { getSupabase } from "@/lib/supabase";
import type { Product, ProductVariant } from "@/lib/types";

type TabKey = "description" | "details" | "avis";
const PRODUCT_FULL = `${PRODUCT_CARD}, variants:product_variants!product_variants_product_id_fkey(*)`;

const matches = (v: ProductVariant, sel: Record<string, string>) => Object.entries(sel).every(([k, val]) => v.options?.[k] === val);

export function ProductView() {
  const { id } = useParams<{ id: string }>();
  const sp = useSearchParams();
  const router = useRouter();
  const cart = useCart();
  const toast = useToast();
  const shop = useShopSettings();
  const [photo, setPhoto] = useState(0);
  const [qty, setQty] = useState(1);
  const [picked, setPicked] = useState<Record<string, string> | null>(null);
  const [tabState, setTab] = useState<TabKey | null>(null);

  const data = useQuery(async () => {
    const supabase = getSupabase();
    const product = unwrap<Product | null>(
      await supabase.from("products").select(PRODUCT_FULL).eq("id", id).eq("is_active", true).order("sort_order", { referencedTable: "variants" }).maybeSingle(),
    );
    if (!product) return { product: null, similar: [] as Product[] };
    let sq = supabase.from("products").select(PRODUCT_CARD).eq("is_active", true).neq("id", product.id).gt("stock", 0);
    if (product.category_id) sq = sq.eq("category_id", product.category_id);
    const similar = unwrap<Product[]>(await sq.order("sold_count", { ascending: false }).limit(5));
    return { product, similar };
  }, [id]);

  const p = data.data?.product ?? null;
  const options = useMemo(() => p?.options ?? [], [p]);
  const variants = useMemo(() => (p?.variants ?? []).filter((v) => v.is_active), [p]);
  const hasVariants = options.length > 0;

  // Sélection par défaut : la 1re déclinaison en stock
  const defaultSel = useMemo(() => {
    const v = variants.find((x) => x.stock > 0) ?? variants[0];
    return v ? { ...v.options } : {};
  }, [variants]);
  const sel = picked ?? defaultSel;
  const variant = hasVariants ? (variants.find((v) => options.every((o) => v.options?.[o.name] === sel[o.name])) ?? null) : null;

  // Galerie : photos du produit + photos propres aux déclinaisons
  const gallery = useMemo<(string | null)[]>(() => {
    const list: string[] = [...(p?.images ?? [])];
    for (const v of variants) if (v.image && !list.includes(v.image)) list.push(v.image);
    return list.length ? list : [null];
  }, [p, variants]);

  const hasDetails = !!p && (p.specs?.length > 0 || !!p.details?.trim() || p.detail_images?.length > 0);
  const tabs: { key: TabKey; label: string }[] = [
    ...(p?.description ? [{ key: "description" as const, label: "Description" }] : []),
    ...(hasDetails ? [{ key: "details" as const, label: "Détails du produit" }] : []),
    { key: "avis", label: p?.rating_count ? `Avis (${p.rating_count})` : "Avis" },
  ];
  const urlTab = sp.get("onglet") as TabKey | null;
  const tab = [tabState, urlTab].find((t): t is TabKey => !!t && tabs.some((x) => x.key === t)) ?? tabs[0].key;

  if (data.loading && !data.data) return <PageLoader />;
  if (!p) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16">
        <Card>
          <EmptyState icon={<Package />} title="Produit introuvable" text="Ce produit n'existe pas ou n'est plus en vente." action={<Button href="/boutique">Retour à la boutique</Button>} />
        </Card>
      </div>
    );
  }

  const price = Number(variant?.price ?? p.price);
  const compareRaw = variant ? (variant.compare_at_price ?? (variant.price == null ? p.compare_at_price : null)) : p.compare_at_price;
  const compareAt = compareRaw != null ? Number(compareRaw) : null;
  const stock = hasVariants ? (variant?.stock ?? 0) : p.stock;
  const unavailable = hasVariants && !variant;
  const out = stock <= 0;
  const inCart = cart.qtyOf(p.id, variant?.id);
  const maxQty = Math.max(1, stock - inCart);

  /** Une valeur est-elle disponible, compte tenu des autres options choisies ? */
  function available(optName: string, value: string) {
    const others = Object.fromEntries(Object.entries(sel).filter(([k]) => k !== optName));
    return variants.some((v) => v.stock > 0 && v.options?.[optName] === value && matches(v, others));
  }

  function choose(optName: string, value: string) {
    let next = { ...sel, [optName]: value };
    // combinaison inexistante : on garde la valeur choisie et on ajuste les autres options
    if (!variants.some((v) => matches(v, next))) {
      const alt = variants.find((v) => v.options?.[optName] === value && v.stock > 0) ?? variants.find((v) => v.options?.[optName] === value);
      if (alt) next = { ...alt.options };
    }
    setPicked(next);
    setQty(1);
    const v = variants.find((x) => matches(x, next) && Object.keys(x.options ?? {}).length === options.length);
    if (v?.image) setPhoto(Math.max(0, gallery.indexOf(v.image)));
  }

  function add(goToCart: boolean) {
    if (!p || out || unavailable) return;
    if (inCart >= stock) {
      toast(`Vous avez déjà tout le stock disponible dans votre panier`, "info");
      if (goToCart) router.push("/panier");
      return;
    }
    cart.add(p, Math.min(qty, maxQty), variant);
    if (goToCart) router.push("/panier");
    else toast(`${p.name}${variant ? ` (${variant.label})` : ""} ajouté au panier`);
  }

  return (
    <div className="mx-auto max-w-7xl px-4 pb-16 pt-5 sm:px-6">
      <nav className="flex items-center gap-2 text-sm text-muted" aria-label="Fil d'Ariane">
        <Link href="/boutique" className="inline-flex items-center gap-1.5 font-semibold text-primary hover:underline">
          <ArrowLeft className="size-4" /> Boutique
        </Link>
        {p.category && (
          <>
            <span>/</span>
            <Link href={`/boutique?categorie=${p.category.slug}`} className="hover:text-primary">
              {p.category.name}
            </Link>
          </>
        )}
      </nav>

      <div className="mt-4 grid gap-6 lg:grid-cols-2 lg:gap-10">
        {/* Galerie */}
        <div>
          <div className="relative aspect-square overflow-hidden rounded-[var(--radius-card)] border border-line/70 bg-white">
            <ProductImage src={gallery[Math.min(photo, gallery.length - 1)] ?? null} alt={p.name} className="size-full" />
            {compareAt != null && compareAt > price && <span className="absolute left-3 top-3 rounded-md bg-rose-500 px-2.5 py-1 text-sm font-bold text-white">Promo</span>}
            <ProductFavButton productId={p.id} name={p.name} size="lg" className="absolute right-3 top-3" />
          </div>
          {gallery.length > 1 && (
            <div className="scrollbar-none mt-3 flex gap-2 overflow-x-auto">
              {gallery.map((src, i) => (
                <button
                  key={`${src}-${i}`}
                  type="button"
                  onClick={() => setPhoto(i)}
                  aria-label={`Photo ${i + 1}`}
                  aria-pressed={photo === i}
                  className={cn("size-20 shrink-0 overflow-hidden rounded-xl border-2 bg-white transition", photo === i ? "border-primary" : "border-transparent opacity-70 hover:opacity-100")}
                >
                  <ProductImage src={src} alt="" className="size-full" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Infos + achat */}
        <div>
          {p.brand_ref ? (
            <Link href={`/boutique?marque=${p.brand_ref.slug}`} className="inline-flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-muted hover:text-primary">
              {p.brand_ref.logo_url && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={p.brand_ref.logo_url} alt="" className="size-6 rounded-full border border-line bg-white object-contain" />
              )}
              {p.brand_ref.name}
            </Link>
          ) : (
            p.brand && <p className="text-sm font-semibold uppercase tracking-wide text-muted">{p.brand}</p>
          )}
          <h1 className="mt-1 text-2xl font-extrabold leading-tight tracking-tight sm:text-3xl [overflow-wrap:anywhere]">{p.name}</h1>
          {p.rating_count > 0 && (
            <button type="button" onClick={() => { setTab("avis"); document.getElementById("onglets")?.scrollIntoView({ behavior: "smooth" }); }} className="mt-2 flex items-center gap-2 text-sm text-body hover:text-primary">
              <Stars value={Number(p.rating_avg)} size={16} />
              <span className="font-semibold">{Number(p.rating_avg).toFixed(1).replace(".", ",")}</span>
              <span className="underline-offset-2 hover:underline">({p.rating_count} avis)</span>
            </button>
          )}
          {p.short_description && <p className="mt-3 text-base text-body [overflow-wrap:anywhere]">{p.short_description}</p>}

          <div className="mt-5">
            <Price price={price} compareAt={compareAt} size="lg" />
          </div>
          <div className="mt-2">{unavailable ? <span className="text-sm font-semibold text-rose-600">Combinaison indisponible</span> : <StockLabel stock={stock} />}</div>

          {/* Déclinaisons */}
          {hasVariants && (
            <div className="mt-5 space-y-4">
              {options.map((o) => (
                <fieldset key={o.name}>
                  <legend className="mb-2 text-sm font-bold text-navy">
                    {o.name}
                    {sel[o.name] && <span className="font-semibold text-body"> : {sel[o.name]}</span>}
                  </legend>
                  <div className="flex flex-wrap gap-2">
                    {o.values.map((val) => {
                      const on = sel[o.name] === val;
                      const ok = available(o.name, val);
                      return (
                        <button
                          key={val}
                          type="button"
                          aria-pressed={on}
                          onClick={() => choose(o.name, val)}
                          className={cn(
                            "min-w-12 rounded-xl border-2 px-3.5 py-2 text-sm font-semibold transition",
                            on ? "border-primary bg-primary-soft/60 text-primary" : "border-line bg-white text-navy hover:border-primary/50",
                            !ok && "text-muted line-through decoration-1 opacity-60",
                          )}
                        >
                          {val}
                        </button>
                      );
                    })}
                  </div>
                </fieldset>
              ))}
            </div>
          )}

          {!out && !unavailable && (
            <div className="mt-6 flex items-center gap-3">
              <div className="shrink-0">
                <QtyStepper value={Math.min(qty, maxQty)} max={maxQty} onChange={(n) => setQty(Math.max(1, Math.min(maxQty, n)))} />
              </div>
              <Button size="lg" className="min-w-0 flex-1 px-4" onClick={() => add(false)} icon={<ShoppingCart className="size-5" />}>
                <span className="truncate">Ajouter au panier</span>
              </Button>
            </div>
          )}
          {out || unavailable ? (
            <Button size="lg" className="mt-6 w-full" disabled>
              {unavailable ? "Indisponible" : "Rupture de stock"}
            </Button>
          ) : (
            <Button size="lg" variant="outline" className="mt-3 w-full border-primary text-primary" onClick={() => add(true)} icon={<Zap className="size-5" />}>
              Acheter maintenant
            </Button>
          )}
          {inCart > 0 && (
            <p className="mt-2 text-sm text-muted">
              Déjà {inCart} dans votre{" "}
              <Link href="/panier" className="font-semibold text-primary hover:underline">
                panier
              </Link>
              .
            </p>
          )}

          <ul className="mt-6 space-y-3 rounded-[var(--radius-card)] border border-line/70 bg-white p-4 text-sm text-body">
            <li className="flex items-start gap-3">
              <Banknote className="mt-0.5 size-5 shrink-0 text-primary" />
              <span>
                <strong className="text-navy">Paiement à la livraison</strong> : vous payez en espèces au livreur.
              </span>
            </li>
            <li className="flex items-start gap-3">
              <Truck className="mt-0.5 size-5 shrink-0 text-primary" />
              <span>
                <strong className="text-navy">Livraison partout en Tunisie</strong>
                {!shop.loading && (shop.fee > 0 ? ` : ${formatTND(shop.fee)}` : " : gratuite")}
                {!shop.loading && shop.freeFrom ? `, offerte dès ${formatTND(shop.freeFrom)} d'achat.` : "."}
              </span>
            </li>
            <li className="flex items-start gap-3">
              <ShieldCheck className="mt-0.5 size-5 shrink-0 text-primary" />
              <span>
                <strong className="text-navy">Commande confirmée par téléphone</strong> avant l&apos;envoi.
              </span>
            </li>
          </ul>
        </div>
      </div>

      {/* Onglets : Description / Détails du produit / Avis */}
      <Card id="onglets" className="mt-8 scroll-mt-24 px-4 pb-6 sm:px-8">
        <span id="avis" className="block scroll-mt-24" aria-hidden />
        <div role="tablist" className="scrollbar-none -mx-4 flex gap-2 overflow-x-auto border-b border-line px-4 sm:mx-0 sm:gap-6 sm:px-0">
          {tabs.map((t) => (
            <button
              key={t.key}
              type="button"
              role="tab"
              aria-selected={tab === t.key}
              onClick={() => setTab(t.key)}
              className={cn(
                "-mb-px shrink-0 border-b-2 px-3 pb-3 pt-5 text-[15px] font-bold transition sm:px-4",
                tab === t.key ? "border-primary text-primary" : "border-transparent text-body hover:text-navy",
              )}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div role="tabpanel" className="min-w-0 pt-6">
          {tab === "description" && <p className="whitespace-pre-line text-[15px] leading-relaxed text-body [overflow-wrap:anywhere]">{p.description}</p>}

          {tab === "details" && (
            <div className="space-y-6">
              {p.specs?.length > 0 && (
                <dl className="overflow-hidden rounded-2xl border border-line/70">
                  {p.specs.map((s, i) => (
                    <div key={`${s.label}-${i}`} className={cn("grid grid-cols-[minmax(0,2fr)_minmax(0,3fr)] gap-4 px-4 py-3 text-sm", i % 2 === 0 ? "bg-page/60" : "bg-white")}>
                      <dt className="font-semibold text-navy [overflow-wrap:anywhere]">{s.label}</dt>
                      <dd className="text-body [overflow-wrap:anywhere]">{s.value}</dd>
                    </div>
                  ))}
                </dl>
              )}
              {p.details?.trim() && <p className="whitespace-pre-line text-[15px] leading-relaxed text-body [overflow-wrap:anywhere]">{p.details}</p>}
              {p.detail_images?.map((src) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img key={src} src={src} alt={`${p.name} – détails`} className="mx-auto w-full max-w-3xl rounded-2xl" />
              ))}
            </div>
          )}

          {tab === "avis" && <ProductReviews productId={p.id} />}
        </div>
      </Card>

      {(data.data?.similar.length ?? 0) > 0 && (
        <section className="mt-10">
          <h2 className="mb-4 text-xl font-extrabold">Vous aimerez aussi</h2>
          <div className="grid grid-cols-2 gap-3 sm:gap-5 md:grid-cols-3 lg:grid-cols-5">
            {data.data!.similar.map((s) => (
              <ProductCard key={s.id} product={s} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
