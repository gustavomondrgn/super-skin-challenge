import { useEffect, useId, useImperativeHandle, useRef } from "react";
import type { CSSProperties, Ref } from "react";
import type { Participant } from "./domain";
import { useCelebrationMusic } from "./useCelebrationMusic";
import "./winner-celebration.css";

export type WinnerCelebrationHandle = {
  startMusic: () => void;
};

type WinnerCelebrationProps = {
  ref?: Ref<WinnerCelebrationHandle>;
  champion: Participant;
  prizeUpgraded: boolean;
  open: boolean;
  onClose: () => void;
};

const CONFETTI_COLORS = ["#f5d48d", "#ff5267", "#fff4db", "#cf9c48", "#ffb1ad"];
const CONFETTI = Array.from(
  { length: 144 },
  (_, index) =>
    ({
      "--confetti-left": `${(index * 37 + 3) % 100}%`,
      "--confetti-drift": `${((index * 23) % 241) - 120}px`,
      "--confetti-delay": `${-((index * 17) % 71) / 10}s`,
      "--confetti-duration": `${4.4 + (index % 11) * 0.28}s`,
      "--confetti-rotation": `${360 + ((index * 137) % 1080)}deg`,
      "--confetti-color": CONFETTI_COLORS[index % CONFETTI_COLORS.length],
      "--confetti-width": `${5 + (index % 6)}px`,
    }) as CSSProperties,
);

function WinnerTrophy() {
  return (
    <svg
      viewBox="0 0 64 64"
      fill="none"
      aria-hidden="true"
      className="winner-celebration__trophy"
    >
      <path
        d="M22 12h20v15c0 7-4.5 12-10 12S22 34 22 27V12Z"
        fill="currentColor"
        fillOpacity=".15"
      />
      <path
        d="M22 12h20v15c0 7-4.5 12-10 12S22 34 22 27V12Zm0 5H12v7c0 6 4 10 11 10m19-17h10v7c0 6-4 10-11 10M32 39v10m-10 5h20m-15-5h10"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default function WinnerCelebration({
  ref,
  champion,
  prizeUpgraded,
  open,
  onClose,
}: WinnerCelebrationProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const dismissalSent = useRef(false);
  const onCloseRef = useRef(onClose);
  const titleId = useId();
  const descriptionId = useId();
  const music = useCelebrationMusic(open);
  useImperativeHandle(ref, () => ({ startMusic: music.play }), [music.play]);
  onCloseRef.current = onClose;

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (!open) {
      if (dialog.open) dialog.close();
      return;
    }

    dismissalSent.current = false;
    if (!dialog.open) dialog.showModal();
    dialog.scrollTop = 0;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
      if (dialog.open) dialog.close();
    };
  }, [open]);

  const requestClose = () => {
    if (dismissalSent.current) return;
    dismissalSent.current = true;
    music.stop();
    onCloseRef.current();
  };

  return (
    <dialog
      ref={dialogRef}
      className="winner-celebration"
      aria-labelledby={titleId}
      aria-describedby={descriptionId}
      onCancel={(event) => {
        // The parent owns visibility. Handling Escape here avoids a native
        // close event also dismissing the next dialog during StrictMode setup.
        event.preventDefault();
        requestClose();
      }}
    >
      {open && (
        <>
          <div className="winner-celebration__ambience" aria-hidden="true">
            <div className="winner-celebration__rays" />
            <div className="winner-celebration__spotlight winner-celebration__spotlight--left" />
            <div className="winner-celebration__spotlight winner-celebration__spotlight--right" />
            <div className="winner-celebration__halo" />
            <span className="winner-celebration__spark winner-celebration__spark--one" />
            <span className="winner-celebration__spark winner-celebration__spark--two" />
            <span className="winner-celebration__spark winner-celebration__spark--three" />
            <span className="winner-celebration__spark winner-celebration__spark--four" />
            <span className="winner-celebration__watermark">CHAMPION</span>
          </div>
          <div className="winner-celebration__confetti" aria-hidden="true">
            {CONFETTI.map((style, index) => (
              <span key={index} style={style} />
            ))}
          </div>
          <div className="winner-celebration__controls">
            {music.supported && (
              <button
                type="button"
                className="winner-celebration__music"
                aria-label={music.playing ? "Silenciar música" : "Ativar música"}
                aria-pressed={music.playing}
                onClick={music.playing ? music.stop : music.play}
              >
                <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path d="m11 5-6 4H2v6h3l6 4V5Z" />
                  {music.playing ? (
                    <path d="M15 8a6 6 0 0 1 0 8m3-11a10 10 0 0 1 0 14" />
                  ) : (
                    <path d="m16 9 6 6m0-6-6 6" />
                  )}
                </svg>
                <span className="winner-celebration__music-label">
                  {music.playing ? "Silenciar música" : "Ativar música"}
                </span>
              </button>
            )}
            <button
              type="button"
              className="winner-celebration__close"
              aria-label="Fechar celebração e ver histórico do evento"
              onClick={requestClose}
              autoFocus
            >
              <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path d="m6 6 12 12M6 18 18 6" />
              </svg>
            </button>
          </div>
          <div className="winner-celebration__stage">
            <div className="winner-celebration__content">
              <p className="winner-celebration__eyebrow">
                SUPER SKIN CHALLENGE <span>2026</span>
              </p>
              <div
                className="winner-celebration__portrait"
                style={{ "--winner-accent": champion.accent } as CSSProperties}
              >
                <span className="winner-celebration__initials" aria-hidden="true">
                  {champion.name.slice(0, 2).toUpperCase()}
                </span>
                {champion.avatar && (
                  <img
                    key={champion.avatar}
                    src={champion.avatar}
                    alt=""
                    onError={(event) => {
                      event.currentTarget.style.display = "none";
                    }}
                  />
                )}
                <span className="winner-celebration__trophy-badge">
                  <WinnerTrophy />
                </span>
              </div>
              <p className="winner-celebration__champion-label">
                CAMPEÃO DO EVENTO
              </p>
              <h1 id={titleId} className="winner-celebration__name">
                {champion.name}
              </h1>
              <p id={descriptionId} className="winner-celebration__description">
                {prizeUpgraded
                  ? "Venceu a grande final, derrotou Tapioca e levou tudo."
                  : "Venceu a grande final. A Champions já tem dono."}
              </p>
              <div className="winner-celebration__prize">
                <span className="winner-celebration__prize-label">
                  {prizeUpgraded ? "UPGRADE CONQUISTADO" : "PREMIAÇÃO GARANTIDA"}
                </span>
                <strong>
                  {prizeUpgraded ? "PACOTE COMPLETO" : "PHANTOM"}
                  <span>CHAMPIONS 2026</span>
                </strong>
              </div>
              <button
                type="button"
                className="winner-celebration__history"
                onClick={requestClose}
              >
                Ver histórico do evento
                <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path d="M5 12h14m-6-6 6 6-6 6" />
                </svg>
              </button>
              <p className="winner-celebration__footnote">
                Cada round fez parte dessa história.
              </p>
            </div>
          </div>
        </>
      )}
    </dialog>
  );
}
