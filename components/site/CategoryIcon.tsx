import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/cn";
import { AppIcon, iconFor } from "@/lib/icons";

/** Couleurs douces par icône (cercles des catégories). */
const TONES: Record<string, string> = {
  dog: "bg-amber-100 text-amber-600",
  cat: "bg-fuchsia-100 text-fuchsia-600",
  bird: "bg-lime-100 text-lime-700",
  rabbit: "bg-orange-100 text-orange-600",
  fish: "bg-rose-100 text-rose-500",
  turtle: "bg-emerald-100 text-emerald-600",
  horse: "bg-red-100 text-red-700",
  tractor: "bg-red-100 text-red-700",
  rat: "bg-orange-100 text-orange-600",
  squirrel: "bg-orange-100 text-orange-600",
  "paw-print": "bg-cyan-100 text-primary",
};

export function categoryIcon(icon: string | null | undefined): LucideIcon {
  return iconFor(icon);
}

export function CategoryIcon({ icon, className }: { icon: string | null | undefined; className?: string }) {
  return <AppIcon icon={icon} className={className} />;
}

/** Pastille ronde colorée contenant l'icône d'une catégorie. */
export function CategoryBubble({ icon, size = 56, className }: { icon: string | null | undefined; size?: number; className?: string }) {
  return (
    <span
      className={cn("grid shrink-0 place-items-center rounded-full", TONES[icon ?? ""] ?? TONES["paw-print"], className)}
      style={{ width: size, height: size }}
    >
      <AppIcon icon={icon} style={{ width: size * 0.48, height: size * 0.48 }} />
    </span>
  );
}
