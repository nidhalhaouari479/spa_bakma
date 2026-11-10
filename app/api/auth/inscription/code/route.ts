import {
  adminClient,
  CODE_TTL_MIN,
  emailTaken,
  handle,
  hashCode,
  HttpError,
  isEmail,
  newCode,
  normalizeEmail,
  RESEND_COOLDOWN_S,
  sendCodeEmail,
} from "@/lib/server/verification";

/**
 * Inscription, étape 1 : envoie un code à 6 chiffres à l'adresse e-mail.
 * Body : { email, full_name? } → { ok: true, ttl_min, cooldown_s }
 */
export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => ({}))) as { email?: unknown; full_name?: unknown };
    const email = normalizeEmail(body.email);
    if (!isEmail(email)) throw new HttpError(400, "Adresse e-mail invalide.");
    const name = typeof body.full_name === "string" ? body.full_name.trim().slice(0, 80) : null;

    const admin = adminClient();
    if (await emailTaken(admin, email)) throw new HttpError(409, "Un compte existe déjà avec cet e-mail. Connectez-vous ou réinitialisez votre mot de passe.");

    // anti-spam : un envoi par minute et par adresse
    const { data: prev, error: prevErr } = await admin
      .from("email_verification_codes")
      .select("last_sent_at")
      .eq("email", email)
      .eq("purpose", "signup")
      .maybeSingle();
    if (prevErr) throw prevErr;
    if (prev) {
      const wait = RESEND_COOLDOWN_S - Math.floor((Date.now() - new Date(prev.last_sent_at).getTime()) / 1000);
      if (wait > 0) throw new HttpError(429, `Patientez ${wait} s avant de demander un nouveau code.`);
    }

    const code = newCode();
    const now = new Date();
    const { error } = await admin.from("email_verification_codes").upsert({
      email,
      purpose: "signup",
      code_hash: hashCode(email, code),
      expires_at: new Date(now.getTime() + CODE_TTL_MIN * 60_000).toISOString(),
      attempts: 0,
      last_sent_at: now.toISOString(),
    });
    if (error) throw error;

    try {
      await sendCodeEmail(email, code, name);
    } catch (e) {
      console.error("[inscription] envoi SMTP", e);
      // on libère le délai d'attente pour permettre un nouvel essai immédiat
      await admin.from("email_verification_codes").delete().eq("email", email).eq("purpose", "signup");
      throw new HttpError(502, "Impossible d'envoyer l'e-mail pour le moment. Vérifiez l'adresse ou réessayez.");
    }

    return Response.json({ ok: true, ttl_min: CODE_TTL_MIN, cooldown_s: RESEND_COOLDOWN_S });
  } catch (e) {
    return handle(e);
  }
}
