"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ArrowLeft, ArrowRight, CalendarClock, Check, IdCard, Phone, Send, Upload } from "lucide-react";
import { openPrivate } from "@/components/espace/AnimalDocuments";
import { Alert, Button, Card, cn, EmptyState, Field, Input, PageLoader, useToast } from "@/components/ui";
import { useAuth } from "@/hooks/useAuth";
import { unwrap, useQuery } from "@/hooks/useQuery";
import { formatDateTime } from "@/lib/labels";
import { uploadPrivateDocument } from "@/lib/storage";
import { errorMessage, getSupabase } from "@/lib/supabase";
import type { OwnerIdentity } from "@/lib/types";
import { ANIMAL_OWNER, canSubmit, missingFields, type OwnerAnimal } from "@/lib/workflow";

const STEPS = [
  { label: "Coordonnées", icon: IdCard },
  { label: "Dates de consultation", icon: CalendarClock },
];

const MAX_SIZE = 10 * 1024 * 1024; // 10 Mo

type Loaded = {
  animal: OwnerAnimal | null;
  phone: string;
  identity: OwnerIdentity | null;
};

/** Valeur pour <input type="datetime-local"> (heure locale). */
function toLocalInput(d: Date): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
}

/**
 * Soumission d'une annonce en 2 étapes (les documents se déposent dans le formulaire d'annonce) :
 * 1. téléphone + CIN (obligatoires) · 2. trois dates pour la consultation.
 */
export function SubmitWizard({ animalId }: { animalId: string }) {
  const { user } = useAuth();
  const uid = user?.id;

  const q = useQuery<Loaded>(
    async () => {
      const supabase = getSupabase();
      const [animal, contact, identity] = await Promise.all([
        supabase.from("animals").select(ANIMAL_OWNER).eq("id", animalId).eq("owner_id", uid!).maybeSingle(),
        supabase.from("profile_contacts").select("phone").eq("id", uid!).maybeSingle(),
        supabase.from("owner_identities").select("*").eq("profile_id", uid!).maybeSingle(),
      ]);
      return {
        animal: unwrap<OwnerAnimal | null>(animal),
        phone: unwrap<{ phone: string | null } | null>(contact)?.phone ?? "",
        identity: unwrap<OwnerIdentity | null>(identity),
      };
    },
    [animalId, uid],
    !!uid,
  );

  if (!q.data) {
    if (q.error) return <Alert>{q.error}</Alert>;
    return <PageLoader />;
  }
  const { animal } = q.data;
  if (!animal) {
    return (
      <Card>
        <EmptyState title="Annonce introuvable" action={<Button href="/espace/annonces">Mes annonces</Button>} />
      </Card>
    );
  }
  if (!canSubmit(animal)) {
    return (
      <Card>
        <EmptyState
          title="Cette annonce est déjà en cours de traitement"
          text="Suivez l'avancement de la vérification depuis la page de l'annonce."
          action={<Button href={`/espace/annonces/${animal.id}`}>Voir le suivi</Button>}
        />
      </Card>
    );
  }
  const missing = missingFields(animal);
  if (missing.length) {
    return (
      <Card>
        <EmptyState
          title="Annonce incomplète"
          text={`Complétez d'abord : ${missing.join(", ")}.`}
          action={<Button href={`/espace/annonces/${animal.id}/modifier`}>Compléter l&apos;annonce</Button>}
        />
      </Card>
    );
  }
  return <Wizard uid={uid!} animal={animal} initial={q.data} reload={q.reload} />;
}

function Wizard({ uid, animal, initial, reload }: { uid: string; animal: OwnerAnimal; initial: Loaded; reload: () => void }) {
  const router = useRouter();
  const toast = useToast();
  const [step, setStep] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Étape 1 : coordonnées
  const [phone, setPhone] = useState(initial.phone);
  const [cin, setCin] = useState(initial.identity?.cin_number ?? "");
  const [cinFile, setCinFile] = useState<File | null>(null);
  const [cinPreview, setCinPreview] = useState<string | null>(null);

  // Étape 2 : dates
  const [slots, setSlots] = useState<string[]>(["", "", ""]);
  const [minDate] = useState(() => toLocalInput(new Date(Date.now() + 60 * 60 * 1000)));

  function go(i: number) {
    setError(null);
    setStep(i);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function saveContact() {
    setError(null);
    const digits = phone.replace(/\D/g, "");
    if (digits.length < 8) return setError("Indiquez un numéro de téléphone valide (8 chiffres minimum).");
    if (!/^\d{8}$/.test(cin.trim())) return setError("Le numéro de CIN doit contenir 8 chiffres.");
    if (!cinFile && !initial.identity?.cin_photo_path) return setError("Ajoutez une photo de votre carte d'identité (CIN).");
    setBusy(true);
    try {
      const supabase = getSupabase();
      const c = await supabase.from("profile_contacts").update({ phone: phone.trim() }).eq("id", uid);
      if (c.error) throw c.error;
      let path = initial.identity?.cin_photo_path ?? "";
      if (cinFile) {
        path = await uploadPrivateDocument(uid, cinFile, "cin");
        const old = initial.identity?.cin_photo_path;
        if (old && old !== path) await supabase.storage.from("vet-documents").remove([old]);
      }
      const i = await supabase
        .from("owner_identities")
        .upsert({ profile_id: uid, cin_number: cin.trim(), cin_photo_path: path, updated_at: new Date().toISOString() });
      if (i.error) throw i.error;
      setCinFile(null);
      reload();
      go(1);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  async function submit() {
    setError(null);
    if (slots.some((s) => !s)) return setError("Choisissez 3 dates.");
    const dates = slots.map((s) => new Date(s));
    if (dates.some((d) => d.getTime() <= Date.now())) return setError("Les dates doivent être dans le futur.");
    if (new Set(dates.map((d) => d.getTime())).size !== 3) return setError("Les 3 dates doivent être différentes.");
    setBusy(true);
    try {
      const { error: err } = await getSupabase().rpc("submit_animal", {
        p_animal_id: animal.id,
        p_slots: dates.map((d) => d.toISOString()),
      });
      if (err) throw err;
      toast("Annonce soumise : un vétérinaire va choisir une de vos dates");
      router.push(`/espace/annonces/${animal.id}`);
    } catch (e) {
      setError(errorMessage(e));
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-6 flex items-start gap-3">
        <Link href={`/espace/annonces/${animal.id}`} className="mt-1 grid size-10 shrink-0 place-items-center rounded-full bg-white text-navy shadow-sm hover:text-primary" aria-label="Retour">
          <ArrowLeft className="size-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">Soumettre « {animal.name} »</h1>
          <p className="mt-1 text-sm text-body">Dernières étapes avant la vérification par un vétérinaire.</p>
        </div>
      </div>

      {/* Étapes */}
      <ol className="mb-6 grid grid-cols-2 gap-2">
        {STEPS.map((s, i) => {
          const Icon = s.icon;
          return (
            <li
              key={s.label}
              className={cn(
                "flex items-center gap-2 rounded-xl border px-3 py-2.5 text-xs font-bold sm:text-sm",
                i === step ? "border-primary bg-primary-soft/60 text-primary" : i < step ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-line bg-white text-muted",
              )}
            >
              {i < step ? <Check className="size-4 shrink-0" /> : <Icon className="size-4 shrink-0" />}
              <span className="truncate">{s.label}</span>
            </li>
          );
        })}
      </ol>

      <Card className="p-5 sm:p-7">
        {step === 0 && (
          <div className="space-y-5">
            <div>
              <h2 className="text-lg font-extrabold">Confirmez vos coordonnées</h2>
              <p className="mt-1 text-sm text-body">Obligatoire. Votre CIN n&apos;est visible que par l&apos;administration de Bakma Store.</p>
            </div>
            <Field label="Numéro de téléphone *">
              <Input type="tel" icon={<Phone />} value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+216 XX XXX XXX" autoComplete="tel" />
            </Field>
            <Field label="Numéro de CIN *">
              <Input icon={<IdCard />} value={cin} onChange={(e) => setCin(e.target.value.replace(/\D/g, "").slice(0, 8))} inputMode="numeric" placeholder="8 chiffres" />
            </Field>
            <Field label="Photo de la carte d'identité (CIN) *" hint="Photo nette du recto, JPG ou PNG, 10 Mo maximum.">
              <div className="flex flex-wrap items-center gap-4">
                {cinPreview ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={cinPreview} alt="Aperçu CIN" className="h-24 w-36 rounded-lg border border-line object-cover" />
                ) : initial.identity?.cin_photo_path ? (
                  <button
                    type="button"
                    onClick={() => openPrivate(initial.identity!.cin_photo_path).catch(() => toast("Impossible d'ouvrir la photo", "error"))}
                    className="flex h-24 w-36 flex-col items-center justify-center gap-1 rounded-lg border border-emerald-200 bg-emerald-50 text-xs font-semibold text-emerald-700"
                  >
                    <Check className="size-5" /> Photo enregistrée
                  </button>
                ) : null}
                <label className="inline-flex cursor-pointer items-center gap-2 rounded-[var(--radius-btn)] border border-line bg-white px-4 py-2.5 text-sm font-semibold text-navy hover:border-primary hover:text-primary">
                  <Upload className="size-4" />
                  {cinFile || initial.identity?.cin_photo_path ? "Remplacer la photo" : "Choisir une photo"}
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    className="sr-only"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      e.target.value = "";
                      if (!f) return;
                      if (f.size > MAX_SIZE) return setError("La photo dépasse 10 Mo.");
                      setError(null);
                      setCinFile(f);
                      setCinPreview(URL.createObjectURL(f));
                    }}
                  />
                </label>
              </div>
            </Field>
          </div>
        )}

        {step === 1 && (
          <div className="space-y-5">
            <div>
              <h2 className="text-lg font-extrabold">Proposez 3 dates pour la consultation</h2>
              <p className="mt-1 text-sm text-body">
                Choisissez 3 créneaux où vous êtes disponible. Le vétérinaire désigné en choisira un et vous serez notifié.
              </p>
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              {slots.map((v, i) => (
                <Field key={i} label={`Date ${i + 1} *`}>
                  <Input
                    type="datetime-local"
                    min={minDate}
                    value={v}
                    onChange={(e) => setSlots((s) => s.map((x, j) => (j === i ? e.target.value : x)))}
                  />
                </Field>
              ))}
            </div>
            {slots.every(Boolean) && (
              <ul className="space-y-1 rounded-xl bg-page px-4 py-3 text-sm text-body">
                {slots.map((v, i) => (
                  <li key={i} className="flex items-center gap-2">
                    <CalendarClock className="size-4 text-primary" /> {formatDateTime(new Date(v).toISOString())}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        <div className="mt-5">
          <Alert>{error}</Alert>
        </div>

        <div className="mt-6 flex flex-wrap justify-between gap-3 border-t border-line pt-5">
          <Button variant="outline" disabled={busy || step === 0} onClick={() => go(step - 1)} icon={<ArrowLeft className="size-4" />}>
            Précédent
          </Button>
          {step === 0 && (
            <Button loading={busy} onClick={saveContact} icon={<ArrowRight className="size-4" />}>
              Confirmer et continuer
            </Button>
          )}
          {step === 1 && (
            <Button loading={busy} onClick={submit} icon={<Send className="size-4" />}>
              Soumettre pour vérification
            </Button>
          )}
        </div>
      </Card>
    </div>
  );
}
