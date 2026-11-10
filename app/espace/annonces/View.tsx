"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { Eye, ExternalLink, FileText, Pencil, Plus, Send, Trash2 } from "lucide-react";
import { PageHeader } from "@/components/espace/EspaceShell";
import { stepSummary } from "@/components/espace/RequestStepper";
import { ListingBadge } from "@/components/site/AnimalCard";
import { Alert, AnimalThumb, Button, Card, EmptyState, MetaBadge, Modal, PageLoader, Tabs, useToast } from "@/components/ui";
import { useAuth } from "@/hooks/useAuth";
import { unwrap, useQuery } from "@/hooks/useQuery";
import { ANIMAL_STATUS, formatAge, formatDate, formatPrice } from "@/lib/labels";
import { errorMessage, getSupabase } from "@/lib/supabase";
import { ANIMAL_OWNER, canDelete, canEdit, canSubmit, latestRequest, missingFields, needsReview, STATUS_TABS, type OwnerAnimal, type StatusTab } from "@/lib/workflow";

export default function MyListingsPage() {
  const { user } = useAuth();
  const uid = user?.id;
  const toast = useToast();
  const router = useRouter();
  const onglet = useSearchParams().get("onglet");
  const [tab, setTab] = useState<StatusTab>(() => STATUS_TABS.find((t) => t.value === onglet)?.value ?? "all");
  const [toDelete, setToDelete] = useState<OwnerAnimal | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const list = useQuery(
    async () => unwrap<OwnerAnimal[]>(await getSupabase().from("animals").select(ANIMAL_OWNER).eq("owner_id", uid!).order("updated_at", { ascending: false })),
    [uid],
    !!uid,
  );

  if (list.loading && !list.data) return <PageLoader />;
  const animals = list.data ?? [];
  const current = STATUS_TABS.find((t) => t.value === tab)!;
  const filtered = current.statuses ? animals.filter((a) => current.statuses!.includes(a.status)) : animals;

  function submit(a: OwnerAnimal) {
    const missing = missingFields(a);
    if (missing.length) {
      toast(`Complétez l'annonce avant de la soumettre : ${missing.join(", ")}`, "error");
      return;
    }
    // documents, coordonnées + CIN, puis 3 dates de consultation
    router.push(`/espace/annonces/${a.id}/soumettre`);
  }

  async function remove() {
    if (!toDelete) return;
    setBusy(toDelete.id);
    try {
      const { error } = await getSupabase().from("animals").delete().eq("id", toDelete.id);
      if (error) throw error;
      toast("Annonce supprimée");
      setToDelete(null);
      list.reload();
    } catch (e) {
      toast(errorMessage(e), "error");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div>
      <PageHeader
        title="Mes annonces"
        subtitle="Suivez la vérification et la publication de vos animaux."
        action={
          <Button href="/espace/annonces/nouvelle" icon={<Plus className="size-4" />}>
            Publier un animal
          </Button>
        }
      />
      {list.error && <Alert>{list.error}</Alert>}

      <Card className="overflow-hidden">
        <Tabs<StatusTab>
          value={tab}
          onChange={setTab}
          items={STATUS_TABS.map((t) => ({ value: t.value, label: t.label, count: t.statuses ? animals.filter((a) => t.statuses!.includes(a.status)).length : animals.length }))}
        />

        {filtered.length === 0 ? (
          <EmptyState
            icon={<FileText />}
            title={tab === "all" ? "Aucune annonce pour le moment" : "Aucune annonce dans cette catégorie"}
            text={tab === "all" ? "Publiez votre premier animal en quelques étapes." : undefined}
            action={
              tab === "all" ? (
                <Button href="/espace/annonces/nouvelle" icon={<Plus className="size-4" />}>
                  Publier un animal
                </Button>
              ) : undefined
            }
          />
        ) : (
          <>
            {/* Tableau desktop */}
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-page/70 text-left text-xs font-bold uppercase tracking-wide text-muted">
                    <th className="px-5 py-3">Animal</th>
                    <th className="px-3 py-3">Type</th>
                    <th className="px-3 py-3">Statut</th>
                    <th className="px-3 py-3">Mise à jour</th>
                    <th className="px-5 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line/70">
                  {filtered.map((a) => (
                    <tr key={a.id} className="align-middle hover:bg-page/40">
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-3">
                          <AnimalThumb src={a.cover_url} alt={a.name} className="size-14 shrink-0 rounded-xl" />
                          <div className="min-w-0">
                            <p className="truncate font-bold text-navy">{a.name}</p>
                            <p className="truncate text-xs text-muted">
                              {[a.category?.name, a.breed, formatAge(a.age_value, a.age_unit)].filter(Boolean).join(" · ")}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-3">
                        <div className="flex flex-col items-start gap-1">
                          <ListingBadge type={a.listing_type} />
                          <span className="text-xs font-bold text-primary">{formatPrice(a.price, a.listing_type)}</span>
                        </div>
                      </td>
                      <td className="px-3 py-3">
                        <StatusCell a={a} />
                      </td>
                      <td className="px-3 py-3 text-muted">{formatDate(a.updated_at)}</td>
                      <td className="px-5 py-3">
                        <Actions a={a} busy={busy === a.id} onSubmit={() => submit(a)} onDelete={() => setToDelete(a)} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Cartes mobile */}
            <ul className="divide-y divide-line/70 md:hidden">
              {filtered.map((a) => (
                <li key={a.id} className="p-4">
                  <div className="flex gap-3">
                    <AnimalThumb src={a.cover_url} alt={a.name} className="size-20 shrink-0 rounded-xl" />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <p className="truncate font-bold text-navy">{a.name}</p>
                        <ListingBadge type={a.listing_type} />
                      </div>
                      <p className="truncate text-xs text-muted">
                        {[a.category?.name, formatAge(a.age_value, a.age_unit)].filter(Boolean).join(" · ")}
                      </p>
                      <div className="mt-1.5">
                        <StatusCell a={a} />
                      </div>
                    </div>
                  </div>
                  <div className="mt-3">
                    <Actions a={a} busy={busy === a.id} onSubmit={() => submit(a)} onDelete={() => setToDelete(a)} mobile />
                  </div>
                </li>
              ))}
            </ul>
          </>
        )}
      </Card>

      <Modal
        open={!!toDelete}
        onClose={() => setToDelete(null)}
        title="Supprimer l'annonce"
        size="sm"
        footer={
          <>
            <Button variant="outline" onClick={() => setToDelete(null)}>
              Annuler
            </Button>
            <Button variant="danger" loading={busy === toDelete?.id} onClick={remove} icon={<Trash2 className="size-4" />}>
              Supprimer
            </Button>
          </>
        }
      >
        <p className="text-sm text-body">
          L&apos;annonce <strong className="text-navy">{toDelete?.name}</strong> et ses photos seront définitivement supprimées.
        </p>
      </Modal>
    </div>
  );
}

function StatusCell({ a }: { a: OwnerAnimal }) {
  const req = latestRequest(a);
  const review = needsReview(a);
  return (
    <div className="flex flex-col items-start gap-1">
      <MetaBadge meta={review ? { label: "Compléments demandés", tone: "red" } : ANIMAL_STATUS[a.status]} />
      {req && a.status !== "brouillon" && <span className="text-xs text-muted">{stepSummary(req.step, req.status)}</span>}
    </div>
  );
}

function Actions({ a, busy, onSubmit, onDelete, mobile }: { a: OwnerAnimal; busy: boolean; onSubmit: () => void; onDelete: () => void; mobile?: boolean }) {
  return (
    <div className={mobile ? "flex flex-wrap gap-2" : "flex flex-wrap justify-end gap-2"}>
      <Button href={`/espace/annonces/${a.id}`} size="sm" variant="outline" icon={<Eye className="size-4" />}>
        Voir
      </Button>
      {a.status === "publiee" && (
        <Button href={`/animaux/${a.id}`} size="sm" variant="ghost" icon={<ExternalLink className="size-4" />}>
          Annonce
        </Button>
      )}
      {canEdit(a) && (
        <Button href={`/espace/annonces/${a.id}/modifier`} size="sm" variant="soft" icon={<Pencil className="size-4" />}>
          Modifier
        </Button>
      )}
      {canSubmit(a) && (
        <Button size="sm" loading={busy} onClick={onSubmit} icon={<Send className="size-4" />}>
          Soumettre
        </Button>
      )}
      {canDelete(a) && (
        <button onClick={onDelete} className="grid size-9 place-items-center rounded-[10px] text-red-500 hover:bg-red-50" aria-label="Supprimer">
          <Trash2 className="size-4" />
        </button>
      )}
    </div>
  );
}
