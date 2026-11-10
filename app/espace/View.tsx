"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, Bell, CheckCircle2, ChevronRight, Clock, FileText, Heart, LogOut, MessageCircle, PawPrint, Plus } from "lucide-react";
import { ESPACE_NAV, PageHeader } from "@/components/espace/EspaceShell";
import { stepSummary } from "@/components/espace/RequestStepper";
import { Alert, AnimalThumb, Button, Card, CardHeader, cn, EmptyState, KpiCard, MetaBadge, PageLoader } from "@/components/ui";
import { useAuth } from "@/hooks/useAuth";
import { unwrap, useQuery } from "@/hooks/useQuery";
import { useUnreadMessages } from "@/hooks/useUnread";
import { ANIMAL_STATUS, formatAge, formatLongDate, timeAgo } from "@/lib/labels";
import { getSupabase } from "@/lib/supabase";
import type { Notification } from "@/lib/types";
import { ANIMAL_OWNER, latestRequest, needsReview, type OwnerAnimal } from "@/lib/workflow";

export default function DashboardPage() {
  const { user, profile, signOut } = useAuth();
  const router = useRouter();
  const uid = user?.id;
  const unreadMsg = useUnreadMessages(uid);

  const data = useQuery(
    async () => {
      const supabase = getSupabase();
      const [animals, favs, notifs] = await Promise.all([
        supabase.from("animals").select(ANIMAL_OWNER).eq("owner_id", uid!).order("updated_at", { ascending: false }),
        supabase.from("favorites").select("animal_id", { count: "exact", head: true }).eq("user_id", uid!),
        supabase.from("notifications").select("*").eq("user_id", uid!).order("created_at", { ascending: false }).limit(5),
      ]);
      return {
        animals: unwrap<OwnerAnimal[]>(animals),
        favorites: favs.count ?? 0,
        notifications: unwrap<Notification[]>(notifs),
      };
    },
    [uid],
    !!uid,
  );

  if (data.loading && !data.data) return <PageLoader />;

  const animals = data.data?.animals ?? [];
  const published = animals.filter((a) => a.status === "publiee").length;
  const inReview = animals.filter((a) => a.status === "en_verification" || a.status === "en_attente_approbation").length;
  const toReview = animals.filter(needsReview);
  const firstName = (profile?.full_name || "").split(" ")[0];

  return (
    <div>
      <PageHeader
        eyebrow="Bienvenue"
        title={firstName ? `Bonjour ${firstName} 👋` : "Bonjour 👋"}
        subtitle="Voici un aperçu de vos annonces et de votre activité."
        action={
          <div className="hidden items-center gap-3 rounded-2xl bg-white px-4 py-3 shadow-sm sm:flex">
            <Clock className="size-5 text-primary" />
            <span className="text-sm font-semibold text-navy">{formatLongDate(new Date().toISOString())}</span>
          </div>
        }
      />

      {data.error && <Alert>{data.error}</Alert>}

      {toReview.length > 0 && (
        <div className="mb-5 flex flex-col gap-3 rounded-[var(--radius-card)] border border-amber-200 bg-amber-50 p-4 sm:flex-row sm:items-center">
          <span className="grid size-10 shrink-0 place-items-center rounded-full bg-amber-100 text-amber-700">
            <Bell className="size-5" />
          </span>
          <p className="flex-1 text-sm text-amber-900">
            <strong>Le vétérinaire demande des compléments</strong> pour {toReview.map((a) => a.name).join(", ")}. Modifiez l&apos;annonce : il reprendra la même consultation.
          </p>
          <Button href={`/espace/annonces/${toReview[0]!.id}`} size="sm" variant="outline">
            Voir la demande
          </Button>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        <KpiCard href="/espace/annonces?onglet=publiee" icon={<CheckCircle2 />} tone="green" value={published} label="Annonces publiées" />
        <KpiCard href="/espace/annonces?onglet=verification" icon={<Clock />} tone="orange" value={inReview} label="En vérification" />
        <KpiCard href="/espace/favoris" icon={<Heart />} tone="red" value={data.data?.favorites ?? 0} label="Favoris" />
        <KpiCard href="/espace/messages" icon={<MessageCircle />} tone="blue" value={unreadMsg} label="Messages non lus" />
      </div>

      {/* Mobile : la barre latérale est masquée, toutes les rubriques sont accessibles ici. */}
      <Card className="mt-6 lg:hidden">
        <CardHeader title="Mon espace" />
        <ul className="divide-y divide-line/70 px-3 pb-2">
          {ESPACE_NAV.filter((i) => i.href !== "/espace" && i.href !== "/espace/annonces/nouvelle").map(({ href, label, icon: Icon }) => (
            <li key={href}>
              <Link href={href} className="flex items-center gap-3 rounded-xl px-2 py-3 transition hover:bg-page">
                <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-primary-soft text-primary">
                  <Icon className="size-[18px]" />
                </span>
                <span className="flex-1 text-[15px] font-semibold text-navy">{label}</span>
                <ChevronRight className="size-4 text-muted" />
              </Link>
            </li>
          ))}
        </ul>
      </Card>

      <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)] [&>*]:min-w-0">
        <Card>
          <CardHeader
            title="Mes dernières annonces"
            action={
              <Link href="/espace/annonces" className="text-sm font-bold text-primary hover:underline">
                Voir toutes
              </Link>
            }
          />
          {animals.length === 0 ? (
            <EmptyState
              icon={<PawPrint />}
              title="Vous n'avez pas encore d'annonce"
              text="Publiez votre premier animal : un vétérinaire le vérifiera avant sa mise en ligne."
              action={<Button href="/espace/annonces/nouvelle" icon={<Plus className="size-4" />}>Publier un animal</Button>}
            />
          ) : (
            <ul className="divide-y divide-line/70 px-3 pb-3">
              {animals.slice(0, 5).map((a) => {
                const req = latestRequest(a);
                return (
                  <li key={a.id}>
                    <Link href={`/espace/annonces/${a.id}`} className="flex items-center gap-3 rounded-xl px-2 py-3 transition hover:bg-page sm:px-3">
                      <AnimalThumb src={a.cover_url} alt={a.name} className="size-12 shrink-0 rounded-xl sm:size-14" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-bold text-navy">{a.name}</p>
                        <p className="truncate text-xs text-muted">
                          {a.category?.name ?? "—"} · {formatAge(a.age_value, a.age_unit)}
                        </p>
                        {req && a.status !== "brouillon" && <p className="mt-0.5 truncate text-xs font-semibold text-primary">{stepSummary(req.step, req.status)}</p>}
                        <div className="mt-1.5 sm:hidden">
                          <MetaBadge meta={needsReview(a) ? { label: "Compléments demandés", tone: "red" } : ANIMAL_STATUS[a.status]} />
                        </div>
                      </div>
                      <div className="hidden shrink-0 flex-col items-end gap-1 sm:flex">
                        <MetaBadge meta={needsReview(a) ? { label: "Compléments demandés", tone: "red" } : ANIMAL_STATUS[a.status]} />
                      </div>
                      <ChevronRight className="size-4 shrink-0 text-muted" />
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>

        <div className="space-y-6">
          <Link
            href="/espace/annonces/nouvelle"
            className="group relative flex items-center gap-4 overflow-hidden rounded-[var(--radius-card)] bg-gradient-to-br from-primary to-primary-dark p-5 text-white shadow-lg"
          >
            <PawPrint className="absolute -right-4 -top-4 size-28 rotate-12 text-white/10" />
            <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-white/20">
              <Plus className="size-6" />
            </span>
            <span className="flex-1">
              <span className="block text-lg font-extrabold">Publier un animal</span>
              <span className="block text-sm text-white/80">Gratuit · vérifié par un vétérinaire</span>
            </span>
            <ArrowRight className="size-5 transition group-hover:translate-x-1" />
          </Link>

          <Card>
            <CardHeader
              title="Notifications récentes"
              action={
                <Link href="/espace/notifications" className="text-sm font-bold text-primary hover:underline">
                  Voir tout
                </Link>
              }
            />
            {(data.data?.notifications.length ?? 0) === 0 ? (
              <p className="px-6 pb-6 text-sm text-muted">Aucune notification pour le moment.</p>
            ) : (
              <ul className="space-y-1 px-3 pb-3">
                {data.data!.notifications.map((n) => (
                  <li key={n.id}>
                    <Link href={n.link?.startsWith("/") ? n.link : "/espace/notifications"} className="flex gap-3 rounded-xl px-3 py-2.5 hover:bg-page">
                      <span className={cn("mt-1.5 size-2 shrink-0 rounded-full", n.read_at ? "bg-line" : "bg-primary")} />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-bold text-navy">{n.title}</span>
                        {n.body && <span className="line-clamp-2 block text-xs text-body">{n.body}</span>}
                        <span className="block text-[11px] text-muted">{timeAgo(n.created_at)}</span>
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card className="p-5">
            <div className="flex items-center gap-3">
              <FileText className="size-5 text-primary" />
              <p className="font-extrabold text-navy">Comment se passe la publication ?</p>
            </div>
            <p className="mt-2 text-sm text-body">Soumission → vérification vétérinaire → validation par l&apos;équipe → publication.</p>
            <Link href="/comment-ca-marche" className="mt-2 inline-flex items-center gap-1 text-sm font-bold text-primary hover:underline">
              En savoir plus <ArrowRight className="size-4" />
            </Link>
          </Card>

          {/* Mobile : la barre latérale (et son bouton de déconnexion) est masquée */}
          <button
            type="button"
            onClick={async () => {
              await signOut();
              router.push("/");
            }}
            className="flex w-full items-center justify-center gap-2 rounded-[var(--radius-card)] border border-red-200 bg-white px-4 py-3.5 text-[15px] font-bold text-red-600 transition hover:bg-red-50 lg:hidden"
          >
            <LogOut className="size-5" /> Se déconnecter
          </button>
        </div>
      </div>
    </div>
  );
}
