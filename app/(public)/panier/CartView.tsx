"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import { ArrowRight, Banknote, ShoppingCart, Trash2, Truck } from "lucide-react";
import { ProductImage, QtyStepper } from "@/components/shop/ShopBits";
import { Button, Card, EmptyState } from "@/components/ui";
import { useAuth } from "@/hooks/useAuth";
import { type FreshProduct, useCart, useShopSettings } from "@/hooks/useCart";
import { formatTND } from "@/lib/labels";
import { getSupabase } from "@/lib/supabase";

export function CartView() {
  const cart = useCart();
  const shop = useShopSettings();
  const { user } = useAuth();
  const synced = useRef(false);

  // Une fois : relire prix / stock / disponibilité en base (le panier n'est qu'un instantané).
  const ids = [...new Set(cart.lines.map((l) => l.id))].join(",");
  const { sync } = cart;
  useEffect(() => {
    if (synced.current || !ids) return;
    synced.current = true;
    void getSupabase()
      .from("products")
      .select("id,name,price,images,stock,is_active,options,variants:product_variants!product_variants_product_id_fkey(id,label,price,stock,image,is_active)")
      .in("id", ids.split(","))
      .then(({ data }) => data && sync(data as unknown as FreshProduct[]));
  }, [ids, sync]);

  if (cart.lines.length === 0) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
        <Card>
          <EmptyState
            icon={<ShoppingCart />}
            title="Votre panier est vide"
            text="Parcourez la boutique : alimentation, accessoires et soins pour vos compagnons."
            action={<Button href="/boutique">Découvrir la boutique</Button>}
          />
        </Card>
      </div>
    );
  }

  const delivery = shop.deliveryFor(cart.subtotal);
  const remaining = shop.freeFrom != null ? shop.freeFrom - cart.subtotal : 0;
  const checkoutHref = user ? "/commande" : `/connexion?next=${encodeURIComponent("/commande")}`;

  return (
    <div className="mx-auto max-w-6xl px-4 pb-16 pt-6 sm:px-6">
      <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">Mon panier</h1>
      <p className="mt-1 text-body">
        {cart.count} article{cart.count > 1 ? "s" : ""}
      </p>

      <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        <Card className="divide-y divide-line/70">
          {cart.lines.map((l) => (
            <div key={l.key} className="flex gap-3 p-4 sm:gap-4 sm:p-5">
              <Link href={`/boutique/${l.id}`} className="size-20 shrink-0 overflow-hidden rounded-xl border border-line/70 bg-page sm:size-24">
                <ProductImage src={l.image} alt={l.name} className="size-full" />
              </Link>
              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-3">
                  <Link href={`/boutique/${l.id}`} className="line-clamp-2 font-bold text-navy hover:text-primary">
                    {l.name}
                  </Link>
                  <button type="button" onClick={() => cart.remove(l.key)} className="grid size-9 shrink-0 place-items-center rounded-full text-muted hover:bg-red-50 hover:text-red-600" aria-label={`Retirer ${l.name}`}>
                    <Trash2 className="size-4" />
                  </button>
                </div>
                {l.variantLabel && <p className="text-sm font-semibold text-body">{l.variantLabel}</p>}
                <p className="text-sm text-muted">{formatTND(l.price)} l&apos;unité</p>
                <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                  <QtyStepper size="sm" value={l.qty} max={Math.max(1, l.stock)} onChange={(n) => cart.setQty(l.key, n)} />
                  <span className="font-extrabold text-navy">{formatTND(l.qty * l.price)}</span>
                </div>
                {l.stock > 0 && l.stock <= 5 && <p className="mt-1 text-xs font-semibold text-amber-700">Plus que {l.stock} en stock</p>}
              </div>
            </div>
          ))}
        </Card>

        <div className="space-y-4 lg:sticky lg:top-24 lg:self-start">
          <Card className="p-5">
            <h2 className="text-lg font-extrabold">Récapitulatif</h2>
            <dl className="mt-4 space-y-2.5 text-sm">
              <div className="flex justify-between">
                <dt className="text-body">Sous-total</dt>
                <dd className="font-semibold text-navy">{formatTND(cart.subtotal)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-body">Livraison</dt>
                <dd className="font-semibold text-navy">{shop.loading ? "…" : delivery === 0 ? "Offerte" : formatTND(delivery)}</dd>
              </div>
              <div className="flex justify-between border-t border-line pt-3 text-base">
                <dt className="font-extrabold text-navy">Total</dt>
                <dd className="font-extrabold text-primary">{formatTND(cart.subtotal + delivery)}</dd>
              </div>
            </dl>
            {remaining > 0 && delivery > 0 && (
              <p className="mt-3 rounded-xl bg-primary-soft/60 px-3 py-2 text-xs font-semibold text-primary">Plus que {formatTND(remaining)} pour la livraison offerte.</p>
            )}
            <Button href={checkoutHref} size="lg" className="mt-5 w-full" icon={<ArrowRight className="size-5" />}>
              Passer la commande
            </Button>
            <Link href="/boutique" className="mt-3 block text-center text-sm font-semibold text-primary hover:underline">
              Continuer mes achats
            </Link>
          </Card>
          <Card className="space-y-3 p-5 text-sm text-body">
            <p className="flex items-start gap-3">
              <Banknote className="mt-0.5 size-5 shrink-0 text-primary" /> Paiement en espèces à la livraison.
            </p>
            <p className="flex items-start gap-3">
              <Truck className="mt-0.5 size-5 shrink-0 text-primary" /> Livraison partout en Tunisie, après confirmation par téléphone.
            </p>
          </Card>
        </div>
      </div>
    </div>
  );
}
