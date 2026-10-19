import { test, expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import {
  applyGameResult,
  createInitialState,
  getSeriesResult,
  getStandings,
  type TournamentState,
} from "../src/domain";
import {
  MockSupabase,
  MOCK_ADMIN_EMAIL,
  MOCK_VIEWER_EMAIL,
  MOCK_PASSWORD,
} from "./mock-supabase";

async function login(
  page: Page,
  email = MOCK_ADMIN_EMAIL,
  password = MOCK_PASSWORD,
) {
  await page.goto("/admin");
  await page.getByLabel("E-mail", { exact: true }).fill(email);
  await page.getByLabel("Senha", { exact: true }).fill(password);
  await page
    .getByRole("button", { name: "Entrar no painel", exact: true })
    .click();
}

async function selectSeries(page: Page, id: string, backend: MockSupabase) {
  await expect(
    page.getByRole("heading", { name: "Controle do evento.", exact: true }),
  ).toBeVisible();
  if (await page.locator("#mobile-series-select").isVisible())
    await page.getByLabel("Confronto", { exact: true }).selectOption(id);
  else {
    const index = backend
      .getState()
      .series.findIndex((series) => series.id === id);
    await page.locator(".series-selector").nth(index).click();
  }
  const selected = backend
    .getState()
    .series.find((series) => series.id === id)!;
  await expect(
    page.locator(".admin-card").first().locator(".section-heading h2"),
  ).toHaveText(
    selected.phase === "tiebreak"
      ? "Desempate extra"
      : `Confronto ${String(selected.order).padStart(2, "0")}`,
  );
}

async function saveScore(
  page: Page,
  backend: MockSupabase,
  id: string,
  a: number,
  b: number,
  reason = "normal",
  winnerId?: string,
) {
  const before = backend.writes;
  await page.getByLabel("Como a partida terminou?").selectOption(reason);
  await page.getByRole("spinbutton").nth(0).fill(String(a));
  await page.getByRole("spinbutton").nth(1).fill(String(b));
  if (winnerId)
    await page.getByLabel("Quem venceu a partida?").selectOption(winnerId);
  await page
    .getByRole("button", { name: "Salvar partida", exact: true })
    .click();
  await expect.poll(() => backend.writes).toBe(before + 1);
  const series = backend.getState().series.find((series) => series.id === id)!;
  const result = getSeriesResult(series);
  await expect(page.locator(".admin-series-score")).toHaveText(
    `${result.winsA}:${result.winsB}`,
  );
  if (result.completed)
    await expect(page.locator(".series-complete")).toBeVisible();
  else
    await expect(page.locator(".game-form h3")).toHaveText(
      `Partida ${series.games.length + 1}`,
    );
}

function seededLeague(winners = ["a", "a", "a", "a", "a", "a"]) {
  let state = createInitialState();
  for (let index = 0; index < 6; index++)
    for (let game = 0; game < 2; game++)
      state = applyGameResult(state, `league-${index + 1}`, game, {
        scoreA: winners[index] === "a" ? 10 : 0,
        scoreB: winners[index] === "b" ? 10 : 0,
        reason: "normal",
      });
  return state;
}

function finishedState(upgraded: boolean) {
  let state = seededLeague();
  for (let game = 0; game < 3; game++)
    state = applyGameResult(state, "final", game, {
      scoreA: 10,
      scoreB: 0,
      reason: "normal",
    });
  state = applyGameResult(state, "boss", 0, {
    scoreA: upgraded ? 10 : 0,
    scoreB: upgraded ? 0 : 10,
    reason: "normal",
  });
  return state;
}

test("public page has no admin links; login rejects wrong password and non-admin account", async ({
  page,
  context,
}) => {
  const backend = new MockSupabase();
  await backend.install(context);
  await page.goto("/");
  await expect(page.locator('a[href*="admin"]')).toHaveCount(0);
  expect(await page.locator("body").innerText()).not.toMatch(/admin/i);
  await login(page, MOCK_ADMIN_EMAIL, "wrong-password");
  await expect(page.getByRole("alert")).toContainText(
    "Não foi possível entrar",
  );
  await page.getByLabel("E-mail", { exact: true }).fill(MOCK_VIEWER_EMAIL);
  await page.getByLabel("Senha", { exact: true }).fill(MOCK_PASSWORD);
  await page
    .getByRole("button", { name: "Entrar no painel", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: /Falta autorizar/ }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Salvar partida" }),
  ).toHaveCount(0);
  expect(backend.writes).toBe(0);
  await page.getByRole("button", { name: "Sair da conta" }).click();
  await expect(
    page.getByRole("button", { name: "Entrar no painel" }),
  ).toBeVisible();
});

for (const upgraded of [false, true])
  test(`full event through authenticated UI, realtime visitors and ${upgraded ? "full bundle" : "guaranteed Phantom"}`, async ({
    page,
    context,
    browser,
  }, testInfo) => {
    const backend = new MockSupabase();
    await backend.install(context);
    const viewerContext = await browser.newContext({
      ...testInfo.project.use,
      baseURL: "http://127.0.0.1:5190",
      reducedMotion: "reduce",
    });
    await backend.install(viewerContext);
    const viewer = await viewerContext.newPage();
    const browserErrors: string[] = [];
    page.on("pageerror", (error) => browserErrors.push(error.message));
    viewer.on("pageerror", (error) => browserErrors.push(error.message));
    try {
      await viewer.goto("/");
      await expect(viewer.locator(".connection-status")).toContainText(
        "Ao vivo",
      );
      await login(page);
      await expect(
        page.getByRole("heading", { name: "Controle do evento." }),
      ).toBeVisible();
      await expect(
        page.getByRole("button", { name: "Testar painel local" }),
      ).toHaveCount(0);
      await saveScore(page, backend, "league-1", 10, 9);
      await expect(
        viewer
          .locator(".standings-table tbody tr")
          .filter({ hasText: "isinha" })
          .locator(".stat-rounds"),
      ).toHaveText("10 RG", { timeout: 3000 });
      await saveScore(page, backend, "league-1", 1, 4, "knife", "isinha");
      expect(backend.getState().series[0].games[1]).toMatchObject({
        scoreA: 10,
        scoreB: 4,
        scoreAtTermination: { a: 1, b: 4 },
      });
      for (let index = 2; index <= 6; index++) {
        await page
          .locator(".series-complete")
          .getByRole("button", { name: "Próximo confronto", exact: true })
          .click();
        if (index === 2)
          await saveScore(
            page,
            backend,
            `league-${index}`,
            1,
            2,
            "violation",
            "kurtz",
          );
        else await saveScore(page, backend, `league-${index}`, 10, 0);
        await saveScore(page, backend, `league-${index}`, 10, 0);
      }
      expect(
        backend.getState().series.find((series) => series.id === "final"),
      ).toMatchObject({ playerA: "isinha", playerB: "alice" });
      await expect(viewer.locator(".spotlight")).toContainText(
        "A grande decisão.",
      );
      await expect(viewer.locator(".spotlight")).toContainText("isinha");
      await expect(viewer.locator(".spotlight")).toContainText("alice");
      await expect(viewer.locator(".spotlight-format")).toContainText("MD5");
      await page
        .locator(".series-complete")
        .getByRole("button", { name: "Próximo confronto", exact: true })
        .click();
      for (let game = 0; game < 3; game++)
        await saveScore(page, backend, "final", 10, 0);
      expect(
        backend.getState().series.find((series) => series.id === "boss"),
      ).toMatchObject({ playerA: "isinha", playerB: "tapioca", bestOf: 1 });
      await expect(viewer.locator(".spotlight")).toContainText("Tapioca");
      await expect(viewer.locator(".spotlight-format")).toContainText("MD1");
      await expect(page.locator(".series-complete")).toContainText(
        "Phantom garantida. Próximo desafio: Tapioca em MD1.",
      );
      await page
        .locator(".series-complete")
        .getByRole("button", { name: "Próximo confronto", exact: true })
        .click();
      await saveScore(
        page,
        backend,
        "boss",
        upgraded ? 10 : 0,
        upgraded ? 0 : 10,
      );
      const boss = backend
        .getState()
        .series.find((series) => series.id === "boss")!;
      expect(boss.games).toHaveLength(1);
      expect(getSeriesResult(boss)).toMatchObject({
        completed: true,
        winnerId: upgraded ? "isinha" : "tapioca",
      });
      await expect(page.locator(".game-history-row")).toHaveCount(1);
      await expect(page.locator(".game-form")).toHaveCount(0);
      await expect(
        page.getByRole("button", { name: "Salvar partida", exact: true }),
      ).toHaveCount(0);
      await expect(
        page
          .locator(".series-complete")
          .getByRole("button", { name: "Próximo confronto", exact: true }),
      ).toHaveCount(0);
      expect(() =>
        applyGameResult(backend.getState(), "boss", 1, {
          scoreA: 10,
          scoreB: 0,
          reason: "normal",
        }),
      ).toThrow();
      const celebration = viewer.getByRole("dialog");
      await expect(celebration).toBeVisible();
      await expect(
        celebration.getByRole("heading", { name: "isinha", exact: true }),
      ).toBeVisible();
      await expect(
        celebration.locator(".winner-celebration__prize"),
      ).toContainText(upgraded ? "PACOTE COMPLETO" : "PHANTOM");
      await viewer.screenshot({ path: testInfo.outputPath("winner.png") });
      await celebration
        .getByRole("button", { name: "Ver histórico do evento", exact: true })
        .click();
      await expect(celebration).not.toBeVisible();
      await expect(
        viewer.locator(".matches-grid").first().locator(".series-card"),
      ).toHaveCount(6);
      await expect(viewer.locator(".final-matches .series-card")).toHaveCount(
        2,
      );
      for (const [index, games] of [3, 1].entries()) {
        const series = viewer.locator(".final-matches .series-card").nth(index);
        await series.locator("summary").click();
        await expect(series.locator(".series-game")).toHaveCount(games);
      }
      await viewer
        .locator(".matches-grid .series-card")
        .first()
        .locator("summary")
        .click();
      await expect(viewer.locator(".series-games").first()).toContainText(
        "Faca",
      );
      await viewer.reload();
      await expect(viewer.locator(".winner-banner")).toContainText("isinha");
      await expect(viewer.getByRole("dialog")).not.toBeVisible();
      await viewer
        .getByRole("button", { name: "Rever celebração", exact: true })
        .click();
      await expect(viewer.getByRole("dialog")).toBeVisible();
      await viewer
        .getByRole("dialog")
        .getByRole("button", {
          name: "Fechar celebração e ver histórico do evento",
          exact: true,
        })
        .click();
      await expect(viewer.getByRole("dialog")).not.toBeVisible();
      expect(
        backend
          .getState()
          .series.reduce((total, series) => total + series.games.length, 0),
      ).toBe(16);
      expect(browserErrors).toEqual([]);
    } finally {
      await viewerContext.close();
    }
  });

test("absolute ties require manual MD1; rounds remain unchanged and final fills automatically", async ({
  page,
  context,
}) => {
  const backend = new MockSupabase(
    seededLeague(["a", "a", "a", "a", "b", "a"]),
  );
  const rounds = getStandings(backend.getState()).map((row) => [
    row.participant.id,
    row.rounds,
  ]);
  await backend.install(context);
  await page.goto("/");
  await expect(page.locator(".tie-notice")).toBeVisible();
  await expect(page.locator(".qualification-row")).toHaveCount(0);
  await login(page);
  for (const [a, b] of [
    ["isinha", "alice"],
    ["kurtz", "musashi"],
  ]) {
    await page.getByLabel("Primeiro jogador", { exact: true }).selectOption(a);
    await page.getByLabel("Segundo jogador", { exact: true }).selectOption(b);
    await page
      .getByRole("button", { name: "Criar desempate MD1", exact: true })
      .click();
    await expect(
      page.getByRole("heading", { name: "Desempate extra", exact: true }),
    ).toBeVisible();
    const id = backend
      .getState()
      .series.filter((series) => series.phase === "tiebreak")
      .at(-1)!.id;
    await saveScore(page, backend, id, 10, 0);
  }
  expect(
    getStandings(backend.getState()).map((row) => [
      row.participant.id,
      row.rounds,
    ]),
  ).toEqual(rounds);
  expect(
    backend.getState().series.find((series) => series.id === "final"),
  ).toMatchObject({ playerA: "isinha", playerB: "alice" });
});

test("invalid score and failed save preserve input; retry saves once; stale version cannot overwrite", async ({
  page,
  context,
}) => {
  const backend = new MockSupabase(createInitialState());
  await backend.install(context);
  await login(page);
  await page.getByRole("spinbutton").nth(0).fill("7");
  await page.getByRole("spinbutton").nth(1).fill("9");
  await page
    .getByRole("button", { name: "Salvar partida", exact: true })
    .click();
  await expect(page.getByRole("alert")).toContainText("precisa terminar");
  expect(backend.writes).toBe(0);
  await page.getByRole("spinbutton").nth(0).fill("10");
  backend.failNextWrite = true;
  await page
    .getByRole("button", { name: "Salvar partida", exact: true })
    .click();
  await expect(page.getByRole("alert")).toContainText(
    "Não foi possível salvar",
  );
  expect(backend.writes).toBe(0);
  await expect(page.getByRole("spinbutton").nth(0)).toHaveValue("10");
  await expect(page.getByRole("spinbutton").nth(1)).toHaveValue("9");
  backend.conflictNextWrite = true;
  await page
    .getByRole("button", { name: "Salvar partida", exact: true })
    .click();
  await expect(page.getByRole("alert")).toContainText("Outra janela atualizou");
  expect(backend.writes).toBe(0);
  await page
    .getByRole("button", { name: "Salvar partida", exact: true })
    .click();
  await expect.poll(() => backend.writes).toBe(1);
  await expect(page.locator(".game-form h3")).toHaveText("Partida 2");
  expect(backend.getState().series[0].games).toHaveLength(1);
});

test("map draw is persisted, confirmed on redraw and preserved when qualifying future players", async ({
  page,
  context,
}) => {
  const backend = new MockSupabase(createInitialState());
  await backend.install(context);
  await login(page);
  await page.getByRole("button", { name: "Sortear mapa", exact: true }).click();
  await expect(page.locator(".map-draw-tile.is-selected")).toHaveCount(1);
  const selectedMap = backend.getState().series[0].map;
  await page
    .getByRole("button", { name: "Sortear novamente", exact: true })
    .click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: `Manter mapa ${selectedMap}`, exact: true })
    .click();
  expect(backend.getState().series[0].map).toBe(selectedMap);
  await page.reload();
  await expect(page.locator(".map-draw-tile.is-selected")).toHaveCount(1);
  await selectSeries(page, "final", backend);
  await expect(page.locator(".empty-state")).toContainText(
    "Aguardando classificação",
  );
  await page.getByRole("button", { name: "Sortear mapa", exact: true }).click();
  await expect(page.locator(".map-draw-tile.is-selected")).toHaveCount(1);
  const finalMap = backend
    .getState()
    .series.find((series) => series.id === "final")!.map;
  const next = seededLeague();
  next.series.find((series) => series.id === "final")!.map = finalMap;
  backend.setState(next);
  await expect(page.locator(".admin-versus")).toContainText("isinha");
  await expect(page.locator(".map-draw-tile.is-selected")).toContainText(
    finalMap!,
  );
});

test("legacy Zacarias MD3 loads as Tapioca MD1 and persists migration only with the real result", async ({
  page,
  context,
}) => {
  let legacy = seededLeague();
  for (let game = 0; game < 3; game++)
    legacy = applyGameResult(legacy, "final", game, {
      scoreA: 10,
      scoreB: 0,
      reason: "normal",
    });
  legacy.participants = legacy.participants.map((participant) =>
    participant.id === "tapioca"
      ? { ...participant, id: "zacarias", name: "Zacarias", avatar: null }
      : participant,
  );
  const legacyBoss = legacy.series.find((series) => series.id === "boss")!;
  legacyBoss.playerB = "zacarias";
  legacyBoss.bestOf = 3;
  legacyBoss.map = "A";
  legacy.activeSeriesId = "boss";

  const leagueBefore = structuredClone(
    legacy.series.filter((series) => series.phase === "league"),
  );
  const finalBefore = structuredClone(
    legacy.series.find((series) => series.id === "final"),
  );
  const competitorsBefore = structuredClone(legacy.participants.slice(0, 4));
  const backend = new MockSupabase(legacy);
  const rowBefore = JSON.stringify(backend.row);
  await backend.install(context);
  await login(page);
  await expect(
    page.getByRole("heading", { name: "Controle do evento." }),
  ).toBeVisible();
  await selectSeries(page, "boss", backend);
  await expect(page.locator(".admin-versus")).toContainText("Tapioca");
  await expect(page.locator(".admin-versus")).not.toContainText("Zacarias");
  await expect(
    page
      .locator(".admin-card")
      .first()
      .locator(".section-heading")
      .first()
      .locator(".format-badge"),
  ).toHaveText("MD1");
  await expect(page.locator(".game-form h3")).toHaveText("Partida 1");
  await expect(page.locator(".map-draw-tile.is-selected")).toContainText("A");
  expect(backend.writes).toBe(0);
  expect(JSON.stringify(backend.row)).toBe(rowBefore);

  await saveScore(page, backend, "boss", 10, 7);

  const persisted = backend.getState();
  const boss = persisted.series.find((series) => series.id === "boss")!;
  expect(backend.writes).toBe(1);
  expect(backend.row?.version).toBe(2);
  expect(persisted.participants.slice(0, 4)).toEqual(competitorsBefore);
  expect(persisted.participants[4]).toMatchObject({
    id: "tapioca",
    name: "Tapioca",
    avatar: null,
  });
  expect(
    persisted.participants.some((participant) => participant.id === "zacarias"),
  ).toBe(false);
  expect(
    persisted.series.filter((series) => series.phase === "league"),
  ).toEqual(leagueBefore);
  expect(persisted.series.find((series) => series.id === "final")).toEqual(
    finalBefore,
  );
  expect(boss).toMatchObject({
    playerA: "isinha",
    playerB: "tapioca",
    bestOf: 1,
    map: "A",
  });
  expect(boss.games).toHaveLength(1);
  expect(getSeriesResult(boss)).toMatchObject({
    completed: true,
    winnerId: "isinha",
  });
  expect(persisted.activeSeriesId).toBeNull();
  await expect(page.locator(".game-form")).toHaveCount(0);
  await expect(page.locator(".series-complete")).toContainText(
    "Pacote completo Champions 2026 conquistado!",
  );
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "Controle do evento." }),
  ).toBeVisible();
  await selectSeries(page, "boss", backend);
  await expect(page.locator(".admin-versus")).toContainText("Tapioca");
  await expect(page.locator(".game-history-row")).toHaveCount(1);
  expect(backend.writes).toBe(1);
});

test("corrections protect played final and boss until explicit confirmation", async ({
  page,
  context,
}) => {
  const backend = new MockSupabase(finishedState(false));
  await backend.install(context);
  await login(page);
  await selectSeries(page, "boss", backend);
  await expect(page.locator(".game-history-row")).toHaveCount(1);
  await expect(page.locator(".series-complete")).toContainText(
    "Tapioca venceu!",
  );
  await selectSeries(page, "league-1", backend);
  await expect(page.locator(".game-history-row")).toHaveCount(2);
  const original = JSON.stringify(backend.getState());
  page.once("dialog", (dialog) => dialog.accept());
  await page
    .getByRole("button", {
      name: "Remover partida 1 e as seguintes deste confronto",
      exact: true,
    })
    .click();
  await expect(page.getByRole("dialog")).toContainText(
    "Essa correção altera o avanço.",
  );
  await page
    .getByRole("button", { name: "Manter resultados", exact: true })
    .click();
  expect(JSON.stringify(backend.getState())).toBe(original);
  page.once("dialog", (dialog) => dialog.accept());
  await page
    .getByRole("button", {
      name: "Remover partida 1 e as seguintes deste confronto",
      exact: true,
    })
    .click();
  await page
    .getByRole("button", {
      name: "Corrigir e limpar fases afetadas",
      exact: true,
    })
    .click();
  await expect(page.locator(".game-form h3")).toHaveText("Partida 1");
  expect(
    backend.getState().series.find((series) => series.id === "final")!.games,
  ).toHaveLength(0);
  expect(
    backend.getState().series.find((series) => series.id === "boss")!.games,
  ).toHaveLength(0);
});

test("offline visitor recovers snapshot; periodic polling does not erase unfinished input", async ({
  page,
  context,
}) => {
  const backend = new MockSupabase(createInitialState());
  await backend.install(context);
  await login(page);
  await page.getByRole("spinbutton").nth(0).fill("8");
  await page.getByRole("spinbutton").nth(1).fill("5");
  await page.evaluate(() => window.dispatchEvent(new Event("focus")));
  await expect(page.getByRole("spinbutton").nth(0)).toHaveValue("8");
  await expect(page.getByRole("spinbutton").nth(1)).toHaveValue("5");
  await page.goto("/");
  await context.setOffline(true);
  await expect(page.locator(".connection-status")).toContainText("Sem conexão");
  backend.dropRealtime = true;
  backend.setState(
    applyGameResult(backend.getState(), "league-1", 0, {
      scoreA: 10,
      scoreB: 4,
      reason: "normal",
    }),
  );
  await context.setOffline(false);
  await expect(
    page
      .locator(".standings-table tbody tr")
      .filter({ hasText: "isinha" })
      .locator(".stat-rounds"),
  ).toHaveText("10 RG");
});

test("small screens keep controls readable, touchable and free of horizontal overflow", async ({
  page,
  context,
}) => {
  const backend = new MockSupabase(createInitialState());
  await backend.install(context);
  await login(page);
  for (const width of [320, 360, 390, 600, 768]) {
    await page.setViewportSize({ width, height: 740 });
    await expect(page.getByLabel("Confronto", { exact: true })).toBeVisible();
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth),
    ).toBe(width);
    const fieldSizes = await page
      .getByRole("spinbutton")
      .evaluateAll((elements) =>
        elements.map((element) => ({
          font: parseFloat(getComputedStyle(element).fontSize),
          width: element.getBoundingClientRect().width,
          height: element.getBoundingClientRect().height,
        })),
      );
    expect(
      fieldSizes.every(
        (field) => field.font >= 16 && field.width >= 44 && field.height >= 44,
      ),
    ).toBe(true);
    const removeButtons = await page
      .getByRole("button", { name: "Sortear mapa", exact: true })
      .boundingBox();
    expect(removeButtons!.height).toBeGreaterThanOrEqual(44);
  }
  await page.getByLabel("Confronto", { exact: true }).selectOption("league-2");
  await expect(page.locator(".admin-versus")).toContainText("kurtz");
  await expect(page.locator(".admin-versus")).toContainText("musashi");
  await page.goto("/");
  for (const width of [320, 360, 390, 768]) {
    await page.setViewportSize({ width, height: 740 });
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth),
    ).toBe(width);
    await expect(
      page.getByRole("link", { name: "As fases", exact: true }),
    ).toBeVisible();
    await expect(page.locator('a[href*="admin"]')).toHaveCount(0);
  }
});

test("winner modal fits a small screen, traps keyboard, closes with Escape and respects reduced motion", async ({
  page,
  context,
}) => {
  const backend = new MockSupabase(finishedState(true));
  await backend.install(context);
  await page.setViewportSize({ width: 320, height: 568 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  const modal = page.getByRole("dialog");
  await expect(modal).toBeVisible();
  const bounds = await modal.boundingBox();
  expect(bounds!.width).toBeLessThanOrEqual(320);
  expect(bounds!.height).toBeLessThanOrEqual(568);
  expect(
    await modal
      .locator(".winner-celebration__confetti")
      .evaluate((element) => getComputedStyle(element).display),
  ).toBe("none");
  for (let index = 0; index < 4; index++) {
    await page.keyboard.press("Tab");
    expect(await modal.evaluate((element) => element.matches(":modal"))).toBe(
      true,
    );
    // Native dialogs may let Tab visit browser chrome, but never background page controls.
    expect(
      await page.evaluate(
        () =>
          !document.hasFocus() ||
          Boolean(document.activeElement?.closest("dialog")),
      ),
    ).toBe(true);
  }
  await page.keyboard.press("Escape");
  await expect(modal).not.toBeVisible();
  await expect(page.locator(".winner-banner")).toContainText("isinha");
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page
    .getByRole("button", { name: "Rever celebração", exact: true })
    .click();
  await expect(modal).toBeVisible();
  await expect
    .poll(() =>
      modal
        .locator(".winner-celebration__confetti > span")
        .evaluateAll((pieces) =>
          pieces.some(
            (piece) =>
              parseFloat(getComputedStyle(piece).opacity) > 0 &&
              piece.getBoundingClientRect().bottom > 0,
          ),
        ),
    )
    .toBe(true);
  await modal
    .getByRole("button", { name: "Ver histórico do evento", exact: true })
    .click();
  await expect(modal).not.toBeVisible();
});

test("public page, admin form and final modal pass automated accessibility checks", async ({
  page,
  context,
}, testInfo) => {
  const backend = new MockSupabase(createInitialState());
  await backend.install(context);
  await page.goto("/");
  for (const stage of ["public", "admin", "winner"]) {
    if (stage === "admin") await login(page);
    if (stage === "winner") {
      backend.setState(finishedState(true));
      await page.goto("/");
      await expect(page.getByRole("dialog")).toBeVisible();
    }
    const report = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
      .analyze();
    if (report.violations.length)
      await testInfo.attach(`${stage}-accessibility-violations`, {
        body: JSON.stringify(report.violations, null, 2),
        contentType: "application/json",
      });
    expect(
      report.violations.map((violation) => ({
        id: violation.id,
        impact: violation.impact,
        nodes: violation.nodes.map((node) => node.target),
      })),
      stage,
    ).toEqual([]);
  }
});
