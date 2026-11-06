"use client";

import { useState } from "react";
import { MapPin, Search, SlidersHorizontal } from "lucide-react";
import { Button, cn } from "@/components/ui";
import { useCities } from "@/hooks/useRefData";

/** Barre de recherche « texte + ville + Rechercher » (accueil et liste). */
export function SearchBar({
  initialQ = "",
  initialCity = "",
  onSearch,
  onOpenFilters,
  placeholder = "Rechercher un animal, une race…",
  className,
}: {
  initialQ?: string;
  initialCity?: string;
  onSearch: (q: string, city: string) => void;
  onOpenFilters?: () => void;
  placeholder?: string;
  className?: string;
}) {
  const cities = useCities();
  const [q, setQ] = useState(initialQ);
  const [city, setCity] = useState(initialCity);

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSearch(q.trim(), city);
      }}
      className={cn(
        "grid gap-2.5 rounded-[22px] bg-white p-2.5 shadow-[0_10px_40px_rgba(14,124,155,0.12)] ring-1 ring-line/60 md:grid-cols-[1.4fr_1fr_auto] md:rounded-full md:p-2",
        className,
      )}
    >
      <label className="relative">
        <span className="sr-only">Rechercher</span>
        <Search className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-primary" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={placeholder}
          className="h-12 w-full rounded-full border border-line bg-white pl-12 pr-4 text-sm text-navy outline-none placeholder:text-muted focus:border-primary focus:ring-4 focus:ring-primary/10 md:border-transparent md:bg-page/40"
        />
      </label>
      <div className="flex gap-2.5">
        <label className="relative flex-1">
          <span className="sr-only">Ville</span>
          <MapPin className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-navy" />
          <select
            value={city}
            onChange={(e) => setCity(e.target.value)}
            className="select-chevron h-12 w-full appearance-none rounded-full border border-line bg-white bg-[length:16px] bg-[right_16px_center] bg-no-repeat pl-12 pr-10 text-sm text-navy outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 md:border-transparent md:bg-page/40"
          >
            <option value="">Toutes les villes</option>
            {cities.map((c) => (
              <option key={c.id} value={c.name}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
        {onOpenFilters && (
          <button
            type="button"
            onClick={onOpenFilters}
            className="grid size-12 shrink-0 place-items-center rounded-2xl bg-primary text-white md:hidden"
            aria-label="Filtres"
          >
            <SlidersHorizontal className="size-5" />
          </button>
        )}
      </div>
      <Button type="submit" size="lg" className="h-12 md:px-12">
        Rechercher
      </Button>
    </form>
  );
}
