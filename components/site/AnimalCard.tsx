"use client";

import Link from "next/link";
import { Heart, MapPin, Mars, Venus } from "lucide-react";
import { AnimalThumb, cn } from "@/components/ui";
import { useFavoriteCount, useFavoriteToggle } from "@/hooks/useFavorites";
import { formatAge, formatPrice, SEX_LABEL } from "@/lib/labels";
import type { Animal } from "@/lib/types";

export function ListingBadge({ type, className }: { type: Animal["listing_type"]; className?: string }) {
  return (
    <span
      className={cn(
        "rounded-md px-2 py-0.5 text-xs font-bold text-white shadow-sm",
        type === "adoption" ? "bg-adopt" : "bg-sale",
        className,
      )}
    >
      {type === "adoption" ? "À adopter" : "À vendre"}
    </span>
  );
}

export function FavoriteButton({ animalId, className }: { animalId: string; className?: string }) {
  const { isFavorite, toggle } = useFavoriteToggle();
  const fav = isFavorite(animalId);
  return (
    <button
      type="button"
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        void toggle(animalId);
      }}
      aria-label={fav ? "Retirer des favoris" : "Ajouter aux favoris"}
      aria-pressed={fav}
      className={cn(
        "grid size-9 place-items-center rounded-full bg-white/95 shadow-md transition hover:scale-105",
        fav ? "text-rose-500" : "text-navy",
        className,
      )}
    >
      <Heart className={cn("size-[18px]", fav && "fill-current")} />
    </button>
  );
}

/** Nombre de favoris (cœur + compteur), mis à jour en direct quand l'utilisateur clique sur le cœur. */
export function FavoriteCount({ animal, className }: { animal: Pick<Animal, "id" | "favorites_count">; className?: string }) {
  const n = useFavoriteCount(animal.id, animal.favorites_count);
  return (
    <span
      title={`${n} personne${n > 1 ? "s ont" : " a"} ajouté cet animal en favori`}
      className={cn("inline-flex shrink-0 items-center gap-1 text-xs font-semibold", n ? "text-rose-500" : "text-muted", className)}
    >
      <Heart className={cn("size-3.5", n > 0 && "fill-current")} />
      {n}
    </span>
  );
}

export function SexAge({ animal, className }: { animal: Pick<Animal, "sex" | "age_value" | "age_unit">; className?: string }) {
  const SexIcon = animal.sex === "femelle" ? Venus : Mars;
  return (
    <span className={cn("flex items-center gap-1.5", className)}>
      <SexIcon className="size-3.5 shrink-0" />
      {animal.sex ? SEX_LABEL[animal.sex] : "Sexe inconnu"} • {formatAge(animal.age_value, animal.age_unit)}
    </span>
  );
}

/** Carte animal (liste, accueil, favoris). */
export function AnimalCard({ animal, showPrice = true }: { animal: Animal; showPrice?: boolean }) {
  const sold = animal.status === "vendue";
  return (
    <Link
      href={`/animaux/${animal.id}`}
      className="group flex flex-col overflow-hidden rounded-[var(--radius-card)] border border-line/70 bg-white shadow-[0_4px_24px_rgba(15,40,90,0.06)] transition hover:-translate-y-0.5 hover:shadow-[0_10px_30px_rgba(15,40,90,0.12)]"
    >
      <div className="relative aspect-[4/3] overflow-hidden">
        <AnimalThumb src={animal.cover_url} alt={animal.name} className={cn("size-full transition duration-300 group-hover:scale-105", sold && "opacity-70 grayscale-[35%]")} />
        {sold ? (
          <span className="absolute left-2.5 top-2.5 rounded-md bg-navy px-2 py-0.5 text-xs font-bold text-white shadow-sm">Vendu</span>
        ) : (
          <ListingBadge type={animal.listing_type} className="absolute left-2.5 top-2.5" />
        )}
        <FavoriteButton animalId={animal.id} className="absolute right-2.5 top-2.5" />
      </div>
      <div className="flex flex-1 flex-col gap-1 p-3 sm:p-4">
        <div className="flex items-center justify-between gap-2">
          <h3 className="min-w-0 truncate text-[15px] font-extrabold text-navy sm:text-base">{animal.name}</h3>
          <FavoriteCount animal={animal} className="sm:text-[13px]" />
        </div>
        <SexAge animal={animal} className="text-xs text-muted sm:text-sm" />
        <span className="flex items-center gap-1.5 text-xs text-muted sm:text-sm">
          <MapPin className="size-3.5 shrink-0" />
          {animal.city || "Tunisie"}
        </span>
        {sold ? (
          <span className="mt-1.5 inline-flex w-fit items-center rounded-full bg-page px-3 py-1 text-xs font-bold text-muted ring-1 ring-line sm:text-sm">Vendu</span>
        ) : (
          showPrice && <span className="mt-1 text-base font-extrabold text-primary sm:text-lg">{formatPrice(animal.price, animal.listing_type)}</span>
        )}
      </div>
    </Link>
  );
}

export function AnimalCardSkeleton() {
  return (
    <div className="overflow-hidden rounded-[var(--radius-card)] border border-line/70 bg-white">
      <div className="aspect-[4/3] animate-pulse bg-primary-soft/60" />
      <div className="space-y-2 p-4">
        <div className="h-4 w-2/3 animate-pulse rounded bg-line" />
        <div className="h-3 w-1/2 animate-pulse rounded bg-line" />
        <div className="h-3 w-1/3 animate-pulse rounded bg-line" />
      </div>
    </div>
  );
}
