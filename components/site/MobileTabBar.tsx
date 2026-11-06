"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CircleHelp, House, LayoutDashboard, MessageCircle, PawPrint, PlusCircle, User } from "lucide-react";
import { cn } from "@/components/ui";
import { useAuth } from "@/hooks/useAuth";
import { useUnreadMessages } from "@/hooks/useUnread";

type Tab = { href: string; label: string; icon: typeof House; active: (p: string) => boolean; center?: boolean; badge?: number };

/** Barre d'onglets du bas (mobile) : seule navigation sur petit écran, site public et espace client. */
export function MobileTabBar() {
  const pathname = usePathname() || "/";
  const { loading, user } = useAuth();
  const unread = useUnreadMessages(user?.id);

  const publish: Tab = { href: "/espace/annonces/nouvelle", label: "Publier", icon: PlusCircle, active: (p) => p === "/espace/annonces/nouvelle" };
  const animals: Tab = { href: "/animaux", label: "Animaux", icon: PawPrint, active: (p) => p.startsWith("/animaux") };
  const home: Tab = { href: "/", label: "Accueil", icon: House, active: (p) => p === "/", center: true };
  const tabs: Tab[] = user
    ? [
        publish,
        animals,
        home,
        { href: "/espace/messages", label: "Messages", icon: MessageCircle, active: (p) => p.startsWith("/espace/messages"), badge: unread },
        {
          href: "/espace",
          label: "Mon espace",
          icon: LayoutDashboard,
          active: (p) => p.startsWith("/espace") && !p.startsWith("/espace/messages") && p !== "/espace/annonces/nouvelle",
        },
      ]
    : [
        publish,
        animals,
        home,
        { href: "/comment-ca-marche", label: "Infos", icon: CircleHelp, active: (p) => p === "/comment-ca-marche" || p === "/a-propos" },
        { href: "/connexion", label: "Connexion", icon: User, active: (p) => ["/connexion", "/inscription", "/mot-de-passe-oublie"].includes(p) },
      ];

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-5 border-t border-line bg-white/95 pb-[env(safe-area-inset-bottom)] shadow-[0_-4px_20px_rgba(15,40,90,0.06)] backdrop-blur lg:hidden"
      aria-label="Navigation mobile"
    >
      {tabs.map(({ href, label, icon: Icon, active, center, badge }) => {
        const on = active(pathname);
        return (
          <Link
            key={href}
            href={href}
            aria-current={on ? "page" : undefined}
            className={cn("relative flex flex-col items-center gap-1 py-2.5 text-[11px] font-semibold", on ? "text-primary" : "text-muted", loading && !center && "opacity-60")}
          >
            {center ? (
              <span className="-mt-6 grid size-12 place-items-center rounded-full bg-gradient-to-b from-primary to-primary-dark text-white shadow-lg ring-4 ring-white">
                <Icon className="size-6" />
              </span>
            ) : (
              <Icon className="size-[22px]" />
            )}
            {label}
            {!!badge && (
              <span className="absolute right-[calc(50%-20px)] top-1.5 grid min-w-[18px] place-items-center rounded-full bg-red-500 px-1 text-[10px] font-bold leading-[18px] text-white">
                {badge > 99 ? "99+" : badge}
              </span>
            )}
          </Link>
        );
      })}
    </nav>
  );
}
