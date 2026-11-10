"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ArrowLeft, ArrowRight, Check, Crosshair, FileText, HeartPulse, Image as ImageIcon, Info, ListChecks, Pencil, Plus, Save, Send, Tag } from "lucide-react";
import { type DocDraft, DocumentsStep, MAX_DOCUMENTS, syncDocuments, toDrafts } from "@/components/espace/AnimalDocuments";
import { ImageUploader } from "@/components/ImageUploader";
import { Alert, Button, Card, cn, EmptyState, Field, Input, PageLoader, Select, Textarea, useToast } from "@/components/ui";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@/hooks/useQuery";
import { useCategories, useCharacteristics, useCities } from "@/hooks/useRefData";
import { SIZE_OPTIONS } from "@/lib/catalog";
import { iconFor } from "@/lib/icons";
import { AGE_UNIT_LABEL, formatAge, formatPrice, SEX_LABEL } from "@/lib/labels";
import { errorMessage, getSupabase } from "@/lib/supabase";
import type { AgeUnit, AnimalDocument, AnimalPhoto, AnimalSex, Characteristics, CharacteristicGroup, ListingType } from "@/lib/types";
import { ANIMAL_OWNER, canEdit, missingFields, needsReview, type OwnerAnimal } from "@/lib/workflow";

interface FormState {
  name: string;
  category_id: string;
  breed: string;
  age_value: string;
  age_unit: AgeUnit;
  sex: AnimalSex | "";
  color: string;
  size: string;
  weight_kg: string;
  city: string;
  latitude: string;
  longitude: string;
  short_description: string;
  description: string;
  characteristics: Characteristics;
  why_adopt: string;
  adoption_conditions: string;
  photos: string[];
  listing_type: ListingType;
  price: string;
}

const EMPTY: FormState = {
  name: "",
  category_id: "",
  breed: "",
  age_value: "",
  age_unit: "mois",
  sex: "",
  color: "",
  size: "",
  weight_kg: "",
  city: "",
  latitude: "",
  longitude: "",
  short_description: "",
  description: "",
  characteristics: {},
  why_adopt: "",
  adoption_conditions: "",
  photos: [],
  listing_type: "adoption",
  price: "",
};

const STEPS = [
  { label: "Informations", icon: Info },
  { label: "Santé & caractère", icon: HeartPulse },
  { label: "Photos", icon: ImageIcon },
  { label: "Documents", icon: FileText },
  { label: "Type & prix", icon: Tag },
  { label: "Récapitulatif", icon: ListChecks },
];

type Loaded = { animal: OwnerAnimal & { photos?: AnimalPhoto[] }; form: FormState; documents: DocDraft[] } | null;

function toForm(a: OwnerAnimal & { photos?: AnimalPhoto[] }): FormState {
  const s = (v: unknown) => (v == null ? "" : String(v));
  return {
    name: a.name ?? "",
    category_id: s(a.category_id),
    breed: s(a.breed),
    age_value: s(a.age_value),
    age_unit: a.age_unit ?? "mois",
    sex: a.sex ?? "",
    color: s(a.color),
    size: s(a.size),
    weight_kg: s(a.weight_kg),
    city: s(a.city),
    latitude: s(a.latitude),
    longitude: s(a.longitude),
    short_description: s(a.short_description),
    description: s(a.description),
    characteristics: a.characteristics ?? {},
    why_adopt: s(a.why_adopt),
    adoption_conditions: s(a.adoption_conditions),
    photos: [...(a.photos ?? [])].sort((x, y) => x.position - y.position).map((p) => p.url),
    listing_type: a.listing_type,
    price: a.listing_type === "vente" ? s(a.price) : "",
  };
}

/** Formulaire multi-étapes de création / modification d'une annonce. */
export function AnimalForm({ animalId }: { animalId?: string }) {
  const { user } = useAuth();
  const uid = user?.id;

  const loaded = useQuery<Loaded>(
    async () => {
      if (!animalId) return null;
      const supabase = getSupabase();
      const [{ data, error }, docs] = await Promise.all([
        supabase.from("animals").select(`${ANIMAL_OWNER}, photos:animal_photos!animal_photos_animal_id_fkey(*)`).eq("id", animalId).maybeSingle(),
        supabase.from("animal_documents").select("*").eq("animal_id", animalId).order("created_at"),
      ]);
      if (error) throw error;
      if (docs.error) throw docs.error;
      if (!data) throw new Error("Annonce introuvable");
      const animal = data as unknown as OwnerAnimal & { photos?: AnimalPhoto[] };
      if (animal.owner_id !== uid) throw new Error("Vous ne pouvez modifier que vos propres annonces");
      return { animal, form: toForm(animal), documents: toDrafts((docs.data ?? []) as AnimalDocument[]) };
    },
    [animalId, uid],
    !!uid,
  );

  if (animalId && loaded.loading) return <PageLoader />;
  if (loaded.error)
    return (
      <Card>
        <EmptyState title="Modification impossible" text={loaded.error} action={<Button href="/espace/annonces">Retour à mes annonces</Button>} />
      </Card>
    );
  const existing = loaded.data?.animal ?? null;
  if (existing && !canEdit(existing))
    return (
      <Card>
        <EmptyState
          icon={<Pencil />}
          title="Cette annonce ne peut pas être modifiée"
          text="Une annonce en cours de vérification, en attente d'approbation ou publiée n'est plus modifiable. Annulez la demande pour pouvoir la modifier."
          action={<Button href={`/espace/annonces/${existing.id}`}>Voir le suivi</Button>}
        />
      </Card>
    );

  return <FormBody key={existing?.id ?? "new"} existing={existing} initial={loaded.data?.form ?? EMPTY} initialDocs={loaded.data?.documents ?? []} uid={uid!} />;
}

function FormBody({ existing, initial, initialDocs, uid }: { existing: (OwnerAnimal & { photos?: AnimalPhoto[] }) | null; initial: FormState; initialDocs: DocDraft[]; uid: string }) {
  const router = useRouter();
  const toast = useToast();
  const { categories } = useCategories();
  const cities = useCities();
  const { groups } = useCharacteristics();
  const [form, setForm] = useState<FormState>(initial);
  const [docs, setDocs] = useState<DocDraft[]>(initialDocs);
  const [step, setStep] = useState(0);
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({});
  const [busy, setBusy] = useState<"draft" | "submit" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [custom, setCustom] = useState<Record<string, string>>({});
  const review = !!existing && needsReview(existing);
  const reviewReason = review ? [...(existing.consultations ?? [])].sort((x, y) => y.created_at.localeCompare(x.created_at))[0]?.review_reason : null;

  const set = <K extends keyof FormState>(k: K, v: FormState[K]) => {
    setForm((f) => ({ ...f, [k]: v }));
    setErrors((e) => ({ ...e, [k]: undefined }));
  };
  const valuesOf = (slug: string) => form.characteristics[slug] ?? [];
  const setValues = (slug: string, values: string[]) => set("characteristics", { ...form.characteristics, [slug]: values });
  const toggleValue = (g: CharacteristicGroup, v: string) => {
    const cur = valuesOf(g.slug);
    if (cur.includes(v)) setValues(g.slug, cur.filter((x) => x !== v));
    else setValues(g.slug, g.multiple ? [...cur, v] : [v]);
  };
  const addCustom = (g: CharacteristicGroup) => {
    const v = (custom[g.slug] ?? "").trim();
    if (v && !valuesOf(g.slug).includes(v)) setValues(g.slug, g.multiple ? [...valuesOf(g.slug), v] : [v]);
    setCustom((c) => ({ ...c, [g.slug]: "" }));
  };

  function validateStep(i: number): boolean {
    const e: Partial<Record<keyof FormState, string>> = {};
    if (i === 0) {
      if (!form.name.trim()) e.name = "Le nom est obligatoire";
      if (!form.category_id) e.category_id = "Choisissez une catégorie";
      if (form.age_value === "" || Number(form.age_value) < 0) e.age_value = "Indiquez l'âge";
      if (!form.sex) e.sex = "Indiquez le sexe";
      if (!form.city) e.city = "Choisissez une ville";
      if (!form.short_description.trim()) e.short_description = "Ajoutez une courte description";
      if (form.weight_kg && !(Number(form.weight_kg) > 0)) e.weight_kg = "Poids invalide";
    }
    if (i === 2 && form.photos.length === 0) e.photos = "Ajoutez au moins une photo";
    if (i === 4 && form.listing_type === "vente" && !(Number(form.price) > 0)) e.price = "Indiquez un prix de vente";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  function goTo(i: number) {
    if (i > step && !validateStep(step)) return;
    setStep(i);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function payload() {
    const num = (v: string) => (v.trim() === "" ? null : Number(v));
    return {
      name: form.name.trim(),
      category_id: form.category_id ? Number(form.category_id) : null,
      breed: form.breed.trim() || null,
      age_value: num(form.age_value),
      age_unit: form.age_unit,
      sex: form.sex || null,
      color: form.color.trim() || null,
      size: form.size || null,
      weight_kg: num(form.weight_kg),
      city: form.city || null,
      latitude: num(form.latitude),
      longitude: num(form.longitude),
      short_description: form.short_description.trim() || null,
      description: form.description.trim() || null,
      // une entrée par rubrique existante (les colonnes santé / traits / besoins sont déduites en base)
      characteristics: Object.fromEntries(groups.map((g) => [g.slug, valuesOf(g.slug)])),
      why_adopt: form.why_adopt.trim() || null,
      adoption_conditions: form.adoption_conditions.trim() || null,
      listing_type: form.listing_type,
      price: form.listing_type === "vente" ? Number(form.price) || 0 : 0,
      cover_url: form.photos[0] ?? null,
    };
  }

  async function save(submit: boolean) {
    setError(null);
    if (!form.name.trim()) {
      setStep(0);
      setErrors({ name: "Le nom est obligatoire" });
      return;
    }
    const data = payload();
    if (submit) {
      const missing = missingFields(data);
      if (missing.length) {
        setError(`Champs obligatoires manquants : ${missing.join(", ")}.`);
        return;
      }
    }
    setBusy(submit ? "submit" : "draft");
    try {
      const supabase = getSupabase();
      let id = existing?.id;
      if (!id) {
        const { data: row, error: e } = await supabase.from("animals").insert({ ...data, owner_id: uid, status: "brouillon" }).select("id").single();
        if (e) throw e;
        id = (row as { id: string }).id;
      } else {
        const { error: e } = await supabase.from("animals").update(data).eq("id", id);
        if (e) throw e;
      }
      // Synchronisation des photos (ordre = position)
      const { error: delErr } = await supabase.from("animal_photos").delete().eq("animal_id", id);
      if (delErr) throw delErr;
      if (form.photos.length) {
        const { error: insErr } = await supabase.from("animal_photos").insert(form.photos.map((url, position) => ({ animal_id: id, url, position })));
        if (insErr) throw insErr;
      }
      // Documents (facultatifs, 6 max)
      await syncDocuments(uid, id!, initialDocs, docs);
      if (submit && !review) {
        // Étapes suivantes : coordonnées + CIN, 3 dates de consultation
        toast("Annonce enregistrée : finalisez la soumission");
        router.push(`/espace/annonces/${id}/soumettre`);
        return;
      }
      toast(review ? "Modifications enregistrées : confirmez l'envoi des compléments au vétérinaire" : "Brouillon enregistré");
      router.push(`/espace/annonces/${id}`);
    } catch (e) {
      setError(errorMessage(e));
      setBusy(null);
    }
  }

  function locate() {
    if (!navigator.geolocation) return toast("La géolocalisation n'est pas disponible", "error");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        set("latitude", pos.coords.latitude.toFixed(5));
        set("longitude", pos.coords.longitude.toFixed(5));
      },
      () => toast("Impossible d'obtenir votre position", "error"),
    );
  }

  const category = categories.find((c) => String(c.id) === form.category_id);
  const isLast = step === STEPS.length - 1;

  return (
    <div>
      <div className="mb-6 flex items-start gap-3">
        <Link href={existing ? `/espace/annonces/${existing.id}` : "/espace/annonces"} className="mt-1 grid size-10 shrink-0 place-items-center rounded-full bg-white text-navy shadow-sm hover:text-primary" aria-label="Retour">
          <ArrowLeft className="size-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">{existing ? `Modifier « ${existing.name} »` : "Publier un animal"}</h1>
          <p className="mt-1 text-body">Toutes les annonces sont vérifiées par un vétérinaire avant publication.</p>
        </div>
      </div>

      {review && (
        <div className="mb-5">
          <Alert tone="orange">
            <strong>Compléments demandés par le vétérinaire :</strong> {reviewReason || "voir le détail de la demande."} Modifiez l&apos;annonce, enregistrez, puis cliquez sur « J&apos;ai apporté les compléments » depuis le suivi : le même vétérinaire
            reprendra la consultation.
          </Alert>
        </div>
      )}

      {/* Étapes */}
      <ol className="scrollbar-none mb-5 flex gap-2 overflow-x-auto rounded-[var(--radius-card)] bg-white p-2 shadow-[0_4px_24px_rgba(15,40,90,0.06)]">
        {STEPS.map(({ label, icon: Icon }, i) => (
          <li key={label} className="flex-1">
            <button
              type="button"
              onClick={() => goTo(i)}
              className={cn(
                "flex w-full shrink-0 items-center gap-2.5 whitespace-nowrap rounded-xl px-3 py-2.5 text-sm font-semibold transition",
                i === step ? "bg-primary-soft text-primary" : i < step ? "text-navy hover:bg-page" : "text-muted hover:bg-page",
              )}
            >
              <span
                className={cn(
                  "grid size-7 shrink-0 place-items-center rounded-full text-xs font-extrabold",
                  i < step ? "bg-primary text-white" : i === step ? "bg-white text-primary ring-2 ring-primary" : "bg-line text-muted",
                )}
              >
                {i < step ? <Check className="size-3.5" /> : i + 1}
              </span>
              <Icon className="hidden size-4 sm:block" />
              <span className={cn(i !== step && "hidden md:inline")}>{label}</span>
            </button>
          </li>
        ))}
      </ol>

      <Card className="p-5 sm:p-7">
        {step === 0 && (
          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="Nom de l'animal *" error={errors.name}>
              <Input value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="Ex. Golden Retriever, Milo…" maxLength={80} />
            </Field>
            <Field label="Catégorie *" error={errors.category_id}>
              <Select value={form.category_id} onChange={(e) => set("category_id", e.target.value)}>
                <option value="">Choisir…</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Race">
              <Input value={form.breed} onChange={(e) => set("breed", e.target.value)} placeholder="Ex. Golden Retriever" />
            </Field>
            <Field label="Âge *" error={errors.age_value}>
              <div className="grid grid-cols-[1fr_140px] gap-2">
                <Input type="number" min={0} value={form.age_value} onChange={(e) => set("age_value", e.target.value)} placeholder="3" />
                <Select value={form.age_unit} onChange={(e) => set("age_unit", e.target.value as AgeUnit)} aria-label="Unité">
                  {(Object.keys(AGE_UNIT_LABEL) as AgeUnit[]).map((u) => (
                    <option key={u} value={u}>
                      {AGE_UNIT_LABEL[u]}
                    </option>
                  ))}
                </Select>
              </div>
            </Field>
            <Field label="Sexe *" error={errors.sex}>
              <div className="grid grid-cols-2 gap-2">
                {(["male", "femelle"] as const).map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => set("sex", s)}
                    className={cn(
                      "h-12 rounded-[var(--radius-input)] border text-sm font-semibold transition",
                      form.sex === s ? "border-primary bg-primary-soft text-primary" : "border-line bg-white text-body hover:border-primary/40",
                    )}
                  >
                    {SEX_LABEL[s]}
                  </button>
                ))}
              </div>
            </Field>
            <Field label="Couleur">
              <Input value={form.color} onChange={(e) => set("color", e.target.value)} placeholder="Ex. Doré" />
            </Field>
            <Field label="Taille">
              <Select value={form.size} onChange={(e) => set("size", e.target.value)}>
                <option value="">Non précisée</option>
                {SIZE_OPTIONS.map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </Select>
            </Field>
            <Field label="Poids (kg)" error={errors.weight_kg}>
              <Input type="number" min={0} step="0.1" value={form.weight_kg} onChange={(e) => set("weight_kg", e.target.value)} placeholder="Ex. 12.5" />
            </Field>
            <Field label="Ville *" error={errors.city}>
              <Select value={form.city} onChange={(e) => set("city", e.target.value)}>
                <option value="">Choisir…</option>
                {cities.map((c) => (
                  <option key={c.id} value={c.name}>
                    {c.name}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Localisation précise (facultatif)" hint="Affichée sur la carte de l'annonce.">
              <div className="grid grid-cols-[1fr_1fr_auto] gap-2">
                <Input type="number" step="any" value={form.latitude} onChange={(e) => set("latitude", e.target.value)} placeholder="Latitude" aria-label="Latitude" />
                <Input type="number" step="any" value={form.longitude} onChange={(e) => set("longitude", e.target.value)} placeholder="Longitude" aria-label="Longitude" />
                <button type="button" onClick={locate} className="grid size-12 place-items-center rounded-[var(--radius-input)] border border-line text-primary hover:bg-primary-soft" aria-label="Utiliser ma position">
                  <Crosshair className="size-5" />
                </button>
              </div>
            </Field>
            <Field label="Description courte *" error={errors.short_description} className="sm:col-span-2" hint={`${form.short_description.length}/280`}>
              <Textarea rows={3} maxLength={280} value={form.short_description} onChange={(e) => set("short_description", e.target.value)} placeholder="En quelques phrases : caractère, santé, à qui il conviendrait…" />
            </Field>
            <Field label="Description détaillée" className="sm:col-span-2">
              <Textarea rows={6} value={form.description} onChange={(e) => set("description", e.target.value)} placeholder="Histoire, habitudes, environnement actuel, entente avec les enfants et les autres animaux…" />
            </Field>
          </div>
        )}

        {step === 1 && (
          <div className="space-y-7">
            {groups.map((g) => {
              const values = valuesOf(g.slug);
              const known = (g.options ?? []).map((o) => o.label);
              const GroupIcon = iconFor(g.icon);
              return (
                <section key={g.id}>
                  <h2 className="flex items-center gap-2 text-lg font-extrabold">
                    <GroupIcon className="size-5 text-primary" /> {g.name}
                  </h2>
                  <p className="mt-0.5 text-xs text-muted">{g.multiple ? "Plusieurs choix possibles." : "Un seul choix."}</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {(g.options ?? []).map((o) => (
                      <Chip key={o.id} active={values.includes(o.label)} onClick={() => toggleValue(g, o.label)}>
                        {o.label}
                      </Chip>
                    ))}
                    {values
                      .filter((v) => !known.includes(v))
                      .map((v) => (
                        <Chip key={v} active onClick={() => toggleValue(g, v)}>
                          {v}
                        </Chip>
                      ))}
                  </div>
                  {g.allow_custom && (
                    <div className="mt-3 flex max-w-md gap-2">
                      <Input
                        value={custom[g.slug] ?? ""}
                        onChange={(e) => setCustom((c) => ({ ...c, [g.slug]: e.target.value }))}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            addCustom(g);
                          }
                        }}
                        placeholder="Autre choix…"
                        className="h-11"
                      />
                      <Button type="button" variant="soft" icon={<Plus className="size-4" />} onClick={() => addCustom(g)}>
                        Ajouter
                      </Button>
                    </div>
                  )}
                  {g.slug === "sante" && <p className="mt-2 text-xs text-muted">Ces informations seront vérifiées par le vétérinaire lors de la consultation.</p>}
                </section>
              );
            })}
            <div className="grid gap-5 sm:grid-cols-2">
              <Field label="Pourquoi l'adopter ?">
                <Textarea rows={4} value={form.why_adopt} onChange={(e) => set("why_adopt", e.target.value)} placeholder="Ses qualités, ce qu'il apportera à sa nouvelle famille…" />
              </Field>
              <Field label="Conditions d'adoption">
                <Textarea rows={4} value={form.adoption_conditions} onChange={(e) => set("adoption_conditions", e.target.value)} placeholder="Ex. jardin clos, visite préalable, suivi après adoption…" />
              </Field>
            </div>
          </div>
        )}

        {step === 2 && (
          <div>
            <h2 className="text-lg font-extrabold">Photos de l&apos;animal</h2>
            <p className="mb-4 mt-1 text-sm text-body">Jusqu&apos;à 6 photos nettes et lumineuses. La première sera la photo de couverture.</p>
            <ImageUploader bucket="animal-photos" userId={uid} folder="animals" value={form.photos} onChange={(urls) => set("photos", urls)} max={6} />
            {form.photos.length > 1 && (
              <div className="mt-4 flex flex-wrap items-center gap-2 text-xs text-muted">
                Couverture :
                {form.photos.map((p, i) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => set("photos", [p, ...form.photos.filter((x) => x !== p)])}
                    className={cn("rounded-full border px-2.5 py-1 font-semibold", i === 0 ? "border-primary bg-primary-soft text-primary" : "border-line hover:border-primary")}
                  >
                    Photo {i + 1}
                  </button>
                ))}
              </div>
            )}
            {errors.photos && <p className="mt-2 text-sm font-medium text-red-600">{errors.photos}</p>}
          </div>
        )}

        {step === 3 && <DocumentsStep value={docs} onChange={setDocs} />}

        {step === 4 && (
          <div className="space-y-5">
            <h2 className="text-lg font-extrabold">Type d&apos;annonce</h2>
            <div className="grid gap-3 sm:grid-cols-2">
              {(
                [
                  ["adoption", "À adopter", "Don gratuit à une famille responsable", "bg-adopt"],
                  ["vente", "À vendre", "Vente à un prix fixé en TND", "bg-sale"],
                ] as const
              ).map(([v, label, sub, color]) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => set("listing_type", v)}
                  className={cn("flex items-center gap-4 rounded-2xl border-2 p-4 text-left transition", form.listing_type === v ? "border-primary bg-primary-soft/50" : "border-line hover:border-primary/40")}
                >
                  <span className={cn("rounded-md px-2.5 py-1 text-xs font-bold text-white", color)}>{label}</span>
                  <span className="text-sm text-body">{sub}</span>
                  {form.listing_type === v && <Check className="ml-auto size-5 text-primary" />}
                </button>
              ))}
            </div>
            {form.listing_type === "vente" ? (
              <Field label="Prix (TND) *" error={errors.price} className="max-w-xs">
                <Input type="number" min={1} value={form.price} onChange={(e) => set("price", e.target.value)} placeholder="Ex. 250" right={<span className="text-sm font-bold text-muted">TND</span>} />
              </Field>
            ) : (
              <Alert tone="orange">Les adoptions sont gratuites : l&apos;annonce affichera « Gratuit ».</Alert>
            )}
          </div>
        )}

        {step === 5 && (
          <div className="space-y-5">
            <h2 className="text-lg font-extrabold">Récapitulatif</h2>
            <div className="grid gap-4 lg:grid-cols-2">
              <Recap title="Informations" onEdit={() => setStep(0)}>
                <RecapRow label="Nom" value={form.name} />
                <RecapRow label="Catégorie" value={category?.name} />
                <RecapRow label="Race" value={form.breed} />
                <RecapRow label="Âge" value={form.age_value ? formatAge(Number(form.age_value), form.age_unit) : ""} />
                <RecapRow label="Sexe" value={form.sex ? SEX_LABEL[form.sex] : ""} />
                <RecapRow label="Couleur / taille" value={[form.color, form.size, form.weight_kg && `${form.weight_kg} kg`].filter(Boolean).join(" · ")} />
                <RecapRow label="Ville" value={form.city} />
                <RecapRow label="Description" value={form.short_description} />
              </Recap>
              <Recap title="Santé & caractère" onEdit={() => setStep(1)}>
                {groups.map((g) => (
                  <RecapRow key={g.id} label={g.name} value={valuesOf(g.slug).join(", ")} />
                ))}
                <RecapRow label="Pourquoi l'adopter" value={form.why_adopt} />
                <RecapRow label="Conditions" value={form.adoption_conditions} />
              </Recap>
              <Recap title={`Photos (${form.photos.length})`} onEdit={() => setStep(2)}>
                {form.photos.length ? (
                  <div className="flex flex-wrap gap-2">
                    {form.photos.map((p) => (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img key={p} src={p} alt="" className="size-16 rounded-lg object-cover" />
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-red-600">Aucune photo</p>
                )}
              </Recap>
              <Recap title={`Documents (${docs.length}/${MAX_DOCUMENTS})`} onEdit={() => setStep(3)}>
                {docs.length ? (
                  <ul className="space-y-1 text-sm">
                    {docs.map((d) => (
                      <li key={d.key} className="flex items-center gap-2 font-semibold text-navy">
                        <FileText className="size-4 shrink-0 text-primary" />
                        <span className="truncate">{d.title || d.file_name}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-muted">Aucun document (facultatif)</p>
                )}
              </Recap>
              <Recap title="Type & prix" onEdit={() => setStep(4)}>
                <RecapRow label="Type" value={form.listing_type === "adoption" ? "À adopter" : "À vendre"} />
                <RecapRow label="Prix" value={formatPrice(Number(form.price) || 0, form.listing_type)} />
              </Recap>
            </div>
            <Alert tone="blue">
              {review
                ? "Après enregistrement, confirmez l'envoi des compléments depuis la page de suivi : le vétérinaire qui les a demandés reprendra la même consultation."
                : "En soumettant, votre annonce part en vérification vétérinaire. Elle ne sera plus modifiable tant que la demande est en cours (sauf demande de compléments)."}
            </Alert>
          </div>
        )}

        <div className="mt-6">
          <Alert>{error}</Alert>
        </div>

        {/* Navigation */}
        <div className="mt-6 flex flex-col-reverse gap-3 border-t border-line pt-5 sm:flex-row sm:items-center">
          {step > 0 && (
            <Button variant="ghost" onClick={() => goTo(step - 1)} icon={<ArrowLeft className="size-4" />}>
              Précédent
            </Button>
          )}
          <div className="flex flex-col-reverse gap-3 sm:ml-auto sm:flex-row">
            {!review && (
              <Button variant="outline" loading={busy === "draft"} disabled={!!busy} onClick={() => save(false)} icon={<Save className="size-4" />}>
                Enregistrer le brouillon
              </Button>
            )}
            {isLast ? (
              <Button loading={busy === "submit"} disabled={!!busy} onClick={() => save(true)} icon={<Send className="size-4" />}>
                {review ? "Enregistrer les modifications" : "Continuer la soumission"}
              </Button>
            ) : (
              <Button onClick={() => goTo(step + 1)}>
                Suivant <ArrowRight className="size-4" />
              </Button>
            )}
          </div>
        </div>
      </Card>
    </div>
  );
}

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex items-center gap-1.5 rounded-full border px-3.5 py-2 text-sm font-semibold transition",
        active ? "border-primary bg-primary text-white" : "border-line bg-white text-body hover:border-primary/50",
      )}
    >
      {active ? <Check className="size-3.5" /> : <Plus className="size-3.5" />}
      {children}
    </button>
  );
}

function Recap({ title, onEdit, children }: { title: string; onEdit: () => void; children: React.ReactNode }) {
  return (
    <div className="min-w-0 rounded-2xl border border-line/80 p-4">
      <div className="mb-2 flex items-center justify-between gap-3">
        <h3 className="min-w-0 font-extrabold">{title}</h3>
        <button type="button" onClick={onEdit} className="flex shrink-0 items-center gap-1 text-sm font-semibold text-primary hover:underline">
          <Pencil className="size-3.5" /> Modifier
        </button>
      </div>
      <div className="space-y-1.5">{children}</div>
    </div>
  );
}

function RecapRow({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="grid grid-cols-[110px_minmax(0,1fr)] gap-2 text-sm sm:grid-cols-[130px_minmax(0,1fr)]">
      <span className="text-muted">{label}</span>
      <span className={cn("whitespace-pre-line font-semibold [overflow-wrap:anywhere]", value ? "text-navy" : "text-muted")}>{value || "—"}</span>
    </div>
  );
}

