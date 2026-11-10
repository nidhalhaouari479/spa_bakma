"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Bell, BellRing, CheckCheck, ClipboardCheck, MessageCircle, Stethoscope, Trash2 } from "lucide-react";
import { PageHeader } from "@/components/espace/EspaceShell";
import { Alert, Button, Card, cn, EmptyState, PageLoader, Tabs, useToast } from "@/components/ui";
import { useAuth } from "@/hooks/useAuth";
import { unwrap, useQuery } from "@/hooks/useQuery";
import { emitUnreadChange } from "@/hooks/useUnread";
import { formatDateTime, timeAgo } from "@/lib/labels";
import { errorMessage, getSupabase } from "@/lib/supabase";
import type { Notification } from "@/lib/types";

const TYPE_ICON: Record<string, typeof Bell> = { demande: ClipboardCheck, consultation: Stethoscope, message: MessageCircle };

export default function NotificationsPage() {
  const { user } = useAuth();
  const uid = user?.id;
  const router = useRouter();
  const toast = useToast();
  const [tab, setTab] = useState<"all" | "unread">("all");

  const notifs = useQuery(
    async () => unwrap<Notification[]>(await getSupabase().from("notifications").select("*").eq("user_id", uid!).order("created_at", { ascending: false }).limit(200)),
    [uid],
    !!uid,
  );
  const { setData } = notifs;

  if (notifs.loading && !notifs.data) return <PageLoader />;
  const all = notifs.data ?? [];
  const unreadCount = all.filter((n) => !n.read_at).length;
  const list = tab === "unread" ? all.filter((n) => !n.read_at) : all;

  async function markRead(ids: string[]) {
    if (!ids.length) return;
    const now = new Date().toISOString();
    setData((d) => d?.map((n) => (ids.includes(n.id) ? { ...n, read_at: n.read_at ?? now } : n)) ?? d);
    const { error } = await getSupabase().from("notifications").update({ read_at: now }).in("id", ids);
    if (error) toast(errorMessage(error), "error");
    emitUnreadChange("notifications");
  }

  async function remove(id: string) {
    setData((d) => d?.filter((n) => n.id !== id) ?? d);
    const { error } = await getSupabase().from("notifications").delete().eq("id", id);
    if (error) {
      toast(errorMessage(error), "error");
      notifs.reload();
    }
    emitUnreadChange("notifications");
  }

  async function open(n: Notification) {
    if (!n.read_at) await markRead([n.id]);
    if (n.link?.startsWith("/")) router.push(n.link);
  }

  return (
    <div>
      <PageHeader
        title="Notifications"
        subtitle={unreadCount ? `${unreadCount} notification${unreadCount > 1 ? "s" : ""} non lue${unreadCount > 1 ? "s" : ""}` : "Vous êtes à jour."}
        action={
          unreadCount > 0 && (
            <Button variant="outline" icon={<CheckCheck className="size-4" />} onClick={() => markRead(all.filter((n) => !n.read_at).map((n) => n.id))}>
              Tout marquer comme lu
            </Button>
          )
        }
      />
      {notifs.error && <Alert>{notifs.error}</Alert>}
      <Card className="overflow-hidden">
        <Tabs
          value={tab}
          onChange={setTab}
          items={[
            { value: "all", label: "Toutes", count: all.length },
            { value: "unread", label: "Non lues", count: unreadCount },
          ]}
        />
        {list.length === 0 ? (
          <EmptyState icon={<Bell />} title="Aucune notification" text="Vous serez notifié à chaque étape de vos demandes de publication." />
        ) : (
          <ul className="divide-y divide-line/70">
            {list.map((n) => {
              const Icon = TYPE_ICON[n.type] ?? BellRing;
              return (
                <li key={n.id} className={cn("group flex items-start gap-3 px-4 py-4 sm:px-6", !n.read_at && "bg-primary-soft/30")}>
                  <span className={cn("grid size-10 shrink-0 place-items-center rounded-full", n.read_at ? "bg-page text-muted" : "bg-primary-soft text-primary")}>
                    <Icon className="size-5" />
                  </span>
                  <button onClick={() => open(n)} className="min-w-0 flex-1 text-left">
                    <p className={cn("text-sm text-navy", n.read_at ? "font-semibold" : "font-extrabold")}>{n.title}</p>
                    {n.body && <p className="mt-0.5 text-sm text-body">{n.body}</p>}
                    <p className="mt-1 text-xs text-muted" title={formatDateTime(n.created_at)}>
                      {timeAgo(n.created_at)}
                    </p>
                  </button>
                  <div className="flex shrink-0 items-center gap-1">
                    {!n.read_at && (
                      <button onClick={() => markRead([n.id])} className="grid size-9 place-items-center rounded-full text-primary hover:bg-primary-soft" aria-label="Marquer comme lu" title="Marquer comme lu">
                        <CheckCheck className="size-4" />
                      </button>
                    )}
                    <button onClick={() => remove(n.id)} className="grid size-9 place-items-center rounded-full text-muted hover:bg-red-50 hover:text-red-600" aria-label="Supprimer" title="Supprimer">
                      <Trash2 className="size-4" />
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </Card>
    </div>
  );
}
