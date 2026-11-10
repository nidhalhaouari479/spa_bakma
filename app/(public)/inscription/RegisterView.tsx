"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowLeft, ArrowRight, Heart, MailCheck, MapPin, PawPrint, Phone, ShieldCheck, User, Mail } from "lucide-react";
import { AuthLayout } from "@/components/site/AuthLayout";
import { OAuthButtons, OrDivider, PasswordInput } from "@/components/site/AuthBits";
import { Alert, Button, cn, Input, Select } from "@/components/ui";
import { useCities } from "@/hooks/useRefData";
import { errorMessage, getSupabase } from "@/lib/supabase";

export function RegisterView() {
  const cities = useCities();
  const [form, setForm] = useState({ full_name: "", email: "", phone: "", city: "", password: "", confirm: "" });
  const [accept, setAccept] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [step, setStep] = useState<"form" | "code" | "done">("form");
  const [code, setCode] = useState("");
  const [cooldown, setCooldown] = useState(0);
  const [info, setInfo] = useState<string | null>(null);

  // compte à rebours avant de pouvoir renvoyer un code
  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setForm((f) => ({ ...f, [k]: e.target.value }));

  function validate() {
    const errs: Record<string, string> = {};
    if (form.full_name.trim().length < 2) errs.full_name = "Indiquez votre nom complet";
    if (!/^\S+@\S+\.\S+$/.test(form.email.trim())) errs.email = "Adresse e-mail invalide";
    if (form.phone && !/^[+\d\s().-]{8,20}$/.test(form.phone.trim())) errs.phone = "Numéro de téléphone invalide";
    if (form.password.length < 8) errs.password = "8 caractères minimum";
    if (form.confirm !== form.password) errs.confirm = "Les mots de passe ne correspondent pas";
    if (!accept) errs.accept = "Vous devez accepter les conditions d'utilisation";
    setFieldErrors(errs);
    return Object.keys(errs).length === 0;
  }

  async function post(url: string, body: unknown) {
    const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const json = (await res.json().catch(() => ({}))) as { error?: string; cooldown_s?: number };
    if (!res.ok) throw new Error(json.error || "Une erreur est survenue, réessayez.");
    return json;
  }

  /** Étape 1 : envoi du code par e-mail */
  async function sendCode() {
    const json = await post("/api/auth/inscription/code", { email: form.email.trim(), full_name: form.full_name.trim() });
    setCooldown(json.cooldown_s ?? 60);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!validate()) return;
    setBusy(true);
    try {
      await sendCode();
      setCode("");
      setInfo(null);
      setStep("code");
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  async function resend() {
    setError(null);
    setInfo(null);
    setBusy(true);
    try {
      await sendCode();
      setCode("");
      setInfo("Un nouveau code vient de vous être envoyé.");
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  /** Étape 2 : vérification du code, création du compte puis connexion */
  async function verify(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setInfo(null);
    if (code.length !== 6) return setError("Saisissez le code à 6 chiffres reçu par e-mail.");
    setBusy(true);
    try {
      await post("/api/auth/inscription", {
        email: form.email.trim(),
        code,
        password: form.password,
        full_name: form.full_name.trim(),
        phone: form.phone.trim() || null,
        city: form.city || null,
      });
      const { error: err } = await getSupabase().auth.signInWithPassword({ email: form.email.trim(), password: form.password });
      if (err) throw err;
      setStep("done");
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  const hero = (
    <>
      <p className="text-sm font-extrabold uppercase tracking-[0.2em] text-body">Rejoignez Bakma Store</p>
      <h1 className="mt-3 text-5xl font-extrabold leading-[1.05] tracking-tight xl:text-6xl">
        Créez <span className="text-primary">votre compte</span>
      </h1>
      <p className="mt-4 max-w-md text-lg leading-relaxed text-body">Publiez, adoptez et offrez une meilleure vie aux animaux en toute sécurité.</p>
      <ul className="mt-8 space-y-5">
        {[
          { icon: PawPrint, cls: "bg-sky-100 text-primary", t: "Publiez vos animaux", d: "Partagez facilement les informations de vos animaux." },
          { icon: ShieldCheck, cls: "bg-emerald-100 text-emerald-600", t: "Processus sécurisé", d: "Animaux vérifiés, contrôlés et approuvés par des professionnels." },
          { icon: Heart, cls: "bg-rose-100 text-rose-500", t: "Rejoignez une communauté", d: "Des passionnés qui partagent les mêmes valeurs." },
        ].map(({ icon: Icon, cls, t, d }) => (
          <li key={t} className="flex items-start gap-4">
            <span className={cn("grid size-14 shrink-0 place-items-center rounded-full", cls)}>
              <Icon className="size-6" />
            </span>
            <span>
              <span className="block text-lg font-extrabold text-navy">{t}</span>
              <span className="block max-w-xs text-sm text-body">{d}</span>
            </span>
          </li>
        ))}
      </ul>
    </>
  );

  if (step === "done") {
    return (
      <AuthLayout hero={hero} trust={false}>
        <div className="py-4 text-center">
          <span className="mx-auto grid size-20 place-items-center rounded-full bg-emerald-50 text-emerald-600">
            <MailCheck className="size-10" />
          </span>
          <h2 className="mt-5 text-2xl font-extrabold sm:text-3xl">Compte créé !</h2>
          <p className="mx-auto mt-3 max-w-md text-body">Votre adresse e-mail est vérifiée et votre compte Bakma Store est prêt.</p>
          <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row">
            <Button href="/espace" size="lg" icon={<ArrowRight className="size-5" />}>
              Accéder à mon espace
            </Button>
            <Button href="/animaux" variant="outline" size="lg">
              Découvrir les animaux
            </Button>
          </div>
        </div>
      </AuthLayout>
    );
  }

  if (step === "code") {
    return (
      <AuthLayout hero={hero} trust={false}>
        <button
          type="button"
          onClick={() => {
            setStep("form");
            setError(null);
            setInfo(null);
          }}
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary hover:underline"
        >
          <ArrowLeft className="size-4" /> Modifier mes informations
        </button>
        <span className="mt-5 grid size-16 place-items-center rounded-full bg-primary-soft text-primary">
          <MailCheck className="size-8" />
        </span>
        <h2 className="mt-4 text-3xl font-extrabold sm:text-[2.1rem]">Vérifiez votre e-mail</h2>
        <p className="mt-1.5 text-body">
          Nous avons envoyé un code à 6 chiffres à <strong className="break-all text-navy">{form.email.trim()}</strong>. Il est valable 10 minutes.
        </p>

        <form onSubmit={verify} className="mt-6 space-y-4" noValidate>
          <input
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
            inputMode="numeric"
            autoComplete="one-time-code"
            autoFocus
            maxLength={6}
            placeholder="••••••"
            aria-label="Code de vérification"
            className="h-16 w-full rounded-2xl border border-line bg-white text-center text-3xl font-extrabold tracking-[0.5em] text-navy outline-none placeholder:text-line focus:border-primary focus:ring-4 focus:ring-primary/10"
          />
          <Alert>{error}</Alert>
          {info && <Alert tone="green">{info}</Alert>}
          <Button type="submit" size="lg" className="h-14 w-full text-base" loading={busy} disabled={code.length !== 6}>
            Vérifier et créer mon compte
          </Button>
        </form>
        <p className="mt-5 text-center text-sm text-body">
          Vous n&apos;avez rien reçu ? Vérifiez vos spams, ou{" "}
          {cooldown > 0 ? (
            <span className="font-semibold text-muted">renvoyez un code dans {cooldown} s</span>
          ) : (
            <button type="button" onClick={resend} disabled={busy} className="font-bold text-primary hover:underline disabled:opacity-50">
              renvoyez un code
            </button>
          )}
          .
        </p>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout hero={hero} trust={false}>
      <h2 className="text-3xl font-extrabold sm:text-[2.1rem]">Créer un compte</h2>
      <p className="mt-1.5 text-body">Rejoignez Bakma Store en quelques étapes</p>

      <form onSubmit={submit} className="mt-6 space-y-3.5" noValidate>
        <FieldError msg={fieldErrors.full_name}>
          <Input icon={<User />} placeholder="Nom complet" aria-label="Nom complet" autoComplete="name" value={form.full_name} onChange={set("full_name")} />
        </FieldError>
        <FieldError msg={fieldErrors.email}>
          <Input type="email" icon={<Mail />} placeholder="Adresse e-mail" aria-label="Adresse e-mail" autoComplete="email" value={form.email} onChange={set("email")} />
        </FieldError>
        <div className="grid gap-3.5 sm:grid-cols-2">
          <FieldError msg={fieldErrors.phone}>
            <Input type="tel" icon={<Phone />} placeholder="Téléphone (optionnel)" aria-label="Téléphone" autoComplete="tel" value={form.phone} onChange={set("phone")} />
          </FieldError>
          <Select icon={<MapPin />} value={form.city} onChange={set("city")} aria-label="Ville">
            <option value="">Ville</option>
            {cities.map((c) => (
              <option key={c.id} value={c.name}>
                {c.name}
              </option>
            ))}
          </Select>
        </div>
        <FieldError msg={fieldErrors.password}>
          <PasswordInput placeholder="Mot de passe" aria-label="Mot de passe" autoComplete="new-password" value={form.password} onChange={set("password")} />
        </FieldError>
        <FieldError msg={fieldErrors.confirm}>
          <PasswordInput placeholder="Confirmer le mot de passe" aria-label="Confirmer le mot de passe" autoComplete="new-password" value={form.confirm} onChange={set("confirm")} />
        </FieldError>
        <FieldError msg={fieldErrors.accept}>
          <label className="flex cursor-pointer items-start gap-2.5 text-sm text-body">
            <input type="checkbox" className="mt-0.5 size-4 accent-[var(--color-primary)]" checked={accept} onChange={(e) => setAccept(e.target.checked)} />
            <span>
              J&apos;accepte les{" "}
              <Link href="/a-propos#conditions" className="font-semibold text-primary hover:underline">
                Conditions d&apos;utilisation
              </Link>{" "}
              et la{" "}
              <Link href="/a-propos#confidentialite" className="font-semibold text-primary hover:underline">
                Politique de confidentialité
              </Link>
            </span>
          </label>
        </FieldError>
        <Alert>{error}</Alert>
        <Button type="submit" size="lg" className="h-14 w-full text-base" loading={busy}>
          S&apos;inscrire
        </Button>
      </form>
      <OrDivider />
      <OAuthButtons onError={setError} />
      <p className="mt-6 text-center text-sm text-body">
        Vous avez déjà un compte ?{" "}
        <Link href="/connexion" className="font-bold text-primary hover:underline">
          Se connecter
        </Link>
      </p>
    </AuthLayout>
  );
}

function FieldError({ msg, children }: { msg?: string; children: React.ReactNode }) {
  return (
    <div>
      {children}
      {msg && <p className="mt-1 text-xs font-medium text-red-600">{msg}</p>}
    </div>
  );
}
