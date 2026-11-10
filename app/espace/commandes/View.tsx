"use client";

import Link from "next/link";
import { useState } from "react";
import { Banknote, Check, MapPin, Package, Phone, Star, XCircle } from "lucide-react";
import { PageHeader } from "@/components/espace/EspaceShell";
import { ProductImage } from "@/components/shop/ShopBits";
import { Alert, Button, Card, cn, EmptyState, Field, MetaBadge, Modal, PageLoader, Textarea, useToast } from "@/components/ui";
import { useAuth } from "@/hooks/useAuth";
import { unwrap, useQuery } from "@/hooks/useQuery";
import { formatDateTime, formatTND, ORDER_STATUS, ORDER_STEPS } from "@/lib/labels";
import { errorMessage, getSupabase } from "@/lib/supabase";
import type { Order } from "@/lib/types";

export default function OrdersPage() {
  const { user } = useAuth();
  const uid = user?.id;
  const toast = useToast();
  const [cancelling, setCancelling] = useState<Order | null>(null);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);

  const orders = useQuery(
    async () =>
      unwrap<Order[]>(
        await getSupabase().from("orders").select("*, items:order_items!order_items_order_id_fkey(*)").eq("user_id", uid!).order("created_at", { ascending: false }),
      ),
    [uid],
    !!uid,
  );

  async function cancel() {
    if (!cancelling) return;
    setBusy(true);
    const { error } = await getSupabase().rpc("cancel_order", { p_order_id: cancelling.id, p_reason: reason.trim() || null });
    setBusy(false);
    if (error) return toast(errorMessage(error), "error");
    toast(`Commande ${cancelling.ref} annulée`);
    setCancelling(null);
    setReason("");
    orders.reload();
  }

  if (orders.loading && !orders.data) return <PageLoader />;
  const list = orders.data ?? [];

  return (
    <div>
      <PageHeader title="Mes commandes" subtitle="Suivez vos achats de la boutique Bakma." action={<Button href="/boutique" variant="outline" icon={<Package className="size-4" />}>Boutique</Button>} />
      {orders.error && <Alert>{orders.error}</Alert>}

      {list.length === 0 ? (
        <Card>
          <EmptyState icon={<Package />} title="Aucune commande" text="Vos commandes de la boutique apparaîtront ici." action={<Button href="/boutique">Découvrir la boutique</Button>} />
        </Card>
      ) : (
        <div className="space-y-4">
          {list.map((o) => (
            <Card key={o.id} className="overflow-hidden">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line/70 px-4 py-3 sm:px-5">
                <div>
                  <p className="font-extrabold text-navy">{o.ref}</p>
                  <p className="text-xs text-muted">Passée le {formatDateTime(o.created_at)}</p>
                </div>
                <MetaBadge meta={ORDER_STATUS[o.status]} />
              </div>

              {o.status !== "annulee" ? <Steps status={o.status} /> : (
                <p className="mx-4 mt-4 rounded-xl bg-page px-3 py-2 text-sm text-body sm:mx-5">
                  <XCircle className="mr-1.5 inline size-4 text-muted" />
                  Annulée{o.cancel_reason ? ` : ${o.cancel_reason}` : ""}
                </p>
              )}

              <ul className="divide-y divide-line/60 px-4 sm:px-5">
                {(o.items ?? []).map((it) => (
                  <li key={it.id} className="flex items-center gap-3 py-3">
                    <span className="size-14 shrink-0 overflow-hidden rounded-xl border border-line/70 bg-page">
                      <ProductImage src={it.image} alt={it.product_name} className="size-full" />
                    </span>
                    <div className="min-w-0 flex-1">
                      {it.product_id ? (
                        <Link href={`/boutique/${it.product_id}`} className="line-clamp-2 text-sm font-semibold text-navy hover:text-primary">
                          {it.product_name}
                        </Link>
                      ) : (
                        <p className="line-clamp-2 text-sm font-semibold text-navy">{it.product_name}</p>
                      )}
                      {it.variant_label && <p className="text-xs font-semibold text-body">{it.variant_label}</p>}
                      <p className="text-xs text-muted">
                        {it.quantity} × {formatTND(it.unit_price)}
                      </p>
                      {o.status === "livree" && it.product_id && (
                        <Link href={`/boutique/${it.product_id}?onglet=avis#avis`} className="mt-0.5 inline-flex items-center gap-1 text-xs font-bold text-primary hover:underline">
                          <Star className="size-3.5" /> Donner mon avis
                        </Link>
                      )}
                    </div>
                    <span className="shrink-0 text-sm font-bold text-navy">{formatTND(it.line_total)}</span>
                  </li>
                ))}
              </ul>

              <div className="grid gap-4 border-t border-line/70 bg-page/40 px-4 py-4 sm:grid-cols-2 sm:px-5">
                <div className="space-y-1 text-sm text-body">
                  <p className="flex items-start gap-2">
                    <MapPin className="mt-0.5 size-4 shrink-0 text-muted" />
                    <span>
                      {o.address}, {o.city}
                    </span>
                  </p>
                  <p className="flex items-center gap-2">
                    <Phone className="size-4 shrink-0 text-muted" /> {o.phone}
                  </p>
                  <p className="flex items-center gap-2">
                    <Banknote className="size-4 shrink-0 text-muted" /> Paiement à la livraison
                  </p>
                </div>
                <dl className="space-y-1 text-sm sm:text-right">
                  <div className="flex justify-between sm:justify-end sm:gap-6">
                    <dt className="text-body">Sous-total</dt>
                    <dd className="font-semibold text-navy">{formatTND(o.subtotal)}</dd>
                  </div>
                  {Number(o.discount) > 0 && (
                    <div className="flex justify-between text-emerald-700 sm:justify-end sm:gap-6">
                      <dt>Code {o.promo_code}</dt>
                      <dd className="font-semibold">−{formatTND(o.discount)}</dd>
                    </div>
                  )}
                  <div className="flex justify-between sm:justify-end sm:gap-6">
                    <dt className="text-body">Livraison</dt>
                    <dd className="font-semibold text-navy">{Number(o.delivery_fee) === 0 ? "Offerte" : formatTND(o.delivery_fee)}</dd>
                  </div>
                  <div className="flex justify-between text-base sm:justify-end sm:gap-6">
                    <dt className="font-extrabold text-navy">Total</dt>
                    <dd className="font-extrabold text-primary">{formatTND(o.total)}</dd>
                  </div>
                </dl>
              </div>

              {o.status === "nouvelle" && (
                <div className="flex justify-end border-t border-line/70 px-4 py-3 sm:px-5">
                  <Button variant="outline" size="sm" icon={<XCircle className="size-4" />} onClick={() => setCancelling(o)}>
                    Annuler la commande
                  </Button>
                </div>
              )}
            </Card>
          ))}
        </div>
      )}

      <Modal
        open={!!cancelling}
        onClose={() => !busy && setCancelling(null)}
        title={`Annuler la commande ${cancelling?.ref ?? ""} ?`}
        size="sm"
        footer={
          <>
            <Button variant="outline" onClick={() => setCancelling(null)} disabled={busy}>
              Garder la commande
            </Button>
            <Button variant="danger" onClick={cancel} loading={busy}>
              Annuler la commande
            </Button>
          </>
        }
      >
        <p className="text-sm text-body">Les articles seront remis en vente. Cette action est définitive.</p>
        <Field label="Raison (facultatif)" className="mt-4">
          <Textarea value={reason} onChange={(e) => setReason(e.target.value)} maxLength={300} placeholder="Ex. commande en double" />
        </Field>
      </Modal>
    </div>
  );
}

/** Progression : Reçue → Confirmée → En livraison → Livrée */
function Steps({ status }: { status: Order["status"] }) {
  const current = ORDER_STEPS.findIndex((s) => s.key === status);
  return (
    <ol className="flex items-start gap-1 px-4 pt-4 sm:px-5">
      {ORDER_STEPS.map((s, i) => {
        const done = i <= current;
        return (
          <li key={s.key} className="flex flex-1 flex-col items-center gap-1.5 text-center">
            <div className="flex w-full items-center">
              <span className={cn("h-0.5 flex-1", i === 0 ? "bg-transparent" : done ? "bg-primary" : "bg-line")} />
              <span className={cn("grid size-7 shrink-0 place-items-center rounded-full text-xs font-bold", done ? "bg-primary text-white" : "bg-line text-muted")}>
                {done ? <Check className="size-4" /> : i + 1}
              </span>
              <span className={cn("h-0.5 flex-1", i === ORDER_STEPS.length - 1 ? "bg-transparent" : i < current ? "bg-primary" : "bg-line")} />
            </div>
            <span className={cn("text-xs font-semibold", done ? "text-navy" : "text-muted")}>{s.label}</span>
          </li>
        );
      })}
    </ol>
  );
}
