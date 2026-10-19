import { useEffect, useRef, useState } from "react";
import { flushSync } from "react-dom";
import {
  EVENT_HIGHLIGHTS,
  HIGHLIGHT_PARTICIPANTS,
  type EventHighlight,
  type HighlightParticipantId,
} from "./highlights";
import "./highlights.css";

type Props = { highlights?: readonly EventHighlight[] };
type ParticipantFilter = HighlightParticipantId | "all";

const PAGE_SIZE = 12;
const CATEGORY_LABELS: Record<EventHighlight["category"], string> = {
  funny: "Resenha",
  mixed: "Jogada e reação",
  skill: "Bala",
};

function PlayIcon() {
  return (
    <svg width="25" height="25" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M7 4.9a1 1 0 0 1 1.5-.86l12 7a1.1 1.1 0 0 1 0 1.92l-12 7A1 1 0 0 1 7 19.1V4.9Z" />
    </svg>
  );
}

function DownloadIcon() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 3v12m-4-4 4 4 4-4M4 16v5h16v-5" />
    </svg>
  );
}

function durationLabel(seconds: number) {
  const whole = Math.max(1, Math.ceil(seconds));
  return `${Math.floor(whole / 60)}:${String(whole % 60).padStart(2, "0")}`;
}

function sizeLabel(bytes: number) {
  return `${(bytes / 1_000_000).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} MB`;
}

export default function EventHighlights({ highlights = EVENT_HIGHLIGHTS }: Props) {
  const [filter, setFilter] = useState<ParticipantFilter>("all");
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [failedId, setFailedId] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const posterRefs = useRef<Record<string, HTMLButtonElement | null>>({});

  const filtered = highlights.filter(
    (highlight) => filter === "all" || highlight.participantIds.includes(filter),
  );
  const visible = filtered.slice(0, visibleCount);
  const selectedParticipant = HIGHLIGHT_PARTICIPANTS.find((participant) => participant.id === filter);

  useEffect(() => {
    if (!playingId) return;
    const video = videoRef.current;
    if (!video) return;
    video.focus({ preventScroll: true });
    return () => {
      video.pause();
      video.removeAttribute("src");
      video.load();
    };
  }, [playingId]);

  if (!highlights.length) return null;

  function chooseFilter(next: ParticipantFilter) {
    setFilter(next);
    setVisibleCount(PAGE_SIZE);
    setPlayingId(null);
    setFailedId(null);
  }

  function play(highlight: EventHighlight) {
    // Mount the selected video and start it within the same user gesture,
    // including browsers that require a synchronous activation, such as Safari.
    flushSync(() => {
      setFailedId(null);
      setPlayingId(highlight.id);
    });
    const video = videoRef.current;
    if (video) void video.play().catch(() => {});
  }

  function close(highlight: EventHighlight) {
    setPlayingId(null);
    window.requestAnimationFrame(() => {
      posterRefs.current[highlight.id]?.focus({ preventScroll: true });
    });
  }

  return (
    <section id="melhores-momentos" className="highlights-section section-anchor" aria-labelledby="highlights-title">
      <div className="section-heading">
        <div>
          <p className="eyebrow"><span className="section-index">05</span> PRA GUARDAR E COMPARTILHAR</p>
          <h2 id="highlights-title">Os momentos que ficaram<span>.</span></h2>
        </div>
        <span className="section-note"><strong>{highlights.length}</strong> clipes do evento</span>
      </div>
      <p className="highlights-intro">Jogadas e resenhas para rever e compartilhar. Escolha um nome, dê o play e baixe o clipe.</p>

      <div className="highlights-toolbar">
        <div className="highlights-filters" role="group" aria-label="Filtrar clipes por participante">
          <button className="highlight-filter highlight-filter--all" type="button" aria-pressed={filter === "all"} onClick={() => chooseFilter("all")}>
            Todos <span>{highlights.length}</span>
          </button>
          {HIGHLIGHT_PARTICIPANTS.map((participant) => {
            const count = highlights.filter((highlight) => highlight.participantIds.includes(participant.id)).length;
            return (
              <button className="highlight-filter" key={participant.id} type="button" aria-pressed={filter === participant.id} disabled={!count} onClick={() => chooseFilter(participant.id)}>
                <span className="highlight-filter__avatar" aria-hidden="true">
                  {participant.name.slice(0, 2).toUpperCase()}
                  <img src={participant.avatarUrl} alt="" loading="lazy" onError={(event) => { event.currentTarget.style.display = "none"; }} />
                </span>
                {participant.name} <span>{count}</span>
              </button>
            );
          })}
        </div>
        <p className="highlights-count" aria-live="polite" aria-atomic="true">
          {filtered.length} {filtered.length === 1 ? "clipe" : "clipes"}{selectedParticipant ? ` com ${selectedParticipant.name}` : " de todos os participantes"}
        </p>
      </div>

      <div className="highlights-grid">
        {visible.map((highlight) => {
          const playing = highlight.id === playingId;
          const failed = highlight.id === failedId;
          return (
            <article className={`highlight-card${playing ? " is-playing" : ""}`} key={highlight.id} aria-labelledby={`highlight-title-${highlight.id}`}>
              <div className="highlight-card__screen">
                {playing ? (
                  <>
                    <video ref={videoRef} key={highlight.id} src={highlight.videoUrl} poster={highlight.posterUrl} controls playsInline preload="none" aria-label={`Clipe: ${highlight.title}`} onError={() => setFailedId(highlight.id)} />
                    <button className="highlight-card__close" type="button" onClick={() => close(highlight)} aria-label={`Fechar vídeo: ${highlight.title}`}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><path d="m6 6 12 12M6 18 18 6" /></svg>
                    </button>
                  </>
                ) : (
                  <button ref={(element) => { posterRefs.current[highlight.id] = element; }} className="highlight-card__poster" type="button" onClick={() => play(highlight)} aria-label={`Assistir clipe: ${highlight.title}, ${durationLabel(highlight.durationSeconds)}`}>
                    <img src={highlight.posterUrl} alt="" loading="lazy" decoding="async" />
                    <span className="highlight-card__play"><PlayIcon /></span>
                    <span className="highlight-card__duration" aria-hidden="true">{durationLabel(highlight.durationSeconds)}</span>
                  </button>
                )}
              </div>
              <div className="highlight-card__content">
                <span className="highlight-card__category">{CATEGORY_LABELS[highlight.category]}</span>
                <h3 id={`highlight-title-${highlight.id}`}>{highlight.title}</h3>
                <span className="sr-only">Duração: {durationLabel(highlight.durationSeconds)}.</span>
                <p className="highlight-card__description">{highlight.description}</p>
                {failed && <p className="highlight-card__error" role="alert">Não foi possível reproduzir agora. Você pode baixar o clipe abaixo.</p>}
                <div className="highlight-card__people" role="group" aria-label="Participantes neste clipe">
                  {!highlight.participantIds.length && <span>Resenha da turma</span>}
                  {highlight.participantIds.map((id) => {
                    const participant = HIGHLIGHT_PARTICIPANTS.find((person) => person.id === id);
                    return participant ? <span key={id}>{participant.name}</span> : null;
                  })}
                </div>
                <div className="highlight-card__footer">
                  <span>MP4 <span aria-hidden="true">·</span> {sizeLabel(highlight.sizeBytes)}</span>
                  <a className="highlight-card__download" href={highlight.downloadUrl ?? highlight.videoUrl} download={highlight.downloadFilename}>
                    <DownloadIcon /> Baixar<span className="sr-only"> clipe: {highlight.title}</span>
                  </a>
                </div>
              </div>
            </article>
          );
        })}
      </div>

      {visibleCount < filtered.length && (
        <div className="highlights-more">
          <span>{visible.length} de {filtered.length} clipes</span>
          <button type="button" className="highlights-more__button" onClick={() => setVisibleCount((count) => count + PAGE_SIZE)}>
            Ver mais clipes <span aria-hidden="true">+</span>
          </button>
        </div>
      )}
    </section>
  );
}
