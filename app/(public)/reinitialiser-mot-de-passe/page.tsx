import type { Metadata } from "next";
import { Suspense } from "react";
import { PageLoader } from "@/components/ui";
import { ResetView } from "./ResetView";

export const metadata: Metadata = { title: "Nouveau mot de passe" };

export default function Page() {
  return (
    <Suspense fallback={<PageLoader />}>
      <ResetView />
    </Suspense>
  );
}
