"use client";

import { useState } from "react";
import { Heart, PawPrint, ShoppingBag } from "lucide-react";
import { PageHeader } from "@/components/espace/EspaceShell";
import { PRODUCT_CARD, ProductCard } from "@/components/shop/ShopBits";
import { AnimalCard } from "@/components/site/AnimalCard";
import { Alert, Button, Card, EmptyState, PageLoader, Tabs } from "@/components/ui";
import { useAuth } from "@/hooks/useAuth";
import { useFavoriteToggle } from "@/hooks/useFavorites";
import { useProductFavorite } from "@/hooks/useProductFavorites";
import { unwrap, useQuery } from "@/hooks/useQuery";
import { getSupabase } from "@/lib/supabase";
import type { Animal, Product } from "@/lib/types";

type Tab = "animaux" | "produits";

export default function FavoritesPage() {
  const { user } = useAuth();
  const uid = user?.id;
  const animalFav = useFavoriteToggle();
  const productFav = useProductFavorite();
  const [tab, setTab] = useState<Tab>("animaux");

  const favs = useQuery(
    async () => {
      const sb = getSupabase();
      const [a, p] = await Promise.all([
        sb
          .from("favorites")
          .select("created_at, animal:animals!favorites_animal_id_fkey(*, category:categories!animals_category_id_fkey(*))")
          .eq("user_id", uid!)
          .order("created_at", { ascending: false }),
        sb
          .from("product_favorites")
          .select(`created_at, product:products!product_favorites_product_id_fkey(${PRODUCT_CARD})`)
          .eq("user_id", uid!)
          .order("created_at", { ascending: false }),
      ]);
      return {
        animals: unwrap<{ animal: Animal | null }[]>(a)
          .map((r) => r.animal)
          .filter((x): x is Animal => !!x),
        // produits masqués du site : invisibles (RLS), donc absents
        products: unwrap<{ product: Product | null }[]>(p)
          .map((r) => r.product)
          .filter((x): x is Product => !!x),
      };
    },
    [uid],
    !!uid,
  );

  if (favs.loading && !favs.data) return <PageLoader />;
  // Les favoris retirés depuis cette page disparaissent immédiatement
  const animals = (favs.data?.animals ?? []).filter((a) => !animalFav.ready || animalFav.isFavorite(a.id));
  const products = (favs.data?.products ?? []).filter((p) => !productFav.ready || productFav.isFavorite(p.id));

  return (
    <div>
      <PageHeader title="Mes favoris" subtitle="Les animaux et les produits que vous avez mis de côté." />
      {favs.error && <Alert>{favs.error}</Alert>}
      <div className="mb-5">
        <Tabs
          value={tab}
          onChange={setTab}
          items={[
            { value: "animaux", label: "Animaux", count: animals.length, icon: <PawPrint /> },
            { value: "produits", label: "Produits", count: products.length, icon: <ShoppingBag /> },
          ]}
        />
      </div>

      {tab === "animaux" ? (
        animals.length === 0 ? (
          <Card>
            <EmptyState
              icon={<Heart />}
              title="Aucun animal en favori"
              text="Cliquez sur le cœur d'une annonce pour la retrouver ici."
              action={<Button href="/animaux">Découvrir les animaux</Button>}
            />
          </Card>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:gap-5 md:grid-cols-3">
            {animals.map((a) => (
              <div key={a.id} className="relative">
                <AnimalCard animal={a} />
                {a.status !== "publiee" && a.status !== "vendue" && (
                  <span className="absolute inset-x-3 top-12 rounded-lg bg-navy/80 px-2 py-1 text-center text-xs font-bold text-white">
                    {a.status === "adoptee" ? "Déjà adopté" : "Plus disponible"}
                  </span>
                )}
              </div>
            ))}
          </div>
        )
      ) : products.length === 0 ? (
        <Card>
          <EmptyState
            icon={<Heart />}
            title="Aucun produit en favori"
            text="Cliquez sur le cœur d'un produit de la boutique pour le retrouver ici."
            action={<Button href="/boutique">Découvrir la boutique</Button>}
          />
        </Card>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:gap-5 md:grid-cols-3">
          {products.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      )}
    </div>
  );
}
