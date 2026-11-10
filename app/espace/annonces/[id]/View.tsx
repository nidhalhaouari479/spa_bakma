"use client";

import { useParams } from "next/navigation";
import { Suspense } from "react";
import { PageLoader } from "@/components/ui";
import { ListingTracking } from "./ListingTracking";

function Inner() {
  const { id } = useParams<{ id: string }>();
  return <ListingTracking id={id} />;
}

export default function ListingTrackingPage() {
  return (
    <Suspense fallback={<PageLoader />}>
      <Inner />
    </Suspense>
  );
}
