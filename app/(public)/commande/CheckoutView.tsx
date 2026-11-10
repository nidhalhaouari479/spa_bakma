"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Banknote, CheckCircle2, MapPin, Phone, ShoppingCart, Ticket, User, X } from "lucide-react";
import { ProductImage } from "@/components/shop/ShopBits";
import { Alert, Button, Card, EmptyState, Field, Input, PageLoader, Select, Textarea, useToast } from "@/components/ui";
import { useAuth } from "@/hooks/useAuth";
import { useCart, useShopSettings } from "@/hooks/useCart";
import { useQuery } from "@/hooks/useQuery";
import { useCities } from "@/hooks/useRefData";
import { formatTND } from "@/lib/labels";
import { errorMessage, getSupabase } from "@/lib/supabase";

type AppliedPromo = {
  code: string;
  percent: number;
  description: string | null;
  product_ids: string[] | null;
};

export function CheckoutView() {
  const { loading: authLoading, user, profile } = useAuth();
  const router = useRouter();
  const toast = useToast();
  const cart = useCart();
  const shop = useShopSettings();
  const cities = useCities();
  const [form, setForm] = useState({
    name: "",
    phone: "",
    city: "",
    address: "",
    note: "",
  });
  const [prefilled, setPrefilled] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [promoInput, setPromoInput] = useState("");
  const [promo, setPromo] = useState<AppliedPromo | null>(null);
  const [promoBusy, setPromoBusy] = useState(false);
  const [promoErr, setPromoErr] = useState<string | null>(null);

  // Connexion obligatoire pour commander
  useEffect(() => {
    if (!authLoading && !user) router.replace(`/connexion?next=${encodeURIComponent("/commande")}`);
  }, [authLoading, user, router]);

  // Pré-remplir avec le profil (nom, ville) et le téléphone du compte, une seule fois
  const contact = useQuery(
    async () => {
      const { data } = await getSupabase().from("profile_contacts").select("phone").eq("id", user!.id).maybeSingle();
      return (data as { phone: string | null } | null)?.phone ?? "";
    },
    [user?.id],
    !!user,
  );
  if (user && profile && !contact.loading && !prefilled) {
    setPrefilled(true);
    setForm((f) => ({
      ...f,
      name: f.name || profile.full_name || "",
      city: f.city || profile.city || "",
      phone: f.phone || contact.data || "",
    }));
  }

  if (authLoading || !user) return <PageLoader />;

  if (cart.lines.length === 0 && !done) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
        <Card>
          <EmptyState icon={<ShoppingCart />} title="Votre panier est vide" action={<Button href="/boutique">Découvrir la boutique</Button>} />
        </Card>
      </div>
    );
  }

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));
  const delivery = shop.deliveryFor(cart.subtotal);
  // réduction : sur les produits concernés par le code (recalculée par le serveur à la validation)
  const eligible = promo ? cart.lines.filter((l) => !promo.product_ids || promo.product_ids.includes(l.id)).reduce((t, l) => t + l.qty * l.price, 0) : 0;
  const discount = promo ? Math.round(eligible * promo.percent) / 100 : 0;
  const total = Math.max(0, cart.subtotal - discount) + delivery;

  async function applyPromo() {
    const code = promoInput.trim().toUpperCase();
    if (!code) return setPromoErr("Saisissez un code promo.");
    setPromoBusy(true);
    setPromoErr(null);
    const { data, error } = await getSupabase().rpc("check_promo_code", {
      p_code: code,
    });
    setPromoBusy(false);
    if (error) return setPromoErr(errorMessage(error));
    const p = data as AppliedPromo;
    const ok = cart.lines.some((l) => !p.product_ids || p.product_ids.includes(l.id));
    if (!ok) return setPromoErr("Ce code ne s'applique à aucun produit de votre panier.");
    setPromo({ ...p, percent: Number(p.percent) });
    setPromoInput("");
    toast(`Code ${p.code} appliqué : −${Number(p.percent)} %`);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (form.name.trim().length < 3) return setErr("Indiquez votre nom complet.");
    if (form.phone.replace(/\D/g, "").length < 8) return setErr("Indiquez un numéro de téléphone valide (8 chiffres).");
    if (!form.city) return setErr("Choisissez votre ville.");
    if (form.address.trim().length < 5) return setErr("Indiquez votre adresse de livraison.");
    setBusy(true);
    setErr(null);
    try {
      const { error } = await getSupabase().rpc("place_order", {
        p_items: cart.lines.map((l) => ({
          product_id: l.id,
          variant_id: l.variantId,
          quantity: l.qty,
        })),
        p_customer_name: form.name.trim(),
        p_phone: form.phone.trim(),
        p_city: form.city,
        p_address: form.address.trim(),
        p_note: form.note.trim() || null,
        p_promo_code: promo?.code ?? null,
      });
      if (error) throw error;
      setDone(true);
      cart.clear();
      toast("Commande envoyée : Bakma vous appellera pour la confirmer.");
      router.push("/espace/commandes");
    } catch (e2) {
      setErr(errorMessage(e2));
      setBusy(false);
    }
  }

  if (done) return <PageLoader />;

  return (
    <div className="mx-auto max-w-6xl px-4 pb-16 pt-6 sm:px-6">
      <Link href="/panier" className="text-sm font-semibold text-primary hover:underline">
        ← Retour au panier
      </Link>
      <h1 className="mt-2 text-2xl font-extrabold tracking-tight sm:text-3xl">Finaliser ma commande</h1>

      <form onSubmit={submit} className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
        <div className="space-y-6">
          <Card className="space-y-4 p-5 sm:p-6">
            <h2 className="text-lg font-extrabold">Adresse de livraison</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Nom complet *">
                <Input icon={<User />} value={form.name} onChange={set("name")} autoComplete="name" maxLength={120} required />
              </Field>
              <Field label="Téléphone *" hint="Le livreur vous appellera sur ce numéro.">
                <Input
                  icon={<Phone />}
                  value={form.phone}
                  onChange={set("phone")}
                  type="tel"
                  inputMode="tel"
                  autoComplete="tel"
                  placeholder="Ex. 22 123 456"
                  maxLength={20}
                  required
                />
              </Field>
            </div>
            <Field label="Ville *">
              <Select icon={<MapPin />} value={form.city} onChange={set("city")} aria-label="Ville">
                <option value="">Choisir une ville</option>
                {cities.map((c) => (
                  <option key={c.id} value={c.name}>
                    {c.name}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Adresse *">
              <Textarea
                value={form.address}
                onChange={set("address")}
                rows={2}
                maxLength={300}
                placeholder="Rue, numéro, immeuble, repère…"
                className="min-h-20"
                required
              />
            </Field>
            <Field label="Instructions (facultatif)">
              <Input value={form.note} onChange={set("note")} maxLength={300} placeholder="Ex. disponible après 17 h" />
            </Field>
          </Card>

          <Card className="p-5 sm:p-6">
            <h2 className="text-lg font-extrabold">Paiement</h2>
            <div className="mt-4 flex items-start gap-3 rounded-2xl border-2 border-primary bg-primary-soft/40 p-4">
              <Banknote className="mt-0.5 size-6 shrink-0 text-primary" />
              <div className="flex-1">
                <p className="font-bold text-navy">Paiement à la livraison</p>
                <p className="text-sm text-body">Vous payez en espèces au livreur à la réception du colis.</p>
              </div>
              <CheckCircle2 className="size-5 shrink-0 text-primary" />
            </div>
          </Card>
        </div>

        <div className="space-y-4 lg:sticky lg:top-24 lg:self-start">
          <Card className="p-5">
            <h2 className="text-lg font-extrabold">Ma commande</h2>
            <ul className="mt-4 space-y-3">
              {cart.lines.map((l) => (
                <li key={l.key} className="flex items-center gap-3">
                  <span className="relative size-14 shrink-0 overflow-hidden rounded-xl border border-line/70 bg-page">
                    <ProductImage src={l.image} alt={l.name} className="size-full" />
                    <span className="absolute -right-0 -top-0 grid h-5 min-w-5 place-items-center rounded-bl-lg bg-navy px-1 text-[11px] font-bold text-white">
                      {l.qty}
                    </span>
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="line-clamp-2 text-sm font-semibold text-navy">{l.name}</span>
                    {l.variantLabel && <span className="block text-xs text-muted">{l.variantLabel}</span>}
                  </span>
                  <span className="shrink-0 text-sm font-bold text-navy">{formatTND(l.qty * l.price)}</span>
                </li>
              ))}
            </ul>
            {/* code promo */}
            <div className="mt-4 border-t border-line pt-4">
              {promo ? (
                <div className="flex items-center gap-3 rounded-xl border border-dashed border-emerald-300 bg-emerald-50 px-3 py-2.5">
                  <Ticket className="size-5 shrink-0 text-emerald-600" />
                  <div className="min-w-0 flex-1">
                    <p className="font-mono text-sm font-bold tracking-wide text-emerald-800">{promo.code}</p>
                    <p className="text-xs text-emerald-700">
                      −{promo.percent} % {promo.product_ids ? "sur les produits concernés" : "sur vos produits"}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setPromo(null)}
                    className="grid size-8 place-items-center rounded-full text-emerald-700 hover:bg-emerald-100"
                    aria-label="Retirer le code promo"
                  >
                    <X className="size-4" />
                  </button>
                </div>
              ) : (
                <>
                  <label htmlFor="promo" className="text-sm font-bold text-navy">
                    Code promo
                  </label>
                  <div className="mt-1.5 flex gap-2">
                    <div className="min-w-0 flex-1">
                      <Input
                        id="promo"
                        icon={<Ticket />}
                        value={promoInput}
                        onChange={(e) => {
                          setPromoInput(e.target.value.toUpperCase().replace(/\s/g, ""));
                          setPromoErr(null);
                        }}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            void applyPromo();
                          }
                        }}
                        placeholder="Ex. BIENVENUE10"
                        maxLength={30}
                        className="font-mono uppercase"
                      />
                    </div>
                    <Button type="button" variant="outline" loading={promoBusy} onClick={applyPromo} className="shrink-0">
                      Appliquer
                    </Button>
                  </div>
                  {promoErr && <p className="mt-1.5 text-xs font-medium text-red-600">{promoErr}</p>}
                </>
              )}
            </div>
            <dl className="mt-4 space-y-2 border-t border-line pt-4 text-sm">
              <div className="flex justify-between">
                <dt className="text-body">Sous-total</dt>
                <dd className="font-semibold text-navy">{formatTND(cart.subtotal)}</dd>
              </div>
              {promo && discount > 0 && (
                <div className="flex justify-between text-emerald-700">
                  <dt>Réduction ({promo.code})</dt>
                  <dd className="font-semibold">−{formatTND(discount)}</dd>
                </div>
              )}
              <div className="flex justify-between">
                <dt className="text-body">Livraison</dt>
                <dd className="font-semibold text-navy">{shop.loading ? "…" : delivery === 0 ? "Offerte" : formatTND(delivery)}</dd>
              </div>
              <div className="flex justify-between border-t border-line pt-3 text-base">
                <dt className="font-extrabold text-navy">Total à payer</dt>
                <dd className="font-extrabold text-primary">{formatTND(total)}</dd>
              </div>
            </dl>
            <div className="mt-4">
              <Alert>{err}</Alert>
            </div>
            <Button type="submit" size="lg" className="mt-4 w-full" loading={busy} icon={<CheckCircle2 className="size-5" />}>
              Confirmer la commande
            </Button>
            <p className="mt-3 text-center text-xs text-muted">Les prix et le stock sont vérifiés à la validation.</p>
          </Card>
        </div>
      </form>
    </div>
  );
}
