"use client";

import { useRef, useState } from "react";
import { Camera, KeyRound, Lock, Mail, Phone, Save, UserRound } from "lucide-react";
import { PageHeader } from "@/components/espace/EspaceShell";
import { PasswordInput } from "@/components/site/AuthBits";
import { Alert, Avatar, Button, Card, CardHeader, Field, Input, PageLoader, Select, Spinner, Textarea, useToast } from "@/components/ui";
import { useAuth } from "@/hooks/useAuth";
import { useCities } from "@/hooks/useRefData";
import { formatDate, ROLE_LABEL } from "@/lib/labels";
import { uploadPublicFile } from "@/lib/storage";
import { errorMessage, getSupabase } from "@/lib/supabase";
import type { Profile, ProfileContact } from "@/lib/types";

export default function ProfilePage() {
  const { user, profile, contact } = useAuth();
  if (!user || !profile) return <PageLoader />;
  return <ProfileForm key={`${profile.updated_at}-${contact?.phone ?? ""}`} userId={user.id} email={user.email ?? contact?.email ?? ""} profile={profile} contact={contact} />;
}

function ProfileForm({ userId, email, profile, contact }: { userId: string; email: string; profile: Profile; contact: ProfileContact | null }) {
  const { refreshProfile } = useAuth();
  const toast = useToast();
  const cities = useCities();
  const fileInput = useRef<HTMLInputElement>(null);
  const [form, setForm] = useState({ full_name: profile.full_name, city: profile.city ?? "", bio: profile.bio ?? "", phone: contact?.phone ?? "" });
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pwd, setPwd] = useState({ password: "", confirm: "" });
  const [pwdBusy, setPwdBusy] = useState(false);
  const [pwdError, setPwdError] = useState<string | null>(null);

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => setForm((f) => ({ ...f, [k]: e.target.value }));

  async function onAvatar(file: File | undefined) {
    if (!file) return;
    if (!file.type.startsWith("image/")) return toast("Choisissez une image", "error");
    if (file.size > 3 * 1024 * 1024) return toast("Image trop lourde (3 Mo max)", "error");
    setUploading(true);
    try {
      const url = await uploadPublicFile("avatars", userId, file);
      const { error: e } = await getSupabase().from("profiles").update({ avatar_url: url }).eq("id", userId);
      if (e) throw e;
      await refreshProfile();
      toast("Photo de profil mise à jour");
    } catch (e) {
      toast(errorMessage(e), "error");
    } finally {
      setUploading(false);
      if (fileInput.current) fileInput.current.value = "";
    }
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (form.full_name.trim().length < 2) return setError("Indiquez votre nom complet.");
    if (form.phone && !/^[+\d\s().-]{8,20}$/.test(form.phone.trim())) return setError("Numéro de téléphone invalide.");
    setSaving(true);
    try {
      const supabase = getSupabase();
      const p = await supabase.from("profiles").update({ full_name: form.full_name.trim(), city: form.city || null, bio: form.bio.trim() || null }).eq("id", userId);
      if (p.error) throw p.error;
      const c = await supabase.from("profile_contacts").update({ phone: form.phone.trim() || null }).eq("id", userId);
      if (c.error) throw c.error;
      await refreshProfile();
      toast("Profil enregistré");
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  async function changePassword(e: React.FormEvent) {
    e.preventDefault();
    setPwdError(null);
    if (pwd.password.length < 8) return setPwdError("8 caractères minimum.");
    if (pwd.password !== pwd.confirm) return setPwdError("Les mots de passe ne correspondent pas.");
    setPwdBusy(true);
    try {
      const { error: err } = await getSupabase().auth.updateUser({ password: pwd.password });
      if (err) throw err;
      setPwd({ password: "", confirm: "" });
      toast("Mot de passe modifié");
    } catch (err) {
      setPwdError(errorMessage(err));
    } finally {
      setPwdBusy(false);
    }
  }

  return (
    <div>
      <PageHeader title="Mon profil" subtitle="Ces informations apparaissent sur vos annonces (sauf vos coordonnées, qui restent privées)." />
      <div className="grid gap-6 xl:grid-cols-[300px_1fr]">
        <Card className="flex flex-col items-center p-6 text-center">
          <div className="relative">
            <Avatar src={profile.avatar_url} name={profile.full_name} size={112} className="ring-4 ring-primary-soft" />
            <button
              onClick={() => fileInput.current?.click()}
              disabled={uploading}
              className="absolute bottom-1 right-1 grid size-9 place-items-center rounded-full bg-primary text-white shadow-md ring-2 ring-white hover:brightness-110"
              aria-label="Changer la photo"
            >
              {uploading ? <Spinner className="size-4 text-white" /> : <Camera className="size-4" />}
            </button>
            <input ref={fileInput} type="file" accept="image/*" hidden onChange={(e) => onAvatar(e.target.files?.[0])} />
          </div>
          <p className="mt-4 text-lg font-extrabold text-navy">{profile.full_name}</p>
          <p className="text-sm text-muted">{ROLE_LABEL[profile.role]}</p>
          <p className="mt-3 text-xs text-muted">Membre depuis le {formatDate(profile.created_at)}</p>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader icon={<UserRound />} title="Informations personnelles" />
            <form onSubmit={save} className="grid gap-4 px-6 pb-6 sm:grid-cols-2">
              <Field label="Nom complet">
                <Input value={form.full_name} onChange={set("full_name")} icon={<UserRound />} />
              </Field>
              <Field label="Adresse e-mail" hint="L'adresse e-mail ne peut pas être modifiée ici.">
                <Input value={email} readOnly disabled icon={<Mail />} />
              </Field>
              <Field label="Téléphone" hint="Privé : visible uniquement par le vétérinaire en charge de vos animaux.">
                <Input type="tel" value={form.phone} onChange={set("phone")} icon={<Phone />} placeholder="+216 …" />
              </Field>
              <Field label="Ville">
                <Select value={form.city} onChange={set("city")}>
                  <option value="">Non précisée</option>
                  {cities.map((c) => (
                    <option key={c.id} value={c.name}>
                      {c.name}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Bio" className="sm:col-span-2">
                <Textarea value={form.bio} onChange={set("bio")} maxLength={500} placeholder="Présentez-vous en quelques mots…" />
              </Field>
              <div className="space-y-3 sm:col-span-2">
                <Alert>{error}</Alert>
                <Button type="submit" loading={saving} icon={<Save className="size-4" />}>
                  Enregistrer
                </Button>
              </div>
            </form>
          </Card>

          <Card>
            <CardHeader icon={<KeyRound />} title="Mot de passe" subtitle="Choisissez un mot de passe d'au moins 8 caractères." />
            <form onSubmit={changePassword} className="grid gap-4 px-6 pb-6 sm:grid-cols-2">
              <Field label="Nouveau mot de passe">
                <PasswordInput value={pwd.password} onChange={(e) => setPwd((p) => ({ ...p, password: e.target.value }))} autoComplete="new-password" />
              </Field>
              <Field label="Confirmation">
                <PasswordInput value={pwd.confirm} onChange={(e) => setPwd((p) => ({ ...p, confirm: e.target.value }))} autoComplete="new-password" />
              </Field>
              <div className="space-y-3 sm:col-span-2">
                <Alert>{pwdError}</Alert>
                <Button type="submit" variant="outline" loading={pwdBusy} icon={<Lock className="size-4" />}>
                  Modifier le mot de passe
                </Button>
              </div>
            </form>
          </Card>
        </div>
      </div>
    </div>
  );
}
