"use client";

import { BadgeCheck, CircleSlash, Clock, Hourglass, Lock, RotateCcw, ShieldAlert } from "lucide-react";
import { useSyncExternalStore } from "react";
import { cn } from "@/components/ui";
import { formatDate } from "@/lib/labels";
import type { PurchaseStatus } from "@/lib/types";

export type PaymentRole = "buyer" | "seller";

export interface PaymentInfo {
  status: PurchaseStatus;
  amount: number;
  hold_days: number;
  created_at: string;
  verified_at: string | null;
  release_at: string | null;
  paid_out_at: string | null;
  refunded_at?: string | null;
}

const DAY = 86_400_000;

// Heure courante partagée, rafraîchie chaque minute (le compte à rebours avance tout seul).
let nowValue = Date.now();
function subscribeNow(cb: () => void) {
  nowValue = Date.now();
  const t = window.setInterval(() => {
    nowValue = Date.now();
    cb();
  }, 60_000);
  return () => window.clearInterval(t);
}
export function useNow() {
  return useSyncExternalStore(subscribeNow, () => nowValue, () => nowValue);
}
const money = (n: number) => `${new Intl.NumberFormat("fr-FR").format(Number(n) || 0)} TND`;

/** Temps restant avant la fin de la garantie : « 5 jours », « 1 jour », « 6 h », « < 1 h ». */
export function timeLeft(releaseAt: string | null, now = Date.now()) {
  if (!releaseAt) return null;
  const ms = new Date(releaseAt).getTime() - now;
  if (ms <= 0) return null;
  if (ms >= DAY) {
    const d = Math.ceil(ms / DAY);
    return { value: d, unit: d > 1 ? "jours" : "jour", short: `${d} j` };
  }
  const h = Math.ceil(ms / 3_600_000);
  return h <= 1 ? { value: "< 1", unit: "heure", short: "< 1 h" } : { value: h, unit: "heures", short: `${h} h` };
}

/** Phase du paiement, vue par l'acheteur ou le vendeur. */
export function paymentPhase(p: Pick<PaymentInfo, "status" | "release_at">, now = Date.now()) {
  if (p.status === "paiement_a_verifier") return "verification" as const;
  if (p.status === "garantie") return p.release_at && new Date(p.release_at).getTime() > now ? ("bloque" as const) : ("liberable" as const);
  if (p.status === "litige") return "litige" as const;
  if (p.status === "versee") return "verse" as const;
  if (p.status === "remboursee") return "rembourse" as const;
  return "annule" as const;
}

const TONES = {
  orange: { box: "border-amber-200 bg-amber-50/70", icon: "bg-amber-100 text-amber-700", title: "text-amber-900", bar: "bg-amber-500" },
  blue: { box: "border-sky-200 bg-sky-50/70", icon: "bg-sky-100 text-sky-700", title: "text-sky-900", bar: "bg-primary" },
  green: { box: "border-emerald-200 bg-emerald-50/70", icon: "bg-emerald-100 text-emerald-700", title: "text-emerald-900", bar: "bg-emerald-500" },
  red: { box: "border-red-200 bg-red-50/70", icon: "bg-red-100 text-red-700", title: "text-red-900", bar: "bg-red-500" },
  grey: { box: "border-line bg-page", icon: "bg-white text-muted", title: "text-navy", bar: "bg-slate-400" },
};

/** Encadré « Paiement » : où en est l'argent, combien de jours restent, prochaine étape. */
export function PaymentPanel({ p, role, className }: { p: PaymentInfo; role: PaymentRole; className?: string }) {
  const now = useNow();
  const phase = paymentPhase(p, now);
  const left = timeLeft(p.release_at, now);
  const seller = role === "seller";

  const view = (() => {
    switch (phase) {
      case "verification":
        return {
          tone: "orange" as const,
          icon: <Clock />,
          title: "Paiement en vérification",
          text: seller
            ? "Un acheteur a envoyé son virement. Bakma vérifie sa réception sur son compte."
            : "Bakma vérifie la réception de votre virement. Vous serez notifié dès la validation.",
        };
      case "bloque":
        return {
          tone: "blue" as const,
          icon: <Lock />,
          title: "Paiement bloqué chez Bakma",
          text: seller
            ? `L'argent est sécurisé chez Bakma pendant la garantie de ${p.hold_days} jours. Il vous sera versé à la fin, si l'acheteur ne signale aucun problème.`
            : `Votre argent est sécurisé chez Bakma. Pendant ${p.hold_days} jours, vous pouvez signaler un problème : le vendeur n'est pas payé en attendant.`,
        };
      case "liberable":
        return {
          tone: "green" as const,
          icon: <Hourglass />,
          title: seller ? "Garantie terminée : versement en préparation" : "Garantie terminée",
          text: seller
            ? "Aucun problème signalé. Bakma prépare le virement sur votre RIB."
            : "La période de garantie est terminée : le paiement va être versé au vendeur.",
        };
      case "litige":
        return {
          tone: "red" as const,
          icon: <ShieldAlert />,
          title: "Paiement gelé : problème signalé",
          text: seller
            ? "L'acheteur a signalé un problème. Le versement est suspendu pendant que Bakma examine la situation."
            : "Bakma examine votre signalement. Le vendeur n'est pas payé en attendant la décision.",
        };
      case "verse":
        return {
          tone: "green" as const,
          icon: <BadgeCheck />,
          title: seller ? "Paiement reçu" : "Achat finalisé",
          text: seller ? `Bakma vous a versé le montant le ${formatDate(p.paid_out_at)}.` : `Le vendeur a été payé le ${formatDate(p.paid_out_at)}.`,
        };
      case "rembourse":
        return {
          tone: "grey" as const,
          icon: <RotateCcw />,
          title: seller ? "Vente annulée" : "Remboursé",
          text: seller ? "La vente a été annulée et l'acheteur remboursé." : `Bakma vous a remboursé${p.refunded_at ? ` le ${formatDate(p.refunded_at)}` : ""}.`,
        };
      default:
        return {
          tone: "grey" as const,
          icon: <CircleSlash />,
          title: p.status === "paiement_refuse" ? "Paiement non validé" : "Achat annulé",
          text: seller ? "Aucun montant n'est en attente pour cette vente." : "Aucun montant n'est bloqué pour cet achat.",
        };
    }
  })();
  const t = TONES[view.tone];

  // progression de la garantie (validation → fin)
  const start = p.verified_at ? new Date(p.verified_at).getTime() : null;
  const end = p.release_at ? new Date(p.release_at).getTime() : null;
  const pct = start && end && end > start ? Math.min(100, Math.max(0, ((now - start) / (end - start)) * 100)) : 0;

  return (
    <div className={cn("rounded-2xl border p-4", t.box, className)}>
      <div className="flex items-start gap-3">
        <span className={cn("grid size-10 shrink-0 place-items-center rounded-xl [&>svg]:size-5", t.icon)}>{view.icon}</span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
            <p className={cn("font-extrabold", t.title)}>{view.title}</p>
            <p className="text-sm font-extrabold text-navy">{money(p.amount)}</p>
          </div>
          <p className="mt-1 text-[13px] leading-relaxed text-body">{view.text}</p>
        </div>
        {phase === "bloque" && left && (
          <div className="shrink-0 rounded-xl bg-white px-3 py-2 text-center shadow-sm ring-1 ring-sky-100">
            <div className="text-[10px] font-bold uppercase tracking-wide text-muted">Reste</div>
            <div className="text-2xl font-extrabold leading-none text-primary">{left.value}</div>
            <div className="text-[11px] font-semibold text-muted">{left.unit}</div>
          </div>
        )}
      </div>

      {(phase === "bloque" || phase === "liberable" || phase === "litige") && start && end && (
        <div className="mt-4">
          <div className="h-2 overflow-hidden rounded-full bg-white">
            <div className={cn("h-full rounded-full transition-all", t.bar)} style={{ width: `${pct}%` }} />
          </div>
          <div className="mt-1.5 flex justify-between gap-2 text-[11px] font-semibold text-muted">
            <span>Validé le {formatDate(p.verified_at)}</span>
            <span>{seller ? "Versement" : "Fin de garantie"} le {formatDate(p.release_at)}</span>
          </div>
        </div>
      )}
    </div>
  );
}

/** Résumé des montants (en haut des onglets Achats / Ventes). */
export function PaymentSummary({ rows, role }: { rows: PaymentInfo[]; role: PaymentRole }) {
  const now = useNow();
  const sum = (phases: string[]) => {
    const list = rows.filter((r) => phases.includes(paymentPhase(r, now)));
    return { n: list.length, amount: list.reduce((s, r) => s + Number(r.amount), 0) };
  };
  const verif = sum(["verification"]);
  const blocked = sum(["bloque", "liberable", "litige"]);
  const done = sum(["verse"]);
  const next = rows
    .filter((r) => paymentPhase(r, now) === "bloque")
    .map((r) => timeLeft(r.release_at, now))
    .filter(Boolean)[0];

  const items = [
    { label: "En vérification", icon: <Clock />, cls: "bg-amber-100 text-amber-700", ...verif, hint: "virement en cours de contrôle" },
    {
      label: "Bloqué chez Bakma",
      icon: <Lock />,
      cls: "bg-sky-100 text-primary",
      ...blocked,
      hint: next ? `prochain versement dans ${next.short}` : "garantie en cours",
    },
    { label: role === "seller" ? "Versé" : "Finalisé", icon: <BadgeCheck />, cls: "bg-emerald-100 text-emerald-700", ...done, hint: role === "seller" ? "reçu sur votre RIB" : "achats terminés" },
  ];

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
      {items.map((it) => (
        <div key={it.label} className="flex items-center gap-3 rounded-2xl border border-line bg-white p-4 shadow-[0_4px_24px_rgba(15,40,90,0.05)]">
          <span className={cn("grid size-10 shrink-0 place-items-center rounded-xl [&>svg]:size-5", it.cls)}>{it.icon}</span>
          <div className="min-w-0">
            <div className="text-xs font-semibold text-muted">
              {it.label} {it.n > 0 && <span className="text-navy">({it.n})</span>}
            </div>
            <div className="text-lg font-extrabold text-navy">{money(it.amount)}</div>
            <div className="truncate text-[11px] text-muted">{it.hint}</div>
          </div>
        </div>
      ))}
    </div>
  );
}
