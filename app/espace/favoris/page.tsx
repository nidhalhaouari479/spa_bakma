"use client";

import { Heart } from "lucide-react";
import { PageHeader } from "@/components/espace/EspaceShell";
import { AnimalCard } from "@/components/site/AnimalCard";
import { Alert, Button, Card, EmptyState, PageLoader } from "@/components/ui";
import { useAuth } from "@/hooks/useAuth";
import { useFavoriteToggle } from "@/hooks/useFavorites";
import { unwrap, useQuery } from "@/hooks/useQuery";
import { getSupabase } from "@/lib/supabase";
import type { Animal } from "@/lib/types";

export default function FavoritesPage() {
  const { user } = useAuth();
  const uid = user?.id;
  const { isFavorite, ready } = useFavoriteToggle();

  const favs = useQuery(
    async () => {
      const rows = unwrap<{ animal: Animal | null }[]>(
        await getSupabase()
          .from("favorites")
          .select("created_at, animal:animals!favorites_animal_id_fkey(*, category:categories!animals_category_id_fkey(*))")
          .eq("user_id", uid!)
          .order("created_at", { ascending: false }),
      );
      return rows.map((r) => r.animal).filter((a): a is Animal => !!a);
    },
    [uid],
    !!uid,
  );

  if (favs.loading && !favs.data) return <PageLoader />;
  // Les favoris retirés depuis cette page disparaissent immédiatement
  const animals = (favs.data ?? []).filter((a) => !ready || isFavorite(a.id));

  return (
    <div>
      <PageHeader title="Mes favoris" subtitle="Les animaux que vous avez mis de côté." />
      {favs.error && <Alert>{favs.error}</Alert>}
      {animals.length === 0 ? (
        <Card>
          <EmptyState
            icon={<Heart />}
            title="Aucun favori pour le moment"
            text="Cliquez sur le cœur d'une annonce pour la retrouver ici."
            action={<Button href="/animaux">Découvrir les animaux</Button>}
          />
        </Card>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:gap-5 md:grid-cols-3">
          {animals.map((a) => (
            <div key={a.id} className="relative">
              <AnimalCard animal={a} />
              {a.status !== "publiee" && (
                <span className="absolute inset-x-3 top-12 rounded-lg bg-navy/80 px-2 py-1 text-center text-xs font-bold text-white">
                  {a.status === "adoptee" ? "Déjà adopté" : a.status === "vendue" ? "Déjà vendu" : "Plus disponible"}
                </span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
