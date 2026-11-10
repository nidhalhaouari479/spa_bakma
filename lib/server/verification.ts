/*
 * Code de vérification e-mail (inscription) — UNIQUEMENT côté serveur (route handlers).
 * Utilise SUPABASE_SERVICE_ROLE_KEY et les variables SMTP_* de spa/.env.local.
 */
import { createHash, randomInt, timingSafeEqual } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import nodemailer from "nodemailer";

export const CODE_TTL_MIN = 10;
export const RESEND_COOLDOWN_S = 60;
export const MAX_ATTEMPTS = 5;

export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

export const fail = (status: number, error: string) => Response.json({ error }, { status });

export function handle(e: unknown) {
  if (e instanceof HttpError) return fail(e.status, e.message);
  console.error("[inscription]", e);
  return fail(500, "Une erreur est survenue, réessayez dans un instant.");
}

export function adminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new HttpError(500, "Configuration serveur incomplète (SUPABASE_SERVICE_ROLE_KEY manquante dans spa/.env.local).");
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

export const normalizeEmail = (v: unknown) => (typeof v === "string" ? v.trim().toLowerCase() : "");
export const isEmail = (e: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e) && e.length <= 254;

export function newCode() {
  return String(randomInt(0, 1_000_000)).padStart(6, "0");
}

export function hashCode(email: string, code: string) {
  const secret = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
  return createHash("sha256").update(`${email}:${code}:${secret}`).digest("hex");
}

export function sameHash(a: string, b: string) {
  const x = Buffer.from(a, "hex");
  const y = Buffer.from(b, "hex");
  return x.length === y.length && timingSafeEqual(x, y);
}

/** Un compte existe-t-il déjà avec cet e-mail ? (profile_contacts est synchronisé avec auth.users) */
export async function emailTaken(admin: ReturnType<typeof adminClient>, email: string) {
  const { data, error } = await admin.from("profile_contacts").select("id").ilike("email", email).limit(1);
  if (error) throw error;
  return (data?.length ?? 0) > 0;
}

// ------------------------------------------------------------------ e-mail
function transport() {
  const host = process.env.SMTP_HOST;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  if (!host || !user || !pass) throw new HttpError(500, "Envoi d'e-mail non configuré (variables SMTP_* manquantes).");
  return nodemailer.createTransport({
    host,
    port: Number(process.env.SMTP_PORT || 587),
    secure: process.env.SMTP_SECURE === "true",
    auth: { user, pass },
  });
}

export async function sendCodeEmail(to: string, code: string, name?: string | null) {
  const from = {
    name: process.env.SMTP_SENDER_NAME || "Bakma Store",
    address: process.env.SMTP_SENDER_EMAIL || process.env.SMTP_USER!,
  };
  const hello = name ? `Bonjour ${escapeHtml(name.split(" ")[0])},` : "Bonjour,";
  const digits = code
    .split("")
    .map((d) => `<td style="width:44px;height:54px;border:1px solid #d6e4ec;border-radius:12px;background:#f2f9fc;font-size:26px;font-weight:800;color:#0f2a5a;text-align:center;font-family:Arial,sans-serif">${d}</td>`)
    .join('<td style="width:8px"></td>');

  await transport().sendMail({
    from,
    to,
    subject: `${code} est votre code de vérification Bakma`,
    text: `${hello.replace(/<[^>]+>/g, "")}\n\nVotre code de vérification Bakma Store : ${code}\nIl est valable ${CODE_TTL_MIN} minutes.\n\nSi vous n'êtes pas à l'origine de cette demande, ignorez cet e-mail.`,
    html: `<!doctype html><html><body style="margin:0;background:#f4f7f9;padding:24px 12px;font-family:Arial,Helvetica,sans-serif;color:#33475b">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;background:#ffffff;border-radius:20px;padding:32px 28px">
<tr><td style="font-size:22px;font-weight:800;color:#0f2a5a">Bakma Store</td></tr>
<tr><td style="padding-top:20px;font-size:15px;line-height:1.6">${hello}<br>Voici votre code pour créer votre compte :</td></tr>
<tr><td align="center" style="padding:24px 0"><table role="presentation" cellpadding="0" cellspacing="0"><tr>${digits}</tr></table></td></tr>
<tr><td style="font-size:14px;line-height:1.6;color:#5b6b7b">Ce code est valable <strong>${CODE_TTL_MIN} minutes</strong>. Ne le communiquez à personne : l'équipe Bakma ne vous le demandera jamais.</td></tr>
<tr><td style="padding-top:20px;font-size:12px;color:#94a3b8">Si vous n'êtes pas à l'origine de cette demande, ignorez simplement cet e-mail.</td></tr>
</table></td></tr></table></body></html>`,
  });
}

function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}
