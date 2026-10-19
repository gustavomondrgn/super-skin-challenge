import { expect, test, type Page } from "@playwright/test";
import { applyGameResult, createInitialState } from "../src/domain";
import { MockSupabase } from "./mock-supabase";

function finishedState() {
  let state = createInitialState();
  for (let series = 1; series <= 6; series++)
    for (let game = 0; game < 2; game++)
      state = applyGameResult(state, `league-${series}`, game, {
        scoreA: 10,
        scoreB: 0,
        reason: "normal",
      });
  for (let game = 0; game < 3; game++)
    state = applyGameResult(state, "final", game, {
      scoreA: 10,
      scoreB: 0,
      reason: "normal",
    });
  return applyGameResult(state, "boss", 0, {
    scoreA: 10,
    scoreB: 4,
    reason: "normal",
  });
}

type ObservedAudioWindow = Window & {
  __celebrationAudioContexts: AudioContext[];
  __celebrationOscillators: number;
  webkitAudioContext?: typeof AudioContext;
};

// Keep real browser synthesis and autoplay rules. The wrapper records native
// contexts and oscillators without replacing audio nodes, timing or output.
async function observeAudio(page: Page) {
  await page.addInitScript(() => {
    const observed = window as unknown as ObservedAudioWindow;
    observed.__celebrationAudioContexts = [];
    observed.__celebrationOscillators = 0;
    const NativeContext = window.AudioContext ?? observed.webkitAudioContext;
    if (!NativeContext) return;
    const ObservedContext = new Proxy(NativeContext, {
      construct(target, argumentsList) {
        const context = Reflect.construct(target, argumentsList) as AudioContext;
        const createOscillator = context.createOscillator.bind(context);
        context.createOscillator = () => {
          observed.__celebrationOscillators++;
          return createOscillator();
        };
        observed.__celebrationAudioContexts.push(context);
        return context;
      },
    });
    Object.defineProperty(window, window.AudioContext ? "AudioContext" : "webkitAudioContext", {
      configurable: true,
      writable: true,
      value: ObservedContext,
    });
  });
}

async function audioStates(page: Page) {
  return page.evaluate(() =>
    (window as unknown as ObservedAudioWindow).__celebrationAudioContexts.map(
      (context) => context.state,
    ),
  );
}

async function audioSupport(page: Page) {
  return page.evaluate(() => ({
    audioContext: typeof window.AudioContext,
    webkitAudioContext: typeof (window as unknown as ObservedAudioWindow).webkitAudioContext,
    origin: window.location.origin,
  }));
}

test("full-screen celebration keeps confetti across the viewport and controls reachable in portrait and landscape", async ({
  page,
  context,
}, testInfo) => {
  const backend = new MockSupabase(finishedState());
  await backend.install(context);
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.goto("/");
  const modal = page.getByRole("dialog");
  await expect(modal).toBeVisible();
  const nativeAudio = await audioSupport(page);
  const hasAudio = nativeAudio.audioContext === "function" || nativeAudio.webkitAudioContext === "function";
  const timing: Array<{ viewport: string; renderMs: number; screenshotMs: number; controlsMs: number }> = [];

  const viewports = [
    { width: 1440, height: 1000 },
    { width: 320, height: 568 },
    { width: 568, height: 320 },
  ];
  for (const [index, viewport] of viewports.entries()) {
    if (index) {
      await page.keyboard.press("Escape");
      await expect(modal).not.toBeVisible();
      await page.getByRole("button", { name: "Rever celebração", exact: true }).click();
      await expect(modal).toBeVisible();
    }
    await page.setViewportSize(viewport);
    const renderedAt = Date.now();
    const confetti = modal.locator(".winner-celebration__confetti");
    const bounds = await confetti.boundingBox();
    expect(bounds).not.toBeNull();
    expect(bounds!.x).toBeCloseTo(0, 0);
    expect(bounds!.y).toBeCloseTo(0, 0);
    expect(bounds!.width).toBeCloseTo(viewport.width, 0);
    expect(bounds!.height).toBeCloseTo(viewport.height, 0);
    expect(
      await confetti.evaluate((element) => getComputedStyle(element).pointerEvents),
    ).toBe("none");
    await expect
      .poll(() =>
        confetti.locator("span").evaluateAll((pieces) =>
          pieces.some((piece) =>
            piece.getAnimations().some((animation) => animation.playState === "running"),
          ),
        ),
      )
      .toBe(true);
    await expect
      .poll(() => modal.locator(".winner-celebration__content").evaluate(
        (element) => getComputedStyle(element).opacity,
      ))
      .toBe("1");
    const screenshotAt = Date.now();
    await page.screenshot({
      path: testInfo.outputPath(`celebration-${viewport.width}x${viewport.height}.png`),
      scale: "css",
    });
    const controlsAt = Date.now();

    const history = modal.getByRole("button", {
      name: "Ver histórico do evento",
      exact: true,
    });
    await history.scrollIntoViewIfNeeded();
    for (const control of [
      history,
      ...(hasAudio ? [modal.locator(".winner-celebration__music")] : []),
      modal.getByRole("button", {
        name: "Fechar celebração e ver histórico do evento",
        exact: true,
      }),
    ]) {
      await control.scrollIntoViewIfNeeded();
      await expect(control).toBeInViewport();
      const box = await control.boundingBox();
      expect(box!.width).toBeGreaterThanOrEqual(44);
      expect(box!.height).toBeGreaterThanOrEqual(44);
      expect(box!.x).toBeGreaterThanOrEqual(0);
      expect(box!.x + box!.width).toBeLessThanOrEqual(viewport.width + 1);
    }
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth),
    ).toBeLessThanOrEqual(viewport.width);
    expect(await modal.evaluate((element) => element.scrollWidth)).toBeLessThanOrEqual(
      viewport.width,
    );
    timing.push({
      viewport: `${viewport.width}x${viewport.height}`,
      renderMs: screenshotAt - renderedAt,
      screenshotMs: controlsAt - screenshotAt,
      controlsMs: Date.now() - controlsAt,
    });
  }
  await testInfo.attach("layout-timings", {
    body: JSON.stringify(timing, null, 2),
    contentType: "application/json",
  });
  expect(backend.writes).toBe(0);
});

test("native music lifecycle and unsupported-browser fallback both preserve celebration controls", async ({
  page,
  context,
}, testInfo) => {
  const backend = new MockSupabase(finishedState());
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await backend.install(context);
  await observeAudio(page);
  await page.goto("/");
  const modal = page.getByRole("dialog");
  await expect(modal).toBeVisible();
  const nativeAudio = await audioSupport(page);
  await testInfo.attach("native-audio-support", {
    body: JSON.stringify(nativeAudio, null, 2),
    contentType: "application/json",
  });
  const activate = modal.getByRole("button", { name: "Ativar música", exact: true });
  if (nativeAudio.audioContext !== "function" && nativeAudio.webkitAudioContext !== "function") {
    // Playwright's Windows WebKit build has no native Web Audio. Verify the
    // actual fallback instead of faking audio support or skipping the browser.
    await expect(modal.locator(".winner-celebration__music")).toHaveCount(0);
    expect(await audioStates(page)).toEqual([]);
    await modal.locator(".winner-celebration__history").click();
    await expect(modal).not.toBeVisible();
    const replay = page.getByRole("button", { name: "Rever celebração", exact: true });
    await replay.focus();
    await replay.press("Enter");
    await expect(modal).toBeVisible();
    await expect(modal.getByRole("heading", { name: "isinha", exact: true })).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(modal).not.toBeVisible();
    await expect(replay).toBeFocused();
    expect(await audioStates(page)).toEqual([]);
    expect(errors).toEqual([]);
    expect(backend.writes).toBe(0);
    return;
  }
  await expect(activate).toHaveAttribute("aria-pressed", "false");
  expect(await audioStates(page)).toEqual([]);
  await activate.click();
  const mute = modal.getByRole("button", { name: "Silenciar música", exact: true });
  await expect(mute).toHaveAttribute("aria-pressed", "true");
  await expect.poll(() => audioStates(page)).toEqual(["running"]);
  expect(
    await page.evaluate(() => (window as unknown as ObservedAudioWindow).__celebrationOscillators),
  ).toBeGreaterThan(0);

  await expect.poll(() => audioStates(page), { timeout: 24_000 }).toEqual(["closed"]);
  await expect(activate).toHaveAttribute("aria-pressed", "false");
  await activate.click();
  await expect.poll(() => audioStates(page)).toEqual(["closed", "running"]);

  await mute.click();
  await expect(activate).toHaveAttribute("aria-pressed", "false");
  await expect.poll(() => audioStates(page)).toEqual(["closed", "closed"]);
  await activate.click();
  await expect.poll(() => audioStates(page)).toEqual(["closed", "closed", "running"]);
  await modal.locator(".winner-celebration__history").click();
  await expect(modal).not.toBeVisible();
  await expect.poll(() => audioStates(page)).toEqual(["closed", "closed", "closed"]);

  const replay = page.getByRole("button", { name: "Rever celebração", exact: true });
  await replay.focus();
  await replay.press("Enter");
  await expect(modal).toBeVisible();
  await expect(mute).toHaveAttribute("aria-pressed", "true");
  await expect.poll(() => audioStates(page)).toEqual(["closed", "closed", "closed", "running"]);
  await page.keyboard.press("Escape");
  await expect(modal).not.toBeVisible();
  await expect(replay).toBeFocused();
  await expect.poll(() => audioStates(page)).toEqual(["closed", "closed", "closed", "closed"]);

  await replay.click();
  await expect.poll(() => audioStates(page)).toEqual([
    "closed", "closed", "closed", "closed", "running",
  ]);
  backend.setState(createInitialState());
  await expect(modal).toHaveCount(0);
  await expect.poll(() => audioStates(page)).toEqual([
    "closed", "closed", "closed", "closed", "closed",
  ]);
  expect(backend.writes).toBe(0);
  expect(errors).toEqual([]);
});

test("hiding or leaving the page stops music and reduced motion removes confetti animation", async ({
  page,
  context,
}) => {
  const backend = new MockSupabase(finishedState());
  await backend.install(context);
  await observeAudio(page);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  const modal = page.getByRole("dialog");
  await expect(modal).toBeVisible();
  const confetti = modal.locator(".winner-celebration__confetti");
  expect(
    await confetti.evaluate((element) => getComputedStyle(element).display),
  ).toBe("none");
  expect(
    await confetti.locator("span").evaluateAll((pieces) =>
      pieces.every((piece) => getComputedStyle(piece).animationName === "none"),
    ),
  ).toBe(true);
  expect(await audioStates(page)).toEqual([]);
  const nativeAudio = await audioSupport(page);
  if (nativeAudio.audioContext !== "function" && nativeAudio.webkitAudioContext !== "function") {
    await expect(modal.locator(".winner-celebration__music")).toHaveCount(0);
    await modal.locator(".winner-celebration__history").click();
    await expect(modal).not.toBeVisible();
    expect(backend.writes).toBe(0);
    return;
  }
  await modal.getByRole("button", { name: "Ativar música", exact: true }).click();
  await expect.poll(() => audioStates(page)).toEqual(["running"]);
  // Simulate browser lifecycle events; synthesis and context cleanup stay real.
  await page.evaluate(() => {
    Object.defineProperty(document, "visibilityState", {
      configurable: true,
      get: () => "hidden",
    });
    Object.defineProperty(document, "hidden", {
      configurable: true,
      get: () => true,
    });
    document.dispatchEvent(new Event("visibilitychange"));
  });
  await expect.poll(() => audioStates(page)).toEqual(["closed"]);
  await expect(
    modal.getByRole("button", { name: "Ativar música", exact: true }),
  ).toHaveAttribute("aria-pressed", "false");
  await page.evaluate(() => {
    Reflect.deleteProperty(document, "visibilityState");
    Reflect.deleteProperty(document, "hidden");
    document.dispatchEvent(new Event("visibilitychange"));
  });
  expect(await audioStates(page)).toEqual(["closed"]);
  await modal.getByRole("button", { name: "Ativar música", exact: true }).click();
  await expect.poll(() => audioStates(page)).toEqual(["closed", "running"]);
  await page.evaluate(() => window.dispatchEvent(new PageTransitionEvent("pagehide")));
  await expect.poll(() => audioStates(page)).toEqual(["closed", "closed"]);
  await expect(
    modal.getByRole("button", { name: "Ativar música", exact: true }),
  ).toHaveAttribute("aria-pressed", "false");
  expect(backend.writes).toBe(0);
});
