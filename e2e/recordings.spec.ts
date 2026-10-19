import { test, expect, type BrowserContext, type Page } from "@playwright/test";
import {
  applyGameResult,
  createInitialState,
  type TournamentState,
} from "../src/domain";
import type { EventRecording } from "../src/recordings";
import { MockSupabase } from "./mock-supabase";

function recordedEvent(): TournamentState {
  let state = createInitialState();
  for (const series of state.series.filter((item) => item.phase === "league"))
    for (let game = 0; game < 2; game++)
      state = applyGameResult(state, series.id, game, {
        scoreA: 4,
        scoreB: 10,
        reason: "normal",
      });
  for (let game = 0; game < 3; game++)
    state = applyGameResult(state, "final", game, {
      scoreA: 10,
      scoreB: 3,
      reason: "normal",
    });
  state = applyGameResult(state, "boss", 0, {
    scoreA: 6,
    scoreB: 10,
    reason: "normal",
  });
  for (const series of state.series) series.map = "E";
  return state;
}

function recordingFixture(state: TournamentState): EventRecording[] {
  return state.series.map((series, index) => ({
    seriesId: series.id,
    youtubeId: `sscVideo${String(index + 1).padStart(3, "0")}`,
    title: `Confronto de teste ${index + 1}`,
    durationSeconds: 785 + index * 231,
    ...(index === 0
      ? { notes: "Pausa de teste na gravação deste confronto." }
      : series.phase === "boss"
        ? { notes: "Trecho de teste ausente no início da gravação." }
        : {}),
  }));
}

async function installRecordings(
  context: BrowserContext,
  recordings: readonly EventRecording[],
) {
  // Replace only the browser response: no fixture IDs are written into src.
  await context.route("**/src/recordings.ts*", (route) =>
    route.fulfill({
      contentType: "application/javascript; charset=utf-8",
      body: `export const EVENT_RECORDINGS = ${JSON.stringify(recordings)};`,
    }),
  );
  await context.route("https://www.youtube-nocookie.com/**", (route) =>
    route.fulfill({
      contentType: "text/html; charset=utf-8",
      body: '<!doctype html><html lang="pt-BR"><meta charset="utf-8"><title>Player isolado</title><body style="margin:0;min-height:100vh;background:#080b0f;color:#eee;display:grid;place-items:center">Player de teste YouTube</body></html>',
    }),
  );
  await context.addInitScript(() => {
    localStorage.setItem("ssc-winner-celebration", "musashi:tapioca");
  });
}

function trackYoutube(page: Page) {
  const requests: string[] = [];
  page.on("request", (request) => {
    const host = new URL(request.url()).hostname;
    if (/(^|\.)(youtube(?:-nocookie)?\.com|youtu\.be|ytimg\.com)$/.test(host))
      requests.push(request.url());
  });
  return requests;
}

test("recording archive stays absent when no published videos are configured", async ({
  page,
  context,
}) => {
  const backend = new MockSupabase(createInitialState());
  await backend.install(context);
  await installRecordings(context, []);
  const requests = trackYoutube(page);
  await page.goto("/");
  await expect(page.locator(".connection-status")).toContainText("Ao vivo");
  await expect(page.locator("#gravacoes")).toHaveCount(0);
  await expect(page.locator("iframe")).toHaveCount(0);
  expect(requests).toEqual([]);
  expect(backend.writes).toBe(0);
  expect(backend.faults).toEqual([]);
});

test("recordings load only after a click and switch one privacy-enhanced player using real event results", async ({
  page,
  context,
}, testInfo) => {
  const state = recordedEvent();
  const backend = new MockSupabase(state);
  await backend.install(context);
  await installRecordings(context, recordingFixture(state));
  const requests = trackYoutube(page);
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/");
  await expect(page.locator(".connection-status")).toContainText("Ao vivo");
  await expect(page.locator(".recording-card")).toHaveCount(8);
  await expect(page.locator("#gravacoes .section-note")).toHaveText(
    "8 confrontos gravados",
  );
  await expect(
    page.locator(".recordings-group--league .recording-card"),
  ).toHaveCount(6);
  await expect(
    page.locator(".recordings-group--decisions .recording-card"),
  ).toHaveCount(2);
  await expect(
    page.locator(".recording-card__bottom > span:last-child"),
  ).toHaveText(Array(8).fill("REPLAY"));
  await expect(page.locator(".recordings-note")).toHaveText(
    "Pausa de teste na gravação deste confronto.",
  );
  await expect(page.locator(".recordings-screen iframe")).toHaveCount(0);
  expect(requests).toEqual([]);

  await page.locator(".recordings-poster").click();
  const player = page.locator(".recordings-screen iframe");
  await expect(player).toHaveCount(1);
  await expect(player).toHaveAttribute(
    "src",
    /youtube-nocookie\.com\/embed\/sscVideo001\?/,
  );
  await expect(player).toHaveAttribute("loading", "lazy");
  await expect(player).toHaveAttribute(
    "referrerpolicy",
    "strict-origin-when-cross-origin",
  );
  await player.scrollIntoViewIfNeeded();
  await expect(
    page
      .frameLocator(".recordings-screen iframe")
      .getByText("Player de teste YouTube", { exact: true }),
  ).toBeVisible();

  const boss = page.getByRole("button", {
    name: "Assistir Chefão final: musashi contra Tapioca",
    exact: true,
  });
  await boss.scrollIntoViewIfNeeded();
  if (testInfo.project.use.hasTouch) await boss.tap();
  else await boss.click();
  await expect(player).toHaveCount(1);
  await expect(player).toHaveAttribute(
    "src",
    /youtube-nocookie\.com\/embed\/sscVideo008\?/,
  );
  await expect(page.locator(".recordings-current h3")).toHaveText(
    "musashi × Tapioca",
  );
  await expect(page.locator(".recordings-current__score strong")).toHaveText(
    "0 × 1",
  );
  await expect(page.locator(".recordings-rounds")).toContainText("6 × 10");
  await expect(page.locator(".recordings-note")).toHaveText(
    "Trecho de teste ausente no início da gravação.",
  );
  await expect(page.locator(".recordings-external")).toHaveAttribute(
    "href",
    "https://www.youtube.com/watch?v=sscVideo008",
  );
  await expect(page.locator(".recording-card[aria-pressed=true]")).toHaveCount(
    1,
  );
  await expect(
    page
      .frameLocator(".recordings-screen iframe")
      .getByText("Player de teste YouTube", { exact: true }),
  ).toBeVisible();

  const requestsBeforeUpdate = requests.length;
  const updated = applyGameResult(state, "boss", 0, {
    scoreA: 7,
    scoreB: 10,
    reason: "normal",
  });
  updated.participants.find(
    (participant) => participant.id === "musashi",
  )!.name = "Musashi atualizado";
  backend.setState(updated);
  await expect(page.locator(".recordings-current h3")).toHaveText(
    "Musashi atualizado × Tapioca",
  );
  await expect(page.locator(".recordings-rounds")).toContainText("7 × 10");
  await expect(player).toHaveCount(1);
  expect(requests).toHaveLength(requestsBeforeUpdate);

  const final = page.getByRole("button", {
    name: "Assistir Grande final: Musashi atualizado contra kurtz",
    exact: true,
  });
  await final.focus();
  await final.press("Enter");
  await expect(player).toHaveAttribute("src", /sscVideo007\?/);
  await expect(page.locator(".recordings-note")).toHaveCount(0);
  await expect(page.locator(".recordings-current__score strong")).toHaveText(
    "3 × 0",
  );
  expect(backend.writes).toBe(0);
  expect(backend.faults).toEqual([]);
  expect(errors).toEqual([]);
});

test("recorded-event cards and notes remain readable without overflow at 320px and 390px", async ({
  page,
  context,
}, testInfo) => {
  const state = recordedEvent();
  const backend = new MockSupabase(state);
  await backend.install(context);
  await installRecordings(context, recordingFixture(state));
  const requests = trackYoutube(page);
  await page.goto("/");
  await expect(page.locator(".connection-status")).toContainText("Ao vivo");
  await expect(page.locator(".recording-card")).toHaveCount(8);
  for (const width of [320, 390]) {
    await page.setViewportSize({ width, height: 844 });
    await page.locator("#gravacoes").scrollIntoViewIfNeeded();
    await page.evaluate(() => document.fonts.ready);
    const metrics = await page.locator("#gravacoes").evaluate((section) => ({
      pageWidth: document.documentElement.scrollWidth,
      sectionWidth: section.scrollWidth,
      sectionClientWidth: section.clientWidth,
      cards: [...section.querySelectorAll<HTMLElement>(".recording-card")].map(
        (card) => ({
          width: card.clientWidth,
          scroll: card.scrollWidth,
        }),
      ),
      player: section
        .querySelector(".recordings-screen")!
        .getBoundingClientRect()
        .toJSON(),
      noteFont: Number.parseFloat(
        getComputedStyle(section.querySelector(".recordings-note")!).fontSize,
      ),
    }));
    expect(metrics.pageWidth).toBe(width);
    expect(metrics.sectionWidth).toBeLessThanOrEqual(
      metrics.sectionClientWidth,
    );
    expect(metrics.cards.every((card) => card.scroll <= card.width)).toBe(true);
    expect(metrics.player.height).toBeGreaterThanOrEqual(200);
    expect(metrics.player.width).toBeLessThanOrEqual(width);
    expect(metrics.noteFont).toBeGreaterThanOrEqual(12);
    await page.screenshot({
      path: testInfo.outputPath(`recordings-${width}.png`),
    });
  }
  await expect(page.locator(".recordings-screen iframe")).toHaveCount(0);
  expect(requests).toEqual([]);
  expect(backend.writes).toBe(0);
});
