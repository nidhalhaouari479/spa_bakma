"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { ArrowLeft, Banknote, Copy, FileText, Landmark, ShieldCheck, ShoppingBag, Trash2, UploadCloud } from "lucide-react";
import { PageHeader } from "@/components/espace/EspaceShell";
import { Alert, AnimalThumb, Button, Card, Checkbox, EmptyState, Field, Input, PageLoader, Textarea, useToast } from "@/components/ui";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@/hooks/useQuery";
import { formatAge, formatPrice, formatRib, SEX_LABEL } from "@/lib/labels";
import { uploadPrivateDocument } from "@/lib/storage";
import { errorMessage, getSupabase } from "@/lib/supabase";
import type { Animal, PaymentSettings } from "@/lib/types";

const MAX_SIZE = 10 * 1024 * 1024;
const ACCEPT = "image/jpeg,image/png,image/webp,application/pdf";

/** Achat d'un animal : virement sur le compte Bakma puis envoi du reçu à l'administrateur. */
export default function BuyAnimalPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const router = useRouter();
  const toast = useToast();
  const input = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [note, setNote] = useState("");
  const [payerName, setPayerName] = useState("");
  const [payerAccount, setPayerAccount] = useState("");
  const [accepted, setAccepted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const data = useQuery(async () => {
    const supabase = getSupabase();
    const [a, s, r] = await Promise.all([
      supabase.from("animals").select("*, category:categories!animals_category_id_fkey(*)").eq("id", id).maybeSingle(),
      supabase.from("settings").select("value").eq("key", "payment").maybeSingle(),
      supabase.rpc("is_animal_reserved", { p_animal_id: id }),
    ]);
    if (a.error && (a.error as { code?: string }).code !== "22P02") throw a.error;
    return {
      animal: (a.data ?? null) as Animal | null,
      payment: ((s.data as { value: PaymentSettings } | null)?.value ?? {}) as PaymentSettings,
      reserved: r.data === true,
    };
  }, [id]);

  if (data.loading && !data.data) return <PageLoader />;
  if (data.error) return <Alert>{data.error}</Alert>;

  const animal = data.data?.animal ?? null;
  const payment = data.data?.payment ?? {};
  const holdDays = payment.hold_days || 8;
  const rib = (payment.rib ?? "").replace(/\D/g, "");

  const blocker = !animal
    ? "Cette annonce n'existe pas ou n'est plus disponible."
    : animal.listing_type !== "vente"
      ? "Cet animal est proposé à l'adoption, il n'est pas à vendre."
      : animal.owner_id === user?.id
        ? "Vous ne pouvez pas acheter votre propre animal."
        : animal.status !== "publiee"
          ? "Cet animal n'est plus disponible à la vente."
          : data.data?.reserved
            ? "Un autre acheteur a déjà envoyé un paiement pour cet animal : il est réservé le temps de la vérification."
            : null;

  if (blocker || !animal) {
    return (
      <Card>
        <EmptyState
          icon={<ShoppingBag />}
          title="Achat impossible"
          text={blocker ?? undefined}
          action={<Button href={animal ? `/animaux/${animal.id}` : "/animaux"}>{animal ? "Retour à l'annonce" : "Voir les animaux"}</Button>}
        />
      </Card>
    );
  }

  function pick(files: FileList | null) {
    const f = files?.[0];
    if (!f) return;
    if (!ACCEPT.split(",").includes(f.type)) return setErr("Format non accepté : photo (JPG, PNG, WEBP) ou PDF.");
    if (f.size > MAX_SIZE) return setErr("Le reçu dépasse 10 Mo.");
    setErr(null);
    setFile(f);
  }

  async function copy(text: string) {
    try {
      await navigator.clipboard.writeText(text);
      toast("Copié dans le presse-papiers", "info");
    } catch {
      /* presse-papiers indisponible */
    }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!user || !animal) return;
    if (!file) return setErr("Ajoutez le reçu de votre virement.");
    const accountDigits = payerAccount.replace(/\D/g, "");
    if (payerName.trim().length < 3) return setErr("Indiquez le nom du titulaire du compte qui a fait le virement.");
    if (accountDigits.length < 8 || accountDigits.length > 24) return setErr("Le numéro de compte (RIB) doit contenir entre 8 et 24 chiffres.");
    if (!accepted) return setErr("Veuillez accepter les conditions d'achat.");
    setBusy(true);
    setErr(null);
    try {
      const path = await uploadPrivateDocument(user.id, file, "receipts");
      const { error } = await getSupabase().rpc("create_purchase", {
        p_animal_id: animal.id,
        p_receipt_path: path,
        p_payer_name: payerName.trim(),
        p_payer_account: accountDigits,
        p_receipt_name: file.name,
        p_note: note.trim() || null,
      });
      if (error) {
        await getSupabase().storage.from("vet-documents").remove([path]);
        throw error;
      }
      toast("Reçu envoyé : Bakma vérifie votre paiement.");
      router.push("/espace/achats");
    } catch (e2) {
      setErr(errorMessage(e2));
      setBusy(false);
    }
  }

  const sub = [animal.category?.name, animal.breed, formatAge(animal.age_value, animal.age_unit), animal.sex ? SEX_LABEL[animal.sex] : null]
    .filter(Boolean)
    .join(" · ");

  return (
    <div>
      <Link href={`/animaux/${animal.id}`} className="mb-4 inline-flex items-center gap-2 text-sm font-bold text-primary hover:underline">
        <ArrowLeft className="size-4" /> Retour à l&apos;annonce
      </Link>
      <PageHeader title={`Acheter ${animal.name}`} subtitle="Paiement sécurisé par virement bancaire sur le compte Bakma." />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <form onSubmit={submit} className="space-y-6">
          {/* Étape 1 : virement */}
          <Card className="p-5 sm:p-6">
            <h2 className="flex items-center gap-3 text-lg font-extrabold">
              <span className="grid size-8 place-items-center rounded-full bg-primary text-sm text-white">1</span>
              Faites le virement
            </h2>
            {rib.length !== 20 ? (
              <div className="mt-4">
                <Alert tone="orange">Le paiement par virement n&apos;est pas encore configuré par Bakma. Réessayez un peu plus tard.</Alert>
              </div>
            ) : (
              <>
                <p className="mt-2 text-sm text-body">Virez exactement le montant ci-dessous sur le compte de Bakma Store, jamais directement au vendeur.</p>
                <dl className="mt-4 divide-y divide-line/70 rounded-2xl border border-line">
                  <Row icon={<Banknote />} label="Montant" value={formatPrice(animal.price, "vente")} strong onCopy={() => copy(String(animal.price))} />
                  <Row icon={<Landmark />} label="Titulaire" value={payment.account_holder || "Bakma Store"} />
                  {payment.bank_name && <Row icon={<Landmark />} label="Banque" value={payment.bank_name} />}
                  <Row icon={<FileText />} label="RIB" value={formatRib(rib)} mono onCopy={() => copy(rib)} />
                  <Row icon={<FileText />} label="Motif" value={`BAKMA ${animal.name}`} onCopy={() => copy(`BAKMA ${animal.name}`)} />
                </dl>
              </>
            )}
          </Card>

          {/* Étape 2 : reçu */}
          <Card className="p-5 sm:p-6">
            <h2 className="flex items-center gap-3 text-lg font-extrabold">
              <span className="grid size-8 place-items-center rounded-full bg-primary text-sm text-white">2</span>
              Envoyez le reçu du virement
            </h2>
            <p className="mt-2 text-sm text-body">Photo ou PDF du reçu (ou capture de l&apos;application bancaire). Il n&apos;est visible que par Bakma.</p>
            {file ? (
              <div className="mt-4 flex items-center gap-3 rounded-2xl border border-line bg-white p-3">
                <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-primary-soft text-primary">
                  <FileText className="size-5" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-navy">{file.name}</p>
                  <p className="text-xs text-muted">{(file.size / 1024 / 1024).toFixed(1)} Mo</p>
                </div>
                <button type="button" onClick={() => setFile(null)} className="grid size-9 place-items-center rounded-lg text-navy hover:bg-red-50 hover:text-red-600" aria-label="Retirer le reçu">
                  <Trash2 className="size-4" />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => input.current?.click()}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  pick(e.dataTransfer.files);
                }}
                className="mt-4 flex w-full flex-col items-center gap-2 rounded-2xl border-2 border-dashed border-primary/40 bg-primary-soft/40 px-4 py-8 text-center transition hover:bg-primary-soft/70"
              >
                <span className="grid size-12 place-items-center rounded-full bg-white text-primary shadow-sm">
                  <UploadCloud className="size-6" />
                </span>
                <span className="text-sm font-bold text-navy">Glissez le reçu ici ou cliquez pour parcourir</span>
                <span className="text-xs text-muted">JPG, PNG, WEBP ou PDF · 10 Mo max</span>
              </button>
            )}
            <input ref={input} type="file" accept={ACCEPT} className="sr-only" onChange={(e) => { pick(e.target.files); e.target.value = ""; }} />
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <Field label="Nom du titulaire du compte *" hint="Tel qu'il apparaît sur le reçu.">
                <Input value={payerName} onChange={(e) => setPayerName(e.target.value)} maxLength={120} autoComplete="name" placeholder="Ex. Mohamed Ben Ali" required />
              </Field>
              <Field
                label="Numéro de compte (RIB) *"
                hint={payerAccount.replace(/\D/g, "").length === 20 ? formatRib(payerAccount) : "Le compte qui a envoyé le virement."}
              >
                <Input
                  value={payerAccount}
                  onChange={(e) => setPayerAccount(e.target.value.replace(/[^\d\s]/g, ""))}
                  inputMode="numeric"
                  maxLength={30}
                  className="font-mono"
                  placeholder="20 chiffres"
                  required
                />
              </Field>
            </div>
            <Field label="Message pour Bakma (facultatif)" className="mt-4">
              <Textarea value={note} onChange={(e) => setNote(e.target.value)} maxLength={500} placeholder="Ex. date du virement, disponibilités pour la remise de l'animal…" />
            </Field>
          </Card>

          <Card className="space-y-4 p-5 sm:p-6">
            <Checkbox
              checked={accepted}
              onChange={(e) => setAccepted(e.target.checked)}
              label={`J'ai effectué le virement. Je comprends que Bakma conserve le paiement pendant ${holdDays} jours de garantie après sa validation, et que tout échange avec le vendeur passe par Bakma.`}
            />
            <Alert>{err}</Alert>
            <Button type="submit" size="lg" className="w-full" loading={busy} disabled={rib.length !== 20} icon={<ShoppingBag className="size-5" />}>
              Envoyer le reçu à Bakma
            </Button>
          </Card>
        </form>

        {/* Récapitulatif */}
        <div className="space-y-4 lg:sticky lg:top-24 lg:self-start">
          <Card className="overflow-hidden">
            <AnimalThumb src={animal.cover_url} alt={animal.name} className="aspect-[4/3] w-full" />
            <div className="p-5">
              <p className="text-lg font-extrabold text-navy">{animal.name}</p>
              <p className="mt-1 text-sm text-muted">{sub}</p>
              <p className="mt-3 text-2xl font-extrabold text-primary">{formatPrice(animal.price, "vente")}</p>
            </div>
          </Card>
          <Card className="p-5">
            <h3 className="flex items-center gap-2 font-extrabold">
              <ShieldCheck className="size-5 text-emerald-600" /> Comment ça marche ?
            </h3>
            <ol className="mt-3 space-y-3 text-sm text-body">
              <li><strong className="text-navy">1. Vérification :</strong> Bakma vérifie la réception de votre virement.</li>
              <li><strong className="text-navy">2. Remise :</strong> une fois validé, l&apos;animal vous est réservé et Bakma organise la remise.</li>
              <li><strong className="text-navy">3. Garantie {holdDays} jours :</strong> en cas de problème, signalez-le depuis « Mes achats ».</li>
              <li><strong className="text-navy">4. Versement :</strong> le vendeur n&apos;est payé qu&apos;après la garantie. Sinon, vous êtes remboursé.</li>
            </ol>
          </Card>
        </div>
      </div>
    </div>
  );
}

function Row({ icon, label, value, strong, mono, onCopy }: { icon: React.ReactNode; label: string; value: string; strong?: boolean; mono?: boolean; onCopy?: () => void }) {
  return (
    <div className="flex items-center gap-3 px-4 py-3 text-sm">
      <span className="text-muted [&>svg]:size-4">{icon}</span>
      <dt className="w-20 shrink-0 text-body">{label}</dt>
      <dd className={`min-w-0 flex-1 break-all text-navy ${strong ? "text-lg font-extrabold text-primary" : "font-semibold"} ${mono ? "font-mono tracking-wide" : ""}`}>{value}</dd>
      {onCopy && (
        <button type="button" onClick={onCopy} className="grid size-8 shrink-0 place-items-center rounded-lg text-muted hover:bg-primary-soft hover:text-primary" aria-label={`Copier : ${label}`}>
          <Copy className="size-4" />
        </button>
      )}
    </div>
  );
}
