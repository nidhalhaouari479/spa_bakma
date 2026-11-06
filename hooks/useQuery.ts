"use client";

import { useCallback, useEffect, useState } from "react";
import { errorMessage } from "@/lib/supabase";

interface QueryState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
}

/**
 * Charge des données de manière asynchrone (Supabase) dans un effet.
 * `fn` n'est jamais exécutée pendant le rendu serveur.
 * Passer `enabled = false` pour différer (ex. tant que l'utilisateur n'est pas connu).
 */
export function useQuery<T>(fn: () => Promise<T>, deps: unknown[], enabled = true) {
  const [state, setState] = useState<QueryState<T>>({ data: null, loading: true, error: null });
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (!enabled) return;
    let active = true;
    Promise.resolve()
      .then(() => {
        if (active) setState((s) => (s.loading ? s : { ...s, loading: true }));
        return fn();
      })
      .then(
        (data) => {
          if (active) setState({ data, loading: false, error: null });
        },
        (e) => {
          if (active) setState((s) => ({ ...s, loading: false, error: errorMessage(e) }));
        },
      );
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, tick, enabled]);

  const reload = useCallback(() => setTick((t) => t + 1), []);
  const setData = useCallback((updater: (d: T | null) => T | null) => setState((s) => ({ ...s, data: updater(s.data) })), []);

  return { ...state, reload, setData };
}

/** Lève l'erreur Supabase éventuelle et renvoie les données typées. */
export function unwrap<T>(res: { data: unknown; error: unknown }): T {
  if (res.error) throw res.error;
  return res.data as T;
}
