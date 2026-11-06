import type { Metadata } from "next";
import { Suspense } from "react";
import { PageLoader } from "@/components/ui";
import { ForgotView } from "./ForgotView";

export const metadata: Metadata = { title: "Mot de passe oublié" };

export default function Page() {
  return (
    <Suspense fallback={<PageLoader />}>
      <ForgotView />
    </Suspense>
  );
}
