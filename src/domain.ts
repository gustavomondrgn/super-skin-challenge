export type GameReason = "normal" | "knife" | "violation";

export const DUEL_MAPS = ["A", "B", "C", "D", "E"] as const;
export type DuelMap = (typeof DUEL_MAPS)[number];

export interface Participant {
  id: string;
  name: string;
  avatar: string | null;
  accent: string;
}

export interface GameInput {
  scoreA: number;
  scoreB: number;
  reason: GameReason;
  winnerId?: string;
}

export interface Game {
  scoreA: number;
  scoreB: number;
  reason: GameReason;
  winnerId: string;
  scoreAtTermination?: { a: number; b: number };
}

export interface Series {
  id: string;
  phase: "league" | "tiebreak" | "final" | "boss";
  order: number;
  playerA: string | null;
  playerB: string | null;
  bestOf: 1 | 3 | 5;
  map: DuelMap | null;
  games: Game[];
}

export interface TournamentState {
  schemaVersion: 1;
  participants: Participant[];
  series: Series[];
  activeSeriesId: string | null;
}

export interface Standing {
  participant: Participant;
  wins: number;
  losses: number;
  rounds: number;
  played: number;
  position: number;
  tied: boolean;
}

export class DownstreamResultsError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DownstreamResultsError";
  }
}

const LEAGUE_IDS = ["isinha", "alice", "kurtz", "musashi"] as const;
const PARTICIPANT_IDS = [...LEAGUE_IDS, "zacarias"];
const PAIRS = [
  ["isinha", "alice"],
  ["kurtz", "musashi"],
  ["isinha", "kurtz"],
  ["alice", "musashi"],
  ["isinha", "musashi"],
  ["alice", "kurtz"],
] as const;

export function createInitialState(): TournamentState {
  return {
    schemaVersion: 1,
    participants: [
      {
        id: "isinha",
        name: "isinha",
        avatar: "/avatars/isinha.png",
        accent: "#e68cc9",
      },
      {
        id: "alice",
        name: "alice",
        avatar: "/avatars/alice.png",
        accent: "#9d95e8",
      },
      {
        id: "kurtz",
        name: "kurtz",
        avatar: "/avatars/kurtz.png",
        accent: "#71c9ba",
      },
      {
        id: "musashi",
        name: "musashi",
        avatar: "/avatars/musashi.png",
        accent: "#e1ae68",
      },
      { id: "zacarias", name: "Zacarias", avatar: null, accent: "#d6b478" },
    ],
    series: [
      ...PAIRS.map(([playerA, playerB], index): Series => ({
        id: `league-${index + 1}`,
        phase: "league",
        order: index + 1,
        playerA,
        playerB,
        bestOf: 3,
        map: null,
        games: [],
      })),
      {
        id: "final",
        phase: "final",
        order: 7,
        playerA: null,
        playerB: null,
        bestOf: 5,
        map: null,
        games: [],
      },
      {
        id: "boss",
        phase: "boss",
        order: 8,
        playerA: null,
        playerB: null,
        bestOf: 3,
        map: null,
        games: [],
      },
    ],
    activeSeriesId: "league-1",
  };
}

export function getSeriesResult(series: Series): {
  winsA: number;
  winsB: number;
  winnerId: string | null;
  completed: boolean;
} {
  const winsA = series.games.filter(
    (game) => game.winnerId === series.playerA,
  ).length;
  const winsB = series.games.filter(
    (game) => game.winnerId === series.playerB,
  ).length;
  const target = Math.floor(series.bestOf / 2) + 1;
  const winnerId =
    winsA >= target ? series.playerA : winsB >= target ? series.playerB : null;
  return { winsA, winsB, winnerId, completed: winnerId !== null };
}

function leagueComplete(state: TournamentState): boolean {
  const league = state.series.filter((series) => series.phase === "league");
  return (
    league.length === 6 &&
    league.every((series) => getSeriesResult(series).completed)
  );
}

function baseStandings(state: TournamentState): Standing[] {
  const rows = LEAGUE_IDS.map((id): Standing => {
    const participant = state.participants.find((item) => item.id === id);
    if (!participant) throw new Error("Participante obrigatório ausente.");
    return {
      participant,
      wins: 0,
      losses: 0,
      rounds: 0,
      played: 0,
      position: 0,
      tied: false,
    };
  });
  const lookup = new Map(rows.map((row) => [row.participant.id, row]));
  for (const series of state.series.filter((item) => item.phase === "league")) {
    const a = lookup.get(series.playerA ?? "");
    const b = lookup.get(series.playerB ?? "");
    if (!a || !b) continue;
    for (const game of series.games) {
      a.rounds += game.scoreA;
      b.rounds += game.scoreB;
    }
    const result = getSeriesResult(series);
    if (result.completed) {
      const winner = result.winnerId === a.participant.id ? a : b;
      const loser = winner === a ? b : a;
      winner.wins += 1;
      loser.losses += 1;
      a.played += 1;
      b.played += 1;
    }
  }
  return rows.sort((a, b) => b.wins - a.wins || b.rounds - a.rounds);
}

function sameBaseGroup(
  rows: Standing[],
  playerA: string,
  playerB: string,
): boolean {
  const a = rows.find((row) => row.participant.id === playerA);
  const b = rows.find((row) => row.participant.id === playerB);
  return Boolean(
    a && b && playerA !== playerB && a.wins === b.wins && a.rounds === b.rounds,
  );
}

/** Return an order only if the MD1 evidence determines every position unambiguously. */
function resolveGroup(
  state: TournamentState,
  group: Standing[],
): Standing[] | null {
  const ids = new Set(group.map((row) => row.participant.id));
  const latest = new Map<string, Series>();
  for (const series of [...state.series].sort((a, b) => a.order - b.order)) {
    if (series.phase !== "tiebreak" || !series.playerA || !series.playerB)
      continue;
    if (!ids.has(series.playerA) || !ids.has(series.playerB)) continue;
    if (!getSeriesResult(series).completed) continue;
    latest.set([series.playerA, series.playerB].sort().join("|"), series);
  }
  const edges = new Map([...ids].map((id) => [id, new Set<string>()]));
  const incoming = new Map([...ids].map((id) => [id, 0]));
  for (const series of latest.values()) {
    const winner = getSeriesResult(series).winnerId!;
    const loser = series.playerA === winner ? series.playerB! : series.playerA!;
    edges.get(winner)!.add(loser);
    incoming.set(loser, incoming.get(loser)! + 1);
  }
  const ordered: Standing[] = [];
  const remaining = new Set(ids);
  while (remaining.size) {
    const choices = [...remaining].filter((id) => incoming.get(id) === 0);
    if (choices.length !== 1) return null;
    const id = choices[0]!;
    ordered.push(group.find((row) => row.participant.id === id)!);
    remaining.delete(id);
    for (const loser of edges.get(id)!)
      incoming.set(loser, incoming.get(loser)! - 1);
  }
  return ordered;
}

export function getStandings(state: TournamentState): Standing[] {
  const rows = baseStandings(state);
  const complete = leagueComplete(state);
  const result: Standing[] = [];
  for (let index = 0; index < rows.length;) {
    let end = index + 1;
    while (
      end < rows.length &&
      rows[end]!.wins === rows[index]!.wins &&
      rows[end]!.rounds === rows[index]!.rounds
    )
      end += 1;
    const group = rows.slice(index, end);
    const resolved =
      complete && group.length > 1 ? resolveGroup(state, group) : null;
    const display = resolved ?? group;
    const unresolved = complete && group.length > 1 && !resolved;
    display.forEach((row, offset) =>
      result.push({
        ...row,
        position: index + 1 + (unresolved ? 0 : offset),
        tied: unresolved,
      }),
    );
    index = end;
  }
  return result;
}

function pendingTies(state: TournamentState): boolean {
  return (
    getStandings(state).some((row) => row.tied) ||
    state.series.some(
      (series) =>
        series.phase === "tiebreak" && !getSeriesResult(series).completed,
    )
  );
}

export function getProgress(state: TournamentState): {
  leagueComplete: boolean;
  tiesPending: boolean;
  phase: "league" | "final" | "boss" | "finished";
  championId: string | null;
  bossWinnerId: string | null;
} {
  const complete = leagueComplete(state);
  const tiesPending = complete && pendingTies(state);
  const final = state.series.find((series) => series.id === "final");
  const boss = state.series.find((series) => series.id === "boss");
  const championId = final ? getSeriesResult(final).winnerId : null;
  const bossWinnerId = boss ? getSeriesResult(boss).winnerId : null;
  return {
    leagueComplete: complete,
    tiesPending,
    phase:
      !complete || tiesPending
        ? "league"
        : !championId
          ? "final"
          : !bossWinnerId
            ? "boss"
            : "finished",
    championId,
    bossWinnerId,
  };
}

function copyState(state: TournamentState): TournamentState {
  return {
    schemaVersion: 1,
    participants: state.participants.map((participant) => ({ ...participant })),
    series: state.series.map((series) => ({
      ...series,
      games: series.games.map((game) => ({
        ...game,
        ...(game.scoreAtTermination
          ? { scoreAtTermination: { ...game.scoreAtTermination } }
          : {}),
      })),
    })),
    activeSeriesId: state.activeSeriesId,
  };
}

function getRequiredSeries(state: TournamentState, id: string): Series {
  const series = state.series.find((item) => item.id === id);
  if (!series) throw new Error("Confronto não encontrado.");
  return series;
}

function checkScore(value: unknown, maximum: number): asserts value is number {
  if (
    typeof value !== "number" ||
    !Number.isInteger(value) ||
    value < 0 ||
    value > maximum
  ) {
    throw new Error(`O placar deve ser um inteiro entre 0 e ${maximum}.`);
  }
}

function createGame(series: Series, input: GameInput): Game {
  if (!series.playerA || !series.playerB)
    throw new Error("Este confronto ainda aguarda seus participantes.");
  if (!input || !["normal", "knife", "violation"].includes(input.reason))
    throw new Error("Motivo de encerramento inválido.");
  if (input.reason === "normal") {
    checkScore(input.scoreA, 10);
    checkScore(input.scoreB, 10);
    if ((input.scoreA === 10) === (input.scoreB === 10))
      throw new Error("Uma partida normal precisa terminar em 10 a 0–9.");
    const winnerId = input.scoreA === 10 ? series.playerA : series.playerB;
    if (input.winnerId !== undefined && input.winnerId !== winnerId)
      throw new Error("O vencedor não corresponde ao placar.");
    return {
      scoreA: input.scoreA,
      scoreB: input.scoreB,
      reason: input.reason,
      winnerId,
    };
  }
  checkScore(input.scoreA, 9);
  checkScore(input.scoreB, 9);
  if (input.winnerId !== series.playerA && input.winnerId !== series.playerB)
    throw new Error("Selecione o vencedor da partida por faca ou punição.");
  return {
    scoreA: input.winnerId === series.playerA ? 10 : input.scoreA,
    scoreB: input.winnerId === series.playerB ? 10 : input.scoreB,
    reason: input.reason,
    winnerId: input.winnerId,
    scoreAtTermination: { a: input.scoreA, b: input.scoreB },
  };
}

function checkGameSequence(series: Series, trim: boolean): void {
  const prefix: Series = { ...series, games: [] };
  for (let index = 0; index < series.games.length; index += 1) {
    if (getSeriesResult(prefix).completed) {
      if (trim) {
        series.games.splice(index);
        return;
      }
      throw new DownstreamResultsError(
        "Esta alteração deixaria partidas após o fim da série. Confirme a limpeza dos resultados posteriores.",
      );
    }
    prefix.games.push(series.games[index]!);
  }
}

function clearDownstream(state: TournamentState, phase: Series["phase"]): void {
  if (phase === "league")
    state.series = state.series.filter((series) => series.phase !== "tiebreak");
  for (const series of state.series) {
    if (
      (phase === "league" || phase === "tiebreak") &&
      series.phase === "final"
    )
      series.games = [];
    if (phase !== "boss" && series.phase === "boss") series.games = [];
  }
}

function reconcile(state: TournamentState): TournamentState {
  const complete = leagueComplete(state);
  const base = baseStandings(state);
  state.series = state.series.filter((series) => {
    if (series.phase !== "tiebreak") return true;
    const valid =
      complete &&
      sameBaseGroup(base, series.playerA ?? "", series.playerB ?? "");
    if (!valid && series.games.length)
      throw new DownstreamResultsError(
        "A correção invalida um desempate já jogado. Confirme a limpeza dos resultados posteriores.",
      );
    return valid;
  });
  const ties = state.series
    .filter((series) => series.phase === "tiebreak")
    .sort((a, b) => a.order - b.order);
  ties.forEach((series, index) => {
    series.order = 7 + index;
  });
  const final = getRequiredSeries(state, "final");
  const boss = getRequiredSeries(state, "boss");
  final.order = 7 + ties.length;
  boss.order = 8 + ties.length;
  function assign(
    series: Series,
    playerA: string | null,
    playerB: string | null,
  ): void {
    if (series.playerA === playerA && series.playerB === playerB) return;
    if (series.games.length)
      throw new DownstreamResultsError(
        "A correção altera uma fase que já tem resultados. Confirme a limpeza dos resultados posteriores.",
      );
    series.playerA = playerA;
    series.playerB = playerB;
  }
  const qualified =
    complete && !pendingTies(state) ? getStandings(state).slice(0, 2) : [];
  assign(
    final,
    qualified[0]?.participant.id ?? null,
    qualified[1]?.participant.id ?? null,
  );
  const champion = getSeriesResult(final).winnerId;
  assign(boss, champion, champion ? "zacarias" : null);
  if (state.activeSeriesId !== null) {
    const current = state.series.find(
      (series) => series.id === state.activeSeriesId,
    );
    if (
      !current ||
      !current.playerA ||
      !current.playerB ||
      getSeriesResult(current).completed
    ) {
      state.activeSeriesId =
        [...state.series]
          .sort((a, b) => a.order - b.order)
          .find(
            (series) =>
              series.playerA &&
              series.playerB &&
              !getSeriesResult(series).completed,
          )?.id ?? null;
    }
  }
  return state;
}

export function applyGameResult(
  state: TournamentState,
  seriesId: string,
  index: number,
  input: GameInput,
  resetDownstream = false,
): TournamentState {
  const next = copyState(state);
  const series = getRequiredSeries(next, seriesId);
  if (
    !Number.isInteger(index) ||
    index < 0 ||
    index > series.games.length ||
    index >= series.bestOf
  )
    throw new Error("Registre as partidas em sequência, sem pular posições.");
  if (index === series.games.length && getSeriesResult(series).completed)
    throw new Error("Este confronto já foi decidido.");
  const game = createGame(series, input);
  if (resetDownstream) clearDownstream(next, series.phase);
  series.games[index] = game;
  checkGameSequence(series, resetDownstream);
  return reconcile(next);
}

/** Removing a result also removes later games in the same series. */
export function removeGameResult(
  state: TournamentState,
  seriesId: string,
  index: number,
  resetDownstream = false,
): TournamentState {
  const next = copyState(state);
  const series = getRequiredSeries(next, seriesId);
  if (!Number.isInteger(index) || index < 0 || index >= series.games.length)
    throw new Error("Partida não encontrada.");
  if (resetDownstream) clearDownstream(next, series.phase);
  series.games.splice(index);
  return reconcile(next);
}

export function addTiebreak(
  state: TournamentState,
  playerA: string,
  playerB: string,
): TournamentState {
  if (!leagueComplete(state))
    throw new Error(
      "Conclua todos os confrontos da liga antes de criar um desempate.",
    );
  if (!sameBaseGroup(baseStandings(state), playerA, playerB))
    throw new Error(
      "A MD1 exige dois participantes empatados em vitórias e rounds.",
    );
  if (
    state.series.some(
      (series) =>
        series.phase === "tiebreak" &&
        !getSeriesResult(series).completed &&
        [series.playerA, series.playerB].includes(playerA) &&
        [series.playerA, series.playerB].includes(playerB),
    )
  ) {
    throw new Error("Já existe uma MD1 pendente entre esses participantes.");
  }
  const next = copyState(state);
  const numbers = next.series
    .filter((series) => series.phase === "tiebreak")
    .map((series) => Number(series.id.replace("tiebreak-", "")));
  const number = Math.max(0, ...numbers) + 1;
  if (number > 100) throw new Error("Limite de desempates atingido.");
  const tiebreak: Series = {
    id: `tiebreak-${number}`,
    phase: "tiebreak",
    order: 7 + numbers.length,
    playerA,
    playerB,
    bestOf: 1,
    map: null,
    games: [],
  };
  next.series.splice(
    next.series.findIndex((series) => series.id === "final"),
    0,
    tiebreak,
  );
  // Reopening a resolved tie cannot silently discard a final already in progress.
  return reconcile(next);
}

export function setActiveSeries(
  state: TournamentState,
  id: string | null,
): TournamentState {
  if (id !== null) {
    const series = getRequiredSeries(state, id);
    if (!series.playerA || !series.playerB)
      throw new Error("Este confronto ainda aguarda seus participantes.");
    if (getSeriesResult(series).completed)
      throw new Error("Este confronto já foi decidido.");
  }
  return { ...copyState(state), activeSeriesId: id };
}

/** Draw one independent map for the whole confrontation, including future phases. */
export function drawSeriesMap(
  state: TournamentState,
  seriesId: string,
): TournamentState {
  const next = copyState(state);
  const series = getRequiredSeries(next, seriesId);
  const sample = new Uint32Array(1);
  const range = 2 ** 32;
  // Reject the incomplete final bucket so every map has exactly the same chance.
  const limit = range - (range % DUEL_MAPS.length);
  do {
    crypto.getRandomValues(sample);
  } while (sample[0]! >= limit);
  series.map = DUEL_MAPS[sample[0]! % DUEL_MAPS.length]!;
  return next;
}

function object(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw new Error("Dados do torneio inválidos.");
  return value as Record<string, unknown>;
}

function safeAvatar(value: unknown): string | null {
  if (value === null) return null;
  if (typeof value !== "string" || value.length > 3_000_000)
    throw new Error("Foto de participante inválida.");
  if (/^data:image\/(png|jpe?g|webp|gif);base64,[A-Za-z0-9+/]+=*$/.test(value))
    return value;
  if (/^\/(?!\/)[^\s]*$/.test(value)) return value;
  try {
    const url = new URL(value);
    if (url.protocol === "https:" && !url.username && !url.password)
      return url.href;
  } catch {
    /* Report the same validation error for malformed URLs. */
  }
  throw new Error("Use uma foto PNG, JPG, WebP, GIF ou uma URL HTTPS.");
}

/** Validate untrusted database/import data and discard unknown properties. */
export function validateState(value: unknown): TournamentState {
  const data = object(value);
  if (
    data.schemaVersion !== 1 ||
    !Array.isArray(data.participants) ||
    data.participants.length !== 5 ||
    !Array.isArray(data.series) ||
    data.series.length < 8 ||
    data.series.length > 108
  ) {
    throw new Error("Formato ou versão dos dados do torneio inválidos.");
  }
  const participants = data.participants.map((value): Participant => {
    const participant = object(value);
    if (
      typeof participant.id !== "string" ||
      !PARTICIPANT_IDS.includes(
        participant.id as (typeof PARTICIPANT_IDS)[number],
      )
    )
      throw new Error("Participante desconhecido.");
    if (
      typeof participant.name !== "string" ||
      !participant.name.trim() ||
      participant.name.length > 80
    )
      throw new Error("Nome de participante inválido.");
    if (
      typeof participant.accent !== "string" ||
      !/^#[\da-f]{6}$/i.test(participant.accent)
    )
      throw new Error("Cor de participante inválida.");
    return {
      id: participant.id,
      name: participant.name.trim(),
      avatar: safeAvatar(participant.avatar),
      accent: participant.accent,
    };
  });
  if (new Set(participants.map((participant) => participant.id)).size !== 5)
    throw new Error("Participantes duplicados.");
  const series = data.series.map((value): Series => {
    const item = object(value);
    if (
      typeof item.id !== "string" ||
      !["league", "tiebreak", "final", "boss"].includes(item.phase as string) ||
      !Number.isInteger(item.order) ||
      Number(item.order) < 1 ||
      ![1, 3, 5].includes(item.bestOf as number) ||
      !Array.isArray(item.games)
    )
      throw new Error("Confronto inválido.");
    for (const id of [item.playerA, item.playerB]) {
      if (
        id !== null &&
        (typeof id !== "string" ||
          !PARTICIPANT_IDS.includes(id as (typeof PARTICIPANT_IDS)[number]))
      )
        throw new Error("Participante inválido em confronto.");
    }
    if (
      (item.playerA === null) !== (item.playerB === null) ||
      (item.playerA !== null && item.playerA === item.playerB)
    )
      throw new Error("Participantes do confronto inválidos.");
    const map = Object.prototype.hasOwnProperty.call(item, "map")
      ? item.map
      : null;
    if (map !== null && !DUEL_MAPS.includes(map as DuelMap))
      throw new Error("Mapa de duelo inválido.");
    const parsed: Series = {
      id: item.id,
      phase: item.phase as Series["phase"],
      order: item.order as number,
      playerA: item.playerA as string | null,
      playerB: item.playerB as string | null,
      bestOf: item.bestOf as Series["bestOf"],
      map: map as DuelMap | null,
      games: [],
    };
    if (item.games.length > parsed.bestOf)
      throw new Error("Quantidade de partidas inválida.");
    parsed.games = item.games.map((value): Game => {
      const game = object(value);
      if (!parsed.playerA || !parsed.playerB)
        throw new Error("Confronto sem participantes não pode ter resultados.");
      if (game.winnerId !== parsed.playerA && game.winnerId !== parsed.playerB)
        throw new Error("Vencedor da partida inválido.");
      if (game.reason === "normal") {
        if (game.scoreAtTermination !== undefined)
          throw new Error(
            "Placar de encerramento incompatível com partida normal.",
          );
        return createGame(parsed, {
          scoreA: game.scoreA as number,
          scoreB: game.scoreB as number,
          reason: "normal",
          winnerId: game.winnerId,
        });
      }
      if (game.reason !== "knife" && game.reason !== "violation")
        throw new Error("Motivo de encerramento inválido.");
      const real = object(game.scoreAtTermination);
      const expected = createGame(parsed, {
        scoreA: real.a as number,
        scoreB: real.b as number,
        reason: game.reason,
        winnerId: game.winnerId,
      });
      if (game.scoreA !== expected.scoreA || game.scoreB !== expected.scoreB)
        throw new Error(
          "Placar oficial não corresponde ao encerramento antecipado.",
        );
      return expected;
    });
    checkGameSequence(parsed, false);
    return parsed;
  });
  if (new Set(series.map((item) => item.id)).size !== series.length)
    throw new Error("Confrontos duplicados.");
  if (new Set(series.map((item) => item.order)).size !== series.length)
    throw new Error("Ordem dos confrontos duplicada.");
  PAIRS.forEach(([a, b], index) => {
    const item = series.find((matchup) => matchup.id === `league-${index + 1}`);
    if (
      !item ||
      item.phase !== "league" ||
      item.bestOf !== 3 ||
      item.order !== index + 1 ||
      item.playerA !== a ||
      item.playerB !== b
    )
      throw new Error("Os confrontos oficiais da liga foram alterados.");
  });
  if (
    series.filter((item) => item.phase === "league").length !== 6 ||
    series.filter((item) => item.phase === "final").length !== 1 ||
    series.filter((item) => item.phase === "boss").length !== 1
  )
    throw new Error("Fases do torneio inválidas.");
  const final = series.find((item) => item.id === "final");
  const boss = series.find((item) => item.id === "boss");
  if (
    !final ||
    final.phase !== "final" ||
    final.bestOf !== 5 ||
    !boss ||
    boss.phase !== "boss" ||
    boss.bestOf !== 3
  )
    throw new Error("Formato da final ou do chefão inválido.");
  for (const item of series.filter((matchup) => matchup.phase === "tiebreak")) {
    if (
      !/^tiebreak-([1-9]\d?)$|^tiebreak-100$/.test(item.id) ||
      item.bestOf !== 1 ||
      !item.playerA ||
      !item.playerB ||
      !LEAGUE_IDS.includes(item.playerA as (typeof LEAGUE_IDS)[number]) ||
      !LEAGUE_IDS.includes(item.playerB as (typeof LEAGUE_IDS)[number])
    )
      throw new Error("MD1 de desempate inválida.");
  }
  if (
    data.activeSeriesId !== null &&
    (typeof data.activeSeriesId !== "string" ||
      !series.some((item) => item.id === data.activeSeriesId))
  )
    throw new Error("Confronto ativo inválido.");
  const state: TournamentState = {
    schemaVersion: 1,
    participants,
    series: series.sort((a, b) => a.order - b.order),
    activeSeriesId: data.activeSeriesId as string | null,
  };
  const base = baseStandings(state);
  for (const item of series.filter((matchup) => matchup.phase === "tiebreak")) {
    if (
      !leagueComplete(state) ||
      !sameBaseGroup(base, item.playerA!, item.playerB!)
    )
      throw new Error("MD1 fora de um empate válido da liga.");
  }
  return reconcile(state);
}
