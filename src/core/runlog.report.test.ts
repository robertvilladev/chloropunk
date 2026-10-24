/**
 * `pnpm runs <file or folder>`: per-wave medians from exported run logs
 * (runs.json from F4) next to the sim's prediction for the same builds, the
 * balance targets on the measured rows, and the sim params fitted from them.
 * Skipped by plain `pnpm test`.
 */
import { it } from "vitest";
import { DATA_HASH, fitParams, median, summarise, type RunLog, type WaveRow } from "./runlog";
import { DEFAULT_PARAMS, simulateWave, type SimParams } from "./sim";
import { checkRows } from "./sim.targets";

const pad = (v: string | number, n: number) => String(v).padStart(n);
const pct = (n: number) => pad(Math.round(n), 4);

const RUNS_PATH: string | undefined = import.meta.env.RUNS_PATH;

// node:fs without @types/node (no new deps): the few calls used here, typed by hand
type Fs = {
  readFileSync(p: string, enc: "utf8"): string;
  readdirSync(p: string): string[];
  statSync(p: string): { isDirectory(): boolean };
};

async function read(path: string): Promise<RunLog[]> {
  const { readFileSync, readdirSync, statSync } = (await import(/* @vite-ignore */ "node:fs" as string)) as Fs;
  const files = statSync(path).isDirectory()
    ? readdirSync(path).filter((f) => f.endsWith(".json")).map((f) => `${path}/${f}`)
    : [path];
  return files.flatMap((f) => {
    const v = JSON.parse(readFileSync(f, "utf8"));
    return (Array.isArray(v) ? v : [v]).filter((l: RunLog) => l?.schemaVersion === 1);
  });
}

/** Median sim prediction for wave n over the builds the logged runs actually had. */
function predict(runs: RunLog[], n: number, p: SimParams) {
  const sims = runs.flatMap((r) => r.waves.filter((w) => w.wave === n)).map((w) => {
    const s = simulateWave(w.build, n, undefined, p);
    return { kill: (100 * s.kills) / Math.max(1, s.spawned), peak: s.peakAlive, scrap: s.scrap, hp: (100 * Math.max(0, s.hpLeft)) / w.build.stats.maxHp };
  });
  return {
    kill: median(sims.map((s) => s.kill)),
    peak: median(sims.map((s) => s.peak)),
    scrap: median(sims.map((s) => s.scrap)),
    hp: median(sims.map((s) => s.hp)),
  };
}

function table(rows: WaveRow[], runs: RunLog[] | null, fit: SimParams): string {
  const head =
    "wave runs died spawn | kill% sim  fit | peak sim | drop live bank sim | buys  aim | dealt contact bolt blast | hp% sim  fit";
  const lines = rows.map((r) => {
    const d = runs ? predict(runs, r.wave, DEFAULT_PARAMS) : null;
    const f = runs ? predict(runs, r.wave, fit) : null;
    const s = (v: number | undefined, n: number) => pad(v === undefined ? "-" : Math.round(v), n);
    return [
      pad(r.wave, 4), pad(r.runs, 4), pad(r.deaths, 4), pad(r.spawned, 5), "|",
      pct(r.killPct), s(d?.kill, 4), s(f?.kill, 4), "|",
      pad(r.peakAlive, 4), s(d?.peak, 3), "|",
      pad(r.scrapDropped, 4), pad(r.scrapLive, 4), pad(r.scrapBanked, 4), s(d?.scrap, 3), "|",
      pad(r.buys, 4), pad(`${Math.round(100 * r.aim)}%`, 4), "|",
      pad(Math.round(r.damageDealt), 5), pad(Math.round(r.taken.contact), 7), pad(Math.round(r.taken.bolt), 4), pad(Math.round(r.taken.blast), 5), "|",
      pct(r.hpEndPct), s(d?.hp, 3), s(f?.hp, 4),
    ].join(" ");
  });
  return [head, ...lines].join("\n");
}

it.runIf(!!RUNS_PATH)("run-log report", async () => {
  const logs = await read(RUNS_PATH!);
  const out: string[] = [`${logs.length} logs read from ${RUNS_PATH}`];
  for (const s of summarise(logs)) {
    const runs = logs.filter((l) => l.dataHash === s.dataHash);
    const live = s.dataHash === DATA_HASH;
    const fitted = fitParams(runs);
    const fit = { ...DEFAULT_PARAMS, aim: fitted?.aim || DEFAULT_PARAMS.aim, contactRate: fitted?.contactRate || DEFAULT_PARAMS.contactRate };
    out.push(
      `\n## data ${s.dataHash}${live ? " (current)" : " (old data: no sim columns)"} · ${s.runs} runs`,
      `fitted: aim ${fitted ? fitted.aim.toFixed(2) : "-"}, contactRate ${fitted ? fitted.contactRate.toFixed(2) : "-"} (sim defaults ${DEFAULT_PARAMS.aim}, ${DEFAULT_PARAMS.contactRate}); "fit" columns rerun the sim with them`,
      "medians across runs; sim = same builds through simulateWave; aim = Σhits ÷ Σshots",
      table(s.rows, live ? runs : null, fit),
      "targets on measured medians: " +
        (v => (v.length ? "\n- " + v.join("\n- ") : "all met"))(
          checkRows(s.rows.map((r) => ({ wave: r.wave, killPct: r.killPct, hpPct: r.hpEndPct, buys: r.buys })), "measured")
        )
    );
  }
  console.log(out.join("\n"));
});
