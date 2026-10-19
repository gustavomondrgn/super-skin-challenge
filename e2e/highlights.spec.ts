import AxeBuilder from "@axe-core/playwright";
import { createServer } from "node:http";
import { test, expect, type BrowserContext } from "@playwright/test";
import { createInitialState } from "../src/domain";
import {
  HIGHLIGHT_PARTICIPANTS,
  type EventHighlight,
  type HighlightParticipantId,
} from "../src/highlights";
import { MockSupabase } from "./mock-supabase";

const MEDIA_BASE = "https://media.ssc.test/highlights/";

function fixture(
  id: string,
  participantIds: readonly HighlightParticipantId[],
): EventHighlight {
  const downloadFilename = `super-skin-challenge-${id}.mp4`;
  const videoUrl = `${MEDIA_BASE}${id}.mp4`;
  return {
    id,
    title: `Momento ${id}`,
    description: "Uma jogada e a reação da turma no evento.",
    participantIds,
    category: participantIds.length ? "mixed" : "funny",
    durationSeconds: 12,
    sizeBytes: 6_500_000,
    videoUrl,
    posterUrl: `${MEDIA_BASE}${id}.jpg`,
    downloadFilename,
    downloadUrl: `${videoUrl}?download=${encodeURIComponent(downloadFilename)}`,
  };
}

const CLIPS: readonly EventHighlight[] = [
  fixture("alice", ["alice"]),
  fixture("isinha", ["isinha"]),
  fixture("kurtz", ["kurtz"]),
  fixture("musashi", ["musashi"]),
  fixture("tapioca", ["tapioca"]),
  fixture("zakkaryz", ["zakkaryz"]),
  fixture("duelo", ["alice", "musashi"]),
  fixture("resenha", []),
  ...Array.from({ length: 7 }, (_, index) =>
    fixture(`extra-${index + 1}`, [
      HIGHLIGHT_PARTICIPANTS[index % HIGHLIGHT_PARTICIPANTS.length].id,
    ]),
  ),
];

async function installHighlights(
  context: BrowserContext,
  highlights: readonly EventHighlight[] = CLIPS,
) {
  await context.route("**/src/highlights.ts*", (route) =>
    route.fulfill({
      contentType: "application/javascript; charset=utf-8",
      body: `export const EVENT_HIGHLIGHTS = ${JSON.stringify(highlights)};
export const HIGHLIGHT_PARTICIPANTS = ${JSON.stringify(HIGHLIGHT_PARTICIPANTS)};`,
    }),
  );
  await context.route(`${MEDIA_BASE}**`, (route) => {
    const url = new URL(route.request().url());
    const filename = url.searchParams.get("download");
    return route.fulfill(
      filename
        ? {
            contentType: "video/mp4",
            headers: {
              "content-disposition": `attachment; filename="${filename}"`,
            },
            body: Buffer.from("isolated-download-fixture"),
          }
        : {
            contentType: "image/svg+xml",
            body: '<svg xmlns="http://www.w3.org/2000/svg" width="640" height="360"><rect width="640" height="360" fill="#171d25"/></svg>',
          },
    );
  });
}

async function installMediaProbe(context: BrowserContext) {
  // Isolate UI lifecycle behavior from codecs and remote media availability.
  // Production playback and the exported MP4 files are verified separately.
  await context.addInitScript(() => {
    const prototype = HTMLMediaElement.prototype;
    prototype.play = function () {
      this.dataset.testPlaybackState = "playing";
      return Promise.resolve();
    };
    prototype.pause = function () {
      this.dataset.testPlaybackState = "paused";
    };
    prototype.load = function () {};
  });
}

test("highlights stay absent when no clips are published", async ({
  page,
  context,
}) => {
  const backend = new MockSupabase(createInitialState());
  await backend.install(context);
  await installHighlights(context, []);
  const mediaRequests: string[] = [];
  page.on("request", (request) => {
    if (request.url().startsWith(MEDIA_BASE)) mediaRequests.push(request.url());
  });
  await page.goto("/");
  await expect(page.locator(".connection-status")).toContainText("Ao vivo");
  await expect(page.locator("#melhores-momentos")).toHaveCount(0);
  expect(mediaRequests).toEqual([]);
  expect(backend.writes).toBe(0);
  expect(backend.faults).toEqual([]);
});

test("participant filters show the correct clips and pagination keeps every moment reachable", async ({
  page,
  context,
}) => {
  const backend = new MockSupabase(createInitialState());
  await backend.install(context);
  await installHighlights(context);
  const videoRequests: string[] = [];
  page.on("request", (request) => {
    if (request.url().startsWith(MEDIA_BASE) && request.url().includes(".mp4"))
      videoRequests.push(request.url());
  });
  await page.goto("/");
  const section = page.locator("#melhores-momentos");
  const filters = section.getByRole("group", {
    name: "Filtrar clipes por participante",
  });
  await expect(section.locator(".highlight-card")).toHaveCount(12);
  await expect(section.locator(".section-note")).toHaveText("15 clipes do evento");
  await expect(section.locator("video")).toHaveCount(0);
  for (const participant of HIGHLIGHT_PARTICIPANTS) {
    const matching = CLIPS.filter((clip) =>
      clip.participantIds.includes(participant.id),
    );
    const button = filters.getByRole("button", {
      name: `${participant.name} ${matching.length}`,
      exact: true,
    });
    await button.click();
    await expect(button).toHaveAttribute("aria-pressed", "true");
    await expect(filters.locator('[aria-pressed="true"]')).toHaveCount(1);
    await expect(section.locator(".highlights-count")).toHaveText(
      `${matching.length} clipes com ${participant.name}`,
    );
    await expect(section.locator(".highlight-card h3")).toHaveText(
      matching.map((clip) => clip.title),
    );
    await expect(section.locator("video")).toHaveCount(0);
  }
  await filters.getByRole("button", { name: "Todos 15", exact: true }).click();
  await expect(section.locator(".highlight-card")).toHaveCount(12);
  await section.getByRole("button", { name: "Ver mais clipes" }).click();
  await expect(section.locator(".highlight-card")).toHaveCount(15);
  await expect(section.locator(".highlight-card h3")).toHaveText(
    CLIPS.map((clip) => clip.title),
  );
  await expect(section.getByText("Resenha da turma", { exact: true })).toBeVisible();
  await expect(section.getByRole("button", { name: "Ver mais clipes" })).toHaveCount(0);
  expect(videoRequests).toEqual([]);
  expect(backend.writes).toBe(0);
  expect(backend.faults).toEqual([]);
});

test("explicit play, switching clips, filters and closing keep only one player active", async ({
  page,
  context,
}) => {
  const backend = new MockSupabase(createInitialState());
  await backend.install(context);
  await installHighlights(context);
  await installMediaProbe(context);
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/");
  const section = page.locator("#melhores-momentos");
  await expect(section.locator(".highlight-card")).toHaveCount(12);
  await expect(section.locator("video")).toHaveCount(0);

  const alicePoster = section.getByRole("button", {
    name: /^Assistir clipe: Momento alice, /,
  });
  await alicePoster.focus();
  await alicePoster.press("Enter");
  const player = section.locator("video");
  await expect(player).toHaveCount(1);
  await expect(player).toHaveAttribute("aria-label", "Clipe: Momento alice");
  await expect(player).toHaveAttribute("data-test-playback-state", "playing");
  await expect(player).not.toHaveAttribute("autoplay");
  await expect(player).toHaveAttribute("playsinline", "");
  const firstPlayer = await player.elementHandle();

  await section.getByRole("button", {
    name: /^Assistir clipe: Momento isinha, /,
  }).click();
  await expect(player).toHaveCount(1);
  await expect(player).toHaveAttribute("aria-label", "Clipe: Momento isinha");
  await expect(player).toHaveAttribute("data-test-playback-state", "playing");
  expect(await firstPlayer!.evaluate((element) => element.dataset.testPlaybackState)).toBe("paused");
  expect(await firstPlayer!.getAttribute("src")).toBeNull();

  const secondPlayer = await player.elementHandle();
  await section.getByRole("group", { name: "Filtrar clipes por participante" })
    .getByRole("button", { name: "Alice 4", exact: true }).click();
  await expect(player).toHaveCount(0);
  expect(await secondPlayer!.evaluate((element) => element.dataset.testPlaybackState)).toBe("paused");
  await alicePoster.click();
  await expect(player).toHaveCount(1);
  const thirdPlayer = await player.elementHandle();
  await section.getByRole("button", {
    name: "Fechar vídeo: Momento alice",
    exact: true,
  }).click();
  await expect(player).toHaveCount(0);
  await expect(alicePoster).toBeFocused();
  expect(await thirdPlayer!.evaluate((element) => element.dataset.testPlaybackState)).toBe("paused");
  expect(backend.writes).toBe(0);
  expect(backend.faults).toEqual([]);
  expect(errors).toEqual([]);
});

test("download uses the attachment URL and preserves the filename", async ({
  page,
  context,
}) => {
  const backend = new MockSupabase(createInitialState());
  await backend.install(context);
  // WebKit's download handoff needs a real HTTP response rather than route.fulfill.
  // A different local port preserves the cross-origin attachment behavior.
  const first = { ...CLIPS[0] };
  const server = createServer((_request, response) => {
    response.writeHead(200, {
      "content-type": "video/mp4",
      "content-disposition": `attachment; filename="${first.downloadFilename}"`,
      "content-length": 25,
    });
    response.end("isolated-download-fixture");
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  try {
    const address = server.address();
    if (!address || typeof address === "string") throw new Error("Missing fixture server port");
    first.downloadUrl = `http://127.0.0.1:${address.port}/alice.mp4?download=${first.downloadFilename}`;
    await installHighlights(context, [first, ...CLIPS.slice(1)]);
    await page.goto("/");
    const section = page.locator("#melhores-momentos");
    const link = section.getByRole("link", {
      name: `Baixar clipe: ${first.title}`,
      exact: true,
    });
    await expect(link).toHaveAttribute("download", first.downloadFilename);
    await expect(link).toHaveAttribute("href", first.downloadUrl);
    const [download] = await Promise.all([
      page.waitForEvent("download"),
      link.click(),
    ]);
    expect(download.suggestedFilename()).toBe(first.downloadFilename);
    expect(await download.failure()).toBeNull();
    await expect(section.locator("video")).toHaveCount(0);
    expect(backend.writes).toBe(0);
  } finally {
    await new Promise<void>((resolve, reject) =>
      server.close((error) => (error ? reject(error) : resolve())),
    );
  }
});

test("clip controls fit 320px and 390px screens and pass automated accessibility checks", async ({
  page,
  context,
}, testInfo) => {
  const backend = new MockSupabase(createInitialState());
  await backend.install(context);
  await installHighlights(context);
  await page.goto("/");
  const section = page.locator("#melhores-momentos");
  for (const width of [320, 390]) {
    await page.setViewportSize({ width, height: 844 });
    await section.scrollIntoViewIfNeeded();
    await page.evaluate(() => document.fonts.ready);
    const metrics = await section.evaluate((element) => ({
      documentWidth: document.documentElement.scrollWidth,
      sectionWidth: element.scrollWidth,
      clientWidth: element.clientWidth,
      controls: [...element.querySelectorAll<HTMLElement>("button, a")].map((control) => ({
        width: control.getBoundingClientRect().width,
        height: control.getBoundingClientRect().height,
      })),
      cards: [...element.querySelectorAll<HTMLElement>(".highlight-card")].map((card) => ({
        width: card.clientWidth,
        scrollWidth: card.scrollWidth,
      })),
    }));
    expect(metrics.documentWidth).toBe(width);
    expect(metrics.sectionWidth).toBeLessThanOrEqual(metrics.clientWidth);
    expect(metrics.controls.every((control) => control.width >= 44 && control.height >= 44)).toBe(true);
    expect(metrics.cards.every((card) => card.scrollWidth <= card.width)).toBe(true);
    await page.screenshot({ path: testInfo.outputPath(`highlights-${width}.png`) });
  }
  const report = await new AxeBuilder({ page })
    .include("#melhores-momentos")
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
    .analyze();
  if (report.violations.length)
    await testInfo.attach("highlights-accessibility-violations", {
      body: JSON.stringify(report.violations, null, 2),
      contentType: "application/json",
    });
  expect(report.violations.map((violation) => ({
    id: violation.id,
    impact: violation.impact,
    nodes: violation.nodes.map((node) => node.target),
  }))).toEqual([]);
  expect(backend.writes).toBe(0);
  expect(backend.faults).toEqual([]);
});
