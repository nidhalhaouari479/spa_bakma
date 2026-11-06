"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowLeft, Mail, MailCheck } from "lucide-react";
import { AuthLayout } from "@/components/site/AuthLayout";
import { Alert, Button, Input } from "@/components/ui";
import { SITE_URL } from "@/lib/catalog";
import { errorMessage, getSupabase } from "@/lib/supabase";

export function ForgotView() {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) {
      setError("Adresse e-mail invalide");
      return;
    }
    setBusy(true);
    try {
      const { error: err } = await getSupabase().auth.resetPasswordForEmail(email.trim(), {
        redirectTo: `${SITE_URL}/reinitialiser-mot-de-passe`,
      });
      if (err) throw err;
      setSent(true);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  const hero = (
    <>
      <h1 className="text-5xl font-extrabold leading-[1.05] tracking-tight">
        Mot de passe <span className="text-primary">oublié ?</span>
      </h1>
      <p className="mt-5 max-w-md text-lg text-body">Pas d&apos;inquiétude : recevez un lien sécurisé pour en choisir un nouveau.</p>
    </>
  );

  return (
    <AuthLayout hero={hero}>
      {sent ? (
        <div className="py-4 text-center">
          <span className="mx-auto grid size-20 place-items-center rounded-full bg-emerald-50 text-emerald-600">
            <MailCheck className="size-10" />
          </span>
          <h2 className="mt-5 text-2xl font-extrabold">Vérifiez votre boîte mail</h2>
          <p className="mx-auto mt-3 max-w-sm text-body">
            Si un compte existe pour <strong className="text-navy">{email.trim()}</strong>, vous recevrez un lien pour réinitialiser votre mot de passe.
          </p>
          <Button href="/connexion" variant="outline" className="mt-6" icon={<ArrowLeft className="size-4" />}>
            Retour à la connexion
          </Button>
        </div>
      ) : (
        <>
          <h2 className="text-3xl font-extrabold">Réinitialiser le mot de passe</h2>
          <p className="mt-1.5 text-body">Saisissez l&apos;adresse e-mail associée à votre compte.</p>
          <form onSubmit={submit} className="mt-7 space-y-4" noValidate>
            <Input type="email" icon={<Mail />} placeholder="Adresse e-mail" aria-label="Adresse e-mail" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} className="h-14" />
            <Alert>{error}</Alert>
            <Button type="submit" size="lg" className="h-14 w-full text-base" loading={busy}>
              Envoyer le lien
            </Button>
          </form>
          <p className="mt-6 text-center text-sm">
            <Link href="/connexion" className="inline-flex items-center gap-1.5 font-bold text-primary hover:underline">
              <ArrowLeft className="size-4" /> Retour à la connexion
            </Link>
          </p>
        </>
      )}
    </AuthLayout>
  );
}
