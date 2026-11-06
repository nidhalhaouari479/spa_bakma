import type { Metadata } from "next";
import { Suspense } from "react";
import { PageLoader } from "@/components/ui";
import { LoginView } from "./LoginView";

export const metadata: Metadata = { title: "Connexion" };

export default function Page() {
  return (
    <Suspense fallback={<PageLoader />}>
      <LoginView />
    </Suspense>
  );
}
