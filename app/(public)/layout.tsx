import { Suspense } from "react";
import { Footer } from "@/components/site/Footer";
import { MobileTabBar, MobileTabBarFallback } from "@/components/site/MobileTabBar";
import { HeaderFallback, PublicHeader } from "@/components/site/PublicHeader";
import { PageLoader } from "@/components/ui";

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col pb-[calc(68px+env(safe-area-inset-bottom))] lg:pb-0">
      <Suspense fallback={<HeaderFallback />}>
        <PublicHeader />
      </Suspense>
      <main className="flex-1">
        <Suspense fallback={<PageLoader />}>{children}</Suspense>
      </main>
      <Footer />
      <Suspense fallback={<MobileTabBarFallback />}>
        <MobileTabBar />
      </Suspense>
    </div>
  );
}
