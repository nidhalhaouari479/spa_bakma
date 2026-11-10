"use client";

import Link from "next/link";
import { useState } from "react";
import { MessageSquareText, Pencil, Star, Trash2 } from "lucide-react";
import { Alert, Avatar, Button, cn, Textarea, useToast } from "@/components/ui";
import { useAuth } from "@/hooks/useAuth";
import { unwrap, useQuery } from "@/hooks/useQuery";
import { formatDate } from "@/lib/labels";
import { errorMessage, getSupabase } from "@/lib/supabase";
import type { ProductReview } from "@/lib/types";
import { Stars } from "./ShopBits";

const REVIEW_SELECT = "*, author:profiles!product_reviews_user_id_fkey(full_name, avatar_url)";
const RATING_WORDS = ["", "Décevant", "Moyen", "Correct", "Très bien", "Excellent"];

/** « Prénom N. » : on n'affiche pas le nom complet des clients. */
function shortName(full: string | null | undefined) {
  const parts = (full ?? "").trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "Client Bakma";
  return parts.length > 1 ? `${parts[0]} ${parts[parts.length - 1][0].toUpperCase()}.` : parts[0];
}

/** Onglet « Avis » de la fiche produit. Seuls les clients ayant reçu le produit peuvent noter. */
export function ProductReviews({ productId }: { productId: string }) {
  const { user } = useAuth();
  const uid = user?.id;
  const [editing, setEditing] = useState(false);

  const reviews = useQuery(async () => {
    return unwrap<ProductReview[]>(
      await getSupabase().from("product_reviews").select(REVIEW_SELECT).eq("product_id", productId).order("created_at", { ascending: false }).limit(200),
    );
  }, [productId]);

  const canReview = useQuery(
    async () => {
      const { data, error } = await getSupabase().rpc("has_purchased_product", { p_product_id: productId });
      if (error) throw error;
      return !!data;
    },
    [productId, uid],
    !!uid,
  );

  const all = reviews.data ?? [];
  const mine = uid ? all.find((r) => r.user_id === uid) : undefined;
  const visible = all.filter((r) => r.is_visible);
  const count = visible.length;
  const avg = count ? visible.reduce((s, r) => s + r.rating, 0) / count : 0;
  const dist = [5, 4, 3, 2, 1].map((n) => ({ n, c: visible.filter((r) => r.rating === n).length }));
  const others = all.filter((r) => r.is_visible && r.user_id !== uid);

  return (
    <div className="grid gap-8 lg:grid-cols-[300px_minmax(0,1fr)]">
      {/* Synthèse */}
      <div>
        <div className="flex items-end gap-3">
          <span className="text-5xl font-extrabold leading-none text-navy">{count ? avg.toFixed(1).replace(".", ",") : "–"}</span>
          <span className="pb-1 text-sm text-muted">/ 5</span>
        </div>
        <Stars value={avg} size={20} className="mt-2" />
        <p className="mt-1 text-sm text-body">
          {count} avis client{count > 1 ? "s" : ""}
        </p>
        <ul className="mt-5 space-y-1.5">
          {dist.map(({ n, c }) => (
            <li key={n} className="flex items-center gap-2 text-sm">
              <span className="w-3 text-right font-semibold text-navy">{n}</span>
              <Star className="size-3.5 fill-amber-400 text-amber-400" />
              <span className="h-2 flex-1 overflow-hidden rounded-full bg-line/70">
                <span className="block h-full rounded-full bg-amber-400" style={{ width: count ? `${(c / count) * 100}%` : 0 }} />
              </span>
              <span className="w-6 text-right tabular-nums text-muted">{c}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* Mon avis + liste */}
      <div className="space-y-5">
        {!uid ? (
          <p className="rounded-2xl bg-page px-4 py-3 text-sm text-body">
            <Link href={`/connexion?next=${encodeURIComponent(`/boutique/${productId}?onglet=avis`)}`} className="font-bold text-primary hover:underline">
              Connectez-vous
            </Link>{" "}
            pour donner votre avis. Seuls les clients ayant reçu ce produit peuvent le noter.
          </p>
        ) : mine && !editing ? (
          <MyReview review={mine} onEdit={() => setEditing(true)} onDeleted={reviews.reload} />
        ) : canReview.data || mine ? (
          <ReviewForm
            productId={productId}
            existing={mine}
            onCancel={mine ? () => setEditing(false) : undefined}
            onSaved={() => {
              setEditing(false);
              void reviews.reload();
            }}
          />
        ) : (
          !canReview.loading && (
            <p className="rounded-2xl bg-page px-4 py-3 text-sm text-body">Vous pourrez donner votre avis une fois ce produit acheté et livré.</p>
          )
        )}

        {reviews.error && <Alert>{reviews.error}</Alert>}
        {reviews.loading && !reviews.data ? (
          <div className="space-y-3">
            {[0, 1].map((i) => (
              <div key={i} className="h-24 animate-pulse rounded-2xl bg-page" />
            ))}
          </div>
        ) : others.length === 0 && !mine ? (
          <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-line py-10 text-center">
            <MessageSquareText className="size-8 text-primary/40" />
            <p className="font-bold text-navy">Aucun avis pour le moment</p>
            <p className="text-sm text-muted">Soyez le premier à partager votre expérience.</p>
          </div>
        ) : (
          <ul className="divide-y divide-line/70">
            {others.map((r) => (
              <ReviewItem key={r.id} review={r} />
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function ReviewItem({ review: r }: { review: ProductReview }) {
  return (
    <li className="flex gap-3 py-4 first:pt-0">
      <Avatar src={r.author?.avatar_url} name={r.author?.full_name} size={40} />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <span className="font-bold text-navy">{shortName(r.author?.full_name)}</span>
          <span className="rounded-md bg-emerald-50 px-1.5 py-0.5 text-[11px] font-bold text-emerald-700">Achat vérifié</span>
          <span className="text-xs text-muted">{formatDate(r.created_at)}</span>
        </div>
        <Stars value={r.rating} size={15} className="mt-1" />
        {r.comment && <p className="mt-2 whitespace-pre-line text-[15px] leading-relaxed text-body [overflow-wrap:anywhere]">{r.comment}</p>}
      </div>
    </li>
  );
}

function MyReview({ review, onEdit, onDeleted }: { review: ProductReview; onEdit: () => void; onDeleted: () => void }) {
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  async function remove() {
    if (!window.confirm("Supprimer votre avis ?")) return;
    setBusy(true);
    const { error } = await getSupabase().from("product_reviews").delete().eq("id", review.id);
    setBusy(false);
    if (error) return toast(errorMessage(error), "error");
    toast("Avis supprimé", "info");
    onDeleted();
  }
  return (
    <div className="rounded-2xl border border-primary/30 bg-primary-soft/30 p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-bold text-navy">Votre avis</p>
          <Stars value={review.rating} size={16} className="mt-1" />
        </div>
        <div className="flex gap-1">
          <button type="button" onClick={onEdit} className="grid size-9 place-items-center rounded-full text-muted hover:bg-white hover:text-primary" aria-label="Modifier mon avis">
            <Pencil className="size-4" />
          </button>
          <button type="button" onClick={remove} disabled={busy} className="grid size-9 place-items-center rounded-full text-muted hover:bg-white hover:text-red-600" aria-label="Supprimer mon avis">
            <Trash2 className="size-4" />
          </button>
        </div>
      </div>
      {review.comment && <p className="mt-2 whitespace-pre-line text-sm text-body [overflow-wrap:anywhere]">{review.comment}</p>}
      {!review.is_visible && <p className="mt-2 text-xs font-semibold text-amber-700">Cet avis a été masqué par la modération et n&apos;est pas visible des autres clients.</p>}
    </div>
  );
}

function ReviewForm({ productId, existing, onSaved, onCancel }: { productId: string; existing?: ProductReview; onSaved: () => void; onCancel?: () => void }) {
  const { user } = useAuth();
  const toast = useToast();
  const [rating, setRating] = useState(existing?.rating ?? 0);
  const [hover, setHover] = useState(0);
  const [comment, setComment] = useState(existing?.comment ?? "");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const shown = hover || rating;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!rating) return setErr("Choisissez une note de 1 à 5 étoiles.");
    setBusy(true);
    setErr(null);
    const sb = getSupabase();
    const payload = { rating, comment: comment.trim() || null };
    const { error } = existing
      ? await sb.from("product_reviews").update(payload).eq("id", existing.id)
      : await sb.from("product_reviews").insert({ ...payload, product_id: productId, user_id: user!.id });
    setBusy(false);
    if (error) return setErr(errorMessage(error));
    toast(existing ? "Avis modifié" : "Merci pour votre avis !");
    onSaved();
  }

  return (
    <form onSubmit={submit} className="rounded-2xl border border-line/70 bg-page/60 p-4 sm:p-5">
      <p className="font-bold text-navy">{existing ? "Modifier votre avis" : "Donnez votre avis"}</p>
      <div className="mt-2 flex items-center gap-3">
        <div className="flex" onMouseLeave={() => setHover(0)} role="radiogroup" aria-label="Note">
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              type="button"
              role="radio"
              aria-checked={rating === n}
              aria-label={`${n} étoile${n > 1 ? "s" : ""}`}
              onMouseEnter={() => setHover(n)}
              onClick={() => setRating(n)}
              className="p-0.5"
            >
              <Star className={cn("size-7 transition", n <= shown ? "fill-amber-400 text-amber-400" : "text-line")} />
            </button>
          ))}
        </div>
        {shown > 0 && <span className="text-sm font-semibold text-body">{RATING_WORDS[shown]}</span>}
      </div>
      <Textarea
        className="mt-3 bg-white"
        rows={3}
        maxLength={2000}
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        placeholder="Qualité, appétence, taille… qu'en avez-vous pensé ? (facultatif)"
      />
      {err && (
        <div className="mt-3">
          <Alert>{err}</Alert>
        </div>
      )}
      <div className="mt-3 flex gap-2">
        <Button type="submit" loading={busy}>
          {existing ? "Enregistrer" : "Publier mon avis"}
        </Button>
        {onCancel && (
          <Button type="button" variant="ghost" onClick={onCancel}>
            Annuler
          </Button>
        )}
      </div>
    </form>
  );
}
