import type { Metadata } from "next";
import { Suspense } from "react";
import { PageLoader } from "@/components/ui";
import { RegisterView } from "./RegisterView";

export const metadata: Metadata = { title: "Inscription" };

export default function Page() {
  return (
    <Suspense fallback={<PageLoader />}>
      <RegisterView />
    </Suspense>
  );
}
