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
];
