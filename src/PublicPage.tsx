import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import WinnerCelebration, {
  type WinnerCelebrationHandle,
} from "./WinnerCelebration";
import EventRecordings from "./EventRecordings";
import { getProgress, getSeriesResult, getStandings } from "./domain";
import type { Participant, Series, TournamentState } from "./domain";

type PublicPageProps = {
  state: TournamentState;
  connection: "connecting" | "live" | "reconnecting" | "offline" | "preview";
  lastUpdated: string | null;
  error: string | null;
  onRetry: () => void;
};

export function Icon({ name, size = 20 }: { name: string; size?: number }) {
  const paths: Record<string, ReactNode> = {
    trophy: (
      <>
        <path d="M8 3h8v6a4 4 0 0 1-8 0V3Z" />
        <path d="M8 5H4v2a4 4 0 0 0 4 4m8-6h4v2a4 4 0 0 1-4 4m-4 2v6m-4 2h8m-6-2h4" />
      </>
    ),
    arrow: (
      <>
        <path d="M5 12h14m-6-6 6 6-6 6" />
      </>
    ),
    bolt: <path d="m13 2-9 12h7l-1 8 10-13h-8l1-7Z" />,
    lock: (
      <>
        <rect x="5" y="10" width="14" height="11" rx="2" />
        <path d="M8 10V7a4 4 0 0 1 8 0v3m-4 5v2" />
      </>
    ),
    check: <path d="m5 12 4 4L19 6" />,
    close: <path d="m6 6 12 12M6 18 18 6" />,
    knife: (
      <>
        <path d="m15 3 6 0-3 8-5 4-4-4 6-8Zm-5 9-7 7 2 2 7-7m-5-5 8 8" />
      </>
    ),
    refresh: (
      <>
        <path d="M20 7v5h-5M4 17v-5h5" />
        <path d="M6 7a7 7 0 0 1 12-1l2 3M4 15l2 3a7 7 0 0 0 12-1" />
      </>
    ),
    logout: (
      <>
        <path d="M10 3H4v18h6m4-14 5 5-5 5m-5-5h10" />
      </>
    ),
    chevron: <path d="m9 5 7 7-7 7" />,
    shield: (
      <>
        <path d="m12 3 8 3v6c0 5-8 9-8 9s-8-4-8-9V6l8-3Z" />
        <path d="m8 12 3 3 5-6" />
      </>
    ),
    eye: (
      <>
        <path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12Z" />
        <circle cx="12" cy="12" r="3" />
      </>
    ),
    plus: <path d="M12 5v14M5 12h14" />,
    edit: (
      <>
        <path d="m15 4 5 5-11 11H4v-5L15 4Zm-2 2 5 5" />
      </>
    ),
    save: (
      <>
        <path d="M4 3h13l3 3v15H4V3Z" />
        <path d="M8 3v6h8V3M8 21v-8h8v8" />
      </>
    ),
    shuffle: (
      <>
        <path d="m16 3 4 4-4 4M4 7h3c4 0 6 10 10 10h3m-4-4 4 4-4 4M4 17h3c1.5 0 3-1.5 4-3m2-4c1-2 2-3 4-3h3" />
      </>
    ),
  };
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {paths[name] ?? paths.bolt}
    </svg>
  );
}

export function Avatar({
  participant,
  size = "small",
}: {
  participant?: Participant | null;
  size?: "small" | "large";
}) {
  const initials = participant?.name.slice(0, 2).toUpperCase() ?? "?";
  return (
    <span
      className={`avatar avatar--${size}`}
      style={
        { "--avatar-accent": participant?.accent || "#a4a6ae" } as CSSProperties
      }
    >
      <span>{initials}</span>
      {participant?.avatar && (
        <img
          src={participant.avatar}
          alt=""
          onError={(event) => {
            event.currentTarget.style.display = "none";
          }}
        />
      )}
    </span>
  );
}

function ChampionshipMark() {
  return (
    <svg
      className="championship-mark"
      viewBox="0 0 420 420"
      fill="none"
      aria-hidden="true"
    >
      <defs>
        <linearGradient
          id="champion-gold"
          x1="100"
          y1="50"
          x2="300"
          y2="350"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#F7E6BD" />
          <stop offset=".4" stopColor="#B99B57" />
          <stop offset=".72" stopColor="#6F562C" />
          <stop offset="1" stopColor="#D9C38E" />
        </linearGradient>
        <linearGradient
          id="champion-black"
          x1="100"
          y1="50"
          x2="300"
          y2="350"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#2E2A24" />
          <stop offset="1" stopColor="#0D0F12" />
        </linearGradient>
      </defs>
      <circle cx="210" cy="210" r="181" stroke="#C9AE72" strokeOpacity=".12" />
      <circle
        cx="210"
        cy="210"
        r="159"
        stroke="#C9AE72"
        strokeOpacity=".2"
        strokeDasharray="1 10"
      />
      <path
        d="m210 29 157 91v180l-157 91-157-91V120L210 29Z"
        stroke="#C9AE72"
        strokeOpacity=".25"
      />
      <path
        d="m210 55 134 78v154l-134 78-134-78V133L210 55Z"
        fill="url(#champion-black)"
        stroke="url(#champion-gold)"
        strokeWidth="1.5"
      />
      <path
        d="m102 111 108-62 108 62M102 309l108 62 108-62"
        stroke="url(#champion-gold)"
        strokeWidth="5"
      />
      <path
        d="M131 150h158l-13 91-66 54-66-54-13-91Z"
        fill="url(#champion-gold)"
      />
      <path d="m148 166 62 98 62-98-15 66-47 40-47-40-15-66Z" fill="#151619" />
      <path
        d="m210 121 17 28-17 29-17-29 17-28ZM156 146l-18-29 37 15-19 14Zm108 0 18-29-37 15 19 14Z"
        fill="url(#champion-gold)"
      />
      <path
        d="M128 160H98l9 56 38 30m147-86h30l-9 56-38 30"
        stroke="url(#champion-gold)"
        strokeWidth="7"
      />
      <path
        d="M209 288v29m-24 0h50"
        stroke="url(#champion-gold)"
        strokeWidth="6"
      />
      <path
        d="M210 13v27m0 340v27M13 210h27m340 0h27"
        stroke="#D8BC7D"
        strokeOpacity=".6"
      />
      <path
        d="m57 57 10 10m286 286 10 10M57 363l10-10M353 67l10-10"
        stroke="#D8BC7D"
        strokeOpacity=".4"
      />
      <path d="m194 338 16 10 16-10" stroke="#D8BC7D" strokeOpacity=".6" />
    </svg>
  );
}

function PlayerName({
  id,
  state,
  placeholder = "A definir",
  large = false,
}: {
  id: string | null;
  state: TournamentState;
  placeholder?: string;
  large?: boolean;
}) {
  const player =
    state.participants.find((p) => p.id === id) ??
    (id === "tapioca"
      ? { id: "tapioca", name: "Tapioca", avatar: null, accent: "#d6b478" }
      : null);
  return (
    <span
      className={`player-identity${large ? " player-identity--large" : ""}`}
    >
      <Avatar participant={player} size={large ? "large" : "small"} />
      <span>{player?.name ?? placeholder}</span>
    </span>
  );
}

function SeriesCard({
  series,
  state,
  featured = false,
}: {
  series: Series;
  state: TournamentState;
  featured?: boolean;
}) {
  const result = getSeriesResult(series);
  const active = state.activeSeriesId === series.id && !result.completed;
  const label = result.completed
    ? "Encerrado"
    : active
      ? "Em andamento"
      : series.games.length
        ? "Iniciado"
        : "A seguir";
  const title =
    series.phase === "tiebreak"
      ? "Desempate"
      : series.phase === "final"
        ? "Grande final"
        : series.phase === "boss"
          ? "Chefão final"
          : `Confronto ${String(series.order).padStart(2, "0")}`;
  return (
    <details
      className={`series-card${active ? " series-card--active" : ""}${featured ? " series-card--featured" : ""}`}
    >
      <summary>
        <div className="series-card-top">
          <span className="series-number">
            {title} <span>MD{series.bestOf}</span>
            {series.map && (
              <span className="series-map">Mapa {series.map}</span>
            )}
          </span>
          <span
            className={`series-state${active ? " series-state--active" : ""}`}
          >
            {active && <i />}
            {label}
          </span>
        </div>
        <div className="series-players">
          <div
            className={
              result.winnerId && result.winnerId === series.playerA
                ? "series-player is-winner"
                : "series-player"
            }
          >
            <PlayerName id={series.playerA} state={state} />
            <strong>{series.games.length ? result.winsA : "–"}</strong>
          </div>
          <div
            className={
              result.winnerId && result.winnerId === series.playerB
                ? "series-player is-winner"
                : "series-player"
            }
          >
            <PlayerName id={series.playerB} state={state} />
            <strong>{series.games.length ? result.winsB : "–"}</strong>
          </div>
        </div>
        <div className="series-card-bottom">
          <span>
            {series.games.length
              ? `${series.games.length} ${series.games.length === 1 ? "partida registrada" : "partidas registradas"}`
              : `Vence quem fizer ${Math.ceil(series.bestOf / 2)} ${series.bestOf === 1 ? "vitória" : "vitórias"}`}
          </span>
          <span className="series-expand">
            Ver partidas <Icon name="chevron" size={14} />
          </span>
        </div>
      </summary>
      <div className="series-games">
        {series.games.length ? (
          series.games.map((game, index) => (
            <div className="series-game" key={index}>
              <span>Partida {index + 1}</span>
              <strong>
                {game.scoreA} <span>×</span> {game.scoreB}
              </strong>
              <span className="game-reason">
                {game.reason === "knife" ? (
                  <>
                    <Icon name="knife" size={14} /> Faca
                  </>
                ) : game.reason === "violation" ? (
                  "Punição"
                ) : (
                  "Normal"
                )}
              </span>
            </div>
          ))
        ) : (
          <p className="muted">
            Os placares aparecem aqui assim que forem registrados.
          </p>
        )}
      </div>
    </details>
  );
}

export default function PublicPage({
  state,
  connection,
  lastUpdated,
  error,
  onRetry,
}: PublicPageProps) {
  const standings = getStandings(state);
  const progress = getProgress(state);
  const league = state.series
    .filter((s) => s.phase === "league")
    .sort((a, b) => a.order - b.order);
  const tiebreaks = state.series.filter((s) => s.phase === "tiebreak");
  const final = state.series.find((s) => s.phase === "final");
  const boss = state.series.find((s) => s.phase === "boss");
  const completed = league.filter((s) => getSeriesResult(s).completed).length;
  const active = state.series.find(
    (s) => s.id === state.activeSeriesId && !getSeriesResult(s).completed,
  );
  const next =
    active ??
    state.series.find(
      (s) => !getSeriesResult(s).completed && s.playerA && s.playerB,
    );
  const champion = state.participants.find((p) => p.id === progress.championId);
  const prizeUpgraded = Boolean(
    progress.championId && progress.bossWinnerId === progress.championId,
  );
  const celebrationKey =
    progress.phase === "finished"
      ? `${progress.championId}:${progress.bossWinnerId}`
      : null;
  const [seenCelebration, setSeenCelebration] = useState<string | null>(() => {
    try {
      return localStorage.getItem("ssc-winner-celebration");
    } catch {
      return null;
    }
  });
  const [celebrationOpen, setCelebrationOpen] = useState(false);
  const celebrationRef = useRef<WinnerCelebrationHandle>(null);
  useEffect(() => {
    setCelebrationOpen(
      Boolean(celebrationKey && seenCelebration !== celebrationKey),
    );
  }, [celebrationKey, seenCelebration]);

  function closeCelebration() {
    setCelebrationOpen(false);
    if (celebrationKey) {
      setSeenCelebration(celebrationKey);
      try {
        localStorage.setItem("ssc-winner-celebration", celebrationKey);
      } catch {
        /* Closing still works when local storage is unavailable. */
      }
    }
    requestAnimationFrame(() =>
      document.getElementById("confrontos")?.scrollIntoView({
        behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
          ? "instant"
          : "smooth",
        block: "start",
      }),
    );
  }
  const connectionLabel = {
    live: "Ao vivo",
    preview: "Prévia",
    connecting: "Conectando",
    reconnecting: "Reconectando",
    offline: "Sem conexão",
  }[connection];
  const updatedTime =
    lastUpdated && !Number.isNaN(new Date(lastUpdated).getTime())
      ? new Date(lastUpdated).toLocaleTimeString("pt-BR", {
          hour: "2-digit",
          minute: "2-digit",
          timeZone: "America/Sao_Paulo",
        })
      : null;
  const phaseLabels = {
    league: "Todos contra todos",
    final: "Grande final",
    boss: "Chefão final",
    finished: "Evento encerrado",
  };
  return (
    <div className="public-page">
      <a className="skip-link" href="#conteudo">
        Pular para o conteúdo
      </a>
      <header className="site-header">
        <div className="container header-inner">
          <a href="#" className="brand">
            <span className="brand-symbol">
              S<span>S</span>C
            </span>
            <span className="brand-wordmark">
              SUPER SKIN
              <br />
              <strong>CHALLENGE</strong>
            </span>
          </a>
          <nav className="main-nav" aria-label="Navegação principal">
            <a href="#classificacao">Classificação</a>
            <a href="#confrontos">Confrontos</a>
            <a href="#fases">As fases</a>
          </nav>
        </div>
      </header>

      <main id="conteudo">
        <section className="hero">
          <div className="hero-grid" aria-hidden="true" />
          <div className="container hero-inner">
            <div className="hero-copy">
              <p className="eyebrow hero-eyebrow">
                <span className="tiny-cross">✦</span> 18 OUT 2026{" "}
                <span className="eyebrow-divider" /> EDIÇÃO ENTRE AMIGOS
              </p>
              <h1>
                SUPER SKIN
                <br />
                <span>
                  CHALLENGE<span className="title-period">.</span>
                </span>
              </h1>
              <p className="hero-description">
                Quatro competidores. Três fases.
                <br />
                Uma chance de levar tudo.
              </p>
              <a className="button primary hero-cta" href="#classificacao">
                Acompanhar o evento <Icon name="arrow" size={19} />
              </a>
              <div className="hero-participants">
                <div className="avatar-stack">
                  {state.participants
                    .filter((p) =>
                      ["isinha", "alice", "kurtz", "musashi"].includes(p.id),
                    )
                    .slice(0, 4)
                    .map((p) => (
                      <Avatar key={p.id} participant={p} />
                    ))}
                </div>
                <span>
                  O próximo campeão
                  <br />
                  <strong>está entre eles.</strong>
                </span>
              </div>
            </div>
            <div className="hero-art">
              <span className="art-coordinate art-coordinate--top">
                SSC / 2026
              </span>
              <ChampionshipMark />
              <div className="hero-art-caption">
                <span>O OBJETIVO É UM SÓ</span>
                <strong>JOGAR. VENCER. LEVAR.</strong>
              </div>
              <span className="art-coordinate art-coordinate--bottom">
                EST. 2026 — BR
              </span>
            </div>
            <div className="hero-bottom">
              <div className="event-phase">
                <span className="signal-dot" />
                <span>{phaseLabels[progress.phase]}</span>
              </div>
              <div className="hero-bottom-meta">
                <span>
                  <strong>04</strong> COMPETIDORES
                </span>
                <span>
                  <strong>03</strong> FASES
                </span>
                <span>
                  <Icon name="trophy" size={16} /> CHAMPIONS 2026
                </span>
              </div>
            </div>
          </div>
        </section>

        <div className="container tournament-content">
          <div className="live-toolbar" role="status" aria-live="polite">
            <span
              className={`connection-status connection-status--${connection}`}
            >
              <span />
              {connectionLabel}
            </span>
            <p>
              {connection === "preview"
                ? "O palco está pronto. A disputa começa em breve."
                : connection === "live"
                  ? "Resultados atualizados automaticamente"
                  : connection === "offline"
                    ? "Mostrando o último resultado recebido"
                    : "Buscando os resultados mais recentes…"}
              {updatedTime && (
                <span className="updated-at"> · {updatedTime}</span>
              )}
            </p>
            {(connection === "offline" || error) && (
              <button className="text-button" onClick={onRetry}>
                <Icon name="refresh" size={14} /> Tentar novamente
              </button>
            )}
          </div>
          {error && (
            <p className="notice warning">
              A conexão com os resultados foi interrompida. Tentaremos
              reconectar automaticamente.
            </p>
          )}

          {next && (
            <section className="spotlight" aria-labelledby="spotlight-title">
              <div className="spotlight-heading">
                <span className={`pill${active ? " pill-live" : ""}`}>
                  {active ? (
                    <>
                      <span className="signal-dot" /> EM ANDAMENTO
                    </>
                  ) : (
                    "PRÓXIMO CONFRONTO"
                  )}
                </span>
                <h2 id="spotlight-title">
                  {next.phase === "final"
                    ? "A grande decisão."
                    : next.phase === "boss"
                      ? "O último desafio."
                      : next.phase === "tiebreak"
                        ? "Tudo ou nada."
                        : "A disputa começa aqui."}
                </h2>
                <span className="spotlight-format">
                  {next.phase === "league"
                    ? "FASE 01"
                    : next.phase === "final"
                      ? "FASE 02"
                      : next.phase === "boss"
                        ? "FASE 03"
                        : "DESEMPATE"}{" "}
                  <span>/</span> MD{next.bestOf}
                  {next.map && (
                    <>
                      {" "}
                      <span>/</span> MAPA {next.map}
                    </>
                  )}
                </span>
              </div>
              <div className="spotlight-match">
                <PlayerName id={next.playerA} state={state} large />
                <div className="spotlight-score">
                  <strong>
                    {next.games.length ? getSeriesResult(next).winsA : "–"}
                  </strong>
                  <span>VS</span>
                  <strong>
                    {next.games.length ? getSeriesResult(next).winsB : "–"}
                  </strong>
                </div>
                <PlayerName id={next.playerB} state={state} large />
              </div>
              <a
                href="#confrontos"
                className="spotlight-link"
                aria-label="Ver todos os confrontos"
              >
                <Icon name="arrow" size={23} />
              </a>
            </section>
          )}

          {progress.phase === "finished" && champion && (
            <section className="winner-banner">
              <Icon name="trophy" size={40} />
              <div>
                <span className="eyebrow">TEMOS UM CAMPEÃO</span>
                <h2>{champion.name}</h2>
                <p>
                  {prizeUpgraded
                    ? "O chefão caiu. O pacote completo Champions 2026 é seu."
                    : "Phantom Champions 2026 garantida. Uma campanha para ficar na história."}
                </p>
              </div>
              <Avatar participant={champion} size="large" />
              <button
                className="button secondary"
                onClick={() => {
                  // Start within this gesture so mobile browsers can play the fanfare.
                  celebrationRef.current?.startMusic();
                  setCelebrationOpen(true);
                }}
              >
                Rever celebração <Icon name="trophy" size={17} />
              </button>
            </section>
          )}

          <section
            id="classificacao"
            className="standings-section section-anchor"
            aria-labelledby="standings-title"
          >
            <div className="section-heading">
              <div>
                <p className="eyebrow">
                  <span className="section-index">01</span> TODOS CONTRA TODOS
                </p>
                <h2 id="standings-title">
                  A corrida pela final<span>.</span>
                </h2>
              </div>
              <span className="section-note">
                <strong>
                  {completed} / {league.length}
                </strong>{" "}
                confrontos concluídos
              </span>
            </div>
            <div className="standings-layout">
              <div className="standings-panel">
                <div className="table-overflow">
                  <table className="standings-table">
                    <caption className="sr-only">
                      Classificação da primeira fase. Dois participantes avançam
                      para a grande final. Vitórias de confronto, derrotas e
                      rounds ganhos.
                    </caption>
                    <thead>
                      <tr>
                        <th scope="col">POS</th>
                        <th scope="col">JOGADOR</th>
                        <th scope="col">
                          <abbr title="Confrontos vencidos">V</abbr>
                        </th>
                        <th scope="col">
                          <abbr title="Confrontos perdidos">D</abbr>
                        </th>
                        <th scope="col">ROUNDS</th>
                      </tr>
                    </thead>
                    <tbody>
                      {standings.map((row) => (
                        <tr
                          key={row.participant.id}
                          className={
                            row.position <= 2 &&
                            (!progress.leagueComplete || !row.tied)
                              ? "qualification-row"
                              : ""
                          }
                        >
                          <td>
                            <span
                              className={`ranking-position${row.position <= 2 && (!progress.leagueComplete || !row.tied) ? " ranking-position--top" : ""}`}
                            >
                              {String(row.position).padStart(2, "0")}
                            </span>
                          </td>
                          <th scope="row">
                            <PlayerName id={row.participant.id} state={state} />
                            {row.tied && completed === league.length && (
                              <span className="tie-label">EMPATE</span>
                            )}
                          </th>
                          <td className="stat-wins">{row.wins}</td>
                          <td>{row.losses}</td>
                          <td className="stat-rounds">
                            {row.rounds}
                            <span> RG</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="standings-legend">
                  <span>
                    <i /> 2 vagas na grande final
                  </span>
                  <span>Vitórias → rounds → MD1</span>
                </div>
                {progress.tiesPending && completed === league.length && (
                  <div className="tie-notice">
                    <Icon name="bolt" size={18} />
                    <span>
                      <strong>Empate em aberto.</strong> As posições serão
                      definidas nas partidas extras de desempate.
                    </span>
                  </div>
                )}
              </div>
              <aside className="prize-card">
                <div className="prize-card-top">
                  <Icon name="trophy" size={20} />
                  <span>VALE A DISPUTA</span>
                  <span className="prize-edition">2026</span>
                </div>
                <div className="prize-glyph" aria-hidden="true">
                  ✦
                </div>
                <span className="eyebrow">AO VENCEDOR DA GRANDE FINAL</span>
                <h3>
                  PHANTOM
                  <br />
                  <span>CHAMPIONS 2026</span>
                </h3>
                <p>
                  Vença a final e garanta a sua.
                  <br />
                  Depois, encare o chefão pelo pacote completo.
                </p>
                <a href="#fases">
                  Entenda o caminho <Icon name="arrow" size={17} />
                </a>
              </aside>
            </div>
          </section>

          <section
            id="confrontos"
            className="section-anchor matches-section"
            aria-labelledby="matches-title"
          >
            <div className="section-heading">
              <div>
                <p className="eyebrow">
                  <span className="section-index">02</span> CADA CONFRONTO CONTA
                </p>
                <h2 id="matches-title">
                  O campo de batalha<span>.</span>
                </h2>
              </div>
              <span className="section-note">
                Todos contra todos <span className="note-divider">/</span> MD3
              </span>
            </div>
            <div className="matches-grid">
              {league.map((series) => (
                <SeriesCard key={series.id} series={series} state={state} />
              ))}
            </div>
            {tiebreaks.length > 0 && (
              <div className="tiebreaks">
                <div className="subsection-heading">
                  <Icon name="bolt" size={19} />
                  <h3>Desempates · MD1</h3>
                  <span>Rounds extras não entram na tabela</span>
                </div>
                <div className="matches-grid">
                  {tiebreaks.map((series) => (
                    <SeriesCard key={series.id} series={series} state={state} />
                  ))}
                </div>
              </div>
            )}
          </section>

          <section
            id="fases"
            className="section-anchor phases-section"
            aria-labelledby="phases-title"
          >
            <div className="section-heading">
              <div>
                <p className="eyebrow">
                  <span className="section-index">03</span> O CAMINHO ATÉ A
                  GLÓRIA
                </p>
                <h2 id="phases-title">
                  Três fases. Tudo em jogo<span>.</span>
                </h2>
              </div>
            </div>
            <div className="phase-track">
              <article
                className={`phase-card${progress.phase === "league" ? " phase-card--current" : ""}`}
              >
                <div className="phase-top">
                  <span>FASE 01</span>
                  <span>
                    {progress.leagueComplete && !progress.tiesPending ? (
                      <Icon name="check" size={19} />
                    ) : (
                      "MD3"
                    )}
                  </span>
                </div>
                <svg
                  className="phase-big-number"
                  viewBox="0 0 110 110"
                  aria-hidden="true"
                  focusable="false"
                >
                  <text x="108" y="95" textAnchor="end">
                    01
                  </text>
                </svg>
                <h3>Todos contra todos</h3>
                <p>
                  Quatro jogadores. Seis confrontos.
                  <br />
                  Os dois melhores seguem na disputa.
                </p>
                <div className="phase-progress">
                  <span
                    style={{
                      width: `${league.length ? (completed / league.length) * 100 : 0}%`,
                    }}
                  />
                </div>
                <div className="phase-bottom">
                  {completed} de {league.length} confrontos{" "}
                  <span>
                    {progress.leagueComplete
                      ? progress.tiesPending
                        ? "DESEMPATE PENDENTE"
                        : "CONCLUÍDA"
                      : "2 VAGAS"}
                  </span>
                </div>
              </article>
              <article
                className={`phase-card${progress.phase === "final" ? " phase-card--current" : ""}`}
              >
                <div className="phase-top">
                  <span>FASE 02</span>
                  <span>MD5</span>
                </div>
                <svg
                  className="phase-big-number"
                  viewBox="0 0 110 110"
                  aria-hidden="true"
                  focusable="false"
                >
                  <text x="108" y="95" textAnchor="end">
                    02
                  </text>
                </svg>
                <h3>Grande final</h3>
                <p>
                  O 1º contra o 2º colocado.
                  <br />
                  Quem fizer três vitórias é o campeão.
                </p>
                <div className="phase-duel">
                  <PlayerName
                    id={final?.playerA ?? null}
                    state={state}
                    placeholder="1º colocado"
                  />
                  <span>×</span>
                  <PlayerName
                    id={final?.playerB ?? null}
                    state={state}
                    placeholder="2º colocado"
                  />
                </div>
                <div className="phase-bottom">
                  <Icon name="trophy" size={15} /> Phantom garantida{" "}
                  {champion && (
                    <span>
                      <Icon name="check" size={16} />
                    </span>
                  )}
                </div>
              </article>
              <article
                className={`phase-card phase-card--boss${progress.phase === "boss" ? " phase-card--current" : ""}`}
              >
                <div className="phase-top">
                  <span>FASE 03</span>
                  <span>MD{boss?.bestOf ?? 1}</span>
                </div>
                <svg
                  className="phase-big-number"
                  viewBox="0 0 110 110"
                  aria-hidden="true"
                  focusable="false"
                >
                  <text x="108" y="95" textAnchor="end">
                    03
                  </text>
                </svg>
                <h3>Chefão final</h3>
                <p>
                  O campeão encara Tapioca.
                  <br />
                  Uma vitória vale o pacote completo.
                </p>
                <div className="phase-duel">
                  <PlayerName
                    id={boss?.playerA ?? progress.championId ?? null}
                    state={state}
                    placeholder="Campeão"
                  />
                  <span>×</span>
                  <PlayerName
                    id={boss?.playerB ?? "tapioca"}
                    state={state}
                    placeholder="Tapioca"
                  />
                </div>
                <div className="phase-bottom">
                  <Icon name="bolt" size={15} /> Pacote completo{" "}
                  <span>UPGRADE</span>
                </div>
              </article>
            </div>
            {(final || boss) && (
              <div className="final-matches">
                {final && <SeriesCard series={final} state={state} />}
                {boss && <SeriesCard series={boss} state={state} />}
              </div>
            )}
            <p className="prize-footnote">
              <Icon name="shield" size={15} /> A Phantom conquistada na final
              continua garantida, mesmo se o campeão perder para Tapioca.
            </p>
          </section>

          <section className="rules-section" aria-label="Regulamento do evento">
            <details className="rules-details">
              <summary>
                <span>
                  <Icon name="shield" size={21} />
                  <span>Jogo limpo. Regras claras.</span>
                </span>
                <span className="rules-toggle">
                  Ver regulamento <Icon name="plus" size={18} />
                </span>
              </summary>
              <div className="rules-grid">
                <div>
                  <span className="eyebrow">01 / ARMAS E ROUNDS</span>
                  <h3>Até 10 rounds.</h3>
                  <p>
                    1º round: somente Sheriff. Do 2º em diante: somente Vandal.
                    A faca é permitida em qualquer round. Em 9 × 9, o round
                    decisivo é somente na faca.
                  </p>
                </div>
                <div>
                  <span className="eyebrow">02 / A REGRA DA FACA</span>
                  <h3>Uma kill. Uma partida.</h3>
                  <p>
                    Matar de faca encerra a partida atual e vale uma vitória
                    dentro da série. O vencedor recebe 10 rounds oficiais; o
                    adversário mantém os rounds que tinha.
                  </p>
                </div>
                <div>
                  <span className="eyebrow">03 / CLASSIFICAÇÃO</span>
                  <h3>Vitórias, rounds, MD1.</h3>
                  <p>
                    A tabela considera confrontos vencidos e, depois, rounds
                    ganhos. Persistindo empate, há partidas extras em MD1. Seus
                    rounds não entram no total da fase regular.
                  </p>
                </div>
                <div>
                  <span className="eyebrow">04 / INFRAÇÕES</span>
                  <h3>A regra vale para todos.</h3>
                  <p>
                    Quebrar uma regra causa derrota na partida atual. O
                    adversário recebe 10 rounds oficiais; o infrator mantém os
                    rounds que tinha. A série continua, se ainda não tiver
                    vencedor.
                  </p>
                </div>
              </div>
            </details>
          </section>
          <EventRecordings state={state} />
        </div>
      </main>
      <footer className="site-footer">
        <div className="container footer-inner">
          <a className="footer-brand" href="#">
            SUPER SKIN <span>CHALLENGE.</span>
          </a>
          <p>Feito de amigos. Jogado como uma final.</p>
          <div className="footer-credits">
            <span>
              Organização <strong>Zacarias</strong>
            </span>
            <span>
              Co-owner <strong>Tapioca</strong>
            </span>
          </div>
        </div>
        <div className="container footer-bottom">
          <span>SSC © 2026</span>
          <span>
            Evento independente entre amigos. Sem afiliação à Riot Games.
          </span>
        </div>
      </footer>
      {progress.phase === "finished" && champion && (
        <WinnerCelebration
          ref={celebrationRef}
          champion={champion}
          prizeUpgraded={prizeUpgraded}
          open={celebrationOpen}
          onClose={closeCelebration}
        />
      )}
    </div>
  );
}
