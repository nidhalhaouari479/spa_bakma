import { Suspense } from "react";
import { PageLoader } from "@/components/ui";
import { ProductView } from "./ProductView";

export default function ProductPage() {
  return (
    <Suspense fallback={<PageLoader />}>
      <ProductView />
    </Suspense>
  );
}
