import type { Metadata } from "next";
import { Suspense } from "react";
import { PageLoader } from "@/components/ui";
import { AnimalsView } from "./AnimalsView";

export const metadata: Metadata = {
  title: "Tous les animaux",
  description: "Découvrez des animaux en bonne santé, vérifiés et prêts à rejoindre leur nouvelle famille.",
};

export default function AnimalsPage() {
  return (
    <Suspense fallback={<PageLoader />}>
      <AnimalsView />
    </Suspense>
  );
}
