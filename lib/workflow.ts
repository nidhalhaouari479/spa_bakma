import type { Animal, AnimalStatus, Consultation, PublicationRequest } from "./types";

/** Annonce du propriétaire avec ses demandes et consultations (FK nommées). */
export const ANIMAL_OWNER =
  "*, category:categories!animals_category_id_fkey(*), requests:publication_requests!publication_requests_animal_id_fkey(id,ref,status,step,submitted_at,refusal_reason,decided_at), consultations:consultations!consultations_animal_id_fkey(id,request_id,status,created_at,review_reason,scheduled_at,vet_id)";

export type OwnerAnimal = Animal & {
  requests?: Pick<PublicationRequest, "id" | "ref" | "status" | "step" | "submitted_at" | "refusal_reason" | "decided_at">[];
  consultations?: Pick<Consultation, "id" | "request_id" | "status" | "created_at" | "review_reason" | "scheduled_at" | "vet_id">[];
};

export function latestRequest(a: OwnerAnimal) {
  return [...(a.requests ?? [])].sort((x, y) => y.submitted_at.localeCompare(x.submitted_at))[0] ?? null;
}

export function latestConsultation(a: OwnerAnimal) {
  return [...(a.consultations ?? [])].sort((x, y) => y.created_at.localeCompare(x.created_at))[0] ?? null;
}

/** Le vétérinaire a demandé des compléments sur la demande en cours. */
export function needsReview(a: OwnerAnimal): boolean {
  const c = latestConsultation(a);
  return a.status === "en_verification" && c?.status === "a_revoir";
}

const EDITABLE: AnimalStatus[] = ["brouillon", "refusee", "annulee"];

export const canSubmit = (a: Pick<Animal, "status">) => EDITABLE.includes(a.status);
export const canDelete = (a: Pick<Animal, "status">) => EDITABLE.includes(a.status);
export const canEdit = (a: OwnerAnimal) => EDITABLE.includes(a.status) || needsReview(a);

export type StatusTab = "all" | "brouillon" | "verification" | "publiee" | "refusee" | "terminee";

export const STATUS_TABS: { value: StatusTab; label: string; statuses: AnimalStatus[] | null }[] = [
  { value: "all", label: "Toutes", statuses: null },
  { value: "brouillon", label: "Brouillons", statuses: ["brouillon"] },
  { value: "verification", label: "En vérification", statuses: ["en_verification", "en_attente_approbation"] },
  { value: "publiee", label: "Publiées", statuses: ["publiee"] },
  { value: "refusee", label: "Refusées / Annulées", statuses: ["refusee", "annulee"] },
  { value: "terminee", label: "Adoptées / Vendues", statuses: ["adoptee", "vendue"] },
];

/** Champs obligatoires manquants avant soumission pour vérification. */
export function missingFields(a: Pick<Animal, "name" | "category_id" | "city" | "sex" | "age_value" | "short_description" | "cover_url" | "listing_type" | "price">): string[] {
  const m: string[] = [];
  if (!a.name?.trim()) m.push("nom");
  if (!a.category_id) m.push("catégorie");
  if (a.age_value == null) m.push("âge");
  if (!a.sex) m.push("sexe");
  if (!a.city) m.push("ville");
  if (!a.short_description?.trim()) m.push("description courte");
  if (!a.cover_url) m.push("au moins une photo");
  if (a.listing_type === "vente" && !(Number(a.price) > 0)) m.push("prix de vente");
  return m;
}
