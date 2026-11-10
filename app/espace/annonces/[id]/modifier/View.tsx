"use client";

import { useParams } from "next/navigation";
import { Suspense } from "react";
import { AnimalForm } from "@/components/espace/AnimalForm";
import { PageLoader } from "@/components/ui";

function EditForm() {
  const { id } = useParams<{ id: string }>();
  return <AnimalForm animalId={id} />;
}

export default function EditListingPage() {
  return (
    <Suspense fallback={<PageLoader />}>
      <EditForm />
    </Suspense>
  );
}
