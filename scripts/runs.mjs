// `pnpm runs <file or folder>`: run-log report (src/core/runlog.report.test.ts).
// The report runs under vitest for its TS + alias + JSON handling; the path goes in RUNS_PATH.
import { spawnSync } from "node:child_process";
import { resolve } from "node:path";

const target = resolve(process.argv.slice(2).find((a) => a !== "--") ?? "runs");
const r = spawnSync("vitest run src/core/runlog.report.test.ts", {
  stdio: "inherit",
  shell: true,
  env: { ...process.env, RUNS_PATH: target },
});
process.exit(r.status ?? 1);
