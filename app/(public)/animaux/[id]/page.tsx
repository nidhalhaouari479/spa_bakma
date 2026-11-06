import { Suspense } from "react";
import { PageLoader } from "@/components/ui";
import { AnimalDetailView } from "./AnimalDetailView";

export default function AnimalDetailPage() {
  return (
    <Suspense fallback={<PageLoader />}>
      <AnimalDetailView />
    </Suspense>
  );
}
