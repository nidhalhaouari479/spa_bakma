import Link from "next/link";
import { Logo } from "@/components/Logo";

const SOCIALS = [
  {
    label: "Facebook",
    href: "https://facebook.com",
    path: "M22 12a10 10 0 1 0-11.56 9.88v-6.99H7.9V12h2.54V9.8c0-2.5 1.49-3.89 3.78-3.89 1.09 0 2.24.2 2.24.2v2.46h-1.26c-1.24 0-1.63.77-1.63 1.56V12h2.78l-.44 2.89h-2.34v6.99A10 10 0 0 0 22 12Z",
  },
  {
    label: "Instagram",
    href: "https://instagram.com",
    path: "M12 2.2c3.2 0 3.58 0 4.85.07 3.25.15 4.77 1.69 4.92 4.92.06 1.27.07 1.65.07 4.85s0 3.58-.07 4.85c-.15 3.23-1.66 4.77-4.92 4.92-1.27.06-1.65.07-4.85.07s-3.58 0-4.85-.07c-3.26-.15-4.77-1.7-4.92-4.92C2.17 15.58 2.2 15.2 2.2 12s0-3.58.07-4.85C2.42 3.92 3.94 2.37 7.15 2.27 8.42 2.21 8.8 2.2 12 2.2Zm0 4.86a4.94 4.94 0 1 0 0 9.88 4.94 4.94 0 0 0 0-9.88Zm0 8.15a3.21 3.21 0 1 1 0-6.42 3.21 3.21 0 0 1 0 6.42Zm5.14-9.5a1.15 1.15 0 1 0 0 2.3 1.15 1.15 0 0 0 0-2.3Z",
  },
  {
    label: "YouTube",
    href: "https://youtube.com",
    path: "M23.5 6.2a3 3 0 0 0-2.1-2.1C19.5 3.6 12 3.6 12 3.6s-7.5 0-9.4.5A3 3 0 0 0 .5 6.2 31.4 31.4 0 0 0 0 12a31.4 31.4 0 0 0 .5 5.8 3 3 0 0 0 2.1 2.1c1.9.5 9.4.5 9.4.5s7.5 0 9.4-.5a3 3 0 0 0 2.1-2.1A31.4 31.4 0 0 0 24 12a31.4 31.4 0 0 0-.5-5.8ZM9.6 15.6V8.4l6.2 3.6-6.2 3.6Z",
  },
  {
    label: "LinkedIn",
    href: "https://linkedin.com",
    path: "M20.45 20.45h-3.56v-5.57c0-1.33-.02-3.04-1.85-3.04-1.86 0-2.14 1.45-2.14 2.94v5.67H9.34V9h3.42v1.56h.05a3.74 3.74 0 0 1 3.37-1.85c3.6 0 4.27 2.37 4.27 5.46v6.28ZM5.34 7.43a2.06 2.06 0 1 1 0-4.13 2.06 2.06 0 0 1 0 4.13ZM7.12 20.45H3.56V9h3.56v11.45ZM22.22 0H1.77C.79 0 0 .77 0 1.73v20.54C0 23.23.79 24 1.77 24h20.45c.98 0 1.78-.77 1.78-1.73V1.73C24 .77 23.2 0 22.22 0Z",
  },
];

const USEFUL = [
  { href: "/", label: "Accueil" },
  { href: "/animaux", label: "Animaux" },
  { href: "/comment-ca-marche", label: "Comment ça marche" },
  { href: "/a-propos", label: "À propos" },
];

const HELP = [
  { href: "/comment-ca-marche#faq", label: "Centre d'aide" },
  { href: "/a-propos#contact", label: "Nous contacter" },
  { href: "/a-propos#conditions", label: "Conditions d'utilisation" },
  { href: "/a-propos#confidentialite", label: "Politique de confidentialité" },
];

export function Footer() {
  return (
    <footer className="mt-auto border-t border-line/70 bg-white">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-12 sm:grid-cols-2 sm:px-6 lg:grid-cols-[1.4fr_1fr_1fr_1fr]">
        <div className="space-y-4">
          <Logo height={46} />
          <p className="max-w-xs text-sm leading-relaxed text-body">
            Une plateforme dédiée aux animaux et à leur bien-être. Adoptez ou trouvez votre compagnon en toute confiance, partout en Tunisie.
          </p>
        </div>
        <div>
          <h4 className="mb-4 text-base font-extrabold">Liens utiles</h4>
          <ul className="space-y-2.5 text-sm">
            {USEFUL.map((l) => (
              <li key={l.href}>
                <Link href={l.href} className="text-body transition hover:text-primary">
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <h4 className="mb-4 text-base font-extrabold">Aide</h4>
          <ul className="space-y-2.5 text-sm">
            {HELP.map((l) => (
              <li key={l.label}>
                <Link href={l.href} className="text-body transition hover:text-primary">
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <h4 className="mb-4 text-base font-extrabold">Suivez-nous</h4>
          <div className="flex gap-3">
            {SOCIALS.map((s) => (
              <a
                key={s.label}
                href={s.href}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={s.label}
                className="grid size-10 place-items-center rounded-full bg-primary-soft text-navy transition hover:bg-primary hover:text-white"
              >
                <svg viewBox="0 0 24 24" className="size-[18px]" fill="currentColor" aria-hidden>
                  <path d={s.path} />
                </svg>
              </a>
            ))}
          </div>
        </div>
      </div>
      <div className="border-t border-line/70">
        <p className="mx-auto max-w-7xl px-4 py-5 text-center text-xs text-muted sm:px-6">
          © 2026 Bakma Store — Tous droits réservés.
        </p>
      </div>
    </footer>
  );
}
