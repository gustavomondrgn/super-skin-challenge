import { useEffect, useRef, useState, type FormEvent } from "react";
import type { User } from "@supabase/supabase-js";
import {
  addTiebreak,
  applyGameResult,
  drawSeriesMap,
  DUEL_MAPS,
  DownstreamResultsError,
  getProgress,
  getSeriesResult,
  getStandings,
  removeGameResult,
  setActiveSeries,
  type GameInput,
  type Series,
  type TournamentState,
} from "./domain";
import { Avatar, Icon } from "./PublicPage";
import { canUseLocalPreview, supabase } from "./supabase";
import type { useTournament } from "./useTournament";

type Props = ReturnType<typeof useTournament>;
type Change = (
  state: TournamentState,
  resetDownstream?: boolean,
) => TournamentState;
const phaseName = {
  league: "Todos contra todos",
  tiebreak: "Desempate",
  final: "Grande Final",
  boss: "Chefão Final",
};

function useAdminAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(Boolean(supabase));
  const [authorized, setAuthorized] = useState(false);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    if (!supabase) return;
    const client = supabase;
    let active = true;
    void client.auth.getSession().then(({ data, error: sessionError }) => {
      if (!active) return;
      if (sessionError) {
        setError("Não foi possível recuperar seu acesso. Entre novamente.");
        setLoading(false);
      }
      setUser(data.session?.user ?? null);
      if (!data.session) setLoading(false);
    });
    const { data } = client.auth.onAuthStateChange((_event, session) => {
      if (active) {
        setUser(session?.user ?? null);
        if (!session) {
          setAuthorized(false);
          setLoading(false);
        }
      }
    });
    return () => {
      active = false;
      data.subscription.unsubscribe();
    };
  }, []);
  useEffect(() => {
    if (!supabase || !user) return;
    let active = true;
    setLoading(true);
    setAuthorized(false);
    void supabase
      .from("event_admins")
      .select("user_id")
      .eq("user_id", user.id)
      .maybeSingle()
      .then(({ data, error: adminError }) => {
        if (!active) return;
        setAuthorized(Boolean(data) && !adminError);
        setError(
          adminError
            ? "Não foi possível conferir seu acesso. Confira o SQL de configuração do Supabase e entre novamente."
            : data
              ? null
              : "Sua conta ainda não foi autorizada. Cadastre seu usuário em event_admins no Supabase.",
        );
        setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [user?.id]);
  return { user, loading, authorized, error };
}

function AdminFrame({ children }: { children: React.ReactNode }) {
  return (
    <div className="admin-shell">
      <header className="admin-header">
        <a href="/" className="brand">
          <span className="brand-mark">
            S<span>S</span>C
          </span>
          <span>
            SUPER SKIN<span className="brand-sub">CHALLENGE / CONTROLE</span>
          </span>
        </a>
        <a href="/" className="button secondary small">
          <Icon name="eye" /> Ver evento
        </a>
      </header>
      {children}
    </div>
  );
}

function Login({ onPreview }: { onPreview: () => void }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  async function login(event: FormEvent) {
    event.preventDefault();
    if (!supabase || busy) return;
    setBusy(true);
    setError(null);
    try {
      const { error: loginError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      if (loginError)
        setError(
          loginError.status === 429
            ? "Muitas tentativas. Aguarde alguns instantes e tente novamente."
            : "Não foi possível entrar. Confira seu e-mail, senha e a confirmação da conta no Supabase.",
        );
    } catch {
      setError(
        "Não foi possível conectar. Confira sua internet e tente novamente.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <AdminFrame>
      <main className="login-card">
        <span className="eyebrow">
          <Icon name="lock" /> ACESSO DO ORGANIZADOR
        </span>
        <h1>
          O jogo está
          <br />
          nas suas mãos.
        </h1>
        <p className="muted">Registre os placares. O evento cuida do resto.</p>
        {supabase ? (
          <form onSubmit={login}>
            <label className="form-field">
              E-mail
              <input
                className="input"
                type="email"
                autoComplete="username"
                required
                value={email}
                onChange={(event) => setEmail(event.target.value)}
              />
            </label>
            <label className="form-field">
              Senha
              <input
                className="input"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(event) => setPassword(event.target.value)}
              />
            </label>
            {error && (
              <p className="notice error" role="alert">
                {error}
              </p>
            )}
            <button className="button primary" type="submit" disabled={busy}>
              {busy ? "Entrando…" : "Entrar no painel"}
              <Icon name="arrow" />
            </button>
          </form>
        ) : (
          <div className="notice warning">
            <strong>Conecte o evento ao Supabase.</strong>
            <p>
              Configure VITE_SUPABASE_URL e VITE_SUPABASE_PUBLISHABLE_KEY na
              Vercel e publique novamente. Os passos estão no README do projeto.
            </p>
            {canUseLocalPreview && (
              <button className="button secondary" onClick={onPreview}>
                Testar painel local
                <Icon name="arrow" />
              </button>
            )}
          </div>
        )}
        <a className="text-link" href="/">
          Voltar para o evento <Icon name="arrow" />
        </a>
      </main>
    </AdminFrame>
  );
}

function ConfirmReset({
  message,
  saving,
  onConfirm,
  onCancel,
}: {
  message: string;
  saving: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    dialog.current?.showModal();
    return () => dialog.current?.close();
  }, []);
  return (
    <dialog
      ref={dialog}
      className="confirm-dialog"
      aria-labelledby="confirm-title"
      onCancel={(event) => {
        event.preventDefault();
        if (!saving) onCancel();
      }}
    >
      <span className="eyebrow">REVISAR FASES SEGUINTES</span>
      <h2 id="confirm-title">Essa correção altera o avanço.</h2>
      <p>{message}</p>
      <p>
        Os resultados das fases afetadas serão limpos para você registrá-los
        novamente com os participantes corretos.
      </p>
      <div className="dialog-actions">
        <button
          className="button secondary"
          disabled={saving}
          onClick={onCancel}
        >
          Manter resultados
        </button>
        <button className="button danger" disabled={saving} onClick={onConfirm}>
          {saving ? "Corrigindo…" : "Corrigir e limpar fases afetadas"}
        </button>
      </div>
    </dialog>
  );
}

function ConfirmMapDraw({
  map,
  saving,
  onConfirm,
  onCancel,
}: {
  map: string;
  saving: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    dialog.current?.showModal();
    return () => dialog.current?.close();
  }, []);
  return (
    <dialog
      ref={dialog}
      className="confirm-dialog"
      aria-labelledby="map-confirm-title"
      onCancel={(event) => {
        event.preventDefault();
        if (!saving) onCancel();
      }}
    >
      <span className="eyebrow">SORTEIO DE MAPA</span>
      <h2 id="map-confirm-title">Sortear novamente?</h2>
      <p>
        O mapa {map} deste confronto será substituído pelo resultado do novo
        sorteio. Os cinco mapas participam novamente.
      </p>
      <div className="dialog-actions">
        <button
          className="button secondary"
          disabled={saving}
          onClick={onCancel}
        >
          Manter mapa {map}
        </button>
        <button
          className="button primary"
          disabled={saving}
          onClick={onConfirm}
        >
          {saving ? "Sorteando…" : "Sortear novamente"}
        </button>
      </div>
    </dialog>
  );
}

function MapDraw({
  series,
  saving,
  drawing,
  onDraw,
}: {
  series: Series;
  saving: boolean;
  drawing: boolean;
  onDraw: () => void;
}) {
  return (
    <section
      className={`map-draw${drawing ? " is-drawing" : ""}`}
      aria-labelledby="map-draw-title"
    >
      <div className="map-draw-heading">
        <div>
          <span className="eyebrow">MODO DUELO</span>
          <h3 id="map-draw-title">Mapa do confronto</h3>
        </div>
        <span className="map-draw-count">1 DE 5</span>
      </div>
      <div
        className="map-draw-pool"
        aria-label="Mapas disponíveis para o sorteio"
      >
        {DUEL_MAPS.map((map) => (
          <span
            key={map}
            className={`map-draw-tile${series.map === map ? " is-selected" : ""}`}
          >
            <span>MAPA</span>
            <strong>{map}</strong>
            {series.map === map && <Icon name="check" size={14} />}
          </span>
        ))}
      </div>
      <div className="map-draw-actions">
        <p aria-live="polite">
          {drawing ? (
            "Sorteando e salvando o mapa…"
          ) : series.map ? (
            <>
              <strong>Mapa {series.map}</strong> definido para toda a série.
            </>
          ) : (
            "Sorteie um mapa para todas as partidas desta série."
          )}
        </p>
        <button
          className="button secondary"
          type="button"
          disabled={saving}
          onClick={onDraw}
        >
          <Icon name="shuffle" size={18} />
          {drawing
            ? "Sorteando…"
            : series.map
              ? "Sortear novamente"
              : "Sortear mapa"}
        </button>
      </div>
    </section>
  );
}

function GameForm({
  state,
  series,
  index,
  saving,
  onSave,
  onCancel,
}: {
  state: TournamentState;
  series: Series;
  index: number;
  saving: boolean;
  onSave: (input: GameInput) => void;
  onCancel?: () => void;
}) {
  const existing = series.games[index];
  const [scoreA, setScoreA] = useState(
    String(existing?.scoreAtTermination?.a ?? existing?.scoreA ?? ""),
  );
  const [scoreB, setScoreB] = useState(
    String(existing?.scoreAtTermination?.b ?? existing?.scoreB ?? ""),
  );
  const [reason, setReason] = useState<GameInput["reason"]>(
    existing?.reason ?? "normal",
  );
  const [winnerId, setWinnerId] = useState(
    existing?.winnerId ?? series.playerA ?? "",
  );
  const a = state.participants.find(
    (participant) => participant.id === series.playerA,
  );
  const b = state.participants.find(
    (participant) => participant.id === series.playerB,
  );
  function submit(event: FormEvent) {
    event.preventDefault();
    if (saving || scoreA === "" || scoreB === "") return;
    onSave({
      scoreA: Number(scoreA),
      scoreB: Number(scoreB),
      reason,
      ...(reason !== "normal" ? { winnerId } : {}),
    });
  }
  return (
    <form className="game-form" onSubmit={submit}>
      <div className="section-heading">
        <div>
          <span className="eyebrow">
            {existing ? "CORREÇÃO DE RESULTADO" : "PRÓXIMO RESULTADO"}
          </span>
          <h3>Partida {index + 1}</h3>
        </div>
        <span className="format-badge">MD{series.bestOf}</span>
      </div>
      <fieldset disabled={saving}>
        <legend className="sr-only">Resultado da partida {index + 1}</legend>
        <label className="form-field">
          Como a partida terminou?
          <select
            className="input"
            value={reason}
            onChange={(event) =>
              setReason(event.target.value as GameInput["reason"])
            }
          >
            <option value="normal">Placar normal — chegou a 10 rounds</option>
            <option value="knife">Kill de faca</option>
            <option value="violation">Punição por quebra de regra</option>
          </select>
        </label>
        <p className="muted form-hint">
          {reason === "normal"
            ? "Informe o placar final: um dos jogadores precisa ter 10 rounds."
            : "Informe o placar real antes do encerramento. O vencedor receberá 10 rounds oficiais."}
        </p>
        <div className="score-form-row">
          <label className="form-field score-label">
            <span>
              <Avatar participant={a} />
              {a?.name}
            </span>
            <input
              aria-label={`Rounds de ${a?.name}`}
              className="input score-input"
              type="number"
              min="0"
              max={reason === "normal" ? 10 : 9}
              step="1"
              required
              inputMode="numeric"
              value={scoreA}
              onChange={(event) => setScoreA(event.target.value)}
            />
          </label>
          <span className="score-x">×</span>
          <label className="form-field score-label">
            <span>
              <Avatar participant={b} />
              {b?.name}
            </span>
            <input
              aria-label={`Rounds de ${b?.name}`}
              className="input score-input"
              type="number"
              min="0"
              max={reason === "normal" ? 10 : 9}
              step="1"
              required
              inputMode="numeric"
              value={scoreB}
              onChange={(event) => setScoreB(event.target.value)}
            />
          </label>
        </div>
        {reason !== "normal" && (
          <label className="form-field">
            Quem venceu a partida?
            <select
              className="input"
              value={winnerId}
              onChange={(event) => setWinnerId(event.target.value)}
            >
              <option value={series.playerA ?? ""}>{a?.name}</option>
              <option value={series.playerB ?? ""}>{b?.name}</option>
            </select>
          </label>
        )}
        <div className="form-actions">
          {onCancel && (
            <button
              type="button"
              className="button secondary"
              onClick={onCancel}
            >
              Cancelar edição
            </button>
          )}
          <button className="button primary" type="submit" disabled={saving}>
            {saving
              ? "Salvando…"
              : existing
                ? "Salvar correção"
                : "Salvar partida"}
            <Icon name="check" />
          </button>
        </div>
      </fieldset>
    </form>
  );
}

export default function AdminPage({
  state,
  saving,
  save,
  connection,
  lastUpdated,
  error: connectionError,
  refresh,
}: Props) {
  const auth = useAdminAuth();
  const [preview, setPreview] = useState(false);
  const [selectedId, setSelectedId] = useState(
    state.activeSeriesId ?? "league-1",
  );
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [notice, setNotice] = useState<{
    text: string;
    kind: "error" | "success";
  } | null>(null);
  const [pendingReset, setPendingReset] = useState<{
    message: string;
    change: Change;
  } | null>(null);
  const [tieA, setTieA] = useState("");
  const [tieB, setTieB] = useState("");
  const [pendingMapId, setPendingMapId] = useState<string | null>(null);
  const [drawingMapId, setDrawingMapId] = useState<string | null>(null);
  const editorRef = useRef<HTMLElement>(null);
  const progress = getProgress(state);
  const standings = getStandings(state);
  const selected =
    state.series.find((series) => series.id === selectedId) ?? state.series[0];
  const result = getSeriesResult(selected);
  const playerA = state.participants.find(
    (participant) => participant.id === selected.playerA,
  );
  const playerB = state.participants.find(
    (participant) => participant.id === selected.playerB,
  );
  const tied = standings.filter((standing) => standing.tied);
  const pendingSeries = state.series.filter(
    (series) =>
      series.playerA && series.playerB && !getSeriesResult(series).completed,
  );
  const nextSeries =
    pendingSeries.find((series) => series.id === state.activeSeriesId) ??
    pendingSeries[0];
  const gameIndex = editingIndex ?? selected.games.length;
  const allowed = (canUseLocalPreview && preview) || auth.authorized;

  useEffect(() => {
    if (!state.series.some((series) => series.id === selectedId)) {
      setSelectedId(state.activeSeriesId ?? "league-1");
      setEditingIndex(null);
    }
  }, [state.series, selectedId, state.activeSeriesId]);

  async function run(change: Change, reset = false) {
    setNotice(null);
    try {
      await save((current) => change(current, reset));
      setEditingIndex(null);
      setPendingReset(null);
      setNotice({
        text: "Alteração salva. O evento foi atualizado.",
        kind: "success",
      });
      return true;
    } catch (error) {
      if (error instanceof DownstreamResultsError)
        setPendingReset({ message: error.message, change });
      else
        setNotice({
          text:
            error instanceof Error
              ? error.message
              : "Não foi possível salvar. Tente novamente.",
          kind: "error",
        });
      return false;
    }
  }
  async function createTie(event: FormEvent) {
    event.preventDefault();
    let id = "";
    const ok = await run((current) => {
      const next = addTiebreak(current, tieA, tieB);
      id = next.series.find(
        (series) =>
          !current.series.some((previous) => previous.id === series.id),
      )!.id;
      return setActiveSeries(next, id);
    });
    if (ok && id) {
      select(id);
      setTieA("");
      setTieB("");
    }
  }
  async function sortMap(seriesId: string) {
    setNotice(null);
    setDrawingMapId(seriesId);
    try {
      let drawnMap: string | null = null;
      await save((current) => {
        const next = drawSeriesMap(current, seriesId);
        drawnMap = next.series.find((series) => series.id === seriesId)!.map;
        return next;
      });
      setNotice({
        text: `Mapa ${drawnMap} sorteado e salvo para este confronto.`,
        kind: "success",
      });
    } catch (error) {
      setNotice({
        text:
          error instanceof Error
            ? error.message
            : "Não foi possível salvar o sorteio. Tente novamente.",
        kind: "error",
      });
    } finally {
      setDrawingMapId(null);
      setPendingMapId(null);
    }
  }
  function select(id: string) {
    setSelectedId(id);
    setEditingIndex(null);
    setNotice(null);
    if (window.matchMedia("(max-width: 800px)").matches) {
      window.requestAnimationFrame(() => {
        editorRef.current?.focus({ preventScroll: true });
        editorRef.current?.scrollIntoView({
          block: "start",
          behavior: window.matchMedia("(prefers-reduced-motion: reduce)")
            .matches
            ? "auto"
            : "smooth",
        });
      });
    }
  }

  if (auth.loading && supabase)
    return (
      <AdminFrame>
        <main className="loading-page" aria-live="polite">
          Conferindo seu acesso…
        </main>
      </AdminFrame>
    );
  if (!allowed) {
    if (auth.user)
      return (
        <AdminFrame>
          <main className="login-card">
            <span className="eyebrow">ACESSO RESTRITO</span>
            <h1>
              Falta autorizar
              <br />
              sua conta.
            </h1>
            <p className="notice error" role="alert">
              {auth.error}
            </p>
            <button
              className="button secondary"
              onClick={async () => {
                await supabase?.auth.signOut();
              }}
            >
              Sair da conta
            </button>
          </main>
        </AdminFrame>
      );
    return <Login onPreview={() => setPreview(true)} />;
  }

  return (
    <AdminFrame>
      <main className="admin-content">
        <div className="admin-title-row">
          <div>
            <span className="eyebrow">PAINEL DO ORGANIZADOR</span>
            <h1>
              Controle do evento<span>.</span>
            </h1>
          </div>
          <div className="admin-toolbar">
            <span className={`connection-label ${connection}`}>
              <i />
              {connection === "live"
                ? "Conectado ao evento"
                : connection === "preview"
                  ? "Prévia local"
                  : connection === "offline"
                    ? "Sem conexão"
                    : "Reconectando…"}
            </span>
            {supabase && (
              <button
                className="button secondary small"
                onClick={async () => {
                  const { error } = await supabase!.auth.signOut();
                  if (error)
                    setNotice({
                      kind: "error",
                      text: "Não foi possível sair. Tente novamente.",
                    });
                }}
              >
                <Icon name="logout" /> Sair
              </button>
            )}
          </div>
        </div>
        {canUseLocalPreview && (
          <div className="notice warning">
            <strong>Prévia local.</strong> Estes resultados ficam apenas neste
            navegador. Para compartilhar o evento, configure o Supabase.
          </div>
        )}
        {connectionError && (
          <div className="notice error" role="alert">
            {connectionError}{" "}
            <button className="text-link" onClick={() => void refresh()}>
              Tentar novamente
            </button>
          </div>
        )}
        <div aria-live="polite" aria-atomic="true">
          {notice && (
            <p
              className={`notice ${notice.kind}`}
              role={notice.kind === "error" ? "alert" : "status"}
            >
              {notice.text}
            </p>
          )}
        </div>
        <div className="mobile-series-nav">
          <div className="mobile-series-nav-heading">
            <span className="eyebrow">SEQUÊNCIA DO EVENTO</span>
            <span>
              {
                state.series.filter(
                  (series) => getSeriesResult(series).completed,
                ).length
              }
              /{state.series.length} concluídos
            </span>
          </div>
          <div className="form-field">
            <label htmlFor="mobile-series-select">Confronto</label>
            <select
              id="mobile-series-select"
              className="input"
              value={selected.id}
              onChange={(event) => select(event.target.value)}
              disabled={saving}
            >
              {(["league", "tiebreak", "final", "boss"] as const).map(
                (phase) => {
                  const matches = state.series.filter(
                    (series) => series.phase === phase,
                  );
                  if (!matches.length) return null;
                  return (
                    <optgroup key={phase} label={phaseName[phase]}>
                      {matches.map((series) => {
                        const matchResult = getSeriesResult(series);
                        const a = state.participants.find(
                          (participant) => participant.id === series.playerA,
                        );
                        const b = state.participants.find(
                          (participant) => participant.id === series.playerB,
                        );
                        const status = matchResult.completed
                          ? `${matchResult.winsA} × ${matchResult.winsB} · Encerrado`
                          : !series.playerA || !series.playerB
                            ? "Aguardando"
                            : state.activeSeriesId === series.id
                              ? "Próximo resultado"
                              : `MD${series.bestOf}`;
                        return (
                          <option key={series.id} value={series.id}>
                            {String(series.order).padStart(2, "0")} ·{" "}
                            {a?.name ?? "A definir"} × {b?.name ?? "A definir"}{" "}
                            · {status}
                          </option>
                        );
                      })}
                    </optgroup>
                  );
                },
              )}
            </select>
          </div>
          {result.completed && editingIndex === null && nextSeries && (
            <button
              className="button primary mobile-next-series"
              onClick={() => select(nextSeries.id)}
            >
              {nextSeries.phase === "final"
                ? "Ir para a Grande Final"
                : nextSeries.phase === "boss"
                  ? "Ir para o desafio com Tapioca"
                  : nextSeries.phase === "tiebreak"
                    ? "Ir para o desempate"
                    : "Próximo confronto"}
              <Icon name="arrow" />
            </button>
          )}
        </div>
        <div className="admin-layout">
          <aside className="admin-sidebar">
            <div className="sidebar-heading">
              <span className="eyebrow">SEQUÊNCIA DO EVENTO</span>
              <span className="muted">
                {
                  state.series.filter(
                    (series) => getSeriesResult(series).completed,
                  ).length
                }
                /{state.series.length}
              </span>
            </div>
            {(["league", "tiebreak", "final", "boss"] as const).map((phase) => (
              <div className="sidebar-group" key={phase}>
                <h2>{phaseName[phase]}</h2>
                {state.series
                  .filter((series) => series.phase === phase)
                  .map((series) => {
                    const seriesResult = getSeriesResult(series);
                    const a = state.participants.find(
                      (participant) => participant.id === series.playerA,
                    );
                    const b = state.participants.find(
                      (participant) => participant.id === series.playerB,
                    );
                    return (
                      <button
                        key={series.id}
                        className={`series-selector ${series.id === selected.id ? "is-active" : ""}`}
                        aria-pressed={series.id === selected.id}
                        onClick={() => select(series.id)}
                      >
                        <span className="series-index">
                          {seriesResult.completed ? (
                            <Icon name="check" />
                          ) : (
                            series.order.toString().padStart(2, "0")
                          )}
                        </span>
                        <span>
                          <strong>
                            {a?.name ?? "A definir"}{" "}
                            <span className="muted">×</span>{" "}
                            {b?.name ??
                              (phase === "boss" ? "Tapioca" : "A definir")}
                          </strong>
                          <small>
                            {seriesResult.completed
                              ? `${seriesResult.winsA} × ${seriesResult.winsB} · Encerrado`
                              : state.activeSeriesId === series.id
                                ? "Próximo resultado"
                                : `MD${series.bestOf}`}
                          </small>
                        </span>
                        <Icon name="chevron" />
                      </button>
                    );
                  })}
              </div>
            ))}
          </aside>
          <section
            className="admin-main"
            aria-label="Registrar resultados"
            ref={editorRef}
            tabIndex={-1}
          >
            <article className="admin-card">
              <div className="section-heading">
                <div>
                  <span className="eyebrow">
                    {phaseName[selected.phase].toUpperCase()}
                  </span>
                  <h2>
                    {selected.phase === "tiebreak"
                      ? "Desempate extra"
                      : `Confronto ${selected.order.toString().padStart(2, "0")}`}
                  </h2>
                </div>
                <span className="format-badge">MD{selected.bestOf}</span>
              </div>
              <div className="admin-versus">
                <div>
                  <Avatar participant={playerA} size="large" />
                  <strong>{playerA?.name ?? "A definir"}</strong>
                </div>
                <span className="admin-series-score">
                  {result.winsA}
                  <i>:</i>
                  {result.winsB}
                </span>
                <div>
                  <Avatar participant={playerB} size="large" />
                  <strong>{playerB?.name ?? "A definir"}</strong>
                </div>
              </div>
              <MapDraw
                series={selected}
                saving={saving}
                drawing={drawingMapId === selected.id}
                onDraw={() => {
                  if (selected.map) setPendingMapId(selected.id);
                  else void sortMap(selected.id);
                }}
              />
              {!selected.playerA || !selected.playerB ? (
                <div className="empty-state">
                  <Icon name="lock" />
                  <h3>Aguardando classificação</h3>
                  <p>
                    {selected.phase === "final"
                      ? "A final será preenchida quando os seis confrontos e os desempates da primeira fase terminarem."
                      : "O vencedor da Grande Final enfrentará Tapioca em MD1 pelo pacote completo."}
                  </p>
                </div>
              ) : (
                <>
                  {selected.games.length > 0 && (
                    <div className="game-history">
                      <h3>Partidas registradas</h3>
                      {selected.games.map((game, index) => (
                        <div className="game-history-row" key={index}>
                          <span>
                            Partida {index + 1}
                            <small>
                              {game.reason === "knife"
                                ? "Faca"
                                : game.reason === "violation"
                                  ? "Punição"
                                  : "Placar normal"}
                            </small>
                          </span>
                          <strong>
                            {game.scoreA} <i>×</i> {game.scoreB}
                          </strong>
                          <div>
                            <button
                              className="button secondary small"
                              aria-label={`Editar partida ${index + 1}`}
                              disabled={saving}
                              onClick={() => {
                                setEditingIndex(index);
                                setNotice(null);
                              }}
                            >
                              <Icon name="edit" /> Editar
                            </button>
                            <button
                              className="remove-game"
                              aria-label={`Remover partida ${index + 1} e as seguintes deste confronto`}
                              title="Remover esta partida e as seguintes"
                              disabled={saving}
                              onClick={() => {
                                if (
                                  window.confirm(
                                    `Remover a partida ${index + 1}${index < selected.games.length - 1 ? " e as seguintes deste confronto" : ""}?`,
                                  )
                                )
                                  void run((current, reset) =>
                                    removeGameResult(
                                      current,
                                      selected.id,
                                      index,
                                      reset,
                                    ),
                                  );
                              }}
                            >
                              <Icon name="close" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  {result.completed && editingIndex === null ? (
                    <div className="series-complete">
                      <Icon name="trophy" />
                      <span className="eyebrow">CONFRONTO ENCERRADO</span>
                      <h3>
                        {
                          state.participants.find(
                            (participant) => participant.id === result.winnerId,
                          )?.name
                        }{" "}
                        venceu!
                      </h3>
                      {selected.phase === "final" && (
                        <p>
                          Phantom garantida. Próximo desafio: Tapioca em MD1.
                        </p>
                      )}
                      {selected.phase === "boss" && (
                        <p>
                          {result.winnerId === "tapioca"
                            ? "O campeão mantém a Phantom Champions 2026."
                            : "Pacote completo Champions 2026 conquistado!"}
                        </p>
                      )}
                      {nextSeries && (
                        <button
                          className="button primary"
                          onClick={() => select(nextSeries.id)}
                        >
                          Próximo confronto
                          <Icon name="arrow" />
                        </button>
                      )}
                    </div>
                  ) : (
                    <GameForm
                      key={`${selected.id}-${gameIndex}-${JSON.stringify(selected.games[gameIndex])}`}
                      state={state}
                      series={selected}
                      index={gameIndex}
                      saving={saving}
                      onSave={(input) =>
                        void run((current, reset) =>
                          applyGameResult(
                            current,
                            selected.id,
                            gameIndex,
                            input,
                            reset,
                          ),
                        )
                      }
                      onCancel={
                        editingIndex === null
                          ? undefined
                          : () => setEditingIndex(null)
                      }
                    />
                  )}
                  {!result.completed &&
                    state.activeSeriesId !== selected.id && (
                      <button
                        className="text-link"
                        disabled={saving}
                        onClick={() =>
                          void run((current) =>
                            setActiveSeries(current, selected.id),
                          )
                        }
                      >
                        Destacar este confronto na página pública{" "}
                        <Icon name="arrow" />
                      </button>
                    )}
                </>
              )}
            </article>
            {progress.leagueComplete && progress.tiesPending && (
              <article className="admin-card">
                <span className="eyebrow">EMPATE NA CLASSIFICAÇÃO</span>
                <h2>Decidir na MD1.</h2>
                <p className="muted">
                  Escolha dois jogadores empatados em vitórias e rounds. O
                  desempate define a ordem, sem somar rounds à fase regular.
                </p>
                <form onSubmit={createTie}>
                  <div className="form-grid">
                    <div className="form-field">
                      <label htmlFor="tie-player-a">Primeiro jogador</label>
                      <select
                        id="tie-player-a"
                        className="input"
                        required
                        value={tieA}
                        onChange={(event) => setTieA(event.target.value)}
                      >
                        <option value="">Selecionar jogador</option>
                        {tied.map((row) => (
                          <option
                            key={row.participant.id}
                            value={row.participant.id}
                          >
                            {row.participant.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="form-field">
                      <label htmlFor="tie-player-b">Segundo jogador</label>
                      <select
                        id="tie-player-b"
                        className="input"
                        required
                        value={tieB}
                        onChange={(event) => setTieB(event.target.value)}
                      >
                        <option value="">Selecionar jogador</option>
                        {tied
                          .filter((row) => row.participant.id !== tieA)
                          .map((row) => (
                            <option
                              key={row.participant.id}
                              value={row.participant.id}
                            >
                              {row.participant.name}
                            </option>
                          ))}
                      </select>
                    </div>
                  </div>
                  <button
                    className="button primary"
                    disabled={saving || !tieA || !tieB}
                    type="submit"
                  >
                    <Icon name="plus" />
                    Criar desempate MD1
                  </button>
                </form>
              </article>
            )}
            <article className="admin-card admin-standings">
              <span className="eyebrow">CLASSIFICAÇÃO ATUAL</span>
              <div className="table-scroll">
                <table>
                  <thead>
                    <tr>
                      <th scope="col">Pos.</th>
                      <th scope="col">Jogador</th>
                      <th scope="col">V</th>
                      <th scope="col">D</th>
                      <th scope="col">Rounds</th>
                    </tr>
                  </thead>
                  <tbody>
                    {standings.map((row) => (
                      <tr key={row.participant.id}>
                        <td>
                          {row.position}
                          {row.tied ? "=" : ""}
                        </td>
                        <th scope="row">
                          <span className="player-name">
                            <Avatar participant={row.participant} />
                            {row.participant.name}
                          </span>
                        </th>
                        <td>{row.wins}</td>
                        <td>{row.losses}</td>
                        <td>{row.rounds}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="muted">
                Vitórias de confronto → rounds ganhos → MD1.{" "}
                {lastUpdated &&
                  `Último salvamento: ${new Date(lastUpdated).toLocaleTimeString("pt-BR")}.`}
              </p>
            </article>
          </section>
        </div>
      </main>
      {pendingReset && (
        <ConfirmReset
          message={pendingReset.message}
          saving={saving}
          onCancel={() => setPendingReset(null)}
          onConfirm={() => void run(pendingReset.change, true)}
        />
      )}
      {pendingMapId && (
        <ConfirmMapDraw
          map={
            state.series.find((series) => series.id === pendingMapId)?.map ??
            "atual"
          }
          saving={saving}
          onCancel={() => setPendingMapId(null)}
          onConfirm={() => void sortMap(pendingMapId)}
        />
      )}
    </AdminFrame>
  );
}
