"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { AlertTriangle, FileText, Headset, Landmark, Pencil, Save, ShieldCheck, ShoppingBag, Store, X } from "lucide-react";
import { PageHeader } from "@/components/espace/EspaceShell";
import { PaymentPanel, PaymentSummary } from "@/components/espace/PaymentPanel";
import { Alert, AnimalThumb, Button, Card, cn, EmptyState, Field, Input, MetaBadge, Modal, PageLoader, Tabs, Textarea, useToast } from "@/components/ui";
import { useAuth } from "@/hooks/useAuth";
import { unwrap, useQuery } from "@/hooks/useQuery";
import { formatDate, formatDateTime, formatPrice, formatRib, PURCHASE_STATUS, type Tone } from "@/lib/labels";
import { signedDocumentUrl } from "@/lib/storage";
import { contactBakma } from "@/lib/contacts";
import { errorMessage, getSupabase } from "@/lib/supabase";
import type { PayoutAccount, Purchase, PurchaseStatus, Sale } from "@/lib/types";

type TabKey = "achats" | "ventes";

const PURCHASE_SELECT = "*, animal:animals!purchases_animal_id_fkey(id,name,cover_url,status)";

/** Étapes communes acheteur / vendeur (index de l'étape atteinte). */
const STEPS = ["Reçu envoyé", "Paiement validé", "Garantie", "Finalisé"];
function stepIndex(s: PurchaseStatus, releaseAt: string | null): number {
  if (s === "paiement_a_verifier") return 0;
  if (s === "garantie" || s === "litige") return releaseAt && new Date(releaseAt) <= new Date() ? 2 : 1;
  if (s === "versee" || s === "remboursee") return 3;
  return -1; // refusé / annulé
}

/** Libellés vus par le vendeur (il ne voit jamais l'acheteur). */
const SALE_STATUS: Record<PurchaseStatus, { label: string; tone: Tone }> = {
  paiement_a_verifier: { label: "Paiement en vérification", tone: "orange" },
  paiement_refuse: { label: "Paiement non validé", tone: "grey" },
  annulee: { label: "Annulé", tone: "grey" },
  garantie: { label: "Vendu — garantie en cours", tone: "blue" },
  litige: { label: "Versement suspendu", tone: "red" },
  versee: { label: "Paiement versé", tone: "green" },
  remboursee: { label: "Vente annulée", tone: "grey" },
};

export default function PurchasesPage() {
  const onglet = useSearchParams().get("onglet");
  const [tab, setTab] = useState<TabKey>(onglet === "ventes" ? "ventes" : "achats");
  return (
    <div>
      <PageHeader title="Achats & ventes" subtitle="Paiements sécurisés par Bakma : le vendeur est payé après la période de garantie." />
      <div className="mb-6">
        <Tabs<TabKey>
          value={tab}
          onChange={setTab}
          items={[
            { value: "achats", label: "Mes achats", icon: <ShoppingBag className="size-4" /> },
            { value: "ventes", label: "Mes ventes", icon: <Store className="size-4" /> },
          ]}
        />
      </div>
      {tab === "achats" ? <MyPurchases /> : <MySales />}
    </div>
  );
}

// ------------------------------------------------------------------ acheteur
function MyPurchases() {
  const { user } = useAuth();
  const uid = user?.id;
  const toast = useToast();
  const router = useRouter();
  const [dispute, setDispute] = useState<Purchase | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const list = useQuery(
    async () => unwrap<Purchase[]>(await getSupabase().from("purchases").select(PURCHASE_SELECT).eq("buyer_id", uid!).order("created_at", { ascending: false })),
    [uid],
    !!uid,
  );

  async function openReceipt(p: Purchase) {
    const w = window.open("", "_blank");
    const url = await signedDocumentUrl(p.receipt_path);
    if (!url) {
      w?.close();
      return toast("Impossible d'ouvrir le reçu.", "error");
    }
    if (w) w.location.href = url;
    else window.location.assign(url);
  }

  async function cancel(p: Purchase) {
    if (!window.confirm("Annuler cet achat ? Si vous avez déjà fait le virement, contactez le support Bakma pour être remboursé.")) return;
    setBusy(p.id);
    const { error } = await getSupabase().rpc("cancel_purchase", { p_purchase_id: p.id });
    setBusy(null);
    if (error) return toast(errorMessage(error), "error");
    toast("Achat annulé");
    list.reload();
  }

  async function contactSupport(p: Purchase) {
    setBusy(`support-${p.id}`);
    try {
      const convId = await contactBakma(p.animal_id);
      router.push(`/espace/messages?c=${convId}`);
    } catch (e) {
      toast(errorMessage(e), "error");
      setBusy(null);
    }
  }

  if (list.loading && !list.data) return <PageLoader />;
  const rows = list.data ?? [];

  return (
    <>
      {list.error && <Alert>{list.error}</Alert>}
      {rows.length === 0 ? (
        <Card>
          <EmptyState
            icon={<ShoppingBag />}
            title="Aucun achat pour le moment"
            text="Les animaux à vendre s'achètent en toute sécurité : vous payez Bakma, le vendeur est payé après la garantie."
            action={<Button href="/animaux">Découvrir les animaux</Button>}
          />
        </Card>
      ) : (
        <div className="space-y-4">
          <PaymentSummary rows={rows} role="buyer" />
          {rows.map((p) => {
            const inGuarantee = p.status === "garantie" && !!p.release_at && new Date(p.release_at) > new Date();
            return (
              <Card key={p.id} className="p-5">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
                  <Link href={`/animaux/${p.animal_id}`} className="shrink-0">
                    <AnimalThumb src={p.animal?.cover_url} alt={p.animal?.name} className="size-20 rounded-2xl" />
                  </Link>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-lg font-extrabold text-navy">{p.animal?.name ?? "Animal"}</p>
                      <MetaBadge meta={p.status === "versee" ? { label: "Achat finalisé", tone: "green" } : PURCHASE_STATUS[p.status]} />
                    </div>
                    <p className="mt-0.5 text-sm text-muted">
                      {p.ref} · {formatPrice(p.amount, "vente")} · envoyé le {formatDate(p.created_at)}
                    </p>
                    <Progress status={p.status} releaseAt={p.release_at} />
                    <PaymentPanel p={p} role="buyer" className="mt-4" />
                    <div className="mt-3 space-y-2 text-sm empty:hidden">
                      {p.status === "paiement_refuse" && p.refusal_reason && <Alert tone="red">Motif : {p.refusal_reason}</Alert>}
                      {inGuarantee && (
                        <p className="text-[13px] text-body">
                          Bakma vous contacte pour la remise de l&apos;animal. En cas de problème, signalez-le avant le {formatDateTime(p.release_at)}.
                        </p>
                      )}
                      {p.status === "litige" && p.disputed_at && <p className="text-[13px] text-body">Problème signalé le {formatDate(p.disputed_at)}.</p>}
                      {p.status === "remboursee" && p.refund_reference && <p className="text-[13px] text-body">Référence du remboursement : {p.refund_reference}</p>}
                    </div>
                  </div>
                </div>
                <div className="mt-4 flex flex-wrap justify-end gap-2 border-t border-line pt-4">
                  <Button size="sm" variant="ghost" icon={<FileText className="size-4" />} onClick={() => openReceipt(p)}>
                    Voir mon reçu
                  </Button>
                  <Button size="sm" variant="outline" icon={<Headset className="size-4" />} loading={busy === `support-${p.id}`} onClick={() => contactSupport(p)}>
                    Contacter Bakma
                  </Button>
                  {p.status === "paiement_a_verifier" && (
                    <Button size="sm" variant="outline" className="text-red-600" loading={busy === p.id} icon={<X className="size-4" />} onClick={() => cancel(p)}>
                      Annuler
                    </Button>
                  )}
                  {p.status === "paiement_refuse" && p.animal?.status === "publiee" && (
                    <Button size="sm" href={`/espace/achats/acheter/${p.animal_id}`}>
                      Envoyer un nouveau reçu
                    </Button>
                  )}
                  {inGuarantee && (
                    <Button size="sm" variant="danger" icon={<AlertTriangle className="size-4" />} onClick={() => setDispute(p)}>
                      Signaler un problème
                    </Button>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}
      <DisputeModal purchase={dispute} onClose={() => setDispute(null)} onDone={list.reload} />
    </>
  );
}

function DisputeModal({ purchase, onClose, onDone }: { purchase: Purchase | null; onClose: () => void; onDone: () => void }) {
  const toast = useToast();
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function send() {
    if (!purchase) return;
    if (reason.trim().length < 10) return setErr("Décrivez le problème (10 caractères minimum).");
    setBusy(true);
    setErr(null);
    const { error } = await getSupabase().rpc("open_purchase_dispute", { p_purchase_id: purchase.id, p_reason: reason.trim() });
    setBusy(false);
    if (error) return setErr(errorMessage(error));
    toast("Problème signalé : le versement au vendeur est suspendu.");
    setReason("");
    onClose();
    onDone();
  }

  return (
    <Modal
      open={!!purchase}
      onClose={onClose}
      title="Signaler un problème"
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={busy}>
            Annuler
          </Button>
          <Button variant="danger" onClick={send} loading={busy}>
            Signaler
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <p className="text-sm text-body">
          Animal malade, non conforme à l&apos;annonce, non remis… Bakma bloque le paiement du vendeur, examine la situation et peut vous rembourser.
        </p>
        <Field label="Décrivez le problème">
          <Textarea value={reason} onChange={(e) => setReason(e.target.value)} maxLength={2000} placeholder="Ex. l'animal présente des symptômes depuis la remise…" />
        </Field>
        <Alert>{err}</Alert>
      </div>
    </Modal>
  );
}

function Progress({ status, releaseAt }: { status: PurchaseStatus; releaseAt: string | null }) {
  const idx = stepIndex(status, releaseAt);
  if (idx < 0) return null;
  return (
    <ol className="mt-3 flex items-center gap-1.5">
      {STEPS.map((label, i) => (
        <li key={label} className="flex min-w-0 flex-1 flex-col gap-1">
          <span className={cn("h-1.5 rounded-full", i <= idx ? (status === "litige" && i === idx ? "bg-red-500" : "bg-primary") : "bg-line")} />
          <span className={cn("truncate text-[11px] font-semibold", i <= idx ? "text-navy" : "text-muted")}>{label}</span>
        </li>
      ))}
    </ol>
  );
}

// ------------------------------------------------------------------ vendeur
function MySales() {
  const { user } = useAuth();
  const uid = user?.id;

  const data = useQuery(
    async () => {
      const sb = getSupabase();
      const [sales, account] = await Promise.all([sb.rpc("my_sales"), sb.from("payout_accounts").select("*").eq("profile_id", uid!).maybeSingle()]);
      return { sales: unwrap<Sale[]>(sales), account: (account.data ?? null) as PayoutAccount | null };
    },
    [uid],
    !!uid,
  );

  if (data.loading && !data.data) return <PageLoader />;
  const sales = data.data?.sales ?? [];
  const pending = sales.some((s) => ["garantie", "litige"].includes(s.status));

  return (
    <div className="space-y-6">
      {data.error && <Alert>{data.error}</Alert>}
      {sales.length > 0 && <PaymentSummary rows={sales} role="seller" />}
      <PayoutAccountCard account={data.data?.account ?? null} uid={uid!} highlight={pending && !data.data?.account} onSaved={data.reload} />

      <Card className="p-5">
        <h2 className="text-lg font-extrabold">Mes ventes</h2>
        <p className="mt-1 text-sm text-body">
          Les acheteurs paient Bakma. Le montant vous est versé après la période de garantie, si aucun problème n&apos;est signalé.
        </p>
        {sales.length === 0 ? (
          <EmptyState icon={<Store />} title="Aucune vente pour le moment" text="Publiez un animal « à vendre » : les acheteurs l'achètent via Bakma." />
        ) : (
          <ul className="mt-4 divide-y divide-line/70">
            {sales.map((s) => (
              <li key={s.id} className="flex flex-col gap-3 py-4 sm:flex-row sm:items-start">
                <AnimalThumb src={s.animal_cover} alt={s.animal_name} className="size-16 shrink-0 rounded-xl" />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-extrabold text-navy">{s.animal_name}</p>
                    <MetaBadge meta={SALE_STATUS[s.status]} />
                  </div>
                  <p className="text-sm text-muted">
                    {s.ref} · {formatPrice(s.amount, "vente")}
                  </p>
                  <Progress status={s.status} releaseAt={s.release_at} />
                  <PaymentPanel p={s} role="seller" className="mt-3" />
                  {s.status === "versee" && s.payout_reference && <p className="mt-2 text-[13px] text-body">Référence du virement : {s.payout_reference}</p>}
                  {s.status === "paiement_refuse" && <p className="mt-2 text-[13px] text-body">Votre annonce reste en ligne.</p>}
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}

function PayoutAccountCard({ account, uid, highlight, onSaved }: { account: PayoutAccount | null; uid: string; highlight: boolean; onSaved: () => void }) {
  const toast = useToast();
  const [editing, setEditing] = useState(!account);
  const [holder, setHolder] = useState(account?.account_holder ?? "");
  const [bank, setBank] = useState(account?.bank_name ?? "");
  const [rib, setRib] = useState(account?.rib ?? "");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    const digits = rib.replace(/\D/g, "");
    if (!holder.trim()) return setErr("Le titulaire du compte est obligatoire.");
    if (digits.length !== 20) return setErr("Le RIB doit contenir exactement 20 chiffres.");
    setBusy(true);
    setErr(null);
    const { error } = await getSupabase()
      .from("payout_accounts")
      .upsert({ profile_id: uid, account_holder: holder.trim(), bank_name: bank.trim() || null, rib: digits, updated_at: new Date().toISOString() });
    setBusy(false);
    if (error) return setErr(errorMessage(error));
    toast("Coordonnées bancaires enregistrées");
    setEditing(false);
    onSaved();
  }

  return (
    <Card className={cn("p-5", highlight && "ring-2 ring-amber-400")}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 text-lg font-extrabold">
            <Landmark className="size-5 text-primary" /> Compte de versement
          </h2>
          <p className="mt-1 text-sm text-body">Le RIB sur lequel Bakma vous verse le prix de vos ventes. Visible uniquement par vous et Bakma.</p>
        </div>
        {account && !editing && (
          <Button size="sm" variant="outline" icon={<Pencil className="size-4" />} onClick={() => setEditing(true)}>
            Modifier
          </Button>
        )}
      </div>
      {highlight && (
        <div className="mt-3">
          <Alert tone="orange">Vous avez une vente en cours : renseignez votre RIB pour recevoir le paiement.</Alert>
        </div>
      )}
      {!editing && account ? (
        <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-3">
          <div>
            <dt className="text-muted">Titulaire</dt>
            <dd className="font-semibold text-navy">{account.account_holder}</dd>
          </div>
          <div>
            <dt className="text-muted">Banque</dt>
            <dd className="font-semibold text-navy">{account.bank_name || "—"}</dd>
          </div>
          <div>
            <dt className="text-muted">RIB</dt>
            <dd className="font-mono font-semibold tracking-wide text-navy">{formatRib(account.rib)}</dd>
          </div>
        </dl>
      ) : (
        <form onSubmit={save} className="mt-4 space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Titulaire du compte">
              <Input value={holder} onChange={(e) => setHolder(e.target.value)} placeholder="Nom et prénom" />
            </Field>
            <Field label="Banque (facultatif)">
              <Input value={bank} onChange={(e) => setBank(e.target.value)} placeholder="Ex. BIAT, Poste…" />
            </Field>
          </div>
          <Field label="RIB (20 chiffres)">
            <Input value={rib} onChange={(e) => setRib(e.target.value)} inputMode="numeric" placeholder="00 000 0000000000000 00" className="font-mono" />
          </Field>
          <Alert>{err}</Alert>
          <div className="flex justify-end gap-2">
            {account && (
              <Button type="button" variant="outline" onClick={() => setEditing(false)}>
                Annuler
              </Button>
            )}
            <Button type="submit" loading={busy} icon={<Save className="size-4" />}>
              Enregistrer
            </Button>
          </div>
        </form>
      )}
      <p className="mt-4 flex items-center gap-2 text-xs text-muted">
        <ShieldCheck className="size-4 text-emerald-600" /> Aucune information sur l&apos;acheteur ne vous est communiquée, et inversement.
      </p>
    </Card>
  );
}
