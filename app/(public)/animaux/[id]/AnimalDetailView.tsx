"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  BadgeCheck,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Clock,
  Eye,
  Flag,
  MapPin,
  Mars,
  MessageCircle,
  Palette,
  PawPrint,
  Ruler,
  Share2,
  Stethoscope,
  Tag,
  UserRound,
  Venus,
  Heart,
  FileText,
  ChevronRight as Chevron,
} from "lucide-react";
import { AnimalCard } from "@/components/site/AnimalCard";
import { ReportModal } from "@/components/site/ReportModal";
import { Alert, AnimalThumb, Avatar, Badge, Button, Card, cn, EmptyState, MetaBadge, PageLoader, Tabs, useToast } from "@/components/ui";
import { useAuth } from "@/hooks/useAuth";
import { useFavoriteToggle } from "@/hooks/useFavorites";
import { unwrap, useQuery } from "@/hooks/useQuery";
import { useCharacteristics } from "@/hooks/useRefData";
import { ANIMAL_CARD, ANIMAL_FULL } from "@/lib/catalog";
import { iconFor } from "@/lib/icons";
import { formatAge, formatDate, formatPrice, ROLE_LABEL, SEX_LABEL, VACCINATION_STATUS } from "@/lib/labels";
import { errorMessage, getSupabase } from "@/lib/supabase";
import type { Animal, CharacteristicGroup, Characteristics, Vaccination } from "@/lib/types";

type TabKey = "infos" | "sante" | "caractere" | "conditions";

const PUBLIC_STATUSES = ["publiee", "adoptee", "vendue"];

/** Icône d'une valeur : celle de l'option, sinon celle de la rubrique. */
function valueIcon(g: CharacteristicGroup | undefined, label: string) {
  return iconFor(g?.options?.find((o) => o.label === label)?.icon ?? g?.icon);
}

/** Caractéristiques d'une annonce (repli sur les anciennes colonnes si non migrée). */
function characteristicsOf(a: Animal): Characteristics {
  if (a.characteristics && Object.keys(a.characteristics).length) return a.characteristics;
  return {
    sante: [a.vaccinated && "Vacciné", a.dewormed && "Vermifugé", a.healthy && "En bonne santé", a.sterilized && "Stérilisé"].filter(Boolean) as string[],
    caractere: a.traits ?? [],
    besoins: a.needs ?? [],
  };
}

export function AnimalDetailView() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const router = useRouter();
  const toast = useToast();
  const { user, loading: authLoading } = useAuth();
  const { isFavorite, toggle } = useFavoriteToggle();
  const [index, setIndex] = useState(0);
  const [tab, setTab] = useState<TabKey>("infos");
  const { groups } = useCharacteristics();
  const [expanded, setExpanded] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [contacting, setContacting] = useState(false);
  const thumbs = useRef<HTMLDivElement>(null);

  const detail = useQuery(async () => {
    const supabase = getSupabase();
    const res = await supabase.from("animals").select(ANIMAL_FULL).eq("id", id).maybeSingle();
    if (res.error) {
      if ((res.error as { code?: string }).code === "22P02") return null; // identifiant invalide
      throw res.error;
    }
    if (!res.data) return null;
    const animal = res.data as unknown as Animal;
    const [vacc, cons, listings] = await Promise.all([
      supabase.from("vaccinations").select("*").eq("animal_id", id).order("vaccinated_on", { ascending: false, nullsFirst: false }),
      supabase.rpc("is_animal_certified", { p_animal_id: id }),
      supabase.from("animals").select("id", { count: "exact", head: true }).eq("owner_id", animal.owner_id).eq("status", "publiee"),
    ]);
    return {
      animal,
      vaccinations: (vacc.data ?? []) as Vaccination[],
      certified: cons.data === true,
      ownerListings: listings.count ?? 0,
    };
  }, [id]);

  const animal = detail.data?.animal ?? null;
  const isOwner = !!user && !!animal && user.id === animal.owner_id;
  const visible = !!animal && (PUBLIC_STATUSES.includes(animal.status) || isOwner);

  const similar = useQuery(
    async () => {
      if (!animal?.category_id) return [] as Animal[];
      return unwrap<Animal[]>(
        await getSupabase()
          .from("animals")
          .select(ANIMAL_CARD)
          .eq("status", "publiee")
          .eq("category_id", animal.category_id)
          .neq("id", animal.id)
          .order("published_at", { ascending: false, nullsFirst: false })
          .limit(4),
      );
    },
    [animal?.id],
    !!animal,
  );

  // +1 vue, une seule fois par affichage
  const viewed = useRef<string | null>(null);
  useEffect(() => {
    if (!animal || authLoading || animal.status !== "publiee" || isOwner) return;
    if (viewed.current === animal.id) return;
    viewed.current = animal.id;
    void getSupabase().rpc("increment_views", { p_animal_id: animal.id });
  }, [animal, authLoading, isOwner]);

  if (detail.loading || (authLoading && animal && !PUBLIC_STATUSES.includes(animal.status))) return <PageLoader />;

  if (detail.error)
    return (
      <div className="mx-auto max-w-3xl px-4 py-16">
        <Alert>{detail.error}</Alert>
      </div>
    );

  if (!animal || !visible)
    return (
      <div className="mx-auto max-w-xl px-4 py-16">
        <Card>
          <EmptyState
            icon={<PawPrint />}
            title="Animal introuvable"
            text="Cette annonce n'existe pas, a été retirée ou n'est pas encore publiée."
            action={<Button href="/animaux">Voir tous les animaux</Button>}
          />
        </Card>
      </div>
    );

  const photos = (animal.photos?.length ? [...animal.photos].sort((a, b) => a.position - b.position).map((p) => p.url) : animal.cover_url ? [animal.cover_url] : []) as string[];
  const current = photos[Math.min(index, Math.max(photos.length - 1, 0))] ?? null;
  const owner = animal.owner;
  const fav = isFavorite(animal.id);
  const closed = animal.status === "adoptee" || animal.status === "vendue";
  const SexIcon = animal.sex === "femelle" ? Venus : Mars;
  const chars = characteristicsOf(animal);
  const group = (slug: string) => groups.find((g) => g.slug === slug);
  const santeGroup = group("sante");
  const besoinsGroup = group("besoins");
  const besoins = chars.besoins ?? [];
  // Rubriques affichées dans l'onglet « Caractère » (toutes sauf la santé)
  const otherGroups = groups.filter((g) => g.slug !== "sante");
  const heroChips = [
    ...(chars.sante ?? []).map((label) => ({ icon: valueIcon(santeGroup, label), label })),
    ...(chars.caractere ?? []).slice(0, 3).map((label) => ({ icon: valueIcon(group("caractere"), label), label })),
  ];
  const certifiedLabel = detail.data?.certified ? "Certifié par un vétérinaire" : animal.status === "publiee" || closed ? "Contrôle vétérinaire effectué" : null;

  async function share() {
    const url = window.location.href;
    try {
      if (navigator.share) {
        await navigator.share({ title: `${animal!.name} — Bakma Store`, text: animal!.short_description ?? undefined, url });
      } else {
        await navigator.clipboard.writeText(url);
        toast("Lien copié dans le presse-papiers", "info");
      }
    } catch {
      /* partage annulé */
    }
  }

  async function contact() {
    if (!user) {
      router.push(`/connexion?next=${encodeURIComponent(`/animaux/${animal!.id}`)}`);
      return;
    }
    setContacting(true);
    try {
      const { data, error } = await getSupabase().rpc("start_conversation", { p_other: animal!.owner_id, p_animal_id: animal!.id });
      if (error) throw error;
      router.push(`/espace/messages?c=${data as string}`);
    } catch (e) {
      toast(errorMessage(e), "error");
      setContacting(false);
    }
  }

  function goBack() {
    if (window.history.length > 1) router.back();
    else router.push("/animaux");
  }

  const contactDisabled = isOwner || closed;

  const ownerCard = (
    <Card className="p-5">
      <h3 className="text-base font-extrabold">Propriétaire</h3>
      <div className="mt-4 flex items-center gap-3">
        <Avatar src={owner?.avatar_url} name={owner?.full_name} size={52} />
        <div className="min-w-0 flex-1">
          <p className="truncate font-bold text-navy">{owner?.full_name || "Membre Bakma"}</p>
          {owner && <p className="text-xs text-muted">Membre depuis {new Date(owner.created_at).getFullYear()}</p>}
        </div>
        <Button variant="outline" size="sm" className="border-primary text-primary lg:hidden" onClick={contact} disabled={contactDisabled} icon={<MessageCircle className="size-4" />}>
          Contacter
        </Button>
      </div>
      <Button
        variant="outline"
        className="mt-4 hidden w-full border-primary text-primary lg:inline-flex"
        onClick={contact}
        loading={contacting}
        disabled={contactDisabled}
        icon={<MessageCircle className="size-4" />}
      >
        Contacter
      </Button>
      <ul className="mt-4 divide-y divide-line/70 text-sm text-body">
        <li className="flex items-center gap-3 py-2.5">
          <MapPin className="size-4 shrink-0 text-muted" /> {owner?.city || animal.city || "Tunisie"}
        </li>
        <li className="flex items-center gap-3 py-2.5">
          <Clock className="size-4 shrink-0 text-muted" /> {owner?.response_time || "Répond généralement rapidement"}
        </li>
        <li className="flex items-center gap-3 py-2.5">
          <UserRound className="size-4 shrink-0 text-muted" /> {owner?.role === "particulier" || !owner ? "Particulier" : ROLE_LABEL[owner.role]}
        </li>
        <li className="flex items-center gap-3 py-2.5">
          <FileText className="size-4 shrink-0 text-muted" /> {detail.data?.ownerListings ?? 0} annonce{(detail.data?.ownerListings ?? 0) > 1 ? "s" : ""}
        </li>
      </ul>
    </Card>
  );

  const infoRows = [
    { icon: PawPrint, label: "Espèce", value: animal.category?.name },
    { icon: Tag, label: "Race", value: animal.breed },
    { icon: Calendar, label: "Âge", value: formatAge(animal.age_value, animal.age_unit) },
    { icon: SexIcon, label: "Sexe", value: animal.sex ? SEX_LABEL[animal.sex] : null },
    { icon: Ruler, label: "Taille estimée", value: [animal.size, animal.weight_kg ? `${animal.weight_kg} kg` : null].filter(Boolean).join(" · ") || null },
    { icon: Palette, label: "Couleur", value: animal.color },
    { icon: MapPin, label: "Lieu", value: animal.city },
  ];

  const mapCard = (
    <Card className="p-5">
      <h3 className="text-base font-extrabold">Carte de localisation</h3>
      <div className="mt-3 overflow-hidden rounded-xl border border-line">
        {animal.latitude != null && animal.longitude != null ? (
          <iframe
            title={`Localisation — ${animal.city ?? ""}`}
            className="h-44 w-full"
            loading="lazy"
            src={`https://www.openstreetmap.org/export/embed.html?bbox=${animal.longitude - 0.02}%2C${animal.latitude - 0.012}%2C${animal.longitude + 0.02}%2C${animal.latitude + 0.012}&layer=mapnik&marker=${animal.latitude}%2C${animal.longitude}`}
          />
        ) : (
          <div className="grid h-44 place-items-center bg-[linear-gradient(135deg,#e3f3f8_25%,#f2f8fc_25%,#f2f8fc_50%,#e3f3f8_50%,#e3f3f8_75%,#f2f8fc_75%)] bg-[length:28px_28px]">
            <span className="grid size-12 place-items-center rounded-full bg-primary text-white shadow-lg">
              <MapPin className="size-6" />
            </span>
          </div>
        )}
      </div>
      <p className="mt-3 flex items-center gap-2 text-sm text-body">
        <MapPin className="size-4 text-muted" /> {animal.city ? `${animal.city}, Tunisie` : "Tunisie"}
      </p>
      <Button
        variant="outline"
        className="mt-3 w-full border-primary text-primary"
        href={
          animal.latitude != null && animal.longitude != null
            ? `https://www.openstreetmap.org/?mlat=${animal.latitude}&mlon=${animal.longitude}#map=14/${animal.latitude}/${animal.longitude}`
            : `https://www.openstreetmap.org/search?query=${encodeURIComponent(`${animal.city ?? ""} Tunisie`)}`
        }
      >
        Voir sur la carte
      </Button>
    </Card>
  );

  return (
    <div className="mx-auto max-w-7xl px-4 pb-16 pt-5 sm:px-6">
      {/* Retour + fil d'Ariane */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-6">
          <button onClick={goBack} className="flex items-center gap-2 font-bold text-primary hover:underline">
            <ArrowLeft className="size-5" /> <span className="hidden sm:inline">Retour aux résultats</span>
            <span className="sm:hidden">Retour</span>
          </button>
          <nav aria-label="Fil d'Ariane" className="hidden items-center gap-1.5 text-sm text-muted md:flex">
            <Link href="/" className="hover:text-primary">
              Accueil
            </Link>
            <Chevron className="size-3.5" />
            <Link href="/animaux" className="hover:text-primary">
              Animaux
            </Link>
            {animal.category && (
              <>
                <Chevron className="size-3.5" />
                <Link href={`/animaux?categorie=${animal.category.slug}`} className="hover:text-primary">
                  {animal.category.name}
                </Link>
              </>
            )}
            <Chevron className="size-3.5" />
            <span className="font-semibold text-body">{animal.name}</span>
          </nav>
        </div>
        <div className="flex items-center gap-2 lg:hidden">
          <button onClick={() => toggle(animal.id)} className={cn("grid size-10 place-items-center rounded-full bg-white shadow-sm", fav ? "text-rose-500" : "text-navy")} aria-label="Favori">
            <Heart className={cn("size-5", fav && "fill-current")} />
          </button>
          <button onClick={share} className="grid size-10 place-items-center rounded-full bg-white text-navy shadow-sm" aria-label="Partager">
            <Share2 className="size-5" />
          </button>
        </div>
      </div>

      {isOwner && !PUBLIC_STATUSES.includes(animal.status) && (
        <div className="mt-4">
          <Alert tone="blue">
            Aperçu de votre annonce : elle n&apos;est pas encore visible publiquement.{" "}
            <Link href={`/espace/annonces/${animal.id}`} className="underline">
              Suivre la publication
            </Link>
          </Alert>
        </div>
      )}
      {closed && (
        <div className="mt-4">
          <Alert tone="teal">
            {animal.name} a déjà trouvé une famille ({animal.status === "adoptee" ? "adopté" : "vendu"}). Découvrez d&apos;autres compagnons ci-dessous.
          </Alert>
        </div>
      )}

      {/* ------------------------------------------------------------ Haut de page */}
      <div className="mt-5 grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] xl:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)_270px]">
        {/* Galerie */}
        <div>
          <div className="relative overflow-hidden rounded-[22px] bg-white shadow-[0_10px_40px_rgba(15,40,90,0.08)]">
            <AnimalThumb src={current} alt={animal.name} className="aspect-[4/3] w-full sm:aspect-[16/11]" />
            <button
              onClick={() => toggle(animal.id)}
              className={cn("absolute right-4 top-4 hidden size-12 place-items-center rounded-full bg-white shadow-lg lg:grid", fav ? "text-rose-500" : "text-navy")}
              aria-label={fav ? "Retirer des favoris" : "Ajouter aux favoris"}
            >
              <Heart className={cn("size-6", fav && "fill-current")} />
            </button>
            {photos.length > 1 && (
              <>
                <button
                  onClick={() => setIndex((i) => (i - 1 + photos.length) % photos.length)}
                  className="absolute left-3 top-1/2 grid size-9 -translate-y-1/2 place-items-center rounded-full bg-white/90 text-navy shadow"
                  aria-label="Photo précédente"
                >
                  <ChevronLeft className="size-5" />
                </button>
                <button
                  onClick={() => setIndex((i) => (i + 1) % photos.length)}
                  className="absolute right-3 top-1/2 grid size-9 -translate-y-1/2 place-items-center rounded-full bg-white/90 text-navy shadow"
                  aria-label="Photo suivante"
                >
                  <ChevronRight className="size-5" />
                </button>
              </>
            )}
            {photos.length > 0 && (
              <span className="absolute bottom-4 right-4 rounded-lg bg-navy/70 px-2.5 py-1 text-sm font-bold text-white">
                {Math.min(index + 1, photos.length)}/{photos.length}
              </span>
            )}
          </div>
          {photos.length > 1 && (
            <div className="relative mt-3">
              <div ref={thumbs} className="scrollbar-none flex gap-3 overflow-x-auto scroll-smooth">
                {photos.map((p, i) => (
                  <button
                    key={p}
                    onClick={() => setIndex(i)}
                    className={cn(
                      "size-[72px] shrink-0 overflow-hidden rounded-xl border-2 transition sm:size-24",
                      i === index ? "border-primary" : "border-transparent opacity-80 hover:opacity-100",
                    )}
                    aria-label={`Photo ${i + 1}`}
                  >
                    <AnimalThumb src={p} className="size-full" />
                  </button>
                ))}
              </div>
              {photos.length > 4 && (
                <button
                  onClick={() => thumbs.current?.scrollBy({ left: 240 })}
                  className="absolute -right-2 top-1/2 hidden size-9 -translate-y-1/2 place-items-center rounded-full bg-white text-navy shadow-md sm:grid"
                  aria-label="Voir plus de photos"
                >
                  <ChevronRight className="size-5" />
                </button>
              )}
            </div>
          )}
        </div>

        {/* Infos */}
        <div>
          <div className="flex items-center justify-between gap-3">
            <span
              className={cn(
                "inline-flex items-center gap-1.5 rounded-lg px-3 py-1 text-sm font-bold",
                animal.listing_type === "adoption" ? "bg-orange-50 text-adopt" : "bg-emerald-50 text-sale",
              )}
            >
              <PawPrint className="size-4" />
              {animal.listing_type === "adoption" ? "À adopter" : "À vendre"}
            </span>
            <div className="hidden items-center gap-2 lg:flex">
              <button onClick={share} className="flex items-center gap-2 text-sm font-semibold text-navy hover:text-primary">
                <Share2 className="size-4 text-primary" /> Partager
              </button>
              <button onClick={share} className="grid size-10 place-items-center rounded-full border border-line bg-white text-navy" aria-label="Partager">
                <Share2 className="size-4" />
              </button>
            </div>
          </div>
          <h1 className="mt-3 text-3xl font-extrabold tracking-tight sm:text-[2.4rem]">{animal.name}</h1>
          <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-base text-body sm:text-lg">
            {animal.sex && (
              <span className="flex items-center gap-1.5">
                <SexIcon className="size-[18px]" /> {SEX_LABEL[animal.sex]}
              </span>
            )}
            <span className="h-4 w-px bg-line" />
            <span className="flex items-center gap-1.5">
              <PawPrint className="size-[18px]" /> {formatAge(animal.age_value, animal.age_unit)}
            </span>
            {animal.city && (
              <>
                <span className="h-4 w-px bg-line" />
                <span className="flex items-center gap-1.5">
                  <MapPin className="size-[18px]" /> {animal.city}
                </span>
              </>
            )}
          </div>
          <p className="mt-3 text-2xl font-extrabold text-primary">{formatPrice(animal.price, animal.listing_type)}</p>

          {animal.short_description && (
            <div className="mt-3">
              <p className={cn("leading-relaxed text-body", !expanded && "line-clamp-3 sm:line-clamp-none")}>{animal.short_description}</p>
              <button onClick={() => setExpanded((e) => !e)} className="mt-1 flex items-center gap-1 font-bold text-primary sm:hidden">
                {expanded ? "Voir moins" : "Voir plus"} <ArrowRight className="size-4" />
              </button>
            </div>
          )}

          {heroChips.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-2">
              {heroChips.map(({ icon: Icon, label }) => (
                <span key={label} className="flex items-center gap-1.5 rounded-full border border-line bg-white px-3.5 py-2 text-sm font-semibold text-navy">
                  <Icon className="size-4 text-primary" /> {label}
                </span>
              ))}
            </div>
          )}

          {animal.why_adopt && (
            <div className="mt-5 flex gap-4 rounded-2xl bg-primary-soft/70 p-4">
              <PawPrint className="size-9 shrink-0 text-primary" />
              <div>
                <p className="font-extrabold text-navy">Pourquoi l&apos;adopter ?</p>
                <p className="mt-1 text-sm leading-relaxed text-body">{animal.why_adopt}</p>
              </div>
            </div>
          )}

          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <Button size="lg" className="flex-1" onClick={contact} loading={contacting} disabled={contactDisabled} icon={<MessageCircle className="size-5" />}>
              {isOwner ? "C'est votre annonce" : "Contacter le propriétaire"}
            </Button>
            <Button size="lg" variant="outline" onClick={() => toggle(animal.id)} icon={<Heart className={cn("size-5", fav && "fill-rose-500 text-rose-500")} />}>
              {fav ? "Dans vos favoris" : "Ajouter aux favoris"}
            </Button>
          </div>
          <div className="mt-3 flex items-center justify-between text-xs text-muted">
            <span className="flex items-center gap-1.5">
              <Eye className="size-3.5" /> {animal.views_count} vue{animal.views_count > 1 ? "s" : ""}
              {animal.published_at && <> · publiée le {formatDate(animal.published_at)}</>}
            </span>
            {!isOwner && (
              <button
                onClick={() => (user ? setReportOpen(true) : router.push(`/connexion?next=${encodeURIComponent(`/animaux/${animal.id}`)}`))}
                className="flex items-center gap-1.5 font-semibold hover:text-red-600"
              >
                <Flag className="size-3.5" /> Signaler l&apos;annonce
              </button>
            )}
          </div>
        </div>

        {/* Propriétaire (desktop xl) */}
        <div className="hidden xl:block">{ownerCard}</div>
      </div>

      {/* ------------------------------------------------------------ Onglets */}
      <div className="mt-10">
        <Tabs<TabKey>
          value={tab}
          onChange={setTab}
          items={[
            { value: "infos", label: "Informations" },
            { value: "sante", label: "Santé" },
            { value: "caractere", label: "Caractère" },
            { value: "conditions", label: "Conditions d'adoption" },
          ]}
        />
        <div className={cn("mt-6 grid gap-5", tab === "infos" ? "lg:grid-cols-[1fr_1.25fr_1fr]" : "lg:grid-cols-[2fr_1fr]")}>
          {tab === "infos" && (
            <>
              <Card className="p-5">
                <h3 className="text-base font-extrabold">Informations générales</h3>
                <dl className="mt-3 divide-y divide-line/70">
                  {infoRows.map(({ icon: Icon, label, value }) => (
                    <div key={label} className="grid grid-cols-[24px_1fr_1.3fr] items-center gap-3 py-2.5 text-sm">
                      <Icon className="size-4 text-muted" />
                      <dt className="text-body">{label}</dt>
                      <dd className="font-semibold text-navy">{value || "—"}</dd>
                    </div>
                  ))}
                </dl>
              </Card>
              <Card className="p-5">
                <h3 className="text-base font-extrabold">Description détaillée</h3>
                <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-body">
                  {animal.description || animal.short_description || "Le propriétaire n'a pas encore ajouté de description détaillée."}
                </p>
                {besoins.length > 0 && (
                  <>
                    <h4 className="mt-5 text-[15px] font-extrabold">{besoinsGroup?.name ?? "Besoins"}</h4>
                    <ValueList values={besoins} group={besoinsGroup} />
                  </>
                )}
              </Card>
            </>
          )}

          {tab === "sante" && (
            <Card className="p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h3 className="text-base font-extrabold">Santé</h3>
                {certifiedLabel && (
                  <span className="flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1.5 text-sm font-bold text-emerald-700">
                    <BadgeCheck className="size-4" /> {certifiedLabel}
                  </span>
                )}
              </div>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {[...new Set([...(santeGroup?.options ?? []).map((o) => o.label), ...(chars.sante ?? [])])].map((label) => ({
                  ok: (chars.sante ?? []).includes(label),
                  icon: valueIcon(santeGroup, label),
                  label,
                })).map(({ ok, icon: Icon, label }) => (
                  <div key={label} className={cn("flex items-center gap-3 rounded-xl border p-3 text-sm font-semibold", ok ? "border-emerald-200 bg-emerald-50/60 text-emerald-800" : "border-line text-muted")}>
                    <Icon className="size-5" /> {label}
                    <span className="ml-auto text-xs">{ok ? "Oui" : "Non renseigné"}</span>
                  </div>
                ))}
              </div>
              <h4 className="mt-6 flex items-center gap-2 text-[15px] font-extrabold">
                <Stethoscope className="size-4 text-primary" /> Vaccinations
              </h4>
              {detail.data && detail.data.vaccinations.length > 0 ? (
                <div className="mt-3 overflow-x-auto">
                  <table className="w-full min-w-[420px] text-sm">
                    <thead>
                      <tr className="bg-page text-left text-xs font-bold uppercase text-muted">
                        <th className="rounded-l-lg px-3 py-2">Vaccin</th>
                        <th className="px-3 py-2">Date</th>
                        <th className="px-3 py-2">Rappel</th>
                        <th className="rounded-r-lg px-3 py-2">Statut</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-line/70">
                      {detail.data.vaccinations.map((v) => (
                        <tr key={v.id}>
                          <td className="px-3 py-2.5 font-semibold text-navy">{v.name}</td>
                          <td className="px-3 py-2.5">{formatDate(v.vaccinated_on)}</td>
                          <td className="px-3 py-2.5">{formatDate(v.next_due_on)}</td>
                          <td className="px-3 py-2.5">
                            <MetaBadge meta={VACCINATION_STATUS[v.status]} />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="mt-2 text-sm text-muted">Aucune vaccination enregistrée par un vétérinaire pour le moment.</p>
              )}
            </Card>
          )}

          {tab === "caractere" && (
            <Card className="p-5">
              <h3 className="text-base font-extrabold">{otherGroups[0]?.name ?? "Caractère"}</h3>
              {otherGroups.map((g, i) => {
                const values = chars[g.slug] ?? [];
                return (
                  <div key={g.id}>
                    {i > 0 && <h4 className="mt-6 text-[15px] font-extrabold">{g.name}</h4>}
                    {values.length > 0 ? (
                      g.slug === "caractere" ? (
                        <div className="mt-3 flex flex-wrap gap-2">
                          {values.map((t) => {
                            const Icon = valueIcon(g, t);
                            return (
                              <Badge key={t} tone="teal" dot={false} className="px-3 py-1.5 text-sm">
                                <Icon className="size-3.5" /> {t}
                              </Badge>
                            );
                          })}
                        </div>
                      ) : (
                        <ValueList values={values} group={g} />
                      )
                    ) : (
                      <p className="mt-2 text-sm text-muted">Non renseigné.</p>
                    )}
                  </div>
                );
              })}
              {animal.why_adopt && (
                <>
                  <h4 className="mt-6 text-[15px] font-extrabold">Pourquoi l&apos;adopter ?</h4>
                  <p className="mt-2 text-sm leading-relaxed text-body">{animal.why_adopt}</p>
                </>
              )}
            </Card>
          )}

          {tab === "conditions" && (
            <Card className="p-5">
              <h3 className="text-base font-extrabold">Conditions d&apos;adoption</h3>
              <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-body">
                {animal.adoption_conditions || "Le propriétaire n'a pas précisé de conditions particulières. Contactez-le pour en savoir plus."}
              </p>
              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                <div className="rounded-xl bg-page p-4 text-sm">
                  <p className="font-bold text-navy">Type d&apos;annonce</p>
                  <p className="mt-1 text-body">{animal.listing_type === "adoption" ? "Adoption (gratuite)" : "Vente"}</p>
                </div>
                <div className="rounded-xl bg-page p-4 text-sm">
                  <p className="font-bold text-navy">Prix</p>
                  <p className="mt-1 font-bold text-primary">{formatPrice(animal.price, animal.listing_type)}</p>
                </div>
              </div>
              <div className="mt-4">
                <Alert tone="blue">Conseil Bakma : rencontrez l&apos;animal avant toute adoption et ne versez jamais d&apos;argent à l&apos;avance.</Alert>
              </div>
            </Card>
          )}

          {mapCard}
        </div>
      </div>

      {/* Propriétaire (mobile / tablette) */}
      <div className="mt-6 xl:hidden">{ownerCard}</div>

      {/* ------------------------------------------------------------ Similaires */}
      {similar.data && similar.data.length > 0 && (
        <section className="mt-12">
          <div className="mb-4 flex items-end justify-between">
            <h2 className="text-2xl font-extrabold">Animaux similaires</h2>
            <Link href={animal.category ? `/animaux?categorie=${animal.category.slug}` : "/animaux"} className="text-sm font-bold text-primary hover:underline">
              Voir tous
            </Link>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-4">
            {similar.data.map((a) => (
              <AnimalCard key={a.id} animal={a} />
            ))}
          </div>
        </section>
      )}

      {user && !isOwner && (
        <ReportModal open={reportOpen} onClose={() => setReportOpen(false)} animalId={animal.id} ownerId={animal.owner_id} reporterId={user.id} />
      )}
    </div>
  );
}

function ValueList({ values, group }: { values: string[]; group: CharacteristicGroup | undefined }) {
  return (
    <ul className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-2 xl:grid-cols-4">
      {values.map((n) => {
        const Icon = valueIcon(group, n);
        return (
          <li key={n} className="flex items-center gap-2 text-sm text-body">
            <span className="grid size-9 shrink-0 place-items-center rounded-full bg-primary-soft text-primary">
              <Icon className="size-4" />
            </span>
            {n}
          </li>
        );
      })}
    </ul>
  );
}
