export interface EventRecording {
  /** The matching series in TournamentState, e.g. league-1, final or boss. */
  seriesId: string;
  /** The 11-character YouTube video ID, without a URL. */
  youtubeId: string;
  title: string;
  durationSeconds: number;
  notes?: string;
}

/** Only published recordings belong here. An empty archive stays hidden. */
export const EVENT_RECORDINGS: readonly EventRecording[] = [
  {
    seriesId: "league-1",
    youtubeId: "dk9iWq2JGNA",
    title: "isinha × Alice — BO3",
    durationSeconds: 644.5,
  },
  {
    seriesId: "league-2",
    youtubeId: "tZo_xBmeYdQ",
    title: "Kurtz × Musashi — BO3",
    durationSeconds: 1150.2,
    notes:
      "Um round de Musashi no jogo 1 não foi capturado na gravação original. O vídeo retoma com o placar atualizado.",
  },
  {
    seriesId: "league-3",
    youtubeId: "uRmxGVmrvI0",
    title: "isinha × Kurtz — BO3",
    durationSeconds: 636,
  },
  {
    seriesId: "league-4",
    youtubeId: "ez4jo8fm00U",
    title: "Alice × Musashi — BO3",
    durationSeconds: 554.1,
    notes: "O último round do jogo 1 não foi capturado na gravação original.",
  },
  {
    seriesId: "league-5",
    youtubeId: "gm00e7iYi7o",
    title: "isinha × Musashi — BO3",
    durationSeconds: 927.3,
    notes:
      "Dois rounds do jogo 2 não foram capturados na gravação original. O vídeo retoma com o placar atualizado.",
  },
  {
    seriesId: "league-6",
    youtubeId: "El3XrmKNXmg",
    title: "Alice × Kurtz — BO3",
    durationSeconds: 686.3,
  },
  {
    seriesId: "final",
    youtubeId: "jWBmLbesbrM",
    title: "Grande final — Musashi × isinha — BO5",
    durationSeconds: 2327.9,
    notes:
      "Um round de isinha no jogo 1 não foi capturado na gravação original. O vídeo retoma com o placar atualizado.",
  },
  {
    seriesId: "boss",
    youtubeId: "JXCFKYy5HWg",
    title: "Pacote Champions — Musashi × Tapioca — BO1",
    durationSeconds: 370.4,
    notes:
      "Dois rounds, um de cada jogador, não foram capturados na gravação original. O vídeo retoma com o placar atualizado.",
  },
];
