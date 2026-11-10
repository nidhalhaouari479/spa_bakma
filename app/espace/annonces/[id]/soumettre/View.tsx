"use client";

import { useParams } from "next/navigation";
import { Suspense } from "react";
import { SubmitWizard } from "@/components/espace/SubmitWizard";
import { PageLoader } from "@/components/ui";

function Inner() {
  const { id } = useParams<{ id: string }>();
  return <SubmitWizard animalId={id} />;
}

export default function SubmitListingPage() {
  return (
    <Suspense fallback={<PageLoader />}>
      <Inner />
    </Suspense>
  );
}
