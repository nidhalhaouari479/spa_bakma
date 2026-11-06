"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  AlertTriangle,
  ArrowLeft,
  Building2,
  CalendarClock,
  CheckCircle2,
  ExternalLink,
  FileText,
  Download,
  Pencil,
  RotateCcw,
  Send,
  Stethoscope,
  Thermometer,
  Weight,
  XCircle,
  PartyPopper,
  MessageSquareReply,
} from "lucide-react";
import { RequestStepper } from "@/components/espace/RequestStepper";
import { ListingBadge } from "@/components/site/AnimalCard";
import { Alert, AnimalThumb, Avatar, Badge, Button, Card, CardHeader, EmptyState, Field, MetaBadge, Modal, PageLoader, Textarea, useToast } from "@/components/ui";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@/hooks/useQuery";
import { ANIMAL_FULL } from "@/lib/catalog";
import {
  ANIMAL_STATUS,
  CONSULTATION_STATUS,
  EXAM_RESULT,
  formatAge,
  formatDate,
  formatDateTime,
  formatPrice,
  REQUEST_STATUS,
  SEX_LABEL,
  VACCINATION_STATUS,
  VET_DECISION,
} from "@/lib/labels";
import { signedDocumentUrl } from "@/lib/storage";
import { errorMessage, getSupabase } from "@/lib/supabase";
import type { Animal, Consultation, Profile, PublicationRequest, Veterinarian } from "@/lib/types";
import { canDelete, canSubmit, missingFields } from "@/lib/workflow";

const REQUEST_FULL =
  "*, consultations!consultations_request_id_fkey(*, vet:profiles!consultations_vet_id_fkey(*, veterinarian:veterinarians!veterinarians_profile_id_fkey(*)), exams:consultation_exams!consultation_exams_consultation_id_fkey(*), vaccinations!vaccinations_consultation_id_fkey(*), documents:consultation_documents!consultation_documents_consultation_id_fkey(*), photos:consultation_photos!consultation_photos_consultation_id_fkey(*))";

type VetProfile = Profile & { veterinarian?: Veterinarian | null };
type FullConsultation = Consultation & { vet?: VetProfile | null };
type FullRequest = PublicationRequest & { consultations?: FullConsultation[] };

export function ListingTracking({ id }: { id: string }) {
  const { user } = useAuth();
  const uid = user?.id;
  const toast = useToast();
  const router = useRouter();
  const [modal, setModal] = useState<"cancel" | "resubmit" | "delete" | null>(null);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState<string | null>(null);

  const q = useQuery(
    async () => {
      const supabase = getSupabase();
      const a = await supabase.from("animals").select(ANIMAL_FULL).eq("id", id).maybeSingle();
      if (a.error && (a.error as { code?: string }).code !== "22P02") throw a.error;
      const animal = (a.data ?? null) as Animal | null;
      if (!animal || animal.owner_id !== uid) return null;
      const r = await supabase.from("publication_requests").select(REQUEST_FULL).eq("animal_id", id).order("submitted_at", { ascending: false });
      if (r.error) throw r.error;
      return { animal, requests: (r.data ?? []) as unknown as FullRequest[] };
    },
    [id, uid],
    !!uid,
  );

  if (q.loading && !q.data) return <PageLoader />;
  if (q.error) return <Alert>{q.error}</Alert>;
  if (!q.data)
    return (
      <Card>
        <EmptyState title="Annonce introuvable" text="Cette annonce n'existe pas ou ne vous appartient pas." action={<Button href="/espace/annonces">Mes annonces</Button>} />
      </Card>
    );

  const { animal, requests } = q.data;
  const request = requests[0] ?? null;
  const consultation = [...(request?.consultations ?? [])].sort((x, y) => y.created_at.localeCompare(x.created_at))[0] ?? null;
  const review = animal.status === "en_verification" && consultation?.status === "a_revoir";
  const editable = canSubmit(animal) || review;

  async function run(key: string, fn: () => PromiseLike<{ error: unknown }>, success: string) {
    setBusy(key);
    try {
      const { error } = await fn();
      if (error) throw error;
      toast(success);
      setModal(null);
      setMessage("");
      q.reload();
    } catch (e) {
      toast(errorMessage(e), "error");
    } finally {
      setBusy(null);
    }
  }

  const supabase = () => getSupabase();
  const submit = () => {
    const missing = missingFields(animal);
    if (missing.length) return toast(`Complétez l'annonce avant de la soumettre : ${missing.join(", ")}`, "error");
    router.push(`/espace/annonces/${animal.id}/soumettre`);
  };
  const setStatus = (status: "adoptee" | "vendue" | "publiee", msg: string) =>
    run("status", () => supabase().from("animals").update({ status }).eq("id", animal.id), msg);

  return (
    <div>
      {/* En-tête */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-3">
          <Link href="/espace/annonces" className="mt-1 grid size-10 shrink-0 place-items-center rounded-full bg-white text-navy shadow-sm hover:text-primary" aria-label="Retour">
            <ArrowLeft className="size-5" />
          </Link>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">{animal.name}</h1>
              <MetaBadge meta={review ? { label: "Compléments demandés", tone: "red" } : ANIMAL_STATUS[animal.status]} />
            </div>
            <p className="mt-1 text-sm text-body">
              {request ? (
                <>
                  Demande <strong className="text-navy">{request.ref}</strong> · soumise le {formatDateTime(request.submitted_at)}
                </>
              ) : (
                "Brouillon non soumis"
              )}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {(animal.status === "publiee" || animal.status === "adoptee" || animal.status === "vendue") && (
            <Button href={`/animaux/${animal.id}`} variant="outline" size="sm" icon={<ExternalLink className="size-4" />}>
              Voir l&apos;annonce publique
            </Button>
          )}
          {editable && (
            <Button href={`/espace/annonces/${animal.id}/modifier`} variant="soft" size="sm" icon={<Pencil className="size-4" />}>
              Modifier
            </Button>
          )}
          {canSubmit(animal) && (
            <Button size="sm" loading={busy === "submit"} onClick={submit} icon={<Send className="size-4" />}>
              {animal.status === "brouillon" ? "Soumettre pour vérification" : "Soumettre à nouveau"}
            </Button>
          )}
          {request?.status === "en_cours" && (
            <Button size="sm" variant="ghost" className="text-red-600 hover:bg-red-50 hover:text-red-700" onClick={() => setModal("cancel")} icon={<XCircle className="size-4" />}>
              Annuler la demande
            </Button>
          )}
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_320px]">
        <div className="min-w-0 space-y-6">
          {/* Suivi */}
          <Card className="p-5 sm:p-6">
            <div className="mb-5 flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-lg font-extrabold">Suivi de la publication</h2>
              {request && <MetaBadge meta={REQUEST_STATUS[request.status]} />}
            </div>
            {request ? (
              <RequestStepper step={request.step} status={request.status} />
            ) : (
              <Alert tone="grey">Cette annonce est un brouillon. Complétez-la puis soumettez-la pour lancer la vérification vétérinaire.</Alert>
            )}

            <div className="mt-5 space-y-3">
              {request?.status === "refusee" && (
                <Alert tone="red">
                  <span className="flex items-start gap-2">
                    <XCircle className="mt-0.5 size-4 shrink-0" />
                    <span>
                      <strong>Annonce refusée.</strong> {request.refusal_reason || "Aucun motif précisé."} Vous pouvez la modifier puis la soumettre à nouveau.
                    </span>
                  </span>
                </Alert>
              )}
              {request?.status === "annulee" && <Alert tone="grey">Demande annulée le {formatDate(request.decided_at)}. Vous pouvez modifier l&apos;annonce et la soumettre à nouveau.</Alert>}
              {request?.status === "approuvee" && (
                <Alert tone="green">
                  <span className="flex items-start gap-2">
                    <CheckCircle2 className="mt-0.5 size-4 shrink-0" />
                    <span>
                      Annonce approuvée le {formatDate(request.decided_at)}.{request.admin_note ? ` Note de l'équipe : ${request.admin_note}` : ""}
                    </span>
                  </span>
                </Alert>
              )}
              {request?.status === "en_cours" && request.step === "attente_approbation" && (
                <Alert tone="purple">La consultation vétérinaire est terminée. Notre équipe valide maintenant votre annonce.</Alert>
              )}
              {request?.status === "en_cours" && request.step === "verification_veterinaire" && consultation?.status === "nouvelle" && (
                <Alert tone="blue">Votre demande attend la prise en charge par un vétérinaire partenaire. Vous serez notifié dès qu&apos;un rendez-vous est planifié.</Alert>
              )}
            </div>

            {review && (
              <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-4 sm:p-5">
                <p className="flex items-center gap-2 font-extrabold text-amber-900">
                  <AlertTriangle className="size-5" /> Le vétérinaire demande des compléments
                </p>
                <p className="mt-2 whitespace-pre-line text-sm text-amber-900">{consultation?.review_reason || "Aucun détail fourni."}</p>
                <p className="mt-2 text-xs text-amber-800">
                  Modifiez votre annonce, puis confirmez l&apos;envoi des compléments : le même vétérinaire reprendra la consultation.
                </p>
                <div className="mt-4 flex flex-wrap gap-2">
                  <Button href={`/espace/annonces/${animal.id}/modifier`} variant="outline" size="sm" icon={<Pencil className="size-4" />}>
                    Modifier l&apos;annonce
                  </Button>
                  <Button size="sm" onClick={() => setModal("resubmit")} icon={<MessageSquareReply className="size-4" />}>
                    J&apos;ai apporté les compléments
                  </Button>
                </div>
              </div>
            )}
          </Card>

          {/* Consultation */}
          {consultation && (
            <Card>
              <CardHeader
                icon={<Stethoscope />}
                title="Consultation vétérinaire"
                subtitle={consultation.consulted_at ? `Réalisée le ${formatDateTime(consultation.consulted_at)}` : undefined}
                action={<MetaBadge meta={CONSULTATION_STATUS[consultation.status]} />}
              />
              <div className="grid gap-4 px-6 pb-6 sm:grid-cols-2">
                <div className="rounded-2xl bg-page/70 p-4">
                  <p className="text-xs font-bold uppercase tracking-wide text-muted">Vétérinaire</p>
                  {consultation.vet ? (
                    <div className="mt-2 flex items-center gap-3">
                      <Avatar src={consultation.vet.avatar_url} name={consultation.vet.full_name} size={44} />
                      <div className="min-w-0">
                        <p className="truncate font-bold text-navy">Dr {consultation.vet.full_name}</p>
                        <p className="flex items-center gap-1 truncate text-xs text-muted">
                          <Building2 className="size-3.5" /> {consultation.vet.veterinarian?.clinic_name || "Clinique non renseignée"}
                          {consultation.vet.veterinarian?.city ? ` · ${consultation.vet.veterinarian.city}` : ""}
                        </p>
                      </div>
                    </div>
                  ) : (
                    <p className="mt-2 text-sm text-body">En attente d&apos;attribution</p>
                  )}
                </div>
                <div className="rounded-2xl bg-page/70 p-4">
                  <p className="text-xs font-bold uppercase tracking-wide text-muted">Rendez-vous</p>
                  <p className="mt-2 flex items-center gap-2 font-bold text-navy">
                    <CalendarClock className="size-5 text-primary" />
                    {consultation.scheduled_at ? formatDateTime(consultation.scheduled_at) : "Pas encore planifié"}
                  </p>
                  {consultation.vet?.veterinarian?.address && <p className="mt-1 text-xs text-muted">{consultation.vet.veterinarian.address}</p>}
                  {!consultation.scheduled_at && consultation.proposed_slots?.length > 0 && (
                    <div className="mt-2 text-xs text-body">
                      <p className="font-semibold text-navy">Vos dates proposées (le vétérinaire en choisira une) :</p>
                      <ul className="mt-1 list-inside list-disc">
                        {consultation.proposed_slots.map((d) => (
                          <li key={d}>{formatDateTime(d)}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
              {consultation.status === "terminee" && <VetReport c={consultation} />}
            </Card>
          )}

          {requests.length > 1 && (
            <Card>
              <CardHeader title="Historique des demandes" />
              <ul className="divide-y divide-line/70 px-6 pb-4">
                {requests.map((r) => (
                  <li key={r.id} className="flex flex-wrap items-center justify-between gap-2 py-3 text-sm">
                    <span>
                      <strong className="text-navy">{r.ref}</strong> <span className="text-muted">· {formatDate(r.submitted_at)}</span>
                    </span>
                    <span className="flex items-center gap-2">
                      {r.refusal_reason && <span className="max-w-xs truncate text-xs text-muted">{r.refusal_reason}</span>}
                      <MetaBadge meta={REQUEST_STATUS[r.status]} />
                    </span>
                  </li>
                ))}
              </ul>
            </Card>
          )}
        </div>

        {/* Colonne animal */}
        <div className="space-y-6">
          <Card className="overflow-hidden">
            <div className="relative">
              <AnimalThumb src={animal.cover_url} alt={animal.name} className="aspect-[4/3] w-full" />
              <ListingBadge type={animal.listing_type} className="absolute left-3 top-3" />
            </div>
            <div className="space-y-1.5 p-5 text-sm">
              <p className="text-lg font-extrabold text-navy">{animal.name}</p>
              <p className="text-body">{[animal.category?.name, animal.breed].filter(Boolean).join(" · ") || "—"}</p>
              <p className="text-body">
                {animal.sex ? SEX_LABEL[animal.sex] : "—"} · {formatAge(animal.age_value, animal.age_unit)} · {animal.city ?? "—"}
              </p>
              <p className="font-extrabold text-primary">{formatPrice(animal.price, animal.listing_type)}</p>
              {animal.status === "publiee" && <p className="text-xs text-muted">{animal.views_count} vues</p>}
            </div>
          </Card>

          {(animal.status === "publiee" || animal.status === "adoptee" || animal.status === "vendue" || canDelete(animal)) && (
            <Card className="space-y-3 p-5">
              <h3 className="font-extrabold">Actions</h3>
              {animal.status === "publiee" && (
                <Button
                  className="w-full"
                  variant="success"
                  loading={busy === "status"}
                  onClick={() => setStatus(animal.listing_type === "vente" ? "vendue" : "adoptee", "Félicitations ! L'annonce est marquée comme terminée.")}
                  icon={<PartyPopper className="size-4" />}
                >
                  {animal.listing_type === "vente" ? "Marquer comme vendu" : "Marquer comme adopté"}
                </Button>
              )}
              {(animal.status === "adoptee" || animal.status === "vendue") && (
                <Button className="w-full" variant="outline" loading={busy === "status"} onClick={() => setStatus("publiee", "Annonce remise en ligne")} icon={<RotateCcw className="size-4" />}>
                  Remettre en ligne
                </Button>
              )}
              {canDelete(animal) && (
                <Button className="w-full" variant="ghost" onClick={() => setModal("delete")} icon={<XCircle className="size-4" />}>
                  Supprimer l&apos;annonce
                </Button>
              )}
            </Card>
          )}
        </div>
      </div>

      <Modal
        open={modal === "cancel"}
        onClose={() => setModal(null)}
        title="Annuler la demande"
        size="sm"
        footer={
          <>
            <Button variant="outline" onClick={() => setModal(null)}>
              Retour
            </Button>
            <Button variant="danger" loading={busy === "cancel"} onClick={() => run("cancel", () => supabase().rpc("cancel_request", { p_request_id: request!.id }), "Demande annulée")}>
              Annuler la demande
            </Button>
          </>
        }
      >
        <p className="text-sm text-body">La vérification vétérinaire en cours sera interrompue. Vous pourrez modifier l&apos;annonce et la soumettre à nouveau plus tard.</p>
      </Modal>

      <Modal
        open={modal === "resubmit"}
        onClose={() => setModal(null)}
        title="Envoyer les compléments au vétérinaire"
        footer={
          <>
            <Button variant="outline" onClick={() => setModal(null)}>
              Annuler
            </Button>
            <Button
              loading={busy === "resubmit"}
              icon={<Send className="size-4" />}
              onClick={() =>
                run(
                  "resubmit",
                  () => supabase().rpc("resubmit_consultation", { p_consultation_id: consultation!.id, p_message: message.trim() || null }),
                  "Compléments envoyés : le vétérinaire reprend la consultation",
                )
              }
            >
              Envoyer
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <p className="text-sm text-body">Assurez-vous d&apos;avoir modifié l&apos;annonce selon la demande. Le vétérinaire sera notifié et reprendra la même consultation.</p>
          <Field label="Message au vétérinaire (facultatif)">
            <Textarea value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Ex. J'ai ajouté les photos du carnet de vaccination." maxLength={500} />
          </Field>
        </div>
      </Modal>

      <Modal
        open={modal === "delete"}
        onClose={() => setModal(null)}
        title="Supprimer l'annonce"
        size="sm"
        footer={
          <>
            <Button variant="outline" onClick={() => setModal(null)}>
              Annuler
            </Button>
            <Button
              variant="danger"
              loading={busy === "delete"}
              onClick={async () => {
                setBusy("delete");
                const { error } = await getSupabase().from("animals").delete().eq("id", animal.id);
                setBusy(null);
                if (error) return toast(errorMessage(error), "error");
                toast("Annonce supprimée");
                router.push("/espace/annonces");
              }}
            >
              Supprimer
            </Button>
          </>
        }
      >
        <p className="text-sm text-body">Cette action est définitive.</p>
      </Modal>
    </div>
  );
}

function VetReport({ c }: { c: FullConsultation }) {
  const toast = useToast();
  async function openDoc(path: string) {
    const url = await signedDocumentUrl(path);
    if (url) window.open(url, "_blank", "noopener");
    else toast("Document indisponible", "error");
  }
  return (
    <div className="space-y-5 border-t border-line px-6 py-5">
      <div className="flex flex-wrap items-center gap-2">
        <h3 className="text-base font-extrabold">Rapport vétérinaire</h3>
        {c.decision && <MetaBadge meta={VET_DECISION[c.decision]} />}
        {c.certified && (
          <Badge tone="green" dot={false}>
            <CheckCircle2 className="size-3.5" /> Certifié
          </Badge>
        )}
      </div>
      {c.summary && <p className="whitespace-pre-line text-sm leading-relaxed text-body">{c.summary}</p>}
      {(c.weight_kg != null || c.temperature != null) && (
        <div className="flex flex-wrap gap-3">
          {c.weight_kg != null && (
            <span className="flex items-center gap-2 rounded-xl bg-page px-3 py-2 text-sm font-semibold text-navy">
              <Weight className="size-4 text-primary" /> {c.weight_kg} kg
            </span>
          )}
          {c.temperature != null && (
            <span className="flex items-center gap-2 rounded-xl bg-page px-3 py-2 text-sm font-semibold text-navy">
              <Thermometer className="size-4 text-primary" /> {c.temperature} °C
            </span>
          )}
        </div>
      )}
      {(c.exams?.length ?? 0) > 0 && (
        <div>
          <h4 className="mb-2 text-sm font-extrabold">Examens</h4>
          <ul className="divide-y divide-line/70 rounded-xl border border-line/70">
            {[...c.exams!].sort((a, b) => a.position - b.position).map((e) => (
              <li key={e.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-2.5 text-sm">
                <span className="font-semibold text-navy">{e.name}</span>
                <span className="flex items-center gap-2">
                  {e.note && <span className="text-xs text-muted">{e.note}</span>}
                  <MetaBadge meta={EXAM_RESULT[e.result]} />
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
      {(c.vaccinations?.length ?? 0) > 0 && (
        <div>
          <h4 className="mb-2 text-sm font-extrabold">Vaccinations</h4>
          <ul className="divide-y divide-line/70 rounded-xl border border-line/70">
            {c.vaccinations!.map((v) => (
              <li key={v.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-2.5 text-sm">
                <span className="font-semibold text-navy">{v.name}</span>
                <span className="flex items-center gap-2 text-xs text-muted">
                  {formatDate(v.vaccinated_on)}
                  {v.next_due_on && ` · rappel ${formatDate(v.next_due_on)}`}
                  <MetaBadge meta={VACCINATION_STATUS[v.status]} />
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
      {c.observations && (
        <div>
          <h4 className="mb-1 text-sm font-extrabold">Observations</h4>
          <p className="whitespace-pre-line text-sm text-body">{c.observations}</p>
        </div>
      )}
      {(c.documents?.length ?? 0) > 0 && (
        <div>
          <h4 className="mb-2 text-sm font-extrabold">Documents</h4>
          <div className="flex flex-wrap gap-2">
            {c.documents!.map((d) => (
              <button key={d.id} onClick={() => openDoc(d.file_path)} className="flex items-center gap-2 rounded-xl border border-line px-3 py-2 text-sm font-semibold text-navy hover:border-primary hover:text-primary">
                <FileText className="size-4" /> {d.title}
                <Download className="size-3.5 text-muted" />
              </button>
            ))}
          </div>
        </div>
      )}
      {(c.photos?.length ?? 0) > 0 && (
        <div>
          <h4 className="mb-2 text-sm font-extrabold">Photos de la consultation</h4>
          <div className="flex flex-wrap gap-2">
            {c.photos!.map((p) => (
              <a key={p.id} href={p.url} target="_blank" rel="noopener noreferrer">
                <AnimalThumb src={p.url} className="size-20 rounded-xl" />
              </a>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
