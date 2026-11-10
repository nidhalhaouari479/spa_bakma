"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { Bell, FileText, Heart, LayoutDashboard, LogOut, MessageCircle, Package, PlusCircle, ShoppingBag, UserRound } from "lucide-react";
import { Avatar, cn, PageLoader } from "@/components/ui";
import { useAuth } from "@/hooks/useAuth";
import { useUnreadMessages, useUnreadNotifications } from "@/hooks/useUnread";
import { ROLE_LABEL } from "@/lib/labels";

/** Rubriques de l'espace client (barre latérale desktop + menu mobile du tableau de bord). */
export const ESPACE_NAV = [
  { href: "/espace", label: "Tableau de bord", icon: LayoutDashboard, exact: true },
  { href: "/espace/annonces", label: "Mes annonces", icon: FileText },
  { href: "/espace/annonces/nouvelle", label: "Publier un animal", icon: PlusCircle, exact: true },
  { href: "/espace/achats", label: "Achats & ventes", icon: ShoppingBag },
  { href: "/espace/commandes", label: "Mes commandes", icon: Package },
  { href: "/espace/favoris", label: "Mes favoris", icon: Heart },
  { href: "/espace/messages", label: "Messages", icon: MessageCircle, badge: "messages" as const },
  { href: "/espace/notifications", label: "Notifications", icon: Bell, badge: "notifications" as const },
  { href: "/espace/profil", label: "Mon profil", icon: UserRound },
];


function isActive(pathname: string, href: string, exact?: boolean) {
  if (exact) return pathname === href;
  if (href === "/espace/annonces") return pathname.startsWith(href) && pathname !== "/espace/annonces/nouvelle";
  return pathname === href || pathname.startsWith(`${href}/`);
}

/** Garde d'authentification + navigation de l'espace client. */
export function EspaceShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() || "/espace";
  const router = useRouter();
  const { loading, user, profile, signOut } = useAuth();
  const unreadMsg = useUnreadMessages(user?.id);
  const unreadNotif = useUnreadNotifications(user?.id);

  useEffect(() => {
    if (!loading && !user) {
      router.replace(`/connexion?next=${encodeURIComponent(window.location.pathname + window.location.search)}`);
    }
  }, [loading, user, router]);

  if (loading || !user) return <PageLoader />;

  const badges = { messages: unreadMsg, notifications: unreadNotif };

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-1 gap-6 px-4 pb-28 pt-6 sm:px-6 lg:pb-12">
      {/* Sidebar desktop */}
      <aside className="hidden w-64 shrink-0 lg:block">
        <div className="sticky top-24 space-y-4">
          <div className="flex items-center gap-3 rounded-[var(--radius-card)] bg-white p-4 shadow-[0_4px_24px_rgba(15,40,90,0.06)]">
            <Avatar src={profile?.avatar_url} name={profile?.full_name || user.email} size={46} />
            <div className="min-w-0">
              <p className="truncate font-extrabold text-navy">{profile?.full_name || user.email}</p>
              <p className="text-xs text-muted">{profile ? ROLE_LABEL[profile.role] : "Particulier"}</p>
            </div>
          </div>
          <nav className="rounded-[var(--radius-card)] bg-white p-2.5 shadow-[0_4px_24px_rgba(15,40,90,0.06)]" aria-label="Espace client">
            {ESPACE_NAV.map(({ href, label, icon: Icon, exact, badge }) => {
              const active = isActive(pathname, href, exact);
              const count = badge ? badges[badge] : 0;
              return (
                <Link
                  key={href}
                  href={href}
                  className={cn(
                    "flex items-center gap-3 rounded-xl px-3.5 py-3 text-[15px] font-semibold transition",
                    active ? "bg-primary-soft text-primary" : "text-body hover:bg-page hover:text-navy",
                  )}
                >
                  <Icon className="size-5" />
                  <span className="flex-1">{label}</span>
                  {count > 0 && <span className="grid min-w-6 place-items-center rounded-full bg-red-500 px-1.5 text-xs font-bold leading-6 text-white">{count}</span>}
                </Link>
              );
            })}
            <button
              onClick={async () => {
                await signOut();
                router.push("/");
              }}
              className="mt-2 flex w-full items-center gap-3 rounded-xl border-t border-line px-3.5 py-3 text-[15px] font-semibold text-primary hover:bg-page"
            >
              <LogOut className="size-5" /> Se déconnecter
            </button>
          </nav>
        </div>
      </aside>

      <div className="min-w-0 flex-1">{children}</div>

    </div>
  );
}

/** En-tête de page de l'espace client. */
export function PageHeader({ title, subtitle, action, eyebrow }: { title: React.ReactNode; subtitle?: React.ReactNode; action?: React.ReactNode; eyebrow?: string }) {
  return (
    <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        {eyebrow && <p className="text-sm font-semibold text-body">{eyebrow}</p>}
        <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">{title}</h1>
        {subtitle && <p className="mt-1 text-body">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}
