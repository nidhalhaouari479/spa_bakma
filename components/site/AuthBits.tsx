"use client";

import { useState } from "react";
import { Eye, EyeOff, Lock } from "lucide-react";
import { Input } from "@/components/ui";
import { SITE_URL } from "@/lib/catalog";
import { getSupabase } from "@/lib/supabase";

export function PasswordInput(props: Omit<React.InputHTMLAttributes<HTMLInputElement>, "type">) {
  const [show, setShow] = useState(false);
  return (
    <Input
      {...props}
      type={show ? "text" : "password"}
      icon={<Lock />}
      right={
        <button
          type="button"
          onClick={() => setShow((s) => !s)}
          className="grid size-8 place-items-center rounded-full text-muted hover:text-primary"
          aria-label={show ? "Masquer le mot de passe" : "Afficher le mot de passe"}
        >
          {show ? <EyeOff className="size-[18px]" /> : <Eye className="size-[18px]" />}
        </button>
      }
    />
  );
}

export function OrDivider() {
  return (
    <div className="my-5 flex items-center gap-4 text-sm text-muted">
      <span className="h-px flex-1 bg-line" />
      ou
      <span className="h-px flex-1 bg-line" />
    </div>
  );
}

function GoogleLogo() {
  return (
    <svg viewBox="0 0 24 24" className="size-5" aria-hidden>
      <path fill="#4285F4" d="M23.5 12.27c0-.85-.08-1.66-.22-2.45H12v4.63h6.46a5.52 5.52 0 0 1-2.4 3.62v3h3.88c2.27-2.09 3.56-5.17 3.56-8.8Z" />
      <path fill="#34A853" d="M12 24c3.24 0 5.96-1.07 7.94-2.9l-3.88-3c-1.07.72-2.45 1.15-4.06 1.15-3.12 0-5.77-2.11-6.71-4.95H1.28v3.1A12 12 0 0 0 12 24Z" />
      <path fill="#FBBC05" d="M5.29 14.3A7.2 7.2 0 0 1 4.9 12c0-.8.14-1.57.39-2.3V6.6H1.28a12 12 0 0 0 0 10.8l4.01-3.1Z" />
      <path fill="#EA4335" d="M12 4.75c1.76 0 3.34.6 4.58 1.8l3.44-3.44A11.5 11.5 0 0 0 12 0 12 12 0 0 0 1.28 6.6l4.01 3.1C6.23 6.86 8.88 4.75 12 4.75Z" />
    </svg>
  );
}

function AppleLogo() {
  return (
    <svg viewBox="0 0 24 24" className="size-5" fill="currentColor" aria-hidden>
      <path d="M16.37 12.73c-.03-2.6 2.12-3.85 2.22-3.91-1.21-1.77-3.09-2.01-3.76-2.04-1.6-.16-3.13.94-3.94.94-.81 0-2.07-.92-3.4-.9a5.05 5.05 0 0 0-4.27 2.59c-1.82 3.16-.47 7.84 1.31 10.4.87 1.25 1.9 2.66 3.26 2.61 1.31-.05 1.8-.85 3.38-.85 1.58 0 2.02.85 3.4.82 1.41-.02 2.3-1.27 3.16-2.53a11.2 11.2 0 0 0 1.43-2.94c-.03-.01-2.75-1.05-2.79-4.19ZM13.77 5.1c.72-.87 1.2-2.08 1.07-3.29-1.04.04-2.29.69-3.03 1.56-.67.77-1.25 2-1.09 3.18 1.15.09 2.33-.59 3.05-1.45Z" />
    </svg>
  );
}

/** Messages lisibles pour les erreurs OAuth (fournisseur non configuré…). */
export function oauthErrorMessage(raw: string): string {
  const m = raw.toLowerCase();
  if (m.includes("not enabled") || m.includes("unsupported provider") || m.includes("provider")) {
    return "Ce mode de connexion n'est pas encore disponible. Utilisez votre adresse e-mail et votre mot de passe.";
  }
  if (m.includes("access_denied") || m.includes("denied")) return "Connexion annulée.";
  return raw;
}

/** Boutons « Continuer avec Google / Apple » (signInWithOAuth). */
export function OAuthButtons({ next, onError }: { next?: string; onError: (msg: string) => void }) {
  const [busy, setBusy] = useState<string | null>(null);

  async function go(provider: "google" | "apple") {
    setBusy(provider);
    try {
      const redirectTo = `${SITE_URL}/connexion${next ? `?next=${encodeURIComponent(next)}` : ""}`;
      const { error } = await getSupabase().auth.signInWithOAuth({ provider, options: { redirectTo } });
      if (error) throw error;
    } catch (e) {
      onError(oauthErrorMessage((e as { message?: string }).message ?? "Connexion impossible"));
      setBusy(null);
    }
  }

  const cls =
    "flex h-12 items-center justify-center gap-2.5 rounded-full border border-line bg-white px-3 text-sm font-semibold text-navy transition hover:border-primary disabled:opacity-60";
  return (
    <div className="grid grid-cols-2 gap-3">
      <button type="button" className={cls} disabled={!!busy} onClick={() => go("google")}>
        <GoogleLogo /> <span className="truncate">Continuer avec Google</span>
      </button>
      <button type="button" className={cls} disabled={!!busy} onClick={() => go("apple")}>
        <AppleLogo /> <span className="truncate">Continuer avec Apple</span>
      </button>
    </div>
  );
}
