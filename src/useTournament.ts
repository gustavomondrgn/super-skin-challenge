import { useCallback, useEffect, useRef, useState } from "react";
import {
  createInitialState,
  validateState,
  type TournamentState,
} from "./domain";
import { canUseLocalPreview, supabase } from "./supabase";

export type Connection =
  "connecting" | "live" | "reconnecting" | "offline" | "preview";
type Row = { id: string; data: unknown; version: number; updated_at: string };
const previewKey = "ssc-local-preview-v1";

function initialState() {
  if (canUseLocalPreview) {
    try {
      const saved = localStorage.getItem(previewKey);
      if (saved) return validateState(JSON.parse(saved));
    } catch {
      /* Ignore an outdated local preview. */
    }
  }
  return createInitialState();
}

export function useTournament() {
  const [state, setState] = useState<TournamentState>(initialState);
  const [connection, setConnection] = useState<Connection>(
    supabase ? "connecting" : "preview",
  );
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const snapshot = useRef({ state, version: null as number | null });
  const alive = useRef(true);
  const subscribed = useRef(false);
  const writeLock = useRef(false);
  const requestId = useRef(0);

  const adopt = useCallback((row: Row) => {
    if (
      !alive.current ||
      (snapshot.current.version !== null &&
        row.version < snapshot.current.version)
    )
      return;
    const data = validateState(row.data);
    snapshot.current = { state: data, version: row.version };
    setState(data);
    setLastUpdated(row.updated_at);
    setError(null);
  }, []);

  const refresh = useCallback(async () => {
    if (!supabase) return;
    const id = ++requestId.current;
    try {
      const { data, error: readError } = await supabase
        .from("tournament_state")
        .select("id,data,version,updated_at")
        .eq("id", "main")
        .maybeSingle();
      if (!alive.current || id !== requestId.current) return;
      if (readError) throw readError;
      if (data) adopt(data as Row);
      else setError(null);
      setConnection(
        navigator.onLine
          ? subscribed.current
            ? "live"
            : "reconnecting"
          : "offline",
      );
    } catch {
      if (!alive.current || id !== requestId.current) return;
      setConnection(navigator.onLine ? "reconnecting" : "offline");
      setError(
        "Não foi possível atualizar os resultados. Tentaremos novamente em instantes.",
      );
    }
  }, [adopt]);

  useEffect(() => {
    alive.current = true;
    if (!supabase) {
      const onStorage = (event: StorageEvent) => {
        if (!canUseLocalPreview || event.key !== previewKey || !event.newValue)
          return;
        try {
          const next = validateState(JSON.parse(event.newValue));
          snapshot.current = { state: next, version: null };
          setState(next);
          setLastUpdated(new Date().toISOString());
        } catch {
          /* Retain the last valid local preview. */
        }
      };
      window.addEventListener("storage", onStorage);
      return () => {
        alive.current = false;
        window.removeEventListener("storage", onStorage);
      };
    }
    const client = supabase;
    let disposed = false;
    void refresh();
    const channel = client
      .channel("ssc-tournament")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "tournament_state",
          filter: "id=eq.main",
        },
        (payload) => {
          if (disposed) return;
          try {
            if ("data" in payload.new) adopt(payload.new as Row);
          } catch {
            void refresh();
          }
        },
      )
      .subscribe((status) => {
        if (disposed) return;
        subscribed.current = status === "SUBSCRIBED";
        if (!alive.current) return;
        if (subscribed.current) {
          setConnection("live");
          void refresh();
        } else if (
          status === "CHANNEL_ERROR" ||
          status === "TIMED_OUT" ||
          status === "CLOSED"
        )
          setConnection(navigator.onLine ? "reconnecting" : "offline");
      });
    // Snapshot recovery handles missed events, sleeping tabs and brief disconnections.
    const interval = window.setInterval(() => {
      if (document.visibilityState === "visible") void refresh();
    }, 15_000);
    const onOnline = () => {
      void refresh();
    };
    const onOffline = () => {
      setConnection("offline");
    };
    const onVisible = () => {
      if (document.visibilityState === "visible") void refresh();
    };
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    window.addEventListener("focus", onOnline);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      disposed = true;
      alive.current = false;
      subscribed.current = false;
      requestId.current++;
      window.clearInterval(interval);
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
      window.removeEventListener("focus", onOnline);
      document.removeEventListener("visibilitychange", onVisible);
      void client.removeChannel(channel);
    };
  }, [adopt, refresh]);

  const save = useCallback(
    async (change: (current: TournamentState) => TournamentState) => {
      if (writeLock.current)
        throw new Error("Aguarde o resultado atual terminar de salvar.");
      writeLock.current = true;
      setSaving(true);
      try {
        const current = snapshot.current;
        const next = validateState(change(current.state));
        if (!supabase) {
          if (!canUseLocalPreview)
            throw new Error(
              "Configure a conexão com o Supabase antes de registrar resultados.",
            );
          localStorage.setItem(previewKey, JSON.stringify(next));
          snapshot.current = { state: next, version: null };
          setState(next);
          setLastUpdated(new Date().toISOString());
          return;
        }
        const query =
          current.version === null
            ? supabase
                .from("tournament_state")
                .insert({ id: "main", data: next, version: 1 })
            : supabase
                .from("tournament_state")
                .update({ data: next, version: current.version + 1 })
                .eq("id", "main")
                .eq("version", current.version);
        const { data, error: writeError } = await query
          .select("id,data,version,updated_at")
          .maybeSingle();
        if (
          writeError?.code === "23505" ||
          writeError?.code === "40001" ||
          (!writeError && !data)
        ) {
          await refresh();
          throw new Error(
            "Outra janela atualizou o evento. Confira os resultados atuais e salve novamente.",
          );
        }
        if (writeError) {
          if (writeError.code === "42501")
            throw new Error(
              "Sua conta não tem autorização para editar. Confira o cadastro em event_admins no Supabase.",
            );
          throw new Error(
            "Não foi possível salvar. Confira sua conexão e a configuração do Supabase antes de tentar novamente.",
          );
        }
        if (!data)
          throw new Error(
            "O resultado não foi confirmado. Atualize e tente novamente.",
          );
        adopt(data as Row);
      } finally {
        writeLock.current = false;
        if (alive.current) setSaving(false);
      }
    },
    [adopt, refresh],
  );

  return { state, connection, error, lastUpdated, saving, save, refresh };
}
