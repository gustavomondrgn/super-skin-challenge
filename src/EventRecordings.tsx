import { useRef, useState } from "react";
import { getSeriesResult, type Series, type TournamentState } from "./domain";
import { Avatar } from "./PublicPage";
import { EVENT_RECORDINGS, type EventRecording } from "./recordings";
import "./recordings.css";

type Props = {
  state: TournamentState;
  recordings?: readonly EventRecording[];
};

type AvailableRecording = EventRecording & { series: Series };

const PHASE_NAMES: Record<Series["phase"], string> = {
  league: "Todos contra todos",
  tiebreak: "Desempate",
  final: "Grande final",
  boss: "Chefão final",
};

function PlayIcon({ small = false }: { small?: boolean }) {
  return (
    <svg
      width={small ? 16 : 27}
      height={small ? 16 : 27}
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M7 4.9a1 1 0 0 1 1.5-.86l12 7a1.1 1.1 0 0 1 0 1.92l-12 7A1 1 0 0 1 7 19.1V4.9Z" />
    </svg>
  );
}

function ExternalIcon() {
  return (
    <svg
      width="17"
      height="17"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M14 4h6v6m0-6L10 14m0-9H4v15h15v-6" />
    </svg>
  );
}

function durationLabel(seconds: number) {
  if (!Number.isFinite(seconds) || seconds <= 0) return null;
  const whole = Math.floor(seconds);
  const hours = Math.floor(whole / 3600);
  const minutes = Math.floor((whole % 3600) / 60);
  const remaining = String(whole % 60).padStart(2, "0");
  return hours
    ? `${hours}:${String(minutes).padStart(2, "0")}:${remaining}`
    : `${minutes}:${remaining}`;
}

function seriesLabel(series: Series) {
  return series.phase === "league"
    ? `Confronto ${String(series.order).padStart(2, "0")}`
    : PHASE_NAMES[series.phase];
}

function resultLabel(series: Series) {
  const result = getSeriesResult(series);
  return series.games.length ? `${result.winsA} × ${result.winsB}` : "×";
}

function Matchup({
  recording,
  state,
}: {
  recording: AvailableRecording;
  state: TournamentState;
}) {
  const { series } = recording;
  const a = state.participants.find(
    (participant) => participant.id === series.playerA,
  );
  const b = state.participants.find(
    (participant) => participant.id === series.playerB,
  );
  const result = getSeriesResult(series);
  return (
    <span className="recording-matchup">
      {[
        { player: a, wins: result.winsA },
        { player: b, wins: result.winsB },
      ].map(({ player, wins }, index) => (
        <span
          key={player?.id ?? index}
          className={`recording-matchup__player${player?.id === result.winnerId ? " is-winner" : ""}`}
        >
          <Avatar participant={player} />
          <span>{player?.name ?? "A definir"}</span>
          <strong>{series.games.length ? wins : "–"}</strong>
        </span>
      ))}
    </span>
  );
}

export default function EventRecordings({
  state,
  recordings = EVENT_RECORDINGS,
}: Props) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [playingVideoId, setPlayingVideoId] = useState<string | null>(null);
  const viewerRef = useRef<HTMLDivElement>(null);
  const available = recordings
    .flatMap((recording): AvailableRecording[] => {
      const series = state.series.find(
        (item) => item.id === recording.seriesId,
      );
      return series && /^[A-Za-z0-9_-]{11}$/.test(recording.youtubeId)
        ? [{ ...recording, series }]
        : [];
    })
    .sort((a, b) => a.series.order - b.series.order);
  const selected =
    available.find((recording) => recording.seriesId === selectedId) ??
    available[0];

  if (!selected) return null;

  const a = state.participants.find(
    (participant) => participant.id === selected.series.playerA,
  );
  const b = state.participants.find(
    (participant) => participant.id === selected.series.playerB,
  );
  const matchup = `${a?.name ?? "A definir"} × ${b?.name ?? "A definir"}`;
  const duration = durationLabel(selected.durationSeconds);
  const notes = selected.notes?.trim();
  const playing = playingVideoId === selected.youtubeId;

  function play(recording: AvailableRecording) {
    setSelectedId(recording.seriesId);
    setPlayingVideoId(recording.youtubeId);
  }

  function selectRecording(recording: AvailableRecording) {
    setSelectedId(recording.seriesId);
    setPlayingVideoId(null);
    window.requestAnimationFrame(() => {
      viewerRef.current?.focus({ preventScroll: true });
      viewerRef.current?.scrollIntoView({
        block: "start",
        behavior: window.matchMedia("(prefers-reduced-motion: reduce)")
          .matches
          ? "auto"
          : "smooth",
      });
    });
  }

  const groups = [
    {
      key: "league",
      title: "Todos contra todos",
      label: "FASE 01",
      entries: available.filter(
        (recording) => recording.series.phase === "league",
      ),
    },
    {
      key: "tiebreak",
      title: "Desempates",
      label: "PARTIDAS EXTRAS",
      entries: available.filter(
        (recording) => recording.series.phase === "tiebreak",
      ),
    },
    {
      key: "decisions",
      title: "As decisões",
      label: "FASES 02 E 03",
      entries: available.filter(
        (recording) =>
          recording.series.phase === "final" ||
          recording.series.phase === "boss",
      ),
    },
  ].filter((group) => group.entries.length);

  return (
    <section
      id="gravacoes"
      className="recordings-section section-anchor"
      aria-labelledby="recordings-title"
    >
      <div className="section-heading">
        <div>
          <p className="eyebrow">
            <span className="section-index">04</span> O EVENTO PARA REVER
          </p>
          <h2 id="recordings-title">
            Cada duelo, guardado<span>.</span>
          </h2>
        </div>
        <span className="section-note">
          <strong>{available.length}</strong>{" "}
          {available.length === 1 ? "confronto gravado" : "confrontos gravados"}
        </span>
      </div>

      <div
        className="recordings-viewer"
        ref={viewerRef}
        tabIndex={-1}
        aria-label="Vídeo selecionado"
      >
        <div className="recordings-screen">
          {playing ? (
            <iframe
              key={selected.youtubeId}
              src={`https://www.youtube-nocookie.com/embed/${selected.youtubeId}?autoplay=1&rel=0&playsinline=1`}
              title={`${selected.title || seriesLabel(selected.series)} — ${matchup}`}
              loading="lazy"
              allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture; web-share"
              referrerPolicy="strict-origin-when-cross-origin"
              allowFullScreen
            />
          ) : (
            <button
              className="recordings-poster"
              type="button"
              onClick={() => play(selected)}
            >
              <span className="sr-only">
                {seriesLabel(selected.series)}: {matchup}.
              </span>
              <span className="recordings-poster__edition">
                SUPER SKIN CHALLENGE <span>2026</span>
              </span>
              <span className="recordings-poster__duel" aria-hidden="true">
                <span>
                  <Avatar participant={a} size="large" />
                  <strong>{a?.name ?? "A definir"}</strong>
                </span>
                <span className="recordings-play">
                  <PlayIcon />
                </span>
                <span>
                  <Avatar participant={b} size="large" />
                  <strong>{b?.name ?? "A definir"}</strong>
                </span>
              </span>
              <span className="recordings-poster__bottom">
                <span>Assistir ao confronto</span>
                {duration && (
                  <time dateTime={`PT${Math.floor(selected.durationSeconds)}S`}>
                    {duration}
                  </time>
                )}
              </span>
            </button>
          )}
        </div>
        <div
          className="recordings-current"
          aria-live="polite"
          aria-atomic="true"
        >
          <span className="eyebrow">
            {playing ? "AGORA NO PLAYER" : "GRAVAÇÃO DO EVENTO"}
          </span>
          <p className="recordings-current__phase">
            {PHASE_NAMES[selected.series.phase]}{" "}
            <span>/ MD{selected.series.bestOf}</span>
          </p>
          <h3>{matchup}</h3>
          <div className="recordings-current__score">
            <strong>{resultLabel(selected.series)}</strong>
            <span>
              {selected.series.games.length}{" "}
              {selected.series.games.length === 1 ? "partida" : "partidas"}
              {duration && <> · {duration}</>}
            </span>
          </div>
          {selected.series.games.length > 0 && (
            <div
              className="recordings-rounds"
              aria-label="Placares de rounds das partidas"
            >
              {selected.series.games.map((game, index) => (
                <span key={index}>
                  <small>P{index + 1}</small>
                  {game.scoreA} × {game.scoreB}
                </span>
              ))}
            </div>
          )}
          {notes && <p className="recordings-note">{notes}</p>}
          <a
            className="recordings-external"
            href={`https://www.youtube.com/watch?v=${selected.youtubeId}`}
            target="_blank"
            rel="noopener noreferrer"
          >
            Abrir no YouTube <ExternalIcon />
          </a>
        </div>
      </div>

      <div className="recordings-groups">
        {groups.map((group) => (
          <div
            className={`recordings-group recordings-group--${group.key}`}
            key={group.key}
          >
            <div className="recordings-group__heading">
              <h3>{group.title}</h3>
              <span>{group.label}</span>
            </div>
            <div className="recordings-grid">
              {group.entries.map((recording) => {
                const current = selected.seriesId === recording.seriesId;
                const cardDuration = durationLabel(recording.durationSeconds);
                return (
                  <button
                    key={recording.seriesId}
                    className={`recording-card${current ? " is-selected" : ""}${recording.series.phase !== "league" ? " recording-card--decision" : ""}`}
                    type="button"
                    aria-pressed={current}
                    onClick={() => selectRecording(recording)}
                  >
                    <span className="recording-card__top">
                      <span>{seriesLabel(recording.series)}</span>
                      <span>
                        MD{recording.series.bestOf}
                        {cardDuration && <> · {cardDuration}</>}
                      </span>
                    </span>
                    <Matchup recording={recording} state={state} />
                    <span className="recording-card__bottom">
                      <span>
                        <PlayIcon small />
                        {current
                          ? playing ? "No player" : "Selecionado"
                          : "Ver confronto"}
                      </span>
                      <span>REPLAY</span>
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
