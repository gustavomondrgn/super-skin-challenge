import { afterEach, describe, expect, it, vi } from "vitest";
import {
  DUEL_MAPS,
  DownstreamResultsError,
  addTiebreak,
  applyGameResult,
  createInitialState,
  drawSeriesMap,
  getProgress,
  getSeriesResult,
  getStandings,
  removeGameResult,
  setActiveSeries,
  validateState,
  type TournamentState,
} from "./domain";

// Exact public tournament data from the version-49 backup, kept inline so CI
// does not depend on the ignored .qa directory or any production connection.
const legacyProductionSnapshot = {
  series: [
    {
      id: "league-1",
      map: "A",
      games: [
        {
          reason: "normal",
          scoreA: 10,
          scoreB: 5,
          winnerId: "isinha",
        },
        {
          reason: "knife",
          scoreA: 4,
          scoreB: 10,
          winnerId: "alice",
          scoreAtTermination: {
            a: 4,
            b: 1,
          },
        },
        {
          reason: "normal",
          scoreA: 10,
          scoreB: 3,
          winnerId: "isinha",
        },
      ],
      order: 1,
      phase: "league",
      bestOf: 3,
      playerA: "isinha",
      playerB: "alice",
    },
    {
      id: "league-2",
      map: "B",
      games: [
        {
          reason: "normal",
          scoreA: 10,
          scoreB: 8,
          winnerId: "kurtz",
        },
        {
          reason: "normal",
          scoreA: 2,
          scoreB: 10,
          winnerId: "musashi",
        },
        {
          reason: "normal",
          scoreA: 5,
          scoreB: 10,
          winnerId: "musashi",
        },
      ],
      order: 2,
      phase: "league",
      bestOf: 3,
      playerA: "kurtz",
      playerB: "musashi",
    },
    {
      id: "league-3",
      map: "C",
      games: [
        {
          reason: "normal",
          scoreA: 10,
          scoreB: 4,
          winnerId: "isinha",
        },
        {
          reason: "normal",
          scoreA: 10,
          scoreB: 6,
          winnerId: "isinha",
        },
      ],
      order: 3,
      phase: "league",
      bestOf: 3,
      playerA: "isinha",
      playerB: "kurtz",
    },
    {
      id: "league-4",
      map: "E",
      games: [
        {
          reason: "normal",
          scoreA: 4,
          scoreB: 10,
          winnerId: "musashi",
        },
        {
          reason: "normal",
          scoreA: 5,
          scoreB: 10,
          winnerId: "musashi",
        },
      ],
      order: 4,
      phase: "league",
      bestOf: 3,
      playerA: "alice",
      playerB: "musashi",
    },
    {
      id: "league-5",
      map: "A",
      games: [
        {
          reason: "normal",
          scoreA: 8,
          scoreB: 10,
          winnerId: "musashi",
        },
        {
          reason: "normal",
          scoreA: 9,
          scoreB: 10,
          winnerId: "musashi",
        },
      ],
      order: 5,
      phase: "league",
      bestOf: 3,
      playerA: "isinha",
      playerB: "musashi",
    },
    {
      id: "league-6",
      map: "C",
      games: [
        {
          reason: "normal",
          scoreA: 8,
          scoreB: 10,
          winnerId: "kurtz",
        },
        {
          reason: "normal",
          scoreA: 6,
          scoreB: 10,
          winnerId: "kurtz",
        },
      ],
      order: 6,
      phase: "league",
      bestOf: 3,
      playerA: "alice",
      playerB: "kurtz",
    },
    {
      id: "final",
      map: "E",
      games: [
        {
          reason: "normal",
          scoreA: 7,
          scoreB: 10,
          winnerId: "isinha",
        },
        {
          reason: "normal",
          scoreA: 9,
          scoreB: 10,
          winnerId: "isinha",
        },
        {
          reason: "normal",
          scoreA: 10,
          scoreB: 9,
          winnerId: "musashi",
        },
        {
          reason: "normal",
          scoreA: 10,
          scoreB: 4,
          winnerId: "musashi",
        },
        {
          reason: "normal",
          scoreA: 10,
          scoreB: 6,
          winnerId: "musashi",
        },
      ],
      order: 7,
      phase: "final",
      bestOf: 5,
      playerA: "musashi",
      playerB: "isinha",
    },
    {
      id: "boss",
      map: "A",
      games: [],
      order: 8,
      phase: "boss",
      bestOf: 3,
      playerA: "musashi",
      playerB: "zacarias",
    },
  ],
  participants: [
    {
      id: "isinha",
      name: "isinha",
      accent: "#e68cc9",
      avatar: "/avatars/isinha.png",
    },
    {
      id: "alice",
      name: "alice",
      accent: "#9d95e8",
      avatar: "/avatars/alice.png",
    },
    {
      id: "kurtz",
      name: "kurtz",
      accent: "#71c9ba",
      avatar: "/avatars/kurtz.png",
    },
    {
      id: "musashi",
      name: "musashi",
      accent: "#e1ae68",
      avatar: "/avatars/musashi.png",
    },
    {
      id: "zacarias",
      name: "Zacarias",
      accent: "#d6b478",
      avatar: null,
    },
  ],
  schemaVersion: 1,
  activeSeriesId: "boss",
};

function sweep(
  state: TournamentState,
  id: string,
  side: "a" | "b",
): TournamentState {
  const series = state.series.find((item) => item.id === id)!;
  const target = Math.floor(series.bestOf / 2) + 1;
  for (let index = 0; index < target; index += 1) {
    state = applyGameResult(state, id, index, {
      scoreA: side === "a" ? 10 : 0,
      scoreB: side === "b" ? 10 : 0,
      reason: "normal",
    });
  }
  return state;
}

function league(
  winners: ("a" | "b")[] = ["a", "a", "a", "a", "a", "a"],
): TournamentState {
  return winners.reduce(
    (state, side, index) => sweep(state, `league-${index + 1}`, side),
    createInitialState(),
  );
}

function md1(
  state: TournamentState,
  a: string,
  b: string,
  side: "a" | "b",
): TournamentState {
  const next = addTiebreak(state, a, b);
  return sweep(
    next,
    next.series.filter((series) => series.phase === "tiebreak").at(-1)!.id,
    side,
  );
}

describe("official event structure", () => {
  it("creates exactly six unique MD3 round-robin confrontations and excludes Tapioca from the table", () => {
    const state = createInitialState();
    const matches = state.series.filter((series) => series.phase === "league");
    expect(matches).toHaveLength(6);
    const unique = matches.map((series) =>
      [series.playerA, series.playerB].sort().join("|"),
    );
    expect(new Set(unique).size).toBe(6);
    for (const row of getStandings(state)) {
      expect(
        matches.filter((series) =>
          [series.playerA, series.playerB].includes(row.participant.id),
        ),
      ).toHaveLength(3);
      expect(row.tied).toBe(false);
    }
    expect(getStandings(state).map((row) => row.participant.id)).not.toContain(
      "tapioca",
    );
    expect(
      state.series.find((series) => series.id === "final")!.playerA,
    ).toBeNull();
    expect(
      state.series.find((series) => series.id === "boss")!.playerB,
    ).toBeNull();
    expect(validateState(state)).toEqual(state);
  });

  it("counts series wins separately from game wins and counts rounds from every league game", () => {
    let state = applyGameResult(createInitialState(), "league-1", 0, {
      scoreA: 10,
      scoreB: 9,
      reason: "normal",
    });
    let isinha = getStandings(state).find(
      (row) => row.participant.id === "isinha",
    )!;
    expect(isinha).toMatchObject({ wins: 0, losses: 0, played: 0, rounds: 10 });
    state = applyGameResult(state, "league-1", 1, {
      scoreA: 7,
      scoreB: 10,
      reason: "normal",
    });
    state = applyGameResult(state, "league-1", 2, {
      scoreA: 10,
      scoreB: 6,
      reason: "normal",
    });
    isinha = getStandings(state).find(
      (row) => row.participant.id === "isinha",
    )!;
    expect(isinha).toMatchObject({ wins: 1, losses: 0, played: 1, rounds: 27 });
    expect(
      getStandings(state).find((row) => row.participant.id === "alice"),
    ).toMatchObject({ wins: 0, losses: 1, played: 1, rounds: 25 });
    expect(getSeriesResult(state.series[0]!)).toMatchObject({
      winsA: 2,
      winsB: 1,
      completed: true,
      winnerId: "isinha",
    });
  });

  it("normalizes knife and punishment wins while preserving the real score and only winning one game", () => {
    let state = applyGameResult(createInitialState(), "league-1", 0, {
      scoreA: 1,
      scoreB: 4,
      reason: "knife",
      winnerId: "isinha",
    });
    expect(state.series[0]!.games[0]).toEqual({
      scoreA: 10,
      scoreB: 4,
      reason: "knife",
      winnerId: "isinha",
      scoreAtTermination: { a: 1, b: 4 },
    });
    expect(getSeriesResult(state.series[0]!)).toMatchObject({
      winsA: 1,
      winsB: 0,
      completed: false,
    });
    state = applyGameResult(state, "league-1", 1, {
      scoreA: 8,
      scoreB: 2,
      reason: "violation",
      winnerId: "alice",
    });
    expect(state.series[0]!.games[1]).toMatchObject({
      scoreA: 8,
      scoreB: 10,
      scoreAtTermination: { a: 8, b: 2 },
    });
    expect(getSeriesResult(state.series[0]!)).toMatchObject({
      winsA: 1,
      winsB: 1,
      completed: false,
    });
    expect(
      getStandings(state).find((row) => row.participant.id === "isinha")!
        .rounds,
    ).toBe(18);
    expect(validateState(state)).toEqual(state);
  });

  it("records the mandatory knife decider at 9–9 as an official 10–9", () => {
    const state = applyGameResult(createInitialState(), "league-1", 0, {
      scoreA: 9,
      scoreB: 9,
      reason: "knife",
      winnerId: "alice",
    });
    expect(state.series[0]!.games[0]).toMatchObject({
      scoreA: 9,
      scoreB: 10,
      scoreAtTermination: { a: 9, b: 9 },
    });
  });

  it("advances the two qualifiers, guarantees the champion, and closes the boss challenge", () => {
    let state = league();
    expect(getProgress(state)).toMatchObject({
      leagueComplete: true,
      tiesPending: false,
      phase: "final",
      championId: null,
    });
    expect(state.series.find((series) => series.id === "final")).toMatchObject({
      playerA: "isinha",
      playerB: "alice",
      bestOf: 5,
    });
    expect(
      getStandings(state).map((row) => [
        row.participant.id,
        row.wins,
        row.rounds,
      ]),
    ).toEqual([
      ["isinha", 3, 60],
      ["alice", 2, 40],
      ["kurtz", 1, 20],
      ["musashi", 0, 0],
    ]);
    state = sweep(state, "final", "a");
    expect(getProgress(state)).toMatchObject({
      phase: "boss",
      championId: "isinha",
    });
    expect(state.series.find((series) => series.id === "boss")).toMatchObject({
      playerA: "isinha",
      playerB: "tapioca",
    });
    state = sweep(state, "boss", "b");
    expect(getProgress(state)).toMatchObject({
      phase: "finished",
      championId: "isinha",
      bossWinnerId: "tapioca",
    });
    expect(validateState(JSON.parse(JSON.stringify(state)))).toEqual(state);
  });
});

describe("MD1 and ranking", () => {
  it("uses total rounds ahead of head-to-head when league wins are equal", () => {
    let state = league(["a", "a", "a", "a", "b", "a"]);
    state = applyGameResult(state, "league-1", 0, {
      scoreA: 10,
      scoreB: 1,
      reason: "normal",
    });
    const top = getStandings(state).slice(0, 2);
    expect(
      top.map((row) => [row.participant.id, row.wins, row.rounds, row.tied]),
    ).toEqual([
      ["alice", 2, 41, false],
      ["isinha", 2, 40, false],
    ]);
    state = md1(state, "kurtz", "musashi", "a");
    expect(state.series.find((series) => series.id === "final")).toMatchObject({
      playerA: "alice",
      playerB: "isinha",
    });
  });

  it("leaves absolute ties visible and blocks advancement until every tied position is resolved", () => {
    let state = league(["a", "a", "a", "a", "b", "a"]);
    expect(getStandings(state).map((row) => [row.position, row.tied])).toEqual([
      [1, true],
      [1, true],
      [3, true],
      [3, true],
    ]);
    expect(getProgress(state)).toMatchObject({
      tiesPending: true,
      phase: "league",
    });
    expect(
      state.series.find((series) => series.id === "final")!.playerA,
    ).toBeNull();
    state = md1(state, "isinha", "alice", "b");
    expect(
      getStandings(state).map((row) => [
        row.participant.id,
        row.position,
        row.tied,
      ]),
    ).toEqual([
      ["alice", 1, false],
      ["isinha", 2, false],
      ["kurtz", 3, true],
      ["musashi", 3, true],
    ]);
    expect(getProgress(state).tiesPending).toBe(true);
    state = md1(state, "kurtz", "musashi", "a");
    expect(getProgress(state).phase).toBe("final");
    expect(state.series.find((series) => series.id === "final")).toMatchObject({
      playerA: "alice",
      playerB: "isinha",
    });
  });

  it("uses MD1 to order positions without adding league wins, losses, games played, or rounds", () => {
    const original = league(["a", "a", "a", "a", "b", "a"]);
    const before = getStandings(original).find(
      (row) => row.participant.id === "alice",
    )!;
    const state = md1(original, "isinha", "alice", "b");
    const after = getStandings(state).find(
      (row) => row.participant.id === "alice",
    )!;
    expect(after).toMatchObject({
      wins: before.wins,
      losses: before.losses,
      rounds: before.rounds,
      played: before.played,
    });
  });

  it("requires an unambiguous order for a three-way tie and retains ties on cycles", () => {
    let state = league(["a", "a", "b", "a", "a", "a"]);
    expect(getStandings(state).filter((row) => row.tied)).toHaveLength(3);
    state = md1(state, "isinha", "alice", "a");
    expect(getStandings(state).filter((row) => row.tied)).toHaveLength(3);
    state = md1(state, "alice", "kurtz", "a");
    expect(getStandings(state).map((row) => row.participant.id)).toEqual([
      "isinha",
      "alice",
      "kurtz",
      "musashi",
    ]);
    expect(getProgress(state).tiesPending).toBe(false);
    state = md1(state, "kurtz", "isinha", "a");
    expect(getProgress(state).tiesPending).toBe(true);
    expect(
      getStandings(state)
        .slice(0, 3)
        .every((row) => row.tied && row.position === 1),
    ).toBe(true);
    state = md1(state, "isinha", "kurtz", "a");
    expect(getProgress(state).tiesPending).toBe(false);
    expect(getStandings(state).map((row) => row.participant.id)).toEqual([
      "isinha",
      "alice",
      "kurtz",
      "musashi",
    ]);
    expect(validateState(state)).toEqual(state);
  });

  it("rejects early, unrelated, self, and duplicate pending tiebreaks", () => {
    expect(() => addTiebreak(createInitialState(), "isinha", "alice")).toThrow(
      /Conclua/,
    );
    const state = league(["a", "a", "a", "a", "b", "a"]);
    expect(() => addTiebreak(state, "isinha", "kurtz")).toThrow(/empatados/);
    expect(() => addTiebreak(state, "isinha", "isinha")).toThrow(/empatados/);
    expect(() => addTiebreak(state, "tapioca", "alice")).toThrow(/empatados/);
    expect(() =>
      addTiebreak(addTiebreak(state, "isinha", "alice"), "alice", "isinha"),
    ).toThrow(/Já existe/);
  });

  it("preserves six total league wins for every possible set of confrontation winners", () => {
    for (let outcome = 0; outcome < 64; outcome += 1) {
      const winners = Array.from({ length: 6 }, (_, index): "a" | "b" =>
        outcome & (1 << index) ? "a" : "b",
      );
      let state = league(winners);
      const rows = getStandings(state);
      expect(rows.reduce((sum, row) => sum + row.wins, 0)).toBe(6);
      expect(rows.reduce((sum, row) => sum + row.losses, 0)).toBe(6);
      expect(rows.reduce((sum, row) => sum + row.rounds, 0)).toBe(120);
      expect(rows.every((row) => row.played === 3)).toBe(true);
      const tiedPositions = new Set(
        rows.filter((row) => row.tied).map((row) => row.position),
      );
      for (const position of tiedPositions) {
        const group = rows.filter((row) => row.position === position);
        for (let index = 1; index < group.length; index += 1) {
          state = md1(
            state,
            group[index - 1]!.participant.id,
            group[index]!.participant.id,
            "a",
          );
        }
      }
      expect(getProgress(state)).toMatchObject({
        leagueComplete: true,
        tiesPending: false,
        phase: "final",
      });
      expect(validateState(state)).toEqual(state);
    }
  });
});

describe("safe result editing", () => {
  it("refuses skipped indexes, invalid scores, unavailable players, and games after a series is won", () => {
    const initial = createInitialState();
    expect(() =>
      applyGameResult(initial, "league-1", 1, {
        scoreA: 10,
        scoreB: 0,
        reason: "normal",
      }),
    ).toThrow(/sequência/);
    for (const [scoreA, scoreB] of [
      [9, 9],
      [10, 10],
      [-1, 10],
      [10, 1.5],
      [11, 0],
      [Number.NaN, 0],
    ]) {
      expect(() =>
        applyGameResult(initial, "league-1", 0, {
          scoreA,
          scoreB,
          reason: "normal",
        }),
      ).toThrow();
    }
    expect(() =>
      applyGameResult(initial, "league-1", 0, {
        scoreA: 1,
        scoreB: 4,
        reason: "knife",
      }),
    ).toThrow(/Selecione/);
    expect(() =>
      applyGameResult(initial, "league-1", 0, {
        scoreA: 10,
        scoreB: 4,
        reason: "knife",
        winnerId: "isinha",
      }),
    ).toThrow(/entre 0 e 9/);
    expect(() =>
      applyGameResult(initial, "league-1", 0, {
        scoreA: 10,
        scoreB: 4,
        reason: "normal",
        winnerId: "alice",
      }),
    ).toThrow(/não corresponde/);
    expect(() =>
      applyGameResult(initial, "final", 0, {
        scoreA: 10,
        scoreB: 0,
        reason: "normal",
      }),
    ).toThrow(/aguarda/);
    expect(() =>
      applyGameResult(sweep(initial, "league-1", "a"), "league-1", 2, {
        scoreA: 10,
        scoreB: 0,
        reason: "normal",
      }),
    ).toThrow(/decidido/);
  });

  it("protects a final already played when an earlier correction changes qualifiers", () => {
    const state = sweep(league(), "final", "a");
    const original = JSON.stringify(state);
    expect(() => removeGameResult(state, "league-1", 0)).toThrow(
      DownstreamResultsError,
    );
    expect(JSON.stringify(state)).toBe(original);
    const corrected = removeGameResult(state, "league-1", 0, true);
    expect(
      corrected.series.find((series) => series.id === "final"),
    ).toMatchObject({ games: [], playerA: null, playerB: null });
    expect(
      corrected.series.find((series) => series.id === "boss"),
    ).toMatchObject({ games: [], playerA: null, playerB: null });
    expect(getProgress(corrected).phase).toBe("league");
  });

  it("protects boss results when a final correction changes the champion", () => {
    const state = sweep(sweep(league(), "final", "a"), "boss", "b");
    expect(() => removeGameResult(state, "final", 0)).toThrow(
      DownstreamResultsError,
    );
    const corrected = removeGameResult(state, "final", 0, true);
    expect(
      corrected.series.find((series) => series.id === "boss"),
    ).toMatchObject({ games: [], playerA: null, playerB: null });
    expect(getProgress(corrected)).toMatchObject({
      phase: "final",
      championId: null,
    });
  });

  it("allows a rounds-only correction that preserves qualifiers without deleting later results", () => {
    const state = sweep(sweep(league(), "final", "a"), "boss", "b");
    const corrected = applyGameResult(state, "league-1", 0, {
      scoreA: 10,
      scoreB: 1,
      reason: "normal",
    });
    expect(getProgress(corrected)).toMatchObject({
      phase: "finished",
      championId: "isinha",
      bossWinnerId: "tapioca",
    });
    expect(
      corrected.series.find((series) => series.id === "final")!.games,
    ).toHaveLength(3);
  });

  it("requires confirmation before trimming games rendered impossible by an earlier edit", () => {
    let state = applyGameResult(createInitialState(), "league-1", 0, {
      scoreA: 10,
      scoreB: 0,
      reason: "normal",
    });
    state = applyGameResult(state, "league-1", 1, {
      scoreA: 0,
      scoreB: 10,
      reason: "normal",
    });
    state = applyGameResult(state, "league-1", 2, {
      scoreA: 10,
      scoreB: 0,
      reason: "normal",
    });
    expect(() =>
      applyGameResult(state, "league-1", 1, {
        scoreA: 10,
        scoreB: 0,
        reason: "normal",
      }),
    ).toThrow(DownstreamResultsError);
    const corrected = applyGameResult(
      state,
      "league-1",
      1,
      { scoreA: 10, scoreB: 0, reason: "normal" },
      true,
    );
    expect(corrected.series[0]!.games).toHaveLength(2);
    expect(getSeriesResult(corrected.series[0]!)).toMatchObject({
      winsA: 2,
      winsB: 0,
    });
  });

  it("invalidates already played MD1 when a league correction breaks the absolute tie", () => {
    let state = league(["a", "a", "a", "a", "b", "a"]);
    state = md1(state, "isinha", "alice", "a");
    expect(() =>
      applyGameResult(state, "league-1", 0, {
        scoreA: 10,
        scoreB: 1,
        reason: "normal",
      }),
    ).toThrow(DownstreamResultsError);
    const corrected = applyGameResult(
      state,
      "league-1",
      0,
      { scoreA: 10, scoreB: 1, reason: "normal" },
      true,
    );
    expect(
      corrected.series.filter((series) => series.phase === "tiebreak"),
    ).toHaveLength(0);
    expect(validateState(corrected)).toEqual(corrected);
  });

  it("lets the organizer select live matches and advances completed matches without mutating prior state", () => {
    const initial = createInitialState();
    const next = setActiveSeries(initial, "league-2");
    expect(next.activeSeriesId).toBe("league-2");
    expect(initial.activeSeriesId).toBe("league-1");
    expect(sweep(next, "league-2", "a").activeSeriesId).toBe("league-1");
    expect(setActiveSeries(next, null).activeSeriesId).toBeNull();
    expect(() => setActiveSeries(next, "final")).toThrow(/aguarda/);
    expect(() =>
      setActiveSeries(sweep(next, "league-2", "a"), "league-2"),
    ).toThrow(/decidido/);
  });
});

describe("untrusted persisted state", () => {
  it("rejects malformed, duplicate, illegal, and altered event data", () => {
    for (const value of [
      null,
      {},
      [],
      { ...createInitialState(), schemaVersion: 2 },
    ])
      expect(() => validateState(value)).toThrow();
    const mutate = (fn: (state: TournamentState) => void) => {
      const state = createInitialState();
      fn(state);
      expect(() => validateState(state)).toThrow();
    };
    mutate((state) => {
      state.participants[1]!.id = "isinha";
    });
    mutate((state) => {
      state.participants[0]!.avatar = "javascript:alert(1)";
    });
    mutate((state) => {
      state.participants[0]!.avatar = "//untrusted.example/x.png";
    });
    mutate((state) => {
      state.participants[0]!.accent = "red;display:none";
    });
    mutate((state) => {
      state.series[0]!.playerB = "tapioca";
    });
    mutate((state) => {
      state.series[0]!.bestOf = 5;
    });
    mutate((state) => {
      state.series[1]!.order = 1;
    });
    mutate((state) => {
      state.activeSeriesId = "nonexistent";
    });
    mutate((state) => {
      state.series[0]!.games = [
        { scoreA: 10, scoreB: 2, reason: "normal", winnerId: "alice" },
      ];
    });
    const invalidExtraGame = sweep(createInitialState(), "league-1", "a");
    invalidExtraGame.series[0]!.games.push({
      scoreA: 10,
      scoreB: 2,
      reason: "normal",
      winnerId: "isinha",
    });
    expect(() => validateState(invalidExtraGame)).toThrow();
  });

  it("checks the official early-termination score against the audit score", () => {
    const state = applyGameResult(createInitialState(), "league-1", 0, {
      scoreA: 1,
      scoreB: 4,
      reason: "knife",
      winnerId: "isinha",
    });
    state.series[0]!.games[0]!.scoreB = 2;
    expect(() => validateState(state)).toThrow(/Placar oficial/);
  });

  it("drops unknown fields and returns a detached state with safe photo URLs", () => {
    const input = { ...createInitialState(), surprise: "discard me" };
    input.participants[0]!.avatar = "https://example.com/portrait.png";
    const parsed = validateState(input);
    expect("surprise" in parsed).toBe(false);
    expect(parsed).not.toBe(input);
    parsed.participants[0]!.name = "Changed";
    expect(input.participants[0]!.name).toBe("isinha");
    expect(parsed.participants[0]!.avatar).toBe(
      "https://example.com/portrait.png",
    );
  });
});

describe("duel map draws", () => {
  afterEach(() => vi.unstubAllGlobals());

  function mockDraws(...samples: number[]) {
    const getRandomValues = vi.fn((array: Uint32Array) => {
      const sample = samples.shift();
      if (sample === undefined) throw new Error("Unexpected random draw.");
      array[0] = sample;
      return array;
    });
    vi.stubGlobal("crypto", { getRandomValues });
    return getRandomValues;
  }

  it("starts every phase and newly created MD1 without a map", () => {
    expect(
      createInitialState().series.every((series) => series.map === null),
    ).toBe(true);
    const state = addTiebreak(
      league(["a", "a", "a", "a", "b", "a"]),
      "isinha",
      "alice",
    );
    expect(
      state.series.find((series) => series.phase === "tiebreak")!.map,
    ).toBeNull();
  });

  it("can draw all five maps and permits independent repetitions", () => {
    mockDraws(0, 1, 2, 3, 4, 0);
    let state = createInitialState();
    for (let index = 0; index < 6; index += 1) {
      state = drawSeriesMap(state, `league-${index + 1}`);
    }
    expect(state.series.slice(0, 5).map((series) => series.map)).toEqual(
      DUEL_MAPS,
    );
    expect(state.series[5]!.map).toBe("A");
  });

  it("rejects the biased remainder before selecting a uniformly distributed map", () => {
    const random = mockDraws(2 ** 32 - 1, 2 ** 32 - 2);
    const state = drawSeriesMap(createInitialState(), "league-1");
    expect(random).toHaveBeenCalledTimes(2);
    expect(state.series[0]!.map).toBe("E");
  });

  it("changes only the chosen map, preserves scores and active match, and allows a redraw", () => {
    mockDraws(1, 4);
    const initial = applyGameResult(createInitialState(), "league-1", 0, {
      scoreA: 2,
      scoreB: 7,
      reason: "knife",
      winnerId: "isinha",
    });
    const before = JSON.stringify(initial);
    const standings = getStandings(initial);
    const firstDraw = drawSeriesMap(initial, "league-1");
    const redraw = drawSeriesMap(firstDraw, "league-1");
    expect(firstDraw.series[0]!.map).toBe("B");
    expect(redraw.series[0]!.map).toBe("E");
    expect(redraw).toEqual({
      ...initial,
      series: initial.series.map((series) =>
        series.id === "league-1" ? { ...series, map: "E" } : series,
      ),
    });
    expect(getStandings(redraw)).toEqual(standings);
    expect(JSON.stringify(initial)).toBe(before);
    expect(redraw.series[0]!.games[0]).not.toBe(initial.series[0]!.games[0]);
    expect(redraw.series[0]!.games[0]!.scoreAtTermination).not.toBe(
      initial.series[0]!.games[0]!.scoreAtTermination,
    );
  });

  it("retains maps drawn for future final and boss slots as players qualify and games are played", () => {
    mockDraws(2, 3);
    let state = drawSeriesMap(createInitialState(), "final");
    state = drawSeriesMap(state, "boss");
    for (let index = 1; index <= 6; index += 1) {
      state = sweep(state, `league-${index}`, "a");
    }
    expect(state.series.find((series) => series.id === "final")).toMatchObject({
      map: "C",
      playerA: "isinha",
      playerB: "alice",
    });
    state = sweep(state, "final", "a");
    expect(state.series.find((series) => series.id === "boss")).toMatchObject({
      map: "D",
      playerA: "isinha",
      playerB: "tapioca",
    });
    state = sweep(state, "boss", "b");
    const corrected = removeGameResult(state, "league-1", 0, true);
    expect(
      corrected.series.find((series) => series.id === "final"),
    ).toMatchObject({ map: "C", playerA: null, playerB: null, games: [] });
    expect(
      corrected.series.find((series) => series.id === "boss"),
    ).toMatchObject({ map: "D", playerA: null, playerB: null, games: [] });
  });

  it("draws and persists the one map used for an MD1", () => {
    mockDraws(4);
    let state = addTiebreak(
      league(["a", "a", "a", "a", "b", "a"]),
      "isinha",
      "alice",
    );
    const id = state.series.find((series) => series.phase === "tiebreak")!.id;
    state = sweep(drawSeriesMap(state, id), id, "a");
    expect(state.series.find((series) => series.id === id)).toMatchObject({
      map: "E",
      bestOf: 1,
    });
    expect(validateState(JSON.parse(JSON.stringify(state)))).toEqual(state);
  });

  it("rejects an unknown confrontation without consuming randomness or modifying state", () => {
    const random = mockDraws(0);
    const state = createInitialState();
    const before = JSON.stringify(state);
    expect(() => drawSeriesMap(state, "missing")).toThrow(/não encontrado/);
    expect(random).not.toHaveBeenCalled();
    expect(JSON.stringify(state)).toBe(before);
  });

  it("loads legacy snapshots without maps and preserves every recorded result", () => {
    const state = sweep(sweep(league(), "final", "a"), "boss", "b");
    const legacy = {
      ...state,
      series: state.series.map(({ map: _map, ...series }) => series),
    };
    const restored = validateState(JSON.parse(JSON.stringify(legacy)));
    expect(restored).toEqual(state);
    expect(getProgress(restored).phase).toBe("finished");
    expect(restored.series.every((series) => series.map === null)).toBe(true);
  });

  it("accepts persisted A–E or null and rejects every other map value", () => {
    const state = createInitialState();
    state.series.forEach((series, index) => {
      series.map = DUEL_MAPS[index % DUEL_MAPS.length]!;
    });
    expect(validateState(JSON.parse(JSON.stringify(state)))).toEqual(state);
    for (const value of [undefined, "", "a", "F", " A", 0, false, [], {}]) {
      const invalid = {
        ...state,
        series: state.series.map((series, index) =>
          index === 0 ? { ...series, map: value } : series,
        ),
      };
      expect(() => validateState(invalid)).toThrow(/Mapa de duelo inválido/);
    }
  });
});

describe("Tapioca MD1 boss and legacy migration", () => {
  it("migrates the exact version-49 Musashi snapshot while preserving every league/final result, map, and active match", () => {
    const original = JSON.stringify(legacyProductionSnapshot);
    const originalFinal = legacyProductionSnapshot.series.find(
      (series) => series.id === "final",
    )!;
    const originalBoss = legacyProductionSnapshot.series.find(
      (series) => series.id === "boss",
    )!;
    expect(originalFinal.games).toHaveLength(5);
    expect(originalBoss).toMatchObject({
      playerA: "musashi",
      playerB: "zacarias",
      bestOf: 3,
      games: [],
      map: "A",
    });

    const migrated = validateState(legacyProductionSnapshot);
    expect(migrated).toEqual({
      ...legacyProductionSnapshot,
      participants: legacyProductionSnapshot.participants.map((participant) =>
        participant.id === "zacarias"
          ? { ...participant, id: "tapioca", name: "Tapioca", avatar: null }
          : participant,
      ),
      series: legacyProductionSnapshot.series.map((series) =>
        series.id === "boss"
          ? { ...series, playerB: "tapioca", bestOf: 1 }
          : series,
      ),
    });
    expect(migrated.series.filter((series) => series.phase !== "boss")).toEqual(
      legacyProductionSnapshot.series.filter(
        (series) => series.phase !== "boss",
      ),
    );
    expect(migrated.activeSeriesId).toBe("boss");
    expect(getProgress(migrated)).toMatchObject({
      phase: "boss",
      championId: "musashi",
      bossWinnerId: null,
    });
    expect(validateState(JSON.parse(JSON.stringify(migrated)))).toEqual(
      migrated,
    );
    expect(JSON.stringify(legacyProductionSnapshot)).toBe(original);
  });

  it("derives a different champion from the final instead of forcing the live champion in the seed", () => {
    const initial = createInitialState();
    expect(initial.participants.map((participant) => participant.id)).toEqual([
      "isinha",
      "alice",
      "kurtz",
      "musashi",
      "tapioca",
    ]);
    expect(initial.series.find((series) => series.id === "boss")).toMatchObject(
      { playerA: null, playerB: null, bestOf: 1, games: [] },
    );

    let state = sweep(league(), "final", "b");
    expect(getProgress(state).championId).toBe("alice");
    expect(state.series.find((series) => series.id === "boss")).toMatchObject({
      playerA: "alice",
      playerB: "tapioca",
      bestOf: 1,
    });
    state = sweep(state, "boss", "a");
    expect(
      state.series.find((series) => series.id === "boss")!.games,
    ).toHaveLength(1);
    expect(getProgress(state)).toMatchObject({
      phase: "finished",
      championId: "alice",
      bossWinnerId: "alice",
    });
    expect(() =>
      applyGameResult(state, "boss", 1, {
        scoreA: 10,
        scoreB: 0,
        reason: "normal",
      }),
    ).toThrow();
    expect(validateState(JSON.parse(JSON.stringify(state)))).toEqual(state);
  });

  it("finishes the migrated live challenge after a single game without changing the five-game final", () => {
    const migrated = validateState(legacyProductionSnapshot);
    const finished = applyGameResult(migrated, "boss", 0, {
      scoreA: 3,
      scoreB: 10,
      reason: "normal",
    });
    expect(getProgress(finished)).toMatchObject({
      phase: "finished",
      championId: "musashi",
      bossWinnerId: "tapioca",
    });
    expect(finished.series.find((series) => series.id === "final")).toEqual(
      legacyProductionSnapshot.series.find((series) => series.id === "final"),
    );
    expect(
      finished.series.find((series) => series.id === "boss"),
    ).toMatchObject({
      bestOf: 1,
      map: "A",
      games: [{ scoreA: 3, scoreB: 10, reason: "normal", winnerId: "tapioca" }],
    });
    expect(validateState(JSON.parse(JSON.stringify(finished)))).toEqual(
      finished,
    );
  });

  it("also migrates an unplayed legacy seed without creating a champion or changing the active league match", () => {
    const initial = createInitialState();
    const legacy = {
      ...initial,
      participants: initial.participants.map((participant) =>
        participant.id === "tapioca"
          ? { ...participant, id: "zacarias", name: "Zacarias" }
          : participant,
      ),
      series: initial.series.map((series) =>
        series.id === "boss" ? { ...series, bestOf: 3 } : series,
      ),
    };
    expect(validateState(legacy)).toEqual(initial);
    expect(getProgress(validateState(legacy))).toMatchObject({
      phase: "league",
      championId: null,
    });
  });

  it.each(["musashi", "zacarias"])(
    "refuses to reassign any legacy boss game won by %s to a different opponent",
    (winnerId) => {
      const legacy = JSON.parse(JSON.stringify(legacyProductionSnapshot));
      const boss = legacy.series.find(
        (series: { id: string }) => series.id === "boss",
      );
      boss.games = [
        {
          scoreA: winnerId === "musashi" ? 10 : 3,
          scoreB: winnerId === "zacarias" ? 10 : 3,
          reason: "normal",
          winnerId,
        },
      ];
      const before = JSON.stringify(legacy);
      expect(() => validateState(legacy)).toThrow(
        /Zacarias já tem partidas registradas.*não pode ser atribuído a Tapioca/,
      );
      expect(JSON.stringify(legacy)).toBe(before);
    },
  );

  it("rejects mixed legacy/current boss formats instead of silently changing their rule", () => {
    const current = createInitialState();
    current.series.find((series) => series.id === "boss")!.bestOf = 3;
    expect(() => validateState(current)).toThrow(
      /Formato da final ou do chefão inválido/,
    );

    const legacy = JSON.parse(JSON.stringify(legacyProductionSnapshot));
    legacy.series.find(
      (series: { id: string }) => series.id === "boss",
    ).bestOf = 1;
    expect(() => validateState(legacy)).toThrow(
      /Formato legado do chefão inválido/,
    );
  });
});
