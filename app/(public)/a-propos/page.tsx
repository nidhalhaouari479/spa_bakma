import type { Metadata } from "next";
import { HeartHandshake, Mail, MapPin, PawPrint, Phone, ShieldCheck, Stethoscope, Users } from "lucide-react";
import { HeroArt } from "@/components/site/HeroArt";
import { Button } from "@/components/ui";

export const metadata: Metadata = {
  title: "À propos",
  description: "Bakma Store, la marketplace tunisienne de l'adoption responsable : animaux vérifiés par des vétérinaires.",
};

const VALUES = [
  { icon: HeartHandshake, t: "Bien-être animal", d: "Chaque décision est prise dans l'intérêt de l'animal : santé, environnement adapté, famille responsable." },
  { icon: Stethoscope, t: "Expertise vétérinaire", d: "Un réseau de vétérinaires partenaires contrôle chaque animal avant sa mise en ligne." },
  { icon: ShieldCheck, t: "Confiance & sécurité", d: "Annonces modérées, coordonnées protégées, messagerie intégrée et signalement en un clic." },
  { icon: Users, t: "Communauté", d: "Particuliers, vétérinaires et associations réunis autour d'une même passion." },
];

export default function AboutPage() {
  return (
    <>
      <section className="bg-gradient-to-b from-[#e6f4fa] to-page">
        <div className="mx-auto grid max-w-7xl items-center gap-8 px-4 py-12 sm:px-6 lg:grid-cols-2 lg:py-16">
          <div>
            <p className="text-xs font-extrabold uppercase tracking-[0.2em] text-primary">Notre mission</p>
            <h1 className="mt-3 text-4xl font-extrabold leading-tight tracking-tight sm:text-5xl">
              Des amis pour la vie, <span className="text-primary">en toute confiance</span>
            </h1>
            <p className="mt-5 max-w-xl text-lg leading-relaxed text-body">
              Bakma Store est née d&apos;une conviction simple : adopter ou acquérir un animal doit être un moment de joie, pas un pari. Nous
              connectons les familles tunisiennes avec des animaux en bonne santé, vérifiés par des vétérinaires.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Button href="/animaux" size="lg" icon={<PawPrint className="size-5" />}>
                Découvrir les animaux
              </Button>
              <Button href="mailto:contact@bakma.tn?subject=Devenir%20v%C3%A9t%C3%A9rinaire%20partenaire" variant="outline" size="lg" icon={<Stethoscope className="size-5" />}>
                Devenir vétérinaire partenaire
              </Button>
            </div>
          </div>
          <HeroArt className="mx-auto w-full max-w-lg" priority={false} />
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
        <h2 className="text-2xl font-extrabold sm:text-3xl">Nos valeurs</h2>
        <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {VALUES.map(({ icon: Icon, t, d }) => (
            <div key={t} className="rounded-[var(--radius-card)] border border-line/70 bg-white p-6 shadow-[0_4px_24px_rgba(15,40,90,0.06)]">
              <span className="grid size-12 place-items-center rounded-2xl bg-primary-soft text-primary">
                <Icon className="size-6" />
              </span>
              <h3 className="mt-4 text-lg font-extrabold">{t}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-body">{d}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="bg-white py-12">
        <div className="mx-auto grid max-w-7xl gap-6 px-4 sm:px-6 lg:grid-cols-3">
          <div id="contact" className="scroll-mt-24 rounded-[var(--radius-card)] bg-page/70 p-6">
            <h2 className="text-xl font-extrabold">Nous contacter</h2>
            <ul className="mt-4 space-y-3 text-sm text-body">
              <li className="flex items-center gap-3">
                <Mail className="size-4 text-primary" /> contact@bakma.tn
              </li>
              <li className="flex items-center gap-3">
                <Phone className="size-4 text-primary" /> +216 00 000 000
              </li>
              <li className="flex items-center gap-3">
                <MapPin className="size-4 text-primary" /> Tunis, Tunisie
              </li>
            </ul>
          </div>
          <div id="conditions" className="scroll-mt-24 rounded-[var(--radius-card)] bg-page/70 p-6">
            <h2 className="text-xl font-extrabold">Conditions d&apos;utilisation</h2>
            <ul className="mt-4 list-disc space-y-2 pl-5 text-sm leading-relaxed text-body">
              <li>Les annonces doivent décrire fidèlement l&apos;animal et son état de santé.</li>
              <li>Toute publication est soumise à une vérification vétérinaire et à la validation de l&apos;équipe.</li>
              <li>Le commerce d&apos;espèces protégées et toute forme de maltraitance sont strictement interdits.</li>
              <li>Bakma Store peut retirer une annonce ou suspendre un compte en cas de manquement.</li>
            </ul>
          </div>
          <div id="confidentialite" className="scroll-mt-24 rounded-[var(--radius-card)] bg-page/70 p-6">
            <h2 className="text-xl font-extrabold">Politique de confidentialité</h2>
            <ul className="mt-4 list-disc space-y-2 pl-5 text-sm leading-relaxed text-body">
              <li>Votre e-mail et votre téléphone ne sont jamais affichés publiquement.</li>
              <li>Ils ne sont partagés qu&apos;avec le vétérinaire en charge de votre animal.</li>
              <li>Vous pouvez modifier vos informations à tout moment depuis votre profil.</li>
              <li>Vos données ne sont ni vendues ni cédées à des tiers.</li>
            </ul>
          </div>
        </div>
      </section>
    </>
  );
}
