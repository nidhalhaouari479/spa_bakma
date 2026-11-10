import type { Metadata } from "next";
import { Suspense } from "react";
import { EspaceShell } from "@/components/espace/EspaceShell";
import { MobileTabBar, MobileTabBarFallback } from "@/components/site/MobileTabBar";
import { HeaderFallback, PublicHeader } from "@/components/site/PublicHeader";
import { PageLoader } from "@/components/ui";

/**
 * Espace client : garde d'authentification côté client (EspaceShell affiche un loader tant que la session
 * n'est pas connue), donc les pages ne sont jamais rendues au prérendu -> pas de validation "instant".
 */
export const instant = false;

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
      <Suspense fallback={<MobileTabBarFallback />}>
        <MobileTabBar />
      </Suspense>
    </div>
  );
}
