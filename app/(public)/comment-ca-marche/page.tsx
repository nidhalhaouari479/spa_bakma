import type { Metadata } from "next";
import { ArrowRight, BadgeCheck, CheckCircle2, ClipboardCheck, HeartHandshake, MessageCircle, Search, ShieldCheck, Stethoscope } from "lucide-react";
import { Button } from "@/components/ui";
import { HOW_STEPS } from "@/lib/content";

export const metadata: Metadata = {
  title: "Comment ça marche",
  description: "Publication, vérification vétérinaire, validation et adoption : découvrez le parcours d'une annonce sur Bakma Store.",
};

const ADOPTER_STEPS = [
  { icon: Search, title: "Cherchez", text: "Filtrez par espèce, ville, âge ou prix pour trouver le compagnon qui vous correspond." },
  { icon: ShieldCheck, title: "Consultez", text: "Chaque fiche détaille la santé, le caractère et les besoins de l'animal, contrôlés par un vétérinaire." },
  { icon: MessageCircle, title: "Échangez", text: "Contactez le propriétaire via la messagerie sécurisée, sans dévoiler vos coordonnées." },
  { icon: HeartHandshake, title: "Adoptez", text: "Rencontrez l'animal, posez vos questions et accueillez-le dans votre famille." },
];

const FAQ = [
  { q: "La publication d'une annonce est-elle payante ?", a: "Non, la publication est entièrement gratuite pour les particuliers, qu'il s'agisse d'une adoption ou d'une vente." },
  {
    q: "Pourquoi une vérification vétérinaire ?",
    a: "Pour garantir que chaque animal proposé est en bonne santé et que les informations de l'annonce sont exactes. Un vétérinaire partenaire examine l'animal et rédige un rapport (examens, vaccinations, observations).",
  },
  {
    q: "Combien de temps dure la vérification ?",
    a: "En général quelques jours : un vétérinaire prend en charge la demande, planifie un rendez-vous si nécessaire, puis notre équipe valide la publication.",
  },
  {
    q: "Que se passe-t-il si le vétérinaire demande des compléments ?",
    a: "Vous êtes notifié avec le motif. Il suffit de modifier votre annonce : le même vétérinaire reprend alors la consultation.",
  },
  { q: "Mes coordonnées sont-elles visibles ?", a: "Non. Votre e-mail et votre téléphone restent privés : les échanges passent par la messagerie Bakma Store." },
];

export default function HowItWorksPage() {
  return (
    <>
      <section className="bg-gradient-to-b from-[#e6f4fa] to-page">
        <div className="mx-auto max-w-4xl px-4 py-14 text-center sm:px-6 sm:py-20">
          <p className="text-xs font-extrabold uppercase tracking-[0.2em] text-primary">Simple, transparent, sécurisé</p>
          <h1 className="mt-3 text-4xl font-extrabold tracking-tight sm:text-5xl">Comment ça marche ?</h1>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-body">
            Sur Bakma Store, chaque annonce est vérifiée par un vétérinaire puis validée par notre équipe avant d&apos;être publiée. Voici le
            parcours, étape par étape.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
        <h2 className="text-2xl font-extrabold sm:text-3xl">Vous publiez un animal</h2>
        <ol className="relative mt-8 grid gap-5 md:grid-cols-2 lg:grid-cols-4">
          {HOW_STEPS.map(({ icon: Icon, title, text }, i) => (
            <li key={title} className="relative rounded-[var(--radius-card)] border border-line/70 bg-white p-6 shadow-[0_4px_24px_rgba(15,40,90,0.06)]">
              <div className="flex items-center gap-3">
                <span className="grid size-12 place-items-center rounded-2xl bg-gradient-to-b from-primary to-primary-dark text-white">
                  <Icon className="size-6" />
                </span>
                <span className="text-sm font-extrabold text-primary">Étape {i + 1}</span>
              </div>
              <h3 className="mt-4 text-lg font-extrabold">{title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-body">{text}</p>
            </li>
          ))}
        </ol>

        <div className="mt-8 grid gap-5 lg:grid-cols-3">
          {[
            { icon: ClipboardCheck, t: "Une annonce complète", d: "Photos, âge, santé, caractère, besoins et conditions d'adoption : tout ce qu'un adoptant doit savoir." },
            { icon: Stethoscope, t: "Un rapport vétérinaire", d: "Examen clinique, vaccinations et observations sont consignés et consultables dans votre espace." },
            { icon: BadgeCheck, t: "Un badge de confiance", d: "Les annonces publiées affichent le contrôle vétérinaire effectué, gage de sérieux." },
          ].map(({ icon: Icon, t, d }) => (
            <div key={t} className="flex gap-4 rounded-2xl bg-primary-soft/50 p-5">
              <Icon className="size-7 shrink-0 text-primary" />
              <div>
                <p className="font-extrabold text-navy">{t}</p>
                <p className="mt-1 text-sm text-body">{d}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="bg-white py-12">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <h2 className="text-2xl font-extrabold sm:text-3xl">Vous souhaitez adopter</h2>
          <ol className="mt-8 grid gap-5 md:grid-cols-2 lg:grid-cols-4">
            {ADOPTER_STEPS.map(({ icon: Icon, title, text }, i) => (
              <li key={title} className="rounded-[var(--radius-card)] border border-line/70 bg-page/60 p-6">
                <span className="grid size-12 place-items-center rounded-full bg-white text-primary shadow-sm">
                  <Icon className="size-6" />
                </span>
                <h3 className="mt-4 text-lg font-extrabold">
                  {i + 1}. {title}
                </h3>
                <p className="mt-1.5 text-sm leading-relaxed text-body">{text}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section id="faq" className="mx-auto max-w-4xl scroll-mt-24 px-4 py-14 sm:px-6">
        <h2 className="text-center text-2xl font-extrabold sm:text-3xl">Questions fréquentes</h2>
        <div className="mt-8 space-y-3">
          {FAQ.map(({ q, a }) => (
            <details key={q} className="group rounded-2xl border border-line/70 bg-white p-5 shadow-[0_4px_20px_rgba(15,40,90,0.04)]">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-extrabold text-navy">
                {q}
                <span className="grid size-7 shrink-0 place-items-center rounded-full bg-primary-soft text-primary transition group-open:rotate-45">+</span>
              </summary>
              <p className="mt-3 text-sm leading-relaxed text-body">{a}</p>
            </details>
          ))}
        </div>
        <div className="mt-10 flex flex-col items-center gap-3 rounded-[24px] bg-gradient-to-br from-primary to-primary-dark p-8 text-center text-white">
          <CheckCircle2 className="size-9" />
          <p className="text-xl font-extrabold">Prêt à commencer ?</p>
          <div className="flex flex-wrap justify-center gap-3">
            <Button href="/espace/annonces/nouvelle" variant="outline" className="border-white">
              Publier un animal
            </Button>
            <Button href="/animaux" variant="ghost" className="text-white hover:bg-white/15 hover:text-white">
              Voir les animaux <ArrowRight className="size-4" />
            </Button>
          </div>
        </div>
      </section>
    </>
  );
}
