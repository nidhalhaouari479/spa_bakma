import { HeartHandshake, ShieldCheck, Users } from "lucide-react";
import { cn } from "@/lib/cn";
import { HeroArt } from "./HeroArt";

/** Mise en page des écrans d'authentification : hero à gauche, carte à droite. */
export function AuthLayout({
  hero,
  children,
  trust = true,
  className,
}: {
  hero: React.ReactNode;
  children: React.ReactNode;
  trust?: boolean;
  className?: string;
}) {
  return (
    <section className="relative overflow-hidden bg-gradient-to-b from-[#e6f4fa] via-[#f2f9fc] to-page">
      <span className="absolute -left-20 top-20 size-72 rounded-full bg-white/60 blur-3xl" aria-hidden />
      <div className={cn("relative mx-auto grid max-w-7xl gap-6 px-4 py-8 sm:px-6 lg:grid-cols-2 lg:items-center lg:gap-12 lg:py-14", className)}>
        <div className="flex flex-col">
          <div className="hidden lg:block">{hero}</div>
          <HeroArt className="mx-auto mt-2 w-full max-w-sm lg:mt-6 lg:max-w-lg" />
        </div>
        <div className="relative -mt-10 rounded-[28px] bg-white p-6 shadow-[0_20px_60px_rgba(14,124,155,0.12)] ring-1 ring-line/60 sm:p-10 lg:mt-0">{children}</div>
      </div>
      {trust && (
        <div className="relative border-t border-line/60 bg-white/70">
          <ul className="mx-auto grid max-w-7xl gap-6 px-4 py-8 sm:grid-cols-3 sm:px-6">
            {[
              { icon: ShieldCheck, t: "Plateforme sécurisée", d: "Vos données sont protégées" },
              { icon: HeartHandshake, t: "Animaux vérifiés", d: "En bonne santé et contrôlés" },
              { icon: Users, t: "Une communauté engagée", d: "Pour le bien-être animal" },
            ].map(({ icon: Icon, t, d }) => (
              <li key={t} className="flex items-center gap-4 sm:justify-center">
                <span className="grid size-14 shrink-0 place-items-center rounded-full bg-primary-soft text-primary">
                  <Icon className="size-6" />
                </span>
                <span>
                  <span className="block font-extrabold text-navy">{t}</span>
                  <span className="block text-sm text-muted">{d}</span>
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
