// Headless full-run playtest (balance design §9): starts Vite, plays /?seed=N&autopilot in
// Chromium at 3x, takes the first level-up pick, buys nothing, and writes the run log
// (localStorage `vv.runs`) to runs/playtest-<seed>.json. Feed it to `pnpm runs runs`.
//   pnpm playtest [--seed 1] [--runs 1] [--wave N --build typical] [--headed]
import { mkdirSync, writeFileSync } from "node:fs";
import { parseArgs } from "node:util";
import { chromium } from "@playwright/test";
import { createServer } from "vite";

const { values: opt } = parseArgs({
  options: {
    seed: { type: "string", default: "1" },
    runs: { type: "string", default: "1" },
    wave: { type: "string" },
    build: { type: "string" },
    headed: { type: "boolean", default: false },
  },
});
const TIMEOUT_MS = 10 * 60_000; // per run

const server = await createServer({ server: { port: 5199, open: false }, logLevel: "warn" });
await server.listen();
const base = server.resolvedUrls.local[0];
const browser = await chromium.launch({ headless: !opt.headed });

try {
  for (let i = 0; i < Number(opt.runs); i++) {
    const seed = Number(opt.seed) + i;
    const q = new URLSearchParams({ seed: String(seed), autopilot: "", renderer: "canvas" });
    if (opt.wave) q.set("wave", opt.wave);
    if (opt.build) q.set("build", opt.build);
    const page = await browser.newPage();
    page.on("console", (m) => /\[balance\]|\[dev\]|error/i.test(m.text()) && console.log(`  ${m.text()}`));
    page.on("pageerror", (e) => console.error(`  page error: ${e.message}`));
    await page.goto(`${base}?${q}`);
    const t0 = Date.now();
    await play(page, seed);
    const runs = await page.evaluate(() => JSON.parse(localStorage.getItem("vv.runs") ?? "[]"));
    mkdirSync("runs", { recursive: true });
    const file = `runs/playtest-${seed}.json`;
    writeFileSync(file, JSON.stringify(runs, null, 1));
    const r = runs.at(-1)?.result;
    console.log(`seed ${seed}: ${r?.outcome ?? "no result"} at wave ${r?.wave ?? "?"} in ${((Date.now() - t0) / 1000).toFixed(0)} s -> ${file}`);
    await page.close();
  }
} finally {
  await browser.close();
  await server.close();
}

/** Step the scene flow until the run ends (summary screen). */
async function play(page, seed) {
  const deadline = Date.now() + TIMEOUT_MS;
  while (Date.now() < deadline) {
    const s = await page.evaluate(() => {
      const g = window.game;
      const active = g?.scene.getScenes(true).map((x) => x.sys.settings.key) ?? [];
      return { active, speed: g?.scene.getScene("UIScene")?.gameSpeed };
    });
    const on = (k) => s.active.includes(k);
    if (on("SummaryScene")) return; // run summary (M4a), victory or defeat
    if (on("VictoryScene")) await click(page, "VictoryScene", "CONTINUE");
    else if (on("LevelUpScene")) await page.keyboard.press("Digit1");
    else if (on("ShopScene")) await page.keyboard.press("Enter"); // ponytail: buys nothing; follow a reference build if shop runs matter
    else if (on("UIScene") && s.speed !== 3) await page.keyboard.press("Digit3"); // resets to 1x each wave
    else if (on("LoadoutScene")) await page.keyboard.press("Digit1");
    else if (on("MenuScene")) await click(page, "MenuScene", "START RUN");
    await page.waitForTimeout(300);
  }
  throw new Error(`seed ${seed}: run didn't end within ${TIMEOUT_MS / 60_000} min`);
}

/** Fire pointerdown on the scene's button labelled `label` (canvas buttons have no DOM). */
async function click(page, key, label) {
  await page.evaluate(
    ([key, label]) => {
      const find = (list) => {
        for (const o of list) {
          if (o.list && o.input && o.list.some((c) => c.text === label)) return o;
          const hit = o.list && find(o.list);
          if (hit) return hit;
        }
      };
      find(window.game.scene.getScene(key).children.list)?.emit("pointerdown");
    },
    [key, label]
  );
}
