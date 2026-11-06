"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowRight, Heart, MailCheck, MapPin, PawPrint, Phone, ShieldCheck, User, Mail } from "lucide-react";
import { AuthLayout } from "@/components/site/AuthLayout";
import { OAuthButtons, OrDivider, PasswordInput } from "@/components/site/AuthBits";
import { Alert, Button, cn, Input, Select } from "@/components/ui";
import { useCities } from "@/hooks/useRefData";
import { SITE_URL } from "@/lib/catalog";
import { errorMessage, getSupabase } from "@/lib/supabase";

export function RegisterView() {
  const cities = useCities();
  const [form, setForm] = useState({ full_name: "", email: "", phone: "", city: "", password: "", confirm: "" });
  const [accept, setAccept] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [done, setDone] = useState<{ hasSession: boolean } | null>(null);

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

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!validate()) return;
    setBusy(true);
    try {
      const { data, error: err } = await getSupabase().auth.signUp({
        email: form.email.trim(),
        password: form.password,
        options: {
          data: {
            full_name: form.full_name.trim(),
            phone: form.phone.trim() || null,
            city: form.city || null,
          },
          emailRedirectTo: `${SITE_URL}/connexion`,
        },
      });
      if (err) throw err;
      setDone({ hasSession: !!data.session });
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

  if (done) {
    return (
      <AuthLayout hero={hero} trust={false}>
        <div className="py-4 text-center">
          <span className="mx-auto grid size-20 place-items-center rounded-full bg-emerald-50 text-emerald-600">
            <MailCheck className="size-10" />
          </span>
          <h2 className="mt-5 text-2xl font-extrabold sm:text-3xl">{done.hasSession ? "Compte créé !" : "Vérifiez votre e-mail"}</h2>
          <p className="mx-auto mt-3 max-w-md text-body">
            {done.hasSession ? (
              "Votre compte Bakma Store est prêt."
            ) : (
              <>
                Un lien de confirmation a été envoyé à <strong className="text-navy">{form.email.trim()}</strong>. Cliquez dessus pour activer votre compte.
              </>
            )}
          </p>
          <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row">
            {done.hasSession ? (
              <Button href="/espace" size="lg" icon={<ArrowRight className="size-5" />}>
                Accéder à mon espace
              </Button>
            ) : (
              <Button href="/connexion" size="lg">
                Se connecter
              </Button>
            )}
            <Button href="/animaux" variant="outline" size="lg">
              Découvrir les animaux
            </Button>
          </div>
        </div>
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
