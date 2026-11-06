"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { ArrowLeft, MessageCircle, Search, Send } from "lucide-react";
import { PageHeader } from "@/components/espace/EspaceShell";
import { Alert, AnimalThumb, Avatar, Card, cn, EmptyState, PageLoader, Spinner, useToast } from "@/components/ui";
import { useAuth } from "@/hooks/useAuth";
import { unwrap, useQuery } from "@/hooks/useQuery";
import { emitUnreadChange } from "@/hooks/useUnread";
import { formatDate, formatTime, timeAgo } from "@/lib/labels";
import { errorMessage, getSupabase } from "@/lib/supabase";
import type { Conversation, Message } from "@/lib/types";

const CONV_SELECT =
  "*, animal:animals!conversations_animal_id_fkey(id,name,cover_url), a:profiles!conversations_participant_a_fkey(*), b:profiles!conversations_participant_b_fkey(*)";

export function MessagesView() {
  const { user } = useAuth();
  const uid = user?.id;
  const sp = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const toast = useToast();
  const selected = sp.get("c");
  const [filter, setFilter] = useState("");
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const bottom = useRef<HTMLDivElement>(null);
  const selectedRef = useRef<string | null>(selected);

  const convs = useQuery(
    async () => {
      const supabase = getSupabase();
      const [c, unread] = await Promise.all([
        supabase.from("conversations").select(CONV_SELECT).order("last_message_at", { ascending: false }),
        supabase.from("messages").select("conversation_id").neq("sender_id", uid!).is("read_at", null),
      ]);
      const counts: Record<string, number> = {};
      (unread.data ?? []).forEach((m: { conversation_id: string }) => {
        counts[m.conversation_id] = (counts[m.conversation_id] ?? 0) + 1;
      });
      return { list: unwrap<Conversation[]>(c), unread: counts };
    },
    [uid],
    !!uid,
  );

  const thread = useQuery(
    async () => {
      if (!selected) return [] as Message[];
      const supabase = getSupabase();
      const rows = unwrap<Message[]>(await supabase.from("messages").select("*").eq("conversation_id", selected).order("created_at", { ascending: true }).limit(500));
      // Marquer comme lus les messages reçus
      if (rows.some((m) => m.sender_id !== uid && !m.read_at)) {
        await supabase.from("messages").update({ read_at: new Date().toISOString() }).eq("conversation_id", selected).neq("sender_id", uid!).is("read_at", null);
        emitUnreadChange("messages");
      }
      return rows;
    },
    [selected, uid],
    !!uid,
  );

  const { setData: setConvs, reload: reloadConvs } = convs;
  const { setData: setThread } = thread;
  const convIds = useRef<Set<string>>(new Set());

  // Références pour le callback temps réel
  useEffect(() => {
    selectedRef.current = selected;
  }, [selected]);
  useEffect(() => {
    convIds.current = new Set((convs.data?.list ?? []).map((c) => c.id));
  }, [convs.data]);

  // Temps réel : nouveaux messages
  useEffect(() => {
    if (!uid) return;
    const supabase = getSupabase();
    const channel = supabase
      .channel(`messages-${uid}-${Math.random().toString(36).slice(2)}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages" }, (payload) => {
        const m = payload.new as Message;
        const isOpen = selectedRef.current === m.conversation_id;
        if (isOpen) {
          setThread((t) => (t && !t.some((x) => x.id === m.id) ? [...t, m] : t));
          if (m.sender_id !== uid) {
            void supabase
              .from("messages")
              .update({ read_at: new Date().toISOString() })
              .eq("id", m.id)
              .then(() => emitUnreadChange("messages"));
          }
        }
        if (!convIds.current.has(m.conversation_id)) {
          reloadConvs();
          return;
        }
        setConvs((d) => {
          if (!d) return d;
          const list = d.list
            .map((c) => (c.id === m.conversation_id ? { ...c, last_message: m.body.slice(0, 200), last_message_at: m.created_at } : c))
            .sort((x, y) => y.last_message_at.localeCompare(x.last_message_at));
          const unread = !isOpen && m.sender_id !== uid ? { ...d.unread, [m.conversation_id]: (d.unread[m.conversation_id] ?? 0) + 1 } : d.unread;
          return { list, unread };
        });
      })
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [uid, setThread, setConvs, reloadConvs]);

  // Défilement en bas du fil
  const threadLen = thread.data?.length ?? 0;
  useEffect(() => {
    bottom.current?.scrollIntoView({ block: "end" });
  }, [threadLen, selected]);

  if (convs.loading && !convs.data) return <PageLoader />;

  const list = convs.data?.list ?? [];
  const other = (c: Conversation) => (c.participant_a === uid ? c.b : c.a);
  const term = filter.trim().toLowerCase();
  const visible = term
    ? list.filter((c) => (other(c)?.full_name ?? "").toLowerCase().includes(term) || (c.animal?.name ?? "").toLowerCase().includes(term))
    : list;
  const current = list.find((c) => c.id === selected) ?? null;
  const select = (id: string | null) => router.replace(id ? `${pathname}?c=${id}` : pathname, { scroll: false });

  async function send(e: React.FormEvent) {
    e.preventDefault();
    const body = draft.trim();
    if (!body || !selected || !uid) return;
    setSending(true);
    try {
      const { data, error } = await getSupabase().from("messages").insert({ conversation_id: selected, sender_id: uid, body }).select("*").single();
      if (error) throw error;
      const m = data as Message;
      setThread((t) => (t && !t.some((x) => x.id === m.id) ? [...t, m] : t));
      setConvs((d) =>
        d
          ? {
              ...d,
              list: d.list
                .map((c) => (c.id === m.conversation_id ? { ...c, last_message: m.body.slice(0, 200), last_message_at: m.created_at } : c))
                .sort((x, y) => y.last_message_at.localeCompare(x.last_message_at)),
            }
          : d,
      );
      setDraft("");
    } catch (err) {
      toast(errorMessage(err), "error");
    } finally {
      setSending(false);
    }
  }

  return (
    <div>
      <div className={cn(selected && "hidden lg:block")}>
        <PageHeader title="Messages" subtitle="Échangez en toute sécurité avec les propriétaires et les adoptants." />
      </div>
      {convs.error && <Alert>{convs.error}</Alert>}

      <Card className="grid h-[calc(100vh-15rem)] min-h-[480px] overflow-hidden lg:grid-cols-[320px_1fr]">
        {/* Liste */}
        <div className={cn("flex min-h-0 flex-col border-line lg:border-r", selected && "hidden lg:flex")}>
          <div className="border-b border-line p-3">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" />
              <input
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                placeholder="Rechercher une conversation"
                className="h-10 w-full rounded-full border border-line bg-page/50 pl-9 pr-3 text-sm outline-none focus:border-primary"
              />
            </div>
          </div>
          <ul className="min-h-0 flex-1 overflow-y-auto">
            {visible.length === 0 && (
              <li>
                <EmptyState icon={<MessageCircle />} title="Aucune conversation" text="Contactez un propriétaire depuis une annonce pour démarrer une discussion." />
              </li>
            )}
            {visible.map((c) => {
              const o = other(c);
              const n = c.id === selected ? 0 : (convs.data?.unread[c.id] ?? 0);
              return (
                <li key={c.id}>
                  <button
                    onClick={() => select(c.id)}
                    className={cn("flex w-full items-center gap-3 border-b border-line/60 px-4 py-3 text-left transition", c.id === selected ? "bg-primary-soft/70" : "hover:bg-page")}
                  >
                    <div className="relative">
                      <Avatar src={o?.avatar_url} name={o?.full_name} size={46} />
                      {c.animal && <AnimalThumb src={c.animal.cover_url} className="absolute -bottom-1 -right-1 size-6 rounded-full ring-2 ring-white" />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className={cn("truncate text-sm text-navy", n ? "font-extrabold" : "font-bold")}>{o?.full_name || "Utilisateur"}</span>
                        <span className="shrink-0 text-[11px] text-muted">{timeAgo(c.last_message_at)}</span>
                      </div>
                      {c.animal && <p className="truncate text-xs font-semibold text-primary">{c.animal.name}</p>}
                      <div className="flex items-center gap-2">
                        <p className={cn("flex-1 truncate text-xs", n ? "font-semibold text-navy" : "text-muted")}>{c.last_message || "Nouvelle conversation"}</p>
                        {n > 0 && <span className="grid min-w-5 place-items-center rounded-full bg-primary px-1.5 text-[10px] font-bold leading-5 text-white">{n}</span>}
                      </div>
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>

        {/* Fil */}
        <div className={cn("flex min-h-0 flex-col", !selected && "hidden lg:flex")}>
          {!selected || !current ? (
            <div className="grid flex-1 place-items-center">
              {selected && !current ? (
                <EmptyState title="Conversation introuvable" action={<button onClick={() => select(null)} className="text-sm font-bold text-primary">Retour</button>} />
              ) : (
                <EmptyState icon={<MessageCircle />} title="Sélectionnez une conversation" text="Vos échanges apparaîtront ici." />
              )}
            </div>
          ) : (
            <>
              <div className="flex items-center gap-3 border-b border-line px-4 py-3">
                <button onClick={() => select(null)} className="grid size-9 place-items-center rounded-full text-navy hover:bg-page lg:hidden" aria-label="Retour">
                  <ArrowLeft className="size-5" />
                </button>
                <Avatar src={other(current)?.avatar_url} name={other(current)?.full_name} size={40} />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-bold text-navy">{other(current)?.full_name || "Utilisateur"}</p>
                  {current.animal && (
                    <Link href={`/animaux/${current.animal.id}`} className="truncate text-xs font-semibold text-primary hover:underline">
                      À propos de : {current.animal.name}
                    </Link>
                  )}
                </div>
                {current.animal && <AnimalThumb src={current.animal.cover_url} alt={current.animal.name} className="size-10 rounded-lg" />}
              </div>
              <div className="min-h-0 flex-1 space-y-2 overflow-y-auto bg-page/40 px-4 py-4">
                {thread.loading && !thread.data ? (
                  <div className="grid h-full place-items-center">
                    <Spinner />
                  </div>
                ) : (thread.data ?? []).length === 0 ? (
                  <p className="py-10 text-center text-sm text-muted">Aucun message. Présentez-vous et posez vos questions !</p>
                ) : (
                  (thread.data ?? []).map((m, i, arr) => {
                    const mine = m.sender_id === uid;
                    const newDay = i === 0 || formatDate(arr[i - 1]!.created_at) !== formatDate(m.created_at);
                    return (
                      <div key={m.id}>
                        {newDay && <p className="my-3 text-center text-[11px] font-semibold uppercase tracking-wide text-muted">{formatDate(m.created_at)}</p>}
                        <div className={cn("flex", mine ? "justify-end" : "justify-start")}>
                          <div
                            className={cn(
                              "max-w-[80%] rounded-2xl px-4 py-2.5 text-sm shadow-sm",
                              mine ? "rounded-br-md bg-gradient-to-b from-primary to-primary-dark text-white" : "rounded-bl-md bg-white text-navy",
                            )}
                          >
                            <p className="whitespace-pre-line break-words">{m.body}</p>
                            <p className={cn("mt-1 text-right text-[10px]", mine ? "text-white/70" : "text-muted")}>
                              {formatTime(m.created_at)}
                              {mine && m.read_at ? " · Lu" : ""}
                            </p>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={bottom} />
              </div>
              <form onSubmit={send} className="flex items-end gap-2 border-t border-line p-3">
                <textarea
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      e.currentTarget.form?.requestSubmit();
                    }
                  }}
                  rows={1}
                  maxLength={2000}
                  placeholder="Écrire un message…"
                  className="max-h-32 min-h-11 flex-1 resize-none rounded-2xl border border-line bg-white px-4 py-2.5 text-sm text-navy outline-none focus:border-primary focus:ring-4 focus:ring-primary/10"
                />
                <button
                  type="submit"
                  disabled={sending || !draft.trim()}
                  className="grid size-11 shrink-0 place-items-center rounded-full bg-gradient-to-b from-primary to-primary-dark text-white disabled:opacity-50"
                  aria-label="Envoyer"
                >
                  {sending ? <Spinner className="size-5 text-white" /> : <Send className="size-5" />}
                </button>
              </form>
            </>
          )}
        </div>
      </Card>
    </div>
  );
}
