# Art refresh (vector redesign) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the chunky pixel sprites with Brotato-inspired vector art (own designs): fighter, 5 enemies, scrap, 6 weapons + projectiles, three boss looks, and the missing animations, swapped in by texture key.

**Architecture:** Every sprite is an SVG string built by `src/art/vector.ts` (a typed port of the approved canvas file `project/vector.js`). `BootScene.preload` loads each frame as an SVG image at 2× design px; `create` composes one CanvasTexture per key with named frames and the baked shadow, smooth (LINEAR) filtered. Sprites are drawn at scale ½ (`ART_SCALE = 2`), so on-screen design sizes stay right and edges stay sharp at camera zoom 2; bodies are fitted through one helper so hit areas stay in design px.

**Tech Stack:** Claude Design (Design canvas), Phaser 3.90, TypeScript strict, Vitest, Playwright (playtest).

**Spec:** [arena map addendum](../specs/2026-10-23-arena-map-addendum.md) §3 (boss, revised 2026-10-24) and §4 (art direction, revised 2026-10-24); MVP spec §6. Canvas (source of truth for the art): https://claude.ai/artifact/TnsQjaTcJEYoShEC5AyMXM. Design system: https://claude.ai/artifact/9DHSn6f62spjQLXLqsCQee.

## Owner decisions (2026-10-24)

1. Vector, not pixel art: ink outline + **keyline** (thin light rim), flat fill + one shade crescent, simple angry faces, clearly different sizes. Brotato is inspiration only; designs are ours.
2. Hit areas grow with the art: pea r12, pepper r14, carrot r15, tomato r17, potato r26 (`enemies.json`), player box 32×32 and scrap 16×16 unchanged.
3. Scrap = **power bolt** (hex nut, lime ring core).
4. Pea Pod and Spud Tank redrawn more techy (approved on the canvas).
5. Boss: the stitched Compost Colossus is dropped. **Three bosses** (Harvester-9, The Onion King, The Greenhouse); each run picks one at random from the run seed. **Same fight, own look:** identical patterns, timings and HP; only art, projectile art and name differ.
6. Delivery: **4 PRs**, each after its canvas board is approved. Weapon tiers = **tier-colour trim** baked per tier (no tint). Animations in scope: enemy attack tells, hit/death/spawn, weapon feedback, squash-and-bob movement.
7. Parked (ROADMAP ideas, proposed): scrap tiers / a stronger "harvesting" feel when collecting.

## Global Constraints

- pnpm only; branch per PR off `main` (`feat/art-vector-cast`, `feat/art-weapons`, `feat/art-animations`, `feat/art-bosses`); Conventional Commits.
- Palette roles unchanged (`theme.ts`): fighter pink hood + cyan visor, lime = scrap/good, danger orange-red, no violet/indigo as a main body colour (it means "floor"); every sprite reads brighter than the Night violet floor.
- Texture keys and frame names unchanged: `player`, `enemy_pea`, `enemy_pepper`, `enemy_potato`, `enemy_carrot`, `enemy_tomato` (`walk0`, `walk1`, `hit`), `pickup_scrap` (`0`, `1`). New keys are listed in each PR.
- No tint for any visible state (Canvas renderer can't draw it): hit flash, tier trim, glow are baked frames.
- Sprite design sizes (design px, frame w×h): player 48×48, pea 40×36, pepper 40×56, potato 68×60, carrot 48×56, tomato 48×52, scrap 24×24, boss 160×160.
- Sprite assets (all SVG strings) < 300 KB in the bundle; boot adds < 500 ms on the dev machine.
- ≥ 60 fps with F2 (150 peas) + F3 on WebGL and `?renderer=canvas`.
- Leave `src/art/arena.ts` to the arena work; A5 owns obstacle collisions.

## Review Focus

1. Menu (setScale 4) and loadout (8/3) fighters upscale a 2× texture and go blurry: bake a `player_portrait` at 8× (Task 3).
2. SVG load failure (a malformed string) must fail loudly at boot, not leave a missing texture (Task 3 test: every SVG parses with `DOMParser` in jsdom, no `parsererror`).
3. A recycled enemy keeps the old scale/body after a key change: `fitCircle` sets scale and body every spawn (Task 2 test).
4. Bigger potato/tomato bodies overlap the spawn ring: `SPAWN_MARGIN` must stay ≥ largest radius + 24 (Task 2 test).
5. Duplicate `clipPath`/`filter` ids across frames drawn into one canvas are harmless (each SVG is its own image), but ids must be unique inside one SVG (Task 1 test).

---

## Phase A — Remaining canvas boards (owner gates)

Done 2026-10-24: direction (keyline), cast, scrap (power bolt), boss proposals. Old pixel boards and the Colossus sit on the canvas's "Superseded" page.

- [x] **A1 Weapons board** (approved 2026-10-25) (gate for PR 2): 6 weapons (pistol, shotgun, laser, blade, drone, rocket) drawn pointing right, each ×4 tier trims (grey `#a9b0b8`, cyan `#3ad8ff`, pink `#ff4f9a`, amber `#ffb13b`); projectiles (`projectile_basic`, `proj_pellet`, `proj_rocket`, `enemy_bolt`), laser beam style, blade swoosh, drone body, rocket blast ring, muzzle flash; shown orbiting the fighter at real size.
- [x] **A2 Animations board** (approved 2026-10-25) (gate for PR 3): attack tells (pepper `tell` crouch, carrot `tell` aim, tomato `tell` fuse flare), player `hit` frame, death pop and spawn pop-in timings, squash-and-bob curve (shown as a looping preview).
- [x] **A3 Boss sheets** (approved 2026-10-25) (gate for PR 4): Harvester-9, Onion King, Greenhouse, each `idle0`, `idle1`, `hit`, `volley`, `charge`, `lob`, plus each boss's projectile art (carrot round / layer shard / carrot bolt; tomato / tear-gas bulb / tomato).
- [x] Approvals recorded in the addendum §4 (2026-10-25). Owner calls on the boards: Harvester-9 gatling on the front arm (claw at the back), Greenhouse cannon front / mortar back, `enemy_bolt` orange-red (reads as danger), tell windows pepper last 0.4 s before a dash / carrot last 0.5 s before a shot / tomato within 90 px of the fighter, bob 3 hops/s with k = min(1, speed/90). Boss phase-2 looks are not drawn yet (open for PR 4). Each PR still copies its part of the canvas `project/vector.js` into `src/art/vector.ts`.

---

## PR 1 — Vector pipeline, cast, scrap, hit areas (`feat/art-vector-cast`)

### Task 1: Sprite source as SVG strings

**Files:**
- Create: `src/art/vector.ts`, `src/art/vector.test.ts`
- Delete: `src/art/grid.ts`, `src/art/grid.test.ts`, `src/art/actors.ts`, `src/art/pickups.ts`, `src/art/palette.ts` (only used by the pixel pipeline)

**Interfaces:**
- Produces: `type ActorKey = "player" | "enemy_pea" | "enemy_pepper" | "enemy_potato" | "enemy_carrot" | "enemy_tomato"`; `type SpriteKey = ActorKey | "pickup_scrap"`; `interface SpriteMeta { w: number; h: number; feet: number; cx: number; cy: number }` (design px; `cy` = body centre); `const SPRITE_META: Record<SpriteKey, SpriteMeta>`; `const FRAMES: Record<SpriteKey, readonly string[]>` (`walk0, walk1, hit` / `0, 1`); `svg(key: SpriteKey, frame: string): string` (keyline style, `width`/`height` = 2× `w`/`h`).

- [x] **Step 1: Write the failing tests** in `vector.test.ts`:
  - `every key and frame builds an svg`: for each key × `FRAMES[key]`, the string starts with `<svg`, has `viewBox="0 0 ${w} ${h}"` and `width="${2*w}"`.
  - `svgs parse`: `new DOMParser().parseFromString(s, "image/svg+xml")` has no `parsererror` (vitest `environment: "jsdom"` for this file via `// @vitest-environment jsdom`).
  - `ids are unique inside one svg`: all `id="…"` values in a string are distinct.
  - `no external references`: no `href=`, no `url(http`.
  - `hit differs from walk0` and `walk1 differs from walk0` for every actor.
  - `total size < 300 KB` (sum of all strings) and each < 16 KB.
- [x] **Step 2:** `pnpm vitest run src/art/vector.test.ts` → FAIL (module missing).
- [x] **Step 3:** Port the canvas `project/vector.js` (actors, `bolt` scrap, keyline style only, `PROPOSALS`/boss left for PR 4) to TypeScript in `vector.ts`; colours from `THEME_CSS` where a token exists (`pink`, `pink700`, `pink300`, `lime`, `line`, `faint`, `deep`), the rest as named consts in the file. `cy` values: read the body centre off the canvas cast board (player 32, pea 22, pepper 30, potato 33, carrot 30, tomato 32; scrap 12).
- [x] **Step 4:** Tests PASS; `pnpm type-check` clean.
- [x] **Step 5: Commit** `feat(art): vector sprite source`.

### Task 2: Bodies fitted in design px, bigger hit areas

**Files:**
- Modify: `src/art/body.ts`, `src/art/body.test.ts`, `assets/data/enemies.json` (radius: pea 12, carrot 15, tomato 17, potato 26), `src/managers/EnemyManager.ts:22,275-276`, `src/managers/PlayerManager.ts:54-55`, `src/managers/PickupManager.ts:38`

**Interfaces:**
- Consumes: `SPRITE_META`, `SpriteKey` (Task 1).
- Produces: `const ART_SCALE = 2`; `frameSize(key: SpriteKey): { w: number; h: number }` (texture px = meta × 2); `fitCircle(s: Phaser.Physics.Arcade.Sprite, key: SpriteKey, radius: number): void` (sets `setScale(1/ART_SCALE)` and `setCircle(radius*ART_SCALE, ox, oy)` centred on `(cx, cy)`); `fitBox(s, key, w, h): void` (same for `setSize`/`setOffset`).

- [x] **Step 1: Write the failing tests** (`body.test.ts`, a fake sprite recording `setScale`, `setCircle`, `setSize`, `setOffset` calls):
  - `fitCircle centres the circle on the body centre`: for every enemy in `enemies.json`, `ox + r*2 === cx*2` and `oy + r*2 === cy*2`, circle inside `frameSize`.
  - `fitBox centres the player box`: `fitBox(s, "player", 32, 32)` → `setSize(64, 64)`, offset centres on `(cx*2, cy*2)`, inside the frame.
  - `fitCircle sets scale every call` (call twice with different keys; last scale is ½, last circle matches the second key).
  - `radii follow the owner's sizes`: pea 12, pepper 14, carrot 15, tomato 17, potato 26.
  - `SPAWN_MARGIN covers the largest enemy`: export `SPAWN_MARGIN` from `EnemyManager.ts`; `SPAWN_MARGIN >= max(radius) + 24`.
- [x] **Step 2:** Run → FAIL.
- [x] **Step 3:** Implement `fitCircle`/`fitBox`; replace the three manager call sites with them (`PickupManager`: `fitBox(s, "pickup_scrap", PICKUP_SIZE, PICKUP_SIZE)`); `SPAWN_MARGIN = 50` stays (26 + 24 = 50), update its comment.
- [x] **Step 4:** `pnpm vitest run` → all PASS.
- [x] **Step 5: Commit** `feat(art): fit bodies in design px; larger potato and tomato`.

### Task 3: Bake SVG frames at boot

**Files:**
- Modify: `src/art/textures.ts`, `src/scenes/BootScene.ts:19-31`, `src/scenes/MenuScene.ts:65`, `src/scenes/LoadoutScene.ts:96`
- Test: `src/art/textures.test.ts` (create)

**Interfaces:**
- Consumes: `svg`, `FRAMES`, `SPRITE_META` (Task 1), `frameSize`, `ART_SCALE` (Task 2).
- Produces: `svgUri(s: string): string` (`data:image/svg+xml;base64,` + `btoa`; ruled in PR 1, see Outcome); `preloadSprites(scene: Phaser.Scene): void` (queues `scene.load.svg(\`${key}@${frame}\`, svgUri(...))` for every key × frame, plus `player_portrait` = player `walk0` with `scale: 4` → 8× design); `buildSpriteTextures(scene): void` (one CanvasTexture per key, frames side by side, frame names as today, shadow ellipse rx 0.36·w, ry rx/4 at `feet` under actors only, `setFilter(LINEAR)`, temp `key@frame` textures removed). `registerAnimations` unchanged in behaviour.

- [x] **Step 1: Write the failing test** `textures.test.ts`: `svgUri` round-trips (`atob(uri.split(",")[1]) === s`); `spriteFrameKeys()` (exported helper) lists `player@walk0 … pickup_scrap@1` (20 entries) plus `player_portrait` (21).
- [x] **Step 2:** Run → FAIL.
- [x] **Step 3:** Implement; `BootScene.preload` calls `preloadSprites(this)`, `create` calls `buildSpriteTextures(this)` instead of `buildActorTextures`/`buildPickupTextures`. Menu: `add.image(636, 340, "player_portrait").setScale(0.5)` (384 px texture → 192 design px, as today); loadout: `setScale(1 / 3)` (→ 128). If Phaser's loader rejects `data:` URLs (it fetches SVG via XHR), load each string into an `Image` instead, `textures.addImage` it on `onload`, and await all of them next to `loadFonts` before `scene.start(MENU)`.
- [x] **Step 4:** Tests PASS; `pnpm build` clean.
- [x] **Step 5: Commit** `feat(art): bake vector sprites at boot`.

### Task 4: Browser check, balance check, docs

**Files:** Modify `ROADMAP.md`, `ARCHITECTURE.md` (`art/` line), `docs/superpowers/specs/2026-10-18-mvp-roguelike-design.md` §6 (sprite line → "vector SVG, see addendum §4"), `docs/superpowers/plans/2026-10-18-m3-look.md` (16×16 constraint: "superseded 2026-10-24"), this plan (outcome section).

- [x] **Step 1:** `pnpm dev`; menu, loadout, a wave with every enemy type (`?seed=1`), WebGL and `?renderer=canvas`; screenshot each plus a greyscale one (CSS `filter: grayscale(1)` on the canvas via devtools); hit flash visible on Canvas.
- [x] **Step 2:** F2 + F3: ≥ 60 fps on both renderers; boot time before/after from the console timestamps.
- [x] **Step 3:** Hit-area balance: `pnpm playtest --seed 1 --runs 3` on `main` and on the branch; record waves reached; a drop of more than 1 wave on average → tell the owner before merging.
- [x] **Step 4:** Docs as listed; ROADMAP "Art refresh" section: PR 1 ✅ with the numbers.
- [x] **Step 5: Commit** `docs: art refresh PR 1 outcome`; open the PR when the owner says so (pending).


### PR 1 outcome (2026-10-25)

- Shipped: `vector.ts` (fighter, 5 enemies, power-bolt scrap; byte-identical to the canvas `vector.js` except ink = `THEME_CSS.deep`), `body.ts` `fitCircle`/`fitBox`, `textures.ts` SVG preload + bake, `player_portrait` at 8x, radii pea 12 / carrot 15 / tomato 17 / potato 26. Pixel files deleted. 208 tests pass, `pnpm build` clean.
- Rulings: Tasks 2 and 3 landed in one commit (the new body fit only works with the 2x textures). `svgUri` is base64, because Phaser marks every `data:` URL base64 and `atob`-decodes it (the URL-encoded form crashed boot), so the SVGs must stay ASCII (tested). The `Image` loader fallback was not needed.
- Browser (WebGL + `?renderer=canvas`): menu, loadout and a wave with all five enemies render, no console errors; the hit frame (white, `><`) shows on Canvas; greyscale silhouettes read.
- 150 peas (F2): in-app browser WebGL 61–66 fps. Headless Chrome on the GPU: WebGL 52–59 (main 58–60), Canvas 57–60 (main 59–60). Headless WebGL misses 60 on main too; recheck on the owner's screen.
- Boot to menu (dev server, warm): WebGL about 1.0–1.1 s vs main 0.7–0.8 s, Canvas about 0.5–0.55 s vs 0.3 s: roughly +250–300 ms, inside the 500 ms budget.
- Balance (`pnpm playtest --seed 1 --runs 3`, autopilot): all 3 runs won wave 10 on both main and the branch, so no wave drop. Contact damage taken, summed over waves: 162 (main) vs 127 (branch). Wave 9–10 kill%: 22/18 vs 17/15 (medians, within run noise).
- Final review fixes: a frame that fails to load throws at boot (no silent missing texture); shadows lifted so they never clip at the frame bottom; depth sorts by the feet (`feetOffset`), since frame heights now differ per actor.
- Deferred (review minors): carrot hitbox sits 4 design px off its art when facing left (`cx` 22 of 48, body offset not mirrored on flip); possible 1-texel bleed between side-by-side frames under LINEAR (not seen in screenshots); a re-entered BootScene would leave the temp `key@frame` textures in memory.
- Carry-overs: the player hurt flash is still `setTint` (invisible on Canvas) until PR 3; weapons and projectiles stay placeholder shapes until PR 2.

---

## PR 2 — Weapons and projectiles (`feat/art-weapons`, after A1 and A5 merged)

**Files:** `src/art/vector.ts` (+ weapons, projectiles, effects), `src/art/textures.ts`, `src/scenes/BootScene.ts` (drop `createPlaceholderSprites` for these keys), `src/managers/WeaponManager.ts` (beam and arc drawn as sprites instead of `Graphics`; weapons rotate to aim), tests beside them.

**Interfaces:** keys `weapon_<id>` with frames `t1`…`t4` (tier trim baked); `projectile_basic`, `proj_pellet`, `proj_rocket`, `enemy_bolt` (same keys, `HIT_SIZE` unchanged); new `fx_muzzle`, `fx_swoosh`, `fx_beam` (tileable 1-frame), `fx_blast`. `weaponFrame(tier: 1|2|3|4): string`.

- Tests: every weapon has 4 tier frames that differ; projectile hit sizes unchanged (`HIT_SIZE` snapshot); `WeaponManager` picks frame `t${tier}`.
- Browser: all 6 weapons at T1 and T4 in a wave, WebGL + Canvas, fps check as PR 1.

## PR 3 — Animations (`feat/art-animations`, after A2 and PR 1)

**Files:** `src/art/vector.ts` (+ `tell` frames, player `hit`), `src/art/textures.ts` (`registerAnimations`), `src/fx/Juice.ts` (death pop, spawn pop-in, player hit uses the `hit` frame instead of `setTint` — closes the ROADMAP Canvas carry-over), `src/managers/EnemyManager.ts` (tell frame during wind-ups, squash-and-bob), `src/core/bob.ts` (pure squash-and-bob curve).

**Interfaces:** `bob(t: number, speed: number): { sx: number; sy: number; dy: number }` (pure, tested: period, amplitude 0 at rest, sx·sy ≈ 1); frames `tell` on `enemy_pepper`, `enemy_carrot`, `enemy_tomato`; `player` gains `hit`.

- Tests: `bob` curve values; enemies with a tell show `tell` during the wind-up window (fake clock); `PlayerManager` no longer calls `setTint` (test double asserts `setFrame("hit")`).
- Browser + fps as PR 1 (squash-and-bob on 150 peas is the perf risk).

## PR 4 — Boss sheets (`feat/art-bosses`, after A3 and PR 1; consumed by M4b)

**Files:** `src/art/vector.ts` (+ `boss_harvester`, `boss_onion`, `boss_greenhouse`, their projectiles), `src/art/textures.ts`, `src/core/bossSkin.ts` (pure pick), docs: addendum §3 (done 2026-10-24), [M4b plan](2026-10-23-m4-boss.md) (texture key per skin, banner name per skin).

**Interfaces:** `type BossSkin = "harvester" | "onion" | "greenhouse"`; `pickBossSkin(rng: Rng): BossSkin` (uses a stream of the run seed, like `combatRng`); texture `boss_${skin}` with frames `idle0`, `idle1`, `hit`, `volley`, `charge`, `lob`; `BOSS_NAMES: Record<BossSkin, string>` = `HARVESTER-9`, `THE ONION KING`, `THE GREENHOUSE`; one shared body (`radius` from the M4b `boss` entry) for all three.

- Tests: `pickBossSkin` deterministic per seed and covers all three over 30 seeds; every boss frame builds and parses (as Task 1); the three bodies are identical.
