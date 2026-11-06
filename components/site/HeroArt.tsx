import { PawPrint } from "lucide-react";
import { cn } from "@/lib/cn";

/** Illustration chiot + chaton avec formes décoratives (hero). */
export function HeroArt({ className, priority = true }: { className?: string; priority?: boolean }) {
  return (
    <div className={cn("relative", className)}>
      <span className="absolute -left-4 top-6 size-16 rounded-full bg-sky-200/60 blur-[1px]" aria-hidden />
      <span className="absolute -right-2 bottom-10 size-24 rounded-full bg-cyan-200/50" aria-hidden />
      <PawPrint className="absolute -left-2 bottom-16 z-10 size-10 rotate-[-18deg] text-white drop-shadow" aria-hidden />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/hero-pets.jpg"
        alt="Un chiot golden retriever et un chaton tigré"
        fetchPriority={priority ? "high" : "auto"}
        className="relative w-full object-contain mix-blend-multiply"
      />
    </div>
  );
}
