import { adminClient, handle, hashCode, HttpError, isEmail, MAX_ATTEMPTS, normalizeEmail, sameHash } from "@/lib/server/verification";

/**
 * Inscription, étape 2 : vérifie le code puis crée le compte (e-mail déjà confirmé).
 * Body : { email, code, password, full_name, phone?, city? } → { ok: true }
 * Le navigateur se connecte ensuite avec signInWithPassword.
 */
export async function POST(request: Request) {
  try {
    const b = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    const str = (v: unknown) => (typeof v === "string" ? v.trim() : "");
    const email = normalizeEmail(b.email);
    const code = str(b.code).replace(/\D/g, "");
    const password = typeof b.password === "string" ? b.password : "";
    const fullName = str(b.full_name).slice(0, 80);
    const phone = str(b.phone).slice(0, 20) || null;
    const city = str(b.city).slice(0, 60) || null;

    if (!isEmail(email)) throw new HttpError(400, "Adresse e-mail invalide.");
    if (code.length !== 6) throw new HttpError(400, "Saisissez le code à 6 chiffres reçu par e-mail.");
    if (password.length < 8) throw new HttpError(400, "Le mot de passe doit contenir au moins 8 caractères.");
    if (fullName.length < 2) throw new HttpError(400, "Indiquez votre nom complet.");
    if (phone && !/^[+\d\s().-]{8,20}$/.test(phone)) throw new HttpError(400, "Numéro de téléphone invalide.");

    const admin = adminClient();
    const { data: row, error } = await admin
      .from("email_verification_codes")
      .select("code_hash, expires_at, attempts")
      .eq("email", email)
      .eq("purpose", "signup")
      .maybeSingle();
    if (error) throw error;
    if (!row || new Date(row.expires_at).getTime() < Date.now()) throw new HttpError(400, "Ce code a expiré. Demandez-en un nouveau.");
    if (row.attempts >= MAX_ATTEMPTS) throw new HttpError(429, "Trop d'essais. Demandez un nouveau code.");

    if (!sameHash(row.code_hash, hashCode(email, code))) {
      const attempts = row.attempts + 1;
      await admin.from("email_verification_codes").update({ attempts }).eq("email", email).eq("purpose", "signup");
      const left = MAX_ATTEMPTS - attempts;
      throw new HttpError(400, left > 0 ? `Code incorrect. ${left} essai${left > 1 ? "s" : ""} restant${left > 1 ? "s" : ""}.` : "Code incorrect. Demandez un nouveau code.");
    }

    // Compte créé déjà confirmé : le trigger handle_new_user crée profil + contact depuis les métadonnées
    const { error: createErr } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: fullName, phone, city },
    });
    if (createErr) {
      if (/already|registered|exists/i.test(createErr.message)) throw new HttpError(409, "Un compte existe déjà avec cet e-mail.");
      if (/password/i.test(createErr.message)) throw new HttpError(400, "Mot de passe refusé : choisissez-en un plus robuste.");
      throw createErr;
    }

    await admin.from("email_verification_codes").delete().eq("email", email).eq("purpose", "signup");
    return Response.json({ ok: true });
  } catch (e) {
    return handle(e);
  }
}
