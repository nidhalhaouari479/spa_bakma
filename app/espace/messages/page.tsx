"use client";

import { Suspense } from "react";
import { PageLoader } from "@/components/ui";
import { MessagesView } from "./MessagesView";

export default function MessagesPage() {
  return (
    <Suspense fallback={<PageLoader />}>
      <MessagesView />
    </Suspense>
  );
}
