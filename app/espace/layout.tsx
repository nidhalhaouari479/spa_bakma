import type { Metadata } from "next";
import { Suspense } from "react";
import { EspaceShell } from "@/components/espace/EspaceShell";
import { MobileTabBar } from "@/components/site/MobileTabBar";
import { HeaderFallback, PublicHeader } from "@/components/site/PublicHeader";
import { PageLoader } from "@/components/ui";

export const metadata: Metadata = { title: { default: "Mon espace", template: "%s · Mon espace · Bakma Store" } };

export default function EspaceLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <Suspense fallback={<HeaderFallback />}>
        <PublicHeader />
      </Suspense>
      <Suspense fallback={<PageLoader />}>
        <EspaceShell>{children}</EspaceShell>
      </Suspense>
      <MobileTabBar />
    </div>
  );
}
