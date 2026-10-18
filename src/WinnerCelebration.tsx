import { useEffect, useId, useRef } from "react";
import type { CSSProperties } from "react";
import type { Participant } from "./domain";
import "./winner-celebration.css";

type WinnerCelebrationProps = {
  champion: Participant;
  prizeUpgraded: boolean;
  open: boolean;
  onClose: () => void;
};

const CONFETTI_COLORS = ["#e6c98c", "#ff6472", "#f4eee0", "#b89759"];
const CONFETTI = Array.from(
  { length: 40 },
  (_, index) =>
    ({
      "--confetti-left": `${(index * 37 + 3) % 100}%`,
      "--confetti-drift": `${((index * 23) % 61) - 30}px`,
      "--confetti-delay": `${((index * 43) % 8) * 0.08}s`,
      "--confetti-duration": `${2.6 + (index % 7) * 0.1}s`,
      "--confetti-rotation": `${180 + ((index * 137) % 540)}deg`,
      "--confetti-color": CONFETTI_COLORS[index % CONFETTI_COLORS.length],
      "--confetti-width": `${5 + (index % 4)}px`,
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
          <div className="winner-celebration__confetti" aria-hidden="true">
            {CONFETTI.map((style, index) => (
              <span key={index} style={style} />
            ))}
          </div>
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
                ? "Venceu a grande final, derrotou Zacarias e levou tudo."
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
        </>
      )}
    </dialog>
  );
}
