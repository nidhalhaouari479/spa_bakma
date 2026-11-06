"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { ArrowRight, LogOut, Mail, ShieldCheck, Stethoscope } from "lucide-react";
import { AuthLayout } from "@/components/site/AuthLayout";
import { OAuthButtons, oauthErrorMessage, OrDivider, PasswordInput } from "@/components/site/AuthBits";
import { Alert, Button, Input, Spinner } from "@/components/ui";
import { useAuth } from "@/hooks/useAuth";
import { ADMIN_URL, VET_URL } from "@/lib/catalog";
import { errorMessage, getSupabase } from "@/lib/supabase";
import type { UserRole } from "@/lib/types";

function safeNext(next: string | null): string {
  return next && next.startsWith("/") && !next.startsWith("//") ? next : "/espace";
}

export function LoginView() {
  const sp = useSearchParams();
  const router = useRouter();
  const next = safeNext(sp.get("next"));
  const oauthError = sp.get("error_description") || sp.get("error");
  const { user, profile, loading, signOut } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(oauthError ? oauthErrorMessage(oauthError) : null);
  const [staffRole, setStaffRole] = useState<UserRole | null>(null);

  const role = staffRole ?? profile?.role ?? null;

  // Déjà connecté (ou retour OAuth) : redirection des particuliers
  useEffect(() => {
    if (!loading && user && profile && profile.role === "particulier") router.replace(next);
  }, [loading, user, profile, next, router]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!email.trim() || !password) {
      setError("Veuillez saisir votre e-mail et votre mot de passe.");
      return;
    }
    setBusy(true);
    try {
      const supabase = getSupabase();
      const { data, error: err } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
      if (err) throw err;
      const { data: p } = await supabase.from("profiles").select("role").eq("id", data.user.id).maybeSingle();
      const r = (p?.role as UserRole | undefined) ?? "particulier";
      if (r === "particulier") {
        router.replace(next);
      } else {
        setStaffRole(r);
        setBusy(false);
      }
    } catch (err) {
      setError(errorMessage(err));
      setBusy(false);
    }
  }

  const hero = (
    <>
      <h1 className="text-5xl font-extrabold leading-[1.05] tracking-tight xl:text-6xl">
        Bienvenue <br />
        sur <span className="text-primary">Bakma Store</span>
      </h1>
      <p className="mt-5 max-w-md text-lg leading-relaxed text-body">
        Rejoignez notre communauté pour publier, adopter et offrir une meilleure vie aux animaux.
      </p>
    </>
  );

  // Connecté avec un rôle vétérinaire / admin : renvoi vers la bonne application
  if (user && (role === "veterinaire" || role === "admin")) {
    const vet = role === "veterinaire";
    return (
      <AuthLayout hero={hero}>
        <div className="text-center">
          <span className="mx-auto grid size-16 place-items-center rounded-full bg-primary-soft text-primary">
            {vet ? <Stethoscope className="size-8" /> : <ShieldCheck className="size-8" />}
          </span>
          <h2 className="mt-4 text-2xl font-extrabold">{vet ? "Espace vétérinaire" : "Espace administrateur"}</h2>
          <p className="mx-auto mt-2 max-w-sm text-body">
            {vet
              ? "Vous êtes connecté avec un compte vétérinaire. Vos demandes de consultation et vos rapports se gèrent depuis l'espace vétérinaire."
              : "Vous êtes connecté avec un compte administrateur. La modération et la gestion de la plateforme se font depuis le back-office."}
          </p>
          <div className="mt-6 flex flex-col gap-3">
            <Button href={vet ? VET_URL : ADMIN_URL} size="lg" icon={<ArrowRight className="size-5" />}>
              {vet ? "Accéder à l'espace vétérinaire" : "Accéder au back-office"}
            </Button>
            <Button
              variant="outline"
              icon={<LogOut className="size-4" />}
              onClick={async () => {
                await signOut();
                setStaffRole(null);
              }}
            >
              Se déconnecter
            </Button>
          </div>
        </div>
      </AuthLayout>
    );
  }

  const redirecting = !loading && !!user && profile?.role === "particulier";

  return (
    <AuthLayout hero={hero}>
      <h2 className="text-3xl font-extrabold sm:text-[2.1rem]">Se connecter</h2>
      <p className="mt-1.5 text-body">Accédez à votre compte Bakma Store</p>

      {redirecting ? (
        <div className="flex flex-col items-center gap-3 py-12 text-sm text-muted">
          <Spinner />
          Redirection vers votre espace…
        </div>
      ) : (
        <>
          <form onSubmit={submit} className="mt-7 space-y-4" noValidate>
            <Input
              type="email"
              autoComplete="email"
              icon={<Mail />}
              placeholder="Adresse e-mail"
              aria-label="Adresse e-mail"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="h-14"
            />
            <PasswordInput
              autoComplete="current-password"
              placeholder="Mot de passe"
              aria-label="Mot de passe"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="h-14"
            />
            <div className="text-right">
              <Link href="/mot-de-passe-oublie" className="text-sm font-bold text-primary hover:underline">
                Mot de passe oublié ?
              </Link>
            </div>
            <Alert>{error}</Alert>
            <Button type="submit" size="lg" className="h-14 w-full text-base" loading={busy}>
              Se connecter
            </Button>
          </form>
          <OrDivider />
          <OAuthButtons next={next} onError={setError} />
          <p className="mt-7 text-center text-sm text-body">
            Vous n&apos;avez pas encore de compte ?{" "}
            <Link href="/inscription" className="font-bold text-primary hover:underline">
              S&apos;inscrire
            </Link>
          </p>
        </>
      )}
    </AuthLayout>
  );
}
