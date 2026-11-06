"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { CheckCircle2, KeyRound } from "lucide-react";
import { AuthLayout } from "@/components/site/AuthLayout";
import { PasswordInput } from "@/components/site/AuthBits";
import { Alert, Button, PageLoader } from "@/components/ui";
import { useAuth } from "@/hooks/useAuth";
import { errorMessage, getSupabase } from "@/lib/supabase";

export function ResetView() {
  const router = useRouter();
  const { loading, user } = useAuth();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (password.length < 8) return setError("Le mot de passe doit contenir au moins 8 caractères.");
    if (password !== confirm) return setError("Les mots de passe ne correspondent pas.");
    setBusy(true);
    try {
      const { error: err } = await getSupabase().auth.updateUser({ password });
      if (err) throw err;
      setDone(true);
      setTimeout(() => router.replace("/espace"), 2000);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  const hero = (
    <>
      <h1 className="text-5xl font-extrabold leading-[1.05] tracking-tight">
        Nouveau <span className="text-primary">mot de passe</span>
      </h1>
      <p className="mt-5 max-w-md text-lg text-body">Choisissez un mot de passe robuste que vous n&apos;utilisez nulle part ailleurs.</p>
    </>
  );

  if (loading) return <PageLoader />;

  return (
    <AuthLayout hero={hero}>
      {done ? (
        <div className="py-4 text-center">
          <span className="mx-auto grid size-20 place-items-center rounded-full bg-emerald-50 text-emerald-600">
            <CheckCircle2 className="size-10" />
          </span>
          <h2 className="mt-5 text-2xl font-extrabold">Mot de passe modifié</h2>
          <p className="mt-2 text-body">Redirection vers votre espace…</p>
        </div>
      ) : !user ? (
        <div className="py-4 text-center">
          <span className="mx-auto grid size-20 place-items-center rounded-full bg-amber-50 text-amber-600">
            <KeyRound className="size-10" />
          </span>
          <h2 className="mt-5 text-2xl font-extrabold">Lien invalide ou expiré</h2>
          <p className="mx-auto mt-2 max-w-sm text-body">Ouvrez le lien reçu par e-mail sur cet appareil, ou demandez-en un nouveau.</p>
          <Button href="/mot-de-passe-oublie" className="mt-6">
            Demander un nouveau lien
          </Button>
        </div>
      ) : (
        <>
          <h2 className="text-3xl font-extrabold">Choisir un nouveau mot de passe</h2>
          <p className="mt-1.5 text-body">Compte : {user.email}</p>
          <form onSubmit={submit} className="mt-7 space-y-4" noValidate>
            <PasswordInput placeholder="Nouveau mot de passe" aria-label="Nouveau mot de passe" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} className="h-14" />
            <PasswordInput placeholder="Confirmer le mot de passe" aria-label="Confirmer le mot de passe" autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} className="h-14" />
            <Alert>{error}</Alert>
            <Button type="submit" size="lg" className="h-14 w-full text-base" loading={busy}>
              Enregistrer
            </Button>
          </form>
        </>
      )}
    </AuthLayout>
  );
}
