import { describe, expect, it } from "vitest";
import {
  DownstreamResultsError,
  addTiebreak,
  applyGameResult,
  createInitialState,
  getProgress,
  getSeriesResult,
  getStandings,
  removeGameResult,
  setActiveSeries,
  validateState,
  type TournamentState,
} from "./domain";

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
  it("creates exactly six unique MD3 round-robin confrontations and excludes Zacarias from the table", () => {
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
      "zacarias",
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
      playerB: "zacarias",
    });
    state = sweep(state, "boss", "b");
    expect(getProgress(state)).toMatchObject({
      phase: "finished",
      championId: "isinha",
      bossWinnerId: "zacarias",
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
    expect(() => addTiebreak(state, "zacarias", "alice")).toThrow(/empatados/);
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
      bossWinnerId: "zacarias",
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
      state.series[0]!.playerB = "zacarias";
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
