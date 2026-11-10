"use client";

import Link from "next/link";
import { Children, createContext, isValidElement, useCallback, useContext, useEffect, useId, useRef, useState } from "react";
import { Check, ChevronDown, ChevronLeft, ChevronRight, Loader2, PawPrint, X } from "lucide-react";
import { initials, type Tone } from "@/lib/labels";

export function cn(...c: (string | false | null | undefined)[]) {
  return c.filter(Boolean).join(" ");
}

// ------------------------------------------------------------------ Button
type ButtonVariant = "primary" | "outline" | "ghost" | "danger" | "success" | "soft";
const BTN: Record<ButtonVariant, string> = {
  primary: "bg-gradient-to-b from-primary to-primary-dark text-white shadow-sm hover:brightness-110",
  outline: "border border-line bg-white text-navy hover:border-primary hover:text-primary",
  ghost: "text-body hover:bg-primary-soft hover:text-primary",
  danger: "bg-red-500 text-white hover:bg-red-600",
  success: "bg-emerald-500 text-white hover:bg-emerald-600",
  soft: "bg-primary-soft text-primary hover:brightness-95",
};
const SIZE = { sm: "h-9 px-3 text-sm", md: "h-11 px-5 text-sm", lg: "h-13 px-7 text-base" };

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: keyof typeof SIZE;
  loading?: boolean;
  href?: string;
  icon?: React.ReactNode;
};

export function Button({ variant = "primary", size = "md", loading, href, icon, className, children, disabled, ...rest }: ButtonProps) {
  const cls = cn(
    "inline-flex items-center justify-center gap-2 rounded-[var(--radius-btn)] font-semibold transition disabled:cursor-not-allowed disabled:opacity-60 whitespace-nowrap",
    BTN[variant],
    SIZE[size],
    className,
  );
  const content = (
    <>
      {loading ? <Loader2 className="size-4 animate-spin" /> : icon}
      {children}
    </>
  );
  if (href) return <Link href={href} className={cls}>{content}</Link>;
  return (
    <button className={cls} disabled={disabled || loading} {...rest}>
      {content}
    </button>
  );
}

// ------------------------------------------------------------------ Form fields
export function Field({ label, error, hint, children, className }: { label?: string; error?: string | null; hint?: string; children: React.ReactNode; className?: string }) {
  return (
    <label className={cn("block space-y-1.5", className)}>
      {label && <span className="text-sm font-semibold text-navy">{label}</span>}
      {children}
      {hint && !error && <span className="block text-xs text-muted">{hint}</span>}
      {error && <span className="block text-xs font-medium text-red-600">{error}</span>}
    </label>
  );
}

const inputBase =
  "w-full rounded-[var(--radius-input)] border border-line bg-white text-sm text-navy placeholder:text-muted outline-none transition focus:border-primary focus:ring-4 focus:ring-primary/10 disabled:bg-page";

export function Input({ icon, right, className, ...rest }: React.InputHTMLAttributes<HTMLInputElement> & { icon?: React.ReactNode; right?: React.ReactNode }) {
  return (
    <div className="relative">
      {icon && <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted [&>svg]:size-[18px]">{icon}</span>}
      <input className={cn(inputBase, "h-12", icon ? "pl-11" : "pl-4", right ? "pr-11" : "pr-4", className)} {...rest} />
      {right && <span className="absolute right-3 top-1/2 -translate-y-1/2">{right}</span>}
    </div>
  );
}

export function Textarea({ className, ...rest }: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={cn(inputBase, "min-h-28 px-4 py-3", className)} {...rest} />;
}

type SelectOption = { value: string; label: React.ReactNode; text: string; disabled?: boolean };

/** Récupère les <option> passées en enfants (y compris dans des fragments / tableaux). */
function readOptions(children: React.ReactNode): SelectOption[] {
  const out: SelectOption[] = [];
  const walk = (nodes: React.ReactNode) =>
    Children.forEach(nodes, (child) => {
      if (!isValidElement(child)) return;
      const props = child.props as { value?: string | number; children?: React.ReactNode; disabled?: boolean };
      if (child.type === "option") {
        const text = Children.toArray(props.children)
          .filter((c) => typeof c === "string" || typeof c === "number")
          .join("");
        out.push({ value: String(props.value ?? text), label: props.children, text, disabled: props.disabled });
      } else if (props.children) walk(props.children);
    });
  walk(children);
  return out;
}

/**
 * Liste déroulante stylée (remplace le <select> natif, dont le menu est dessiné par le système).
 * Même API qu'un <select> : value, onChange(e) avec e.target.value, enfants <option>.
 */
export function Select({
  icon,
  className,
  children,
  value,
  onChange,
  disabled,
  name,
  id,
  "aria-label": ariaLabel,
}: React.SelectHTMLAttributes<HTMLSelectElement> & { icon?: React.ReactNode }) {
  const options = readOptions(children);
  const current = String(value ?? "");
  const selected = options.find((o) => o.value === current) ?? options[0];
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const [pos, setPos] = useState<{ left: number; width: number; top?: number; bottom?: number; maxHeight: number } | null>(null);
  const btn = useRef<HTMLButtonElement>(null);
  const list = useRef<HTMLUListElement>(null);
  const listId = useId();

  const place = useCallback(() => {
    const r = btn.current?.getBoundingClientRect();
    if (!r) return;
    const below = window.innerHeight - r.bottom - 12;
    const above = r.top - 12;
    const up = below < 220 && above > below;
    // Largeur mini 180 px, sans jamais dépasser l'écran : on aligne sur le bord droit du champ si besoin.
    const vw = document.documentElement.clientWidth;
    const width = Math.min(Math.max(r.width, 180), vw - 16);
    let left = r.left;
    if (left + width > vw - 8) left = r.right - width; // déborde à droite → aligné sur le bord droit du champ
    left = Math.min(Math.max(8, left), vw - 8 - width);
    setPos({
      left,
      width,
      maxHeight: Math.min(288, up ? above : below),
      ...(up ? { bottom: window.innerHeight - r.top + 6 } : { top: r.bottom + 6 }),
    });
  }, []);

  function openList() {
    if (disabled) return;
    place();
    setActive(Math.max(0, options.findIndex((o) => o.value === selected?.value)));
    setOpen(true);
  }

  function choose(o: SelectOption | undefined) {
    if (!o || o.disabled) return;
    setOpen(false);
    btn.current?.focus();
    if (o.value !== current) {
      onChange?.({ target: { value: o.value, name }, currentTarget: { value: o.value, name } } as unknown as React.ChangeEvent<HTMLSelectElement>);
    }
  }

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!btn.current?.contains(e.target as Node) && !list.current?.contains(e.target as Node)) setOpen(false);
    };
    const onScroll = (e: Event) => {
      if (!list.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    window.addEventListener("scroll", onScroll, true);
    window.addEventListener("resize", place);
    return () => {
      document.removeEventListener("mousedown", onDown);
      window.removeEventListener("scroll", onScroll, true);
      window.removeEventListener("resize", place);
    };
  }, [open, place]);

  // Garder l'option active visible
  useEffect(() => {
    if (open) list.current?.querySelector<HTMLElement>(`[data-index="${active}"]`)?.scrollIntoView({ block: "nearest" });
  }, [open, active]);

  function move(d: number) {
    let i = active;
    for (let k = 0; k < options.length; k++) {
      i = (i + d + options.length) % options.length;
      if (!options[i]?.disabled) break;
    }
    setActive(i);
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (!open) {
      if (["ArrowDown", "ArrowUp", "Enter", " "].includes(e.key)) {
        e.preventDefault();
        openList();
      }
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      move(1);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      move(-1);
    } else if (e.key === "Home") {
      e.preventDefault();
      setActive(0);
    } else if (e.key === "End") {
      e.preventDefault();
      setActive(options.length - 1);
    } else if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      choose(options[active]);
    } else if (e.key === "Escape" || e.key === "Tab") {
      setOpen(false);
    } else if (e.key.length === 1) {
      const i = options.findIndex((o) => o.text.toLowerCase().startsWith(e.key.toLowerCase()));
      if (i >= 0) setActive(i);
    }
  }

  const rounded = className?.includes("rounded-") ? "" : "rounded-[var(--radius-input)]";

  return (
    <div className="relative">
      {icon && <span className="pointer-events-none absolute left-3.5 top-1/2 z-[1] -translate-y-1/2 text-muted [&>svg]:size-[18px]">{icon}</span>}
      <button
        ref={btn}
        id={id}
        type="button"
        disabled={disabled}
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listId : undefined}
        onClick={() => (open ? setOpen(false) : openList())}
        onKeyDown={onKeyDown}
        className={cn(
          "flex h-12 w-full items-center gap-2 border border-line bg-white text-left text-sm text-navy outline-none transition focus-visible:border-primary focus-visible:ring-4 focus-visible:ring-primary/10 disabled:cursor-not-allowed disabled:bg-page",
          open && "border-primary ring-4 ring-primary/10",
          rounded,
          icon ? "pl-11" : "pl-4",
          "pr-3",
          className,
        )}
      >
        <span className="min-w-0 flex-1 truncate">{selected?.label}</span>
        <ChevronDown className={cn("size-4 shrink-0 text-muted transition", open && "rotate-180 text-primary")} aria-hidden />
      </button>
      {name && <input type="hidden" name={name} value={current} />}
      {open && pos && (
        <ul
          ref={list}
          id={listId}
          role="listbox"
          aria-label={ariaLabel}
          className="fixed z-[70] overflow-y-auto rounded-2xl border border-line bg-white p-1.5 shadow-[0_16px_40px_rgba(15,40,90,0.16)]"
          style={{ left: pos.left, width: pos.width, top: pos.top, bottom: pos.bottom, maxHeight: pos.maxHeight }}
        >
          {options.map((o, i) => {
            const on = o.value === selected?.value;
            return (
              <li
                key={`${o.value}-${i}`}
                data-index={i}
                role="option"
                aria-selected={on}
                aria-disabled={o.disabled || undefined}
                onMouseEnter={() => setActive(i)}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => choose(o)}
                className={cn(
                  "flex cursor-pointer items-center gap-2 rounded-xl px-3 py-2.5 text-sm transition",
                  o.disabled ? "cursor-not-allowed opacity-40" : i === active ? "bg-page text-navy" : "text-body",
                  on && "font-bold text-primary",
                )}
              >
                <span className="min-w-0 flex-1 truncate">{o.label}</span>
                {on && <Check className="size-4 shrink-0 text-primary" aria-hidden />}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

export function Checkbox({ label, className, ...rest }: React.InputHTMLAttributes<HTMLInputElement> & { label: React.ReactNode }) {
  return (
    <label className={cn("flex cursor-pointer items-center gap-2.5 text-sm text-body", className)}>
      <input type="checkbox" className="size-4 rounded accent-[var(--color-primary)]" {...rest} />
      <span>{label}</span>
    </label>
  );
}

// ------------------------------------------------------------------ Card / Badge
export function Card({ className, children, ...rest }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("rounded-[var(--radius-card)] border border-line/70 bg-white shadow-[0_4px_24px_rgba(15,40,90,0.06)]", className)} {...rest}>
      {children}
    </div>
  );
}

export function CardHeader({ title, action, subtitle, icon }: { title: React.ReactNode; subtitle?: React.ReactNode; action?: React.ReactNode; icon?: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 px-6 pt-5 pb-3">
      <div className="flex items-center gap-3">
        {icon && <span className="grid size-10 place-items-center rounded-xl bg-primary-soft text-primary [&>svg]:size-5">{icon}</span>}
        <div>
          <h3 className="text-lg font-bold text-navy">{title}</h3>
          {subtitle && <p className="text-sm text-muted">{subtitle}</p>}
        </div>
      </div>
      {action}
    </div>
  );
}

const TONES: Record<Tone, string> = {
  blue: "bg-blue-50 text-blue-700",
  orange: "bg-amber-50 text-amber-700",
  green: "bg-emerald-50 text-emerald-700",
  red: "bg-red-50 text-red-600",
  grey: "bg-slate-100 text-slate-600",
  purple: "bg-violet-50 text-violet-700",
  teal: "bg-cyan-50 text-cyan-700",
};
const DOTS: Record<Tone, string> = {
  blue: "bg-blue-500",
  orange: "bg-amber-500",
  green: "bg-emerald-500",
  red: "bg-red-500",
  grey: "bg-slate-400",
  purple: "bg-violet-500",
  teal: "bg-cyan-500",
};

export function Badge({ tone = "grey", children, dot = true, className }: { tone?: Tone; children: React.ReactNode; dot?: boolean; className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold", TONES[tone], className)}>
      {dot && <span className={cn("size-1.5 rounded-full", DOTS[tone])} />}
      {children}
    </span>
  );
}

/** Badge à partir d'une table de méta (ex: REQUEST_STATUS[status]) */
export function MetaBadge({ meta }: { meta: { label: string; tone: Tone } | undefined }) {
  if (!meta) return null;
  return <Badge tone={meta.tone}>{meta.label}</Badge>;
}

// ------------------------------------------------------------------ Avatar / images
export function Avatar({ src, name, size = 40, className }: { src?: string | null; name?: string | null; size?: number; className?: string }) {
  return src ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt={name ?? ""} width={size} height={size} className={cn("shrink-0 rounded-full object-cover", className)} style={{ width: size, height: size }} />
  ) : (
    <span
      className={cn("grid shrink-0 place-items-center rounded-full bg-primary-soft font-bold text-primary", className)}
      style={{ width: size, height: size, fontSize: size * 0.38 }}
    >
      {initials(name)}
    </span>
  );
}

export function AnimalThumb({ src, alt, className }: { src?: string | null; alt?: string; className?: string }) {
  return src ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt={alt ?? ""} className={cn("object-cover", className)} />
  ) : (
    <div className={cn("grid place-items-center bg-gradient-to-br from-primary-soft to-white text-primary/50", className)}>
      <PawPrint className="size-1/3 max-h-12 max-w-12" />
    </div>
  );
}

// ------------------------------------------------------------------ Feedback
export function Spinner({ className }: { className?: string }) {
  return <Loader2 className={cn("size-6 animate-spin text-primary", className)} />;
}

export function PageLoader() {
  return (
    <div className="grid min-h-[40vh] place-items-center">
      <Spinner className="size-8" />
    </div>
  );
}

export function EmptyState({ icon, title, text, action }: { icon?: React.ReactNode; title: string; text?: string; action?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 px-6 py-14 text-center">
      <span className="grid size-16 place-items-center rounded-full bg-primary-soft text-primary [&>svg]:size-7">{icon ?? <PawPrint />}</span>
      <h4 className="text-base font-bold text-navy">{title}</h4>
      {text && <p className="max-w-sm text-sm text-muted">{text}</p>}
      {action}
    </div>
  );
}

export function Alert({ tone = "red", children }: { tone?: Tone; children: React.ReactNode }) {
  if (!children) return null;
  return <div className={cn("rounded-xl px-4 py-3 text-sm font-medium", TONES[tone])}>{children}</div>;
}

// ------------------------------------------------------------------ Modal
export function Modal({ open, onClose, title, children, footer, size = "md" }: { open: boolean; onClose: () => void; title: React.ReactNode; children: React.ReactNode; footer?: React.ReactNode; size?: "sm" | "md" | "lg" }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);
  if (!open) return null;
  const w = { sm: "max-w-md", md: "max-w-lg", lg: "max-w-3xl" }[size];
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-navy/40 p-4 backdrop-blur-sm" onClick={onClose}>
      <div className={cn("w-full rounded-[var(--radius-card)] bg-white shadow-2xl", w)} onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-line px-6 py-4">
          <h3 className="text-lg font-bold text-navy">{title}</h3>
          <button onClick={onClose} className="rounded-full p-1.5 text-muted hover:bg-page" aria-label="Fermer">
            <X className="size-5" />
          </button>
        </div>
        <div className="max-h-[70vh] overflow-y-auto px-6 py-5">{children}</div>
        {footer && <div className="flex justify-end gap-3 border-t border-line px-6 py-4">{footer}</div>}
      </div>
    </div>
  );
}

// ------------------------------------------------------------------ Tabs / Pagination
export function Tabs<T extends string>({ value, onChange, items }: { value: T; onChange: (v: T) => void; items: { value: T; label: React.ReactNode; count?: number; icon?: React.ReactNode }[] }) {
  return (
    <div className="flex gap-1 overflow-x-auto border-b border-line">
      {items.map((it) => (
        <button
          key={it.value}
          onClick={() => onChange(it.value)}
          className={cn(
            "flex shrink-0 items-center gap-2 border-b-2 px-4 py-3 text-sm font-semibold transition [&>svg]:size-4",
            value === it.value ? "border-primary bg-primary-soft/60 text-primary" : "border-transparent text-muted hover:text-navy",
          )}
        >
          {it.icon}
          {it.label}
          {it.count != null && <span className="text-xs opacity-80">({it.count})</span>}
        </button>
      ))}
    </div>
  );
}

export function Pagination({ page, pageCount, onChange }: { page: number; pageCount: number; onChange: (p: number) => void }) {
  if (pageCount <= 1) return null;
  const pages: (number | "…")[] = [];
  for (let i = 1; i <= pageCount; i++) {
    if (i === 1 || i === pageCount || Math.abs(i - page) <= 1) pages.push(i);
    else if (pages[pages.length - 1] !== "…") pages.push("…");
  }
  const btn = "grid size-9 place-items-center rounded-[10px] text-sm font-semibold transition";
  return (
    <div className="flex items-center gap-1.5">
      <button className={cn(btn, "border border-line text-muted hover:text-primary disabled:opacity-40")} disabled={page <= 1} onClick={() => onChange(page - 1)} aria-label="Précédent">
        <ChevronLeft className="size-4" />
      </button>
      {pages.map((p, i) =>
        p === "…" ? (
          <span key={`e${i}`} className="px-1 text-muted">…</span>
        ) : (
          <button key={p} onClick={() => onChange(p)} className={cn(btn, p === page ? "bg-primary text-white" : "text-body hover:bg-primary-soft")}>
            {p}
          </button>
        ),
      )}
      <button className={cn(btn, "border border-line text-muted hover:text-primary disabled:opacity-40")} disabled={page >= pageCount} onClick={() => onChange(page + 1)} aria-label="Suivant">
        <ChevronRight className="size-4" />
      </button>
    </div>
  );
}

// ------------------------------------------------------------------ Toasts
type Toast = { id: number; text: string; tone: "success" | "error" | "info" };
const ToastCtx = createContext<(text: string, tone?: Toast["tone"]) => void>(() => {});

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const push = useCallback((text: string, tone: Toast["tone"] = "success") => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t, { id, text, tone }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3500);
  }, []);
  return (
    <ToastCtx.Provider value={push}>
      {children}
      <div className="fixed bottom-24 right-4 z-[60] flex flex-col gap-2 lg:bottom-5 lg:right-5">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={cn(
              "rounded-xl px-4 py-3 text-sm font-semibold text-white shadow-lg",
              t.tone === "success" && "bg-emerald-600",
              t.tone === "error" && "bg-red-600",
              t.tone === "info" && "bg-navy",
            )}
          >
            {t.text}
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  );
}

export const useToast = () => useContext(ToastCtx);

// ------------------------------------------------------------------ KPI
/** Carte chiffre clé ; avec `href`, toute la carte est un lien. Icône au-dessus du chiffre sur mobile. */
export function KpiCard({ icon, value, label, tone = "blue", foot, href }: { icon: React.ReactNode; value: React.ReactNode; label: string; tone?: Tone; foot?: React.ReactNode; href?: string }) {
  const body = (
    <>
      <span className={cn("grid size-11 shrink-0 place-items-center rounded-xl [&>svg]:size-5 sm:size-14 sm:rounded-2xl sm:[&>svg]:size-6", TONES[tone])}>{icon}</span>
      <div className="min-w-0">
        <div className="text-2xl font-extrabold leading-none text-navy sm:text-3xl">{value}</div>
        <div className="mt-1 text-[13px] font-medium leading-snug text-body sm:text-sm">{label}</div>
        {foot && <div className="mt-1 text-xs text-muted">{foot}</div>}
      </div>
      {href && <ChevronRight className="absolute right-3 top-3 size-4 text-muted transition group-hover:translate-x-0.5 group-hover:text-primary sm:top-1/2 sm:-translate-y-1/2 sm:group-hover:-translate-y-1/2" />}
    </>
  );
  const layout = "relative flex min-w-0 flex-col items-start gap-3 p-4 sm:flex-row sm:items-center sm:gap-4 sm:p-5";
  if (!href) return <Card className={layout}>{body}</Card>;
  return (
    <Link
      href={href}
      aria-label={`${label} : ${value}`}
      className={cn(
        layout,
        "group rounded-[var(--radius-card)] border border-line/70 bg-white shadow-[0_4px_24px_rgba(15,40,90,0.06)] transition hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-[0_10px_30px_rgba(15,40,90,0.10)] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/20 sm:pr-9",
      )}
    >
      {body}
    </Link>
  );
}
