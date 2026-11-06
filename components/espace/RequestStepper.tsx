import { Check, X } from "lucide-react";
import { cn } from "@/lib/cn";
import { REQUEST_STEPS } from "@/lib/labels";
import type { RequestStatus, RequestStep } from "@/lib/types";

function currentIndex(step: RequestStep, status: RequestStatus) {
  if (status === "approuvee") return REQUEST_STEPS.length - 1;
  return Math.max(0, REQUEST_STEPS.findIndex((s) => s.key === step));
}

/** Stepper horizontal du workflow de publication. */
export function RequestStepper({ step, status, className }: { step: RequestStep; status: RequestStatus; className?: string }) {
  const idx = currentIndex(step, status);
  const failed = status === "refusee" || status === "annulee";
  return (
    <ol className={cn("grid grid-cols-4", className)}>
      {REQUEST_STEPS.map((s, i) => {
        const done = i < idx || (status === "approuvee" && i === idx);
        const current = i === idx && !done;
        return (
          <li key={s.key} className="relative flex flex-col items-center text-center">
            {i > 0 && <span className={cn("absolute right-1/2 top-[18px] h-1 w-full -translate-y-1/2 rounded-full", i <= idx ? "bg-primary" : "bg-line")} />}
            <span
              className={cn(
                "relative z-10 grid size-9 place-items-center rounded-full text-sm font-extrabold ring-4 ring-white",
                done && "bg-primary text-white",
                current && !failed && "bg-amber-400 text-white",
                current && failed && "bg-red-500 text-white",
                !done && !current && "bg-line text-muted",
              )}
            >
              {done ? <Check className="size-4" /> : current && failed ? <X className="size-4" /> : i + 1}
            </span>
            <span className={cn("mt-2 px-1 text-[11px] font-semibold leading-tight sm:text-xs", done || current ? "text-navy" : "text-muted")}>{s.label}</span>
          </li>
        );
      })}
    </ol>
  );
}

export function stepSummary(step: RequestStep, status: RequestStatus): string {
  const idx = currentIndex(step, status);
  if (status === "annulee") return "Demande annulée";
  if (status === "refusee") return "Demande refusée";
  if (status === "approuvee") return "Publiée";
  return `Étape ${idx + 1}/${REQUEST_STEPS.length} · ${REQUEST_STEPS[idx]?.label ?? ""}`;
}
