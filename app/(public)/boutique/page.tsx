import type { Metadata } from "next";
import { Suspense } from "react";
import { PageLoader } from "@/components/ui";
import { ShopView } from "./ShopView";

export const metadata: Metadata = {
  title: "Boutique",
  description: "Alimentation, accessoires et soins pour animaux, livrés partout en Tunisie. Paiement à la livraison.",
};

export default function ShopPage() {
  return (
    <Suspense fallback={<PageLoader />}>
      <ShopView />
    </Suspense>
  );
}
