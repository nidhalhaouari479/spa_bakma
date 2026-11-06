"use client";

import { useEffect, useState } from "react";
import { getSupabase } from "@/lib/supabase";

/** Nombre de notifications non lues (temps réel). */
export function useUnreadNotifications(userId: string | undefined) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!userId) return;
    const supabase = getSupabase();
    let active = true;
    const load = async () => {
      const { count: c } = await supabase
        .from("notifications")
        .select("id", { count: "exact", head: true })
        .eq("user_id", userId)
        .is("read_at", null);
      if (active) setCount(c ?? 0);
    };
    void load();
    const channel = supabase
      .channel(`notif-count-${userId}-${Math.random().toString(36).slice(2)}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "notifications", filter: `user_id=eq.${userId}` }, () => {
        void load();
      })
      .subscribe();
    const onLocal = () => void load();
    window.addEventListener("bakma:notifications", onLocal);
    return () => {
      active = false;
      window.removeEventListener("bakma:notifications", onLocal);
      void supabase.removeChannel(channel);
    };
  }, [userId]);

  return userId ? count : 0;
}

/** Nombre de messages non lus reçus (temps réel). */
export function useUnreadMessages(userId: string | undefined) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!userId) return;
    const supabase = getSupabase();
    let active = true;
    const load = async () => {
      const { count: c } = await supabase
        .from("messages")
        .select("id", { count: "exact", head: true })
        .neq("sender_id", userId)
        .is("read_at", null);
      if (active) setCount(c ?? 0);
    };
    void load();
    const channel = supabase
      .channel(`msg-count-${userId}-${Math.random().toString(36).slice(2)}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "messages" }, () => {
        void load();
      })
      .subscribe();
    const onLocal = () => void load();
    window.addEventListener("bakma:messages", onLocal);
    return () => {
      active = false;
      window.removeEventListener("bakma:messages", onLocal);
      void supabase.removeChannel(channel);
    };
  }, [userId]);

  return userId ? count : 0;
}

/** Signale aux compteurs qu'un changement local a eu lieu (lecture, suppression…). */
export function emitUnreadChange(kind: "notifications" | "messages") {
  if (typeof window !== "undefined") window.dispatchEvent(new Event(`bakma:${kind}`));
}
