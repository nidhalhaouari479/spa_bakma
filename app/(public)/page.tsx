"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ArrowRight, CheckCircle2, PawPrint } from "lucide-react";
import { AnimalCard, AnimalCardSkeleton } from "@/components/site/AnimalCard";
import { CategoryBubble } from "@/components/site/CategoryIcon";
import { HeroArt } from "@/components/site/HeroArt";
import { SearchBar } from "@/components/site/SearchBar";
import { Alert, Button, cn, EmptyState } from "@/components/ui";
import { unwrap, useQuery } from "@/hooks/useQuery";
import { useCategories } from "@/hooks/useRefData";
import { ANIMAL_CARD } from "@/lib/catalog";
import { GUARANTEES, HOW_STEPS } from "@/lib/content";
import { getSupabase } from "@/lib/supabase";
import type { Animal } from "@/lib/types";

export default function HomePage() {
  const router = useRouter();
  const { categories, loading: catLoading } = useCategories();
  const [chip, setChip] = useState<number | "all">("all");

  const recent = useQuery(async () => {
    let q = getSupabase().from("animals").select(ANIMAL_CARD).eq("status", "publiee");
    if (chip !== "all") q = q.eq("category_id", chip);
    return unwrap<Animal[]>(await q.order("published_at", { ascending: false, nullsFirst: false }).order("created_at", { ascending: false }).limit(10));
  }, [chip]);

  return (
    <>
      {/* ------------------------------------------------------------ Hero */}
      <section className="relative overflow-hidden bg-gradient-to-b from-[#e6f4fa] via-[#f2f9fc] to-page">
        <span className="absolute -left-24 top-10 size-72 rounded-full bg-white/60 blur-3xl" aria-hidden />
        <div className="relative mx-auto grid max-w-7xl items-center gap-6 px-4 pt-8 sm:px-6 lg:grid-cols-[1.05fr_1fr] lg:pt-12">
          <div className="max-w-xl">
            <h1 className="text-[2.4rem] font-extrabold leading-[1.05] tracking-tight sm:text-5xl lg:text-[4rem]">
              Trouvez <br className="hidden sm:block" />
              votre compagnon <br />
              <span className="text-primary">idéal</span>
            </h1>
            <p className="mt-5 max-w-md text-base leading-relaxed text-body sm:text-lg">
              Découvrez des animaux en bonne santé, vérifiés et prêts à rejoindre leur nouvelle famille.
            </p>
          </div>
          <HeroArt className="mx-auto w-full max-w-md lg:max-w-xl" />
        </div>
        <div className="relative mx-auto max-w-7xl px-4 pb-10 sm:px-6 lg:-mt-6">
          <SearchBar
            placeholder="Rechercher un animal…"
            className="lg:max-w-5xl"
            onSearch={(q, city) => {
              const p = new URLSearchParams();
              if (q) p.set("q", q);
              if (city) p.set("ville", city);
              router.push(`/animaux${p.size ? `?${p}` : ""}`);
            }}
          />
          <ul className="mt-6 grid grid-cols-4 gap-2 sm:flex sm:flex-wrap sm:gap-x-8 sm:gap-y-3">
            {GUARANTEES.map(({ icon: Icon, label }) => (
              <li key={label} className="flex flex-col items-center gap-1.5 text-center text-[11px] font-semibold text-body sm:flex-row sm:text-sm">
                <span className="grid size-9 place-items-center rounded-full bg-white text-primary shadow-sm ring-1 ring-line/70">
                  <Icon className="size-[18px]" />
                </span>
                {label}
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* ------------------------------------------------------------ Catégories */}
      <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
        <div className="mb-5 flex items-end justify-between gap-4">
          <h2 className="text-2xl font-extrabold sm:text-[28px]">Catégories</h2>
          <Link href="/animaux" className="flex items-center gap-1 text-sm font-semibold text-primary hover:underline">
            <span className="hidden sm:inline">Voir toutes les catégories</span>
            <span className="sm:hidden">Voir toutes</span>
            <ArrowRight className="size-4" />
          </Link>
        </div>
        <div className="grid grid-cols-4 gap-2.5 sm:gap-4 lg:grid-cols-8">
          {catLoading
            ? Array.from({ length: 8 }).map((_, i) => <div key={i} className="h-36 animate-pulse rounded-2xl bg-white" />)
            : categories.map((c) => (
                <Link
                  key={c.id}
                  href={`/animaux?categorie=${c.slug}`}
                  className="group flex flex-col items-center gap-2 rounded-2xl border border-line/70 bg-white px-1.5 py-3 text-center shadow-[0_4px_20px_rgba(15,40,90,0.05)] transition hover:-translate-y-0.5 hover:border-primary/40 sm:py-5"
                >
                  <CategoryBubble icon={c.icon} size={64} className="transition group-hover:scale-105 max-sm:!size-12" />
                  <span className="text-xs font-bold leading-tight text-navy sm:text-sm">{c.name}</span>
                  <span className="hidden text-xs text-muted sm:block">
                    {c.total} annonce{c.total > 1 ? "s" : ""}
                  </span>
                </Link>
              ))}
        </div>
      </section>

      {/* ------------------------------------------------------------ Animaux récents */}
      <section className="mx-auto max-w-7xl px-4 pb-12 sm:px-6">
        <div className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-end justify-between">
            <h2 className="text-2xl font-extrabold sm:text-[28px]">Animaux récents</h2>
            <Link href="/animaux" className="flex items-center gap-1 text-sm font-semibold text-primary lg:hidden">
              Voir tous <ArrowRight className="size-4" />
            </Link>
          </div>
          <div className="scrollbar-none -mx-4 flex gap-2 overflow-x-auto px-4 lg:mx-0 lg:px-0">
            {[{ id: "all" as const, name: "Tous" }, ...categories.slice(0, 7)].map((c) => (
              <button
                key={c.id}
                onClick={() => setChip(c.id)}
                className={cn(
                  "shrink-0 rounded-full border px-4 py-1.5 text-sm font-semibold transition",
                  chip === c.id ? "border-primary bg-white text-navy shadow-sm ring-2 ring-primary/15" : "border-line bg-white/70 text-body hover:text-primary",
                )}
              >
                {c.name}
              </button>
            ))}
          </div>
        </div>
        {recent.error && <Alert>{recent.error}</Alert>}
        {recent.loading && !recent.data ? (
          <div className="grid grid-cols-2 gap-3 sm:gap-5 md:grid-cols-3 lg:grid-cols-5">
            {Array.from({ length: 5 }).map((_, i) => (
              <AnimalCardSkeleton key={i} />
            ))}
          </div>
        ) : recent.data && recent.data.length > 0 ? (
          <div className={cn("grid grid-cols-2 gap-3 transition sm:gap-5 md:grid-cols-3 lg:grid-cols-5", recent.loading && "opacity-60")}>
            {recent.data.map((a) => (
              <AnimalCard key={a.id} animal={a} />
            ))}
          </div>
        ) : (
          !recent.error && (
            <div className="rounded-[var(--radius-card)] bg-white">
              <EmptyState
                title="Aucune annonce pour le moment"
                text="Revenez bientôt : de nouveaux compagnons sont vérifiés chaque jour."
                action={<Button href="/espace/annonces/nouvelle">Publier un animal</Button>}
              />
            </div>
          )
        )}
        <div className="mt-8 hidden justify-center lg:flex">
          <Button href="/animaux" variant="outline" icon={<PawPrint className="size-4" />}>
            Voir tous les animaux
          </Button>
        </div>
      </section>

      {/* ------------------------------------------------------------ Comment ça marche */}
      <section className="bg-white py-14">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-primary">Simple et sécurisé</p>
            <h2 className="mt-2 text-2xl font-extrabold sm:text-[32px]">Comment ça marche ?</h2>
            <p className="mt-3 text-body">Chaque annonce est contrôlée par un vétérinaire avant d&apos;être publiée.</p>
          </div>
          <ol className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {HOW_STEPS.map(({ icon: Icon, title, text }, i) => (
              <li key={title} className="relative rounded-[var(--radius-card)] border border-line/70 bg-page/60 p-6">
                <span className="absolute right-5 top-5 text-4xl font-extrabold text-primary/10">{i + 1}</span>
                <span className="grid size-14 place-items-center rounded-2xl bg-gradient-to-b from-primary to-primary-dark text-white shadow-md">
                  <Icon className="size-6" />
                </span>
                <h3 className="mt-4 text-lg font-extrabold">{title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-body">{text}</p>
              </li>
            ))}
          </ol>
          <div className="mt-8 text-center">
            <Link href="/comment-ca-marche" className="inline-flex items-center gap-1 text-sm font-bold text-primary hover:underline">
              En savoir plus <ArrowRight className="size-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------ CTA */}
      <section className="mx-auto max-w-7xl px-4 py-14 sm:px-6">
        <div className="relative overflow-hidden rounded-[28px] bg-gradient-to-br from-primary to-primary-dark px-6 py-10 text-white sm:px-12 sm:py-14">
          <PawPrint className="absolute -right-6 -top-6 size-40 rotate-12 text-white/10" aria-hidden />
          <PawPrint className="absolute bottom-4 right-40 size-16 -rotate-12 text-white/10" aria-hidden />
          <div className="relative max-w-2xl">
            <h2 className="text-2xl font-extrabold !text-white sm:text-4xl">Vous avez un animal à faire adopter ?</h2>
            <p className="mt-3 text-white/85 sm:text-lg">
              Publiez votre annonce gratuitement. Après une vérification vétérinaire, elle sera visible par des milliers de familles.
            </p>
            <ul className="mt-5 flex flex-wrap gap-x-6 gap-y-2 text-sm font-semibold">
              {["Publication gratuite", "Contrôle vétérinaire", "Messagerie sécurisée"].map((t) => (
                <li key={t} className="flex items-center gap-2">
                  <CheckCircle2 className="size-4" /> {t}
                </li>
              ))}
            </ul>
            <div className="mt-7 flex flex-wrap gap-3">
              <Button href="/espace/annonces/nouvelle" variant="outline" size="lg" className="border-white">
                Publier un animal
              </Button>
              <Button href="/animaux" variant="ghost" size="lg" className="text-white hover:bg-white/15 hover:text-white">
                Découvrir les animaux <ArrowRight className="size-4" />
              </Button>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
