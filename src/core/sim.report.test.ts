/**
 * `npm run sim`: prints per-wave tables for the reference builds (skipped by
 * plain `npm test`). To try a curve, edit assets/data and rerun.
 */
import { it } from "vitest";
import { LIVE_DATA, simulateRun, type RunWave, type SimData } from "./sim";
import { checkTargets, REFERENCE_BUILDS } from "./sim.targets";

const pad = (v: string | number, n: number) => String(v).padStart(n);

function table(title: string, rows: RunWave[]): string {
  const head = "wave  dur spawn kill kill%  peak  dps  arrHP/s  scrap earn  bank lvl  taken  hpLeft  bought";
  const lines = rows.map((r) =>
    [
      pad(r.wave, 4),
      pad(r.duration, 4),
      pad(r.spawned, 5),
      pad(r.kills, 4),
      pad(Math.round((100 * r.kills) / Math.max(1, r.spawned)), 5),
      pad(r.peakAlive, 5),
      pad(r.dps.toFixed(0), 4),
      pad(r.arrivalHp.toFixed(0), 8),
      pad(r.scrap, 6),
      pad(r.earned, 4),
      pad(r.bank, 5),
      pad(r.level, 3),
      pad(r.damageTaken.toFixed(0), 6),
      pad(r.hpLeft.toFixed(0), 7),
      "  " + r.bought.join(","),
    ].join(" ")
  );
  return [`\n## ${title}`, head, ...lines].join("\n");
}

function report(label: string, data: SimData): string {
  return REFERENCE_BUILDS.map((b) =>
    table(`${label} · ${b.name}`, simulateRun(b.start, b.plan, b.picks, b.loopFrom, data))
  ).join("\n");
}

const waves = (data: SimData) =>
  "\n## waves (count×enemy/every s)\n" +
  data.waves
    .map((w) => `${pad(w.wave, 2)}: ` + w.groups.map((g) => `${g.count}×${g.enemy}/${g.every}s`).join("  "))
    .join("\n");

const targets = (label: string, data: SimData) => {
  const v = checkTargets(data);
  return `\n## ${label} targets: ${v.length === 0 ? "all met" : "\n- " + v.join("\n- ")}`;
};

it.runIf(import.meta.env.npm_lifecycle_event === "sim")("balance report", () => {
  console.log(
    [
      report("LIVE", LIVE_DATA),
      waves(LIVE_DATA),
      targets("LIVE", LIVE_DATA),
    ].join("\n")
  );
});
