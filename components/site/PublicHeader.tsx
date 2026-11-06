"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Bell, ChevronDown, FileText, LayoutDashboard, LogOut, MessageCircle, Search, User, UserRound } from "lucide-react";
import { Logo } from "@/components/Logo";
import { Avatar, Button, cn } from "@/components/ui";
import { useAuth } from "@/hooks/useAuth";
import { useUnreadNotifications } from "@/hooks/useUnread";
import { ROLE_LABEL } from "@/lib/labels";

export const NAV_LINKS = [
  { href: "/", label: "Accueil" },
  { href: "/animaux", label: "Animaux" },
  { href: "/comment-ca-marche", label: "Comment ça marche" },
  { href: "/a-propos", label: "À propos" },
];

function isActive(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);
}

function HeaderSearch({ className, autoFocus, onDone }: { className?: string; autoFocus?: boolean; onDone?: () => void }) {
  const router = useRouter();
  const [q, setQ] = useState("");
  return (
    <form
      role="search"
      className={cn("relative", className)}
      onSubmit={(e) => {
        e.preventDefault();
        const term = q.trim();
        router.push(term ? `/animaux?q=${encodeURIComponent(term)}` : "/animaux");
        onDone?.();
      }}
    >
      <Search className="pointer-events-none absolute left-3.5 top-1/2 size-[18px] -translate-y-1/2 text-navy" />
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        autoFocus={autoFocus}
        placeholder="Rechercher un animal…"
        aria-label="Rechercher un animal"
        className="h-11 w-full rounded-full border border-line bg-white pl-11 pr-4 text-sm text-navy outline-none transition placeholder:text-muted focus:border-primary focus:ring-4 focus:ring-primary/10"
      />
    </form>
  );
}

function UserMenu() {
  const { profile, user, signOut } = useAuth();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  const name = profile?.full_name || user?.email || "Mon compte";
  const items = [
    { href: "/espace", label: "Mon espace", icon: LayoutDashboard },
    { href: "/espace/annonces", label: "Mes annonces", icon: FileText },
    { href: "/espace/messages", label: "Messages", icon: MessageCircle },
    { href: "/espace/profil", label: "Mon profil", icon: UserRound },
  ];

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2.5 rounded-full p-1 pr-2 transition hover:bg-primary-soft"
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <Avatar src={profile?.avatar_url} name={name} size={38} />
        <span className="hidden text-left leading-tight xl:block">
          <span className="block max-w-36 truncate text-sm font-bold text-navy">{name}</span>
          <span className="block text-xs text-muted">{profile ? ROLE_LABEL[profile.role] : ""}</span>
        </span>
        <ChevronDown className="hidden size-4 text-muted sm:block" />
      </button>
      {open && (
        <div role="menu" className="absolute right-0 top-full z-50 mt-2 w-60 overflow-hidden rounded-2xl border border-line bg-white py-2 shadow-xl">
          <div className="border-b border-line px-4 pb-2.5 pt-1">
            <p className="truncate text-sm font-bold text-navy">{name}</p>
            <p className="truncate text-xs text-muted">{user?.email}</p>
          </div>
          {items.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              role="menuitem"
              onClick={() => setOpen(false)}
              className="flex items-center gap-3 px-4 py-2.5 text-sm font-semibold text-body hover:bg-primary-soft hover:text-primary"
            >
              <Icon className="size-4" />
              {label}
            </Link>
          ))}
          <button
            role="menuitem"
            onClick={async () => {
              setOpen(false);
              await signOut();
              router.push("/");
            }}
            className="flex w-full items-center gap-3 border-t border-line px-4 py-2.5 text-sm font-semibold text-red-600 hover:bg-red-50"
          >
            <LogOut className="size-4" />
            Déconnexion
          </button>
        </div>
      )}
    </div>
  );
}

function NotificationBell() {
  const { user } = useAuth();
  const count = useUnreadNotifications(user?.id);
  return (
    <Link
      href="/espace/notifications"
      className="relative grid size-10 place-items-center rounded-full text-navy transition hover:bg-primary-soft hover:text-primary"
      aria-label={`Notifications${count ? ` (${count} non lues)` : ""}`}
    >
      <Bell className="size-[22px]" />
      {count > 0 && (
        <span className="absolute -right-0.5 -top-0.5 grid min-w-5 place-items-center rounded-full bg-red-500 px-1 text-[11px] font-bold leading-5 text-white ring-2 ring-white">
          {count > 99 ? "99+" : count}
        </span>
      )}
    </Link>
  );
}

export function PublicHeader() {
  const pathname = usePathname() || "/";
  const { loading, user } = useAuth();
  const [searchOpen, setSearchOpen] = useState(false);
  const [lastPath, setLastPath] = useState(pathname);

  // Ferme la recherche mobile à chaque navigation
  if (lastPath !== pathname) {
    setLastPath(pathname);
    setSearchOpen(false);
  }

  return (
    <header className="sticky top-0 z-40 border-b border-line/70 bg-white/95 backdrop-blur">
      <div className="mx-auto flex h-[72px] max-w-7xl items-center gap-3 px-4 sm:px-6 lg:h-20 lg:gap-6">
        <Logo height={44} className="shrink-0" />

        <nav className="ml-4 hidden items-center gap-7 lg:flex" aria-label="Navigation principale">
          {NAV_LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className={cn(
                "relative py-2 text-[15px] font-semibold transition hover:text-primary",
                isActive(pathname, l.href) ? "text-primary after:absolute after:inset-x-0 after:-bottom-0.5 after:h-0.5 after:rounded-full after:bg-primary" : "text-navy",
              )}
            >
              {l.label}
            </Link>
          ))}
        </nav>

        <div className="ml-auto hidden items-center gap-3 lg:flex">
          <HeaderSearch className="w-52 xl:w-60" />
          {loading ? (
            <span className="h-10 w-40 animate-pulse rounded-full bg-line/60" />
          ) : user ? (
            <>
              <NotificationBell />
              <UserMenu />
            </>
          ) : (
            <>
              <Button href="/connexion" variant="outline" icon={<User className="size-4" />}>
                Se connecter
              </Button>
              <Button href="/inscription">S&apos;inscrire</Button>
            </>
          )}
        </div>

        {/* Mobile : recherche + notifications (navigation dans la barre du bas) */}
        <div className="ml-auto flex items-center gap-1 lg:hidden">
          <button
            className="grid size-10 place-items-center rounded-full bg-primary-soft/70 text-navy"
            onClick={() => setSearchOpen((o) => !o)}
            aria-label="Rechercher"
          >
            <Search className="size-5" />
          </button>
          {user && <NotificationBell />}
        </div>
      </div>

      {searchOpen && (
        <div className="border-t border-line px-4 py-3 lg:hidden">
          <HeaderSearch autoFocus onDone={() => setSearchOpen(false)} />
        </div>
      )}
    </header>
  );
}

export function HeaderFallback() {
  return (
    <header className="sticky top-0 z-40 border-b border-line/70 bg-white/95">
      <div className="mx-auto flex h-[72px] max-w-7xl items-center px-4 sm:px-6 lg:h-20">
        <Logo height={44} />
      </div>
    </header>
  );
}
