"use client";

import Link from "next/link";
import { Heart, Minus, Package, Plus, ShoppingCart, SlidersHorizontal, Star } from "lucide-react";
import { cn, useToast } from "@/components/ui";
import { useCart } from "@/hooks/useCart";
import { useProductFavorite } from "@/hooks/useProductFavorites";
import { formatTND } from "@/lib/labels";
import type { Product } from "@/lib/types";

export const PRODUCT_CARD = "*, category:shop_categories!products_category_id_fkey(*), brand_ref:shop_brands!products_brand_id_fkey(id,name,slug,logo_url)";

/** Photo produit (ou pictogramme si aucune). */
export function ProductImage({ src, alt, className }: { src?: string | null; alt?: string; className?: string }) {
  return src ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt={alt ?? ""} className={cn("object-cover", className)} />
  ) : (
    <div className={cn("grid place-items-center bg-gradient-to-br from-primary-soft to-white text-primary/40", className)}>
      <Package className="size-1/3 max-h-14 max-w-14" aria-hidden />
    </div>
  );
}

/** Prix + ancien prix barré + % de remise. */
export function Price({ price, compareAt, size = "md" }: { price: number; compareAt?: number | null; size?: "md" | "lg" }) {
  const promo = compareAt != null && compareAt > price;
  return (
    <span className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
      <span className={cn("font-extrabold text-primary", size === "lg" ? "text-3xl" : "text-base sm:text-lg")}>{formatTND(price)}</span>
      {promo && (
        <>
          <span className={cn("text-muted line-through", size === "lg" ? "text-base" : "text-xs sm:text-sm")}>{formatTND(compareAt)}</span>
          <span className="rounded-md bg-rose-50 px-1.5 py-0.5 text-xs font-bold text-rose-600">-{Math.round((1 - price / compareAt) * 100)}%</span>
        </>
      )}
    </span>
  );
}

export function StockLabel({ stock }: { stock: number }) {
  if (stock <= 0) return <span className="text-sm font-semibold text-rose-600">Rupture de stock</span>;
  if (stock <= 5) return <span className="text-sm font-semibold text-amber-700">Plus que {stock} en stock</span>;
  return <span className="text-sm font-semibold text-emerald-700">En stock</span>;
}

/** Sélecteur de quantité − 1 + */
export function QtyStepper({ value, max, onChange, size = "md" }: { value: number; max: number; onChange: (n: number) => void; size?: "sm" | "md" }) {
  const btn = cn("grid place-items-center rounded-full text-navy transition hover:bg-primary-soft hover:text-primary disabled:opacity-30 disabled:hover:bg-transparent", size === "sm" ? "size-8" : "size-10");
  return (
    <div className={cn("inline-flex items-center rounded-full border border-line bg-white", size === "sm" ? "h-9 px-0.5" : "h-12 px-1")}>
      <button type="button" className={btn} onClick={() => onChange(value - 1)} disabled={value <= 1} aria-label="Diminuer la quantité">
        <Minus className="size-4" />
      </button>
      <span className={cn("text-center font-bold tabular-nums text-navy", size === "sm" ? "w-7 text-sm" : "w-10")} aria-live="polite">
        {value}
      </span>
      <button type="button" className={btn} onClick={() => onChange(value + 1)} disabled={value >= max} aria-label="Augmenter la quantité">
        <Plus className="size-4" />
      </button>
    </div>
  );
}

/** Étoiles (lecture seule), demi-étoile comprise. */
export function Stars({ value, size = 14, className }: { value: number; size?: number; className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-0.5", className)} aria-label={`${value.toFixed(1).replace(".", ",")} sur 5`} role="img">
      {[1, 2, 3, 4, 5].map((i) => {
        const fill = Math.max(0, Math.min(1, value - i + 1));
        return (
          <span key={i} className="relative inline-block" style={{ width: size, height: size }}>
            <Star className="absolute inset-0 text-line" style={{ width: size, height: size }} fill="currentColor" strokeWidth={0} />
            {fill > 0 && (
              <span className="absolute inset-y-0 left-0 overflow-hidden" style={{ width: `${fill * 100}%` }}>
                <Star className="text-amber-400" style={{ width: size, height: size }} fill="currentColor" strokeWidth={0} />
              </span>
            )}
          </span>
        );
      })}
    </span>
  );
}

/** Cœur favori produit (carte et fiche). */
export function ProductFavButton({ productId, name, className, size = "md" }: { productId: string; name: string; className?: string; size?: "md" | "lg" }) {
  const { isFavorite, toggle } = useProductFavorite();
  const fav = isFavorite(productId);
  return (
    <button
      type="button"
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        void toggle(productId);
      }}
      aria-pressed={fav}
      aria-label={fav ? `Retirer ${name} des favoris` : `Ajouter ${name} aux favoris`}
      className={cn(
        "grid shrink-0 place-items-center rounded-full bg-white/95 shadow-sm ring-1 ring-line/60 transition hover:scale-105",
        fav ? "text-rose-500" : "text-navy/70 hover:text-rose-500",
        size === "lg" ? "size-12" : "size-9",
        className,
      )}
    >
      <Heart className={cn(size === "lg" ? "size-[22px]" : "size-[18px]", fav && "fill-current")} />
    </button>
  );
}

/** Carte produit (liste boutique, accueil, produits similaires). */
export function ProductCard({ product }: { product: Product }) {
  const cart = useCart();
  const toast = useToast();
  const out = product.stock <= 0;
  const promo = product.compare_at_price != null && product.compare_at_price > product.price;
  // produit à déclinaisons : le choix (taille, couleur…) se fait sur la fiche
  const hasVariants = (product.options?.length ?? 0) > 0;
  return (
    <Link
      href={`/boutique/${product.id}`}
      className="group flex flex-col overflow-hidden rounded-[var(--radius-card)] border border-line/70 bg-white shadow-[0_4px_24px_rgba(15,40,90,0.06)] transition hover:-translate-y-0.5 hover:shadow-[0_10px_30px_rgba(15,40,90,0.12)]"
    >
      <div className="relative aspect-square overflow-hidden bg-page">
        <ProductImage src={product.images[0]} alt={product.name} className={cn("size-full transition duration-300 group-hover:scale-105", out && "opacity-60")} />
        {promo && <span className="absolute left-2.5 top-2.5 rounded-md bg-rose-500 px-2 py-0.5 text-xs font-bold text-white shadow-sm">Promo</span>}
        {out && <span className="absolute inset-x-2.5 bottom-2.5 rounded-lg bg-navy/85 py-1 text-center text-xs font-bold text-white">Rupture de stock</span>}
        <ProductFavButton productId={product.id} name={product.name} className="absolute right-2.5 top-2.5" />
      </div>
      <div className="flex flex-1 flex-col gap-1 p-3 sm:p-4">
        {product.brand && <span className="truncate text-xs font-semibold uppercase tracking-wide text-muted">{product.brand}</span>}
        <h3 className="line-clamp-2 min-h-[2.5em] text-sm font-bold leading-snug text-navy sm:text-[15px]">{product.name}</h3>
        {product.rating_count > 0 && (
          <span className="flex items-center gap-1.5 text-xs text-muted">
            <Stars value={Number(product.rating_avg)} size={13} />({product.rating_count})
          </span>
        )}
        {hasVariants && <span className="truncate text-xs text-muted">{product.options.map((o) => `${o.values.length} ${o.name.toLowerCase()}${o.values.length > 1 ? "s" : ""}`).join(" · ")}</span>}
        <div className="mt-auto flex items-end justify-between gap-2 pt-1">
          <Price price={Number(product.price)} compareAt={product.compare_at_price != null ? Number(product.compare_at_price) : null} />
          <button
            type="button"
            disabled={out}
            onClick={(e) => {
              if (hasVariants) return; // le lien de la carte ouvre la fiche pour choisir
              e.preventDefault();
              e.stopPropagation();
              cart.add(product, 1);
              toast(`${product.name} ajouté au panier`);
            }}
            className="grid size-10 shrink-0 place-items-center rounded-full bg-gradient-to-b from-primary to-primary-dark text-white shadow-sm transition hover:brightness-110 disabled:from-line disabled:to-line disabled:text-muted"
            aria-label={hasVariants ? `Choisir les options de ${product.name}` : `Ajouter ${product.name} au panier`}
          >
            {hasVariants ? <SlidersHorizontal className="size-[18px]" /> : <ShoppingCart className="size-[18px]" />}
          </button>
        </div>
      </div>
    </Link>
  );
}

export function ProductCardSkeleton() {
  return (
    <div className="overflow-hidden rounded-[var(--radius-card)] border border-line/70 bg-white">
      <div className="aspect-square animate-pulse bg-primary-soft/60" />
      <div className="space-y-2 p-4">
        <div className="h-3 w-1/3 animate-pulse rounded bg-line" />
        <div className="h-4 w-4/5 animate-pulse rounded bg-line" />
        <div className="h-5 w-1/2 animate-pulse rounded bg-line" />
      </div>
    </div>
  );
}

/** Icône panier avec compteur (en-tête). */
export function CartButton({ className }: { className?: string }) {
  const { count } = useCart();
  return (
    <Link href="/panier" className={cn("relative grid size-10 place-items-center rounded-full text-navy transition hover:bg-primary-soft", className)} aria-label={count ? `Panier (${count} article${count > 1 ? "s" : ""})` : "Panier"}>
      <ShoppingCart className="size-[22px]" />
      {count > 0 && (
        <span className="absolute -right-0.5 -top-0.5 grid h-5 min-w-5 place-items-center rounded-full bg-adopt px-1 text-[11px] font-bold text-white ring-2 ring-white">{count > 99 ? "99+" : count}</span>
      )}
    </Link>
  );
}
