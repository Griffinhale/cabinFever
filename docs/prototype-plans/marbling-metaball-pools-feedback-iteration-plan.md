# Marbling Metaball Pools Feedback Iteration Plan

Date: 2026-05-08
Branch: `proto/marbling-metaball-pools`
Prototype folder: `prototypes/marbling-metaball-pools/`
Status: plan only; do not implement prototype code in this commit

## Feedback summary

Prototype: metaballs / implicit pigment pools.

User feedback: "great but laggy."

Comparison context from the same review round:

1. Raster: cool, but not consistently circular enough.
2. Radial: worked best.
3. Shader/SDF: did not load.
4. Metaballs: great but laggy.
5. Relaxation: interesting, but too jagged.
6. Particles: worked best.

Interpretation: the metaball direction has strong visual appeal and should be preserved. The next pass should not redesign the prototype into radial, particle, relaxation, or shader/SDF architecture. It should keep the soft organic pool look, ownership clipping, curated pigment palettes, and satisfying hold-to-drop interaction, while removing the main blocker: field rendering cost as the composition grows.

## Current bottleneck hypothesis

The existing prototype renders a low-resolution field at `FIELD_CELL = 4`, but still evaluates every sampled cell against every pool and every lobe whenever anything is growing or an active press preview exists.

The expensive path is:

- `draw()` marks motion while a pool grows or the user presses.
- `renderScene()` calls `renderPigmentField()`.
- `renderPigmentField()` clears and redraws the full pigment layer.
- `evaluateField(renderPools)` scans the full field grid.
- Each field sample calls `pool.fieldAt(x, y)` for each pool.
- `fieldAt()` loops over every lobe in the pool and also calls stable noise.
- After field evaluation, the full field is scanned again to draw cells and detect neighbor rims.

This is acceptable for sparse scenes, but lag appears when 10-20 pools contain many lobes and a new or growing pool forces global recomputation. The current README already documents this limitation: "The field is recomputed globally while anything grows, so many pools can become expensive."

## Iteration goal

Make the metaball prototype feel responsive on desktop and touch/mobile while preserving the reasons it was rated "great":

- soft organic pigment pools;
- same-pool lobe merging;
- readable color ownership/clipping between different pools;
- rich rims and seams;
- hold-to-add-paint interaction;
- static settled compositions;
- no major UI or build-system expansion.

Success is a perceptual performance pass, not a physics redesign. Prefer simple optimizations that reduce field work immediately over complex simulation changes.

## Non-goals

Do not do these in this iteration:

- Do not replace the metaball model with the radial or particle prototype.
- Do not introduce a shader/WebGL dependency; the shader/SDF prototype did not load in review.
- Do not add a full physics/displacement solver.
- Do not add a large settings panel.
- Do not modify the Next.js app.
- Do not add npm dependencies or generated build artifacts.
- Do not sacrifice the organic pool appeal just to reach a higher synthetic frame rate.

## Exact files for the implementation pass

Expected implementation files to modify later:

- `prototypes/marbling-metaball-pools/index.html`
- `prototypes/marbling-metaball-pools/README.md`

Planning file created now:

- `docs/prototype-plans/marbling-metaball-pools-feedback-iteration-plan.md`

No prototype code should be changed in this planning commit.

## Recommended strategy

### 1. Add explicit adaptive quality tiers

Replace the single hardcoded `FIELD_CELL = 4` assumption with a small quality model.

Recommended tiers:

- High: `cellSize = 4`, full visual richness, desktop/small scene default.
- Medium: `cellSize = 5` or `6`, slightly softer contours, crowded-scene default.
- Low: `cellSize = 7` or `8`, emergency/mobile fallback while actively pressing or when frame budget is missed.

Quality selection should consider:

- viewport area;
- pool count;
- total lobe count;
- whether the user is actively pressing;
- recent measured render time.

Keep `pixelDensity(1)`.

Important visual guardrail: if field cells get larger, compensate with slightly softer alpha/rim parameters so cells do not become harsh blocks. The goal is a watercolor/marbled softness, not obvious pixelation.

### 2. Limit lobe count before optimizing everything else

The current hold mapping allows up to 12 lobes per pool. This creates attractive asymmetric edges, but it multiplies the field cost. Reduce the default lobe range while preserving organic appeal.

Recommended change:

- quick tap: 3 lobes;
- medium hold: 4-6 lobes;
- long hold: 7-8 lobes by default;
- optional desktop/high-quality cap: 9 lobes only when total scene complexity is low.

Compensate visually with:

- slightly broader lobe radii;
- stable edge warp/noise;
- rim/seam rendering;
- asymmetric lobe offsets.

Do not make pools consistently circular. The user liked metaballs; the appeal comes from organic non-perfect edges. Reduce redundant lobes, not organic variation.

### 3. Add dirty bounds instead of global recompute

The biggest win should be to avoid recalculating the entire canvas when only one new/growing pool changes.

Each pool should expose a conservative field bounding box in field-cell coordinates:

- center plus max current/target lobe offset;
- plus max current/target radius multiplied by field falloff threshold radius;
- plus padding for edge warp, rims, and neighbor seam checks.

When a pool grows, mark only its previous and current bounds dirty. When a preview changes during hold, mark previous and current preview bounds dirty. On reset, resize, palette surface rebuild, or quality-tier change, mark the full field dirty.

Implementation shape:

- Maintain `dirtyRects` in field coordinates.
- Add `markDirtyRect(rect)` and `markFullFieldDirty()` helpers.
- Add `mergeDirtyRects(rects)` or use a simple union first if multiple rects are easier.
- Evaluate and redraw only dirty field cells into `pigmentLayer`.
- Clear/redraw dirty pixel regions before drawing their updated cells.

Conservative dirty bounds are better than artifacts. If a seam could change just outside the pool threshold, include padding.

Fallback: if dirty rect coverage exceeds a threshold, e.g. 45-60% of the field, do one full recompute for simplicity.

### 4. Cache settled pool influence or raster ownership

Once a pool has settled, most of its contribution does not change. Use that fact.

Two acceptable options, in increasing complexity:

Option A: per-pool bounds and cheap candidate filtering

- Store each pool's settled bounds.
- During field evaluation for a cell, skip pools whose bounds do not include that cell.
- Keep same-pool lobe evaluation unchanged for candidate pools.
- This is simple and should drastically reduce cost when pools are spatially separated.

Option B: persistent settled owner/field cache

- Maintain a field-sized cache of settled owner, field strength, and margin.
- When no pool is growing, keep the current cached pigment layer exactly as today.
- When a new/growing pool appears, only compare it against settled candidates inside dirty bounds.
- Recompute affected cells by evaluating active/growing pools plus settled pools whose bounds overlap the cell or dirty rect.

Recommended first implementation: Option A. Add Option B only if Option A plus dirty bounds and lobe caps still lag.

### 5. Incremental rendering budget

Avoid a long blocking frame when a large dirty area must be redrawn.

Add an optional work queue for dirty cells/rects:

- Process at most a configured number of cells per frame, e.g. 8,000-18,000 depending on quality tier.
- Draw partially updated pigment layer during processing.
- Prioritize the active press/current pool bounds first so direct manipulation feels responsive.
- Finish full-scene refresh over a few frames if needed.

This should be used only when a dirty area is large. Small dirty regions should update in one frame to preserve crisp interaction.

Visual guardrail: do not show distracting checkerboard or obvious progressive fill. If incremental rendering is visible, prefer a full low-quality preview during input, then refine after release.

### 6. Optional press-time quality scaling

While the pointer is down or while a pool is actively growing, it is acceptable to use a cheaper preview quality, then refine after settle.

Recommended behavior:

- During press/drag/growth: medium or low field quality if frame time is high.
- On release or after settle: one final higher-quality redraw if the device can handle it.
- If a quality change occurs, rebuild field buffers and mark the full field dirty.

This preserves the final image quality while keeping interaction responsive.

Avoid jarring jumps by making tier transitions hysteretic:

- only degrade after several slow frames;
- only upgrade after several fast/settled frames;
- do not switch tiers every frame.

### 7. Reduce avoidable per-cell overhead

Small local optimizations should support the larger algorithmic changes:

- Precompute lobe world positions and squared radii once per pool update.
- Precompute each pool's max influence radius and field bounds.
- Avoid calling stable noise for cells far outside a lobe's plausible influence.
- Use squared-distance early rejection before computing full contribution.
- Store palette color channels as numeric RGB values on pool creation instead of repeatedly calling `color()` per cell.
- Consider replacing repeated `p5.Color` operations in `drawPigmentCell()` with numeric interpolation.
- Keep neighbor rim checks local to dirty bounds, with one-cell padding.

These are secondary to dirty bounds and lobe reduction, but they can remove visible stutter on lower-powered devices.

## Staged implementation tasks

### Task 1: Instrument the bottleneck without adding visible UI

Files:

- `prototypes/marbling-metaball-pools/index.html`

Implement:

- lightweight timing around `renderPigmentField()` and `evaluateField()`;
- counters for pool count, lobe count, field cell count, candidate evaluations, and render time;
- console logging only behind a `DEBUG_PERF = false` constant or temporary comments removed before final;
- no large on-canvas debug panel.

Verify:

- debug disabled by default;
- no visible UI changes;
- local console/timing confirms whether full field evaluation is the lag source.

Suggested commit:

- `perf(metaballs): instrument field rendering cost`

### Task 2: Add adaptive field quality tiers

Files:

- `prototypes/marbling-metaball-pools/index.html`
- `prototypes/marbling-metaball-pools/README.md`

Implement:

- replace `FIELD_CELL` constant usage with `quality.cellSize` or equivalent;
- rebuild field dimensions when quality changes;
- choose initial quality from viewport size and touch/mobile hints;
- degrade quality when measured render time exceeds budget for several frames;
- upgrade only after stable/settled fast frames;
- document adaptive quality in README known limitations/performance section.

Verify:

- no crashes on resize;
- pigment still renders at all tiers;
- quality changes do not erase pools;
- final settled view can refine if performance allows.

Suggested commit:

- `perf(metaballs): add adaptive field quality tiers`

### Task 3: Reduce lobe counts while preserving organic shapes

Files:

- `prototypes/marbling-metaball-pools/index.html`
- `prototypes/marbling-metaball-pools/README.md`

Implement:

- reduce max default lobes from 12 to about 8;
- make lobe cap responsive to quality/scene complexity;
- tune radius spread, offset spread, and edge warp so long-hold pools remain organic;
- document the new lobe budget.

Verify:

- quick taps remain visible;
- long holds still feel like more pigment;
- pool shapes do not become too circular;
- 10-20 pool compositions preserve the visual appeal noted by the user.

Suggested commit:

- `perf(metaballs): reduce lobe budget for crowded scenes`

### Task 4: Add pool bounds and candidate filtering

Files:

- `prototypes/marbling-metaball-pools/index.html`

Implement:

- compute each pool's conservative pixel and field-cell bounds;
- update bounds when pool lobes grow or settle;
- skip `pool.fieldAt(x, y)` when the sample lies outside the pool bounds;
- optionally pre-filter candidate pools per dirty rect.

Verify:

- no missing pigment edges;
- no ownership seams disappear near bounds;
- crowded scenes with spatially separated pools evaluate far fewer candidates.

Suggested commit:

- `perf(metaballs): skip field evaluation outside pool bounds`

### Task 5: Add dirty rect field updates

Files:

- `prototypes/marbling-metaball-pools/index.html`

Implement:

- track previous and current bounds for active/growing pools;
- add dirty rect helpers with one-cell or two-cell padding for rims/seams;
- redraw only dirty pixel regions of `pigmentLayer`;
- evaluate only dirty field cells;
- full redraw fallback when dirty coverage is too high;
- full redraw on reset, resize, palette surface rebuild, and quality-tier changes.

Verify:

- no stale trails when pools grow;
- no stale seams when pools overlap or ownership changes;
- reset clears everything;
- resize rebuilds correctly;
- settled scenes remain static and cached.

Suggested commit:

- `perf(metaballs): redraw only dirty field bounds`

### Task 6: Add incremental large-refresh rendering if still needed

Files:

- `prototypes/marbling-metaball-pools/index.html`

Implement only if Tasks 2-5 do not sufficiently fix lag:

- dirty work queue for large rects/full redraws;
- per-frame cell budget;
- active press/growing pool priority;
- final refinement pass after release/settle.

Verify:

- interaction remains responsive during long holds;
- large scenes finish refreshing without obvious artifacts;
- static final image is stable.

Suggested commit:

- `perf(metaballs): incrementally process large field refreshes`

### Task 7: Documentation and review notes

Files:

- `prototypes/marbling-metaball-pools/README.md`
- `prototypes/marbling-metaball-pools/REVIEW_NOTES.md` if process notes are useful

Implement:

- document that round-two feedback was "great but laggy";
- document performance strategy: adaptive field resolution, lobe budget, pool bounds, dirty updates, caching/static settle;
- update known limitations with any remaining quality/performance tradeoffs;
- add manual test notes for desktop and touch/mobile.

Verify:

- README still explains controls, architecture, ownership clipping, and static settling;
- limitations are honest;
- no claim of physical fluid correctness is added.

Suggested commit:

- `docs(metaballs): document performance iteration`

## Acceptance criteria for the implementation pass

The iteration is successful if:

1. The prototype still looks like the same appealing metaball/pigment-pool direction that the user liked.
2. Press/hold input feels responsive with 10-20 pools on a normal desktop viewport.
3. Touch/mobile behavior does not regress.
4. Long holds still create visibly larger, organic pools.
5. Same-pool lobes still merge fluidly.
6. Different pigments remain readable through ownership/clipping and rims/seams.
7. The sketch avoids global full-field recomputation for small local changes where practical.
8. Settled compositions remain static and cached.
9. Quality degradation, if triggered, is subtle and preferable to lag.
10. README documents the performance tradeoffs honestly.

## Verification commands

Use the actual worktree path for this branch:

```bash
cd /workspace/projects/Griffinhale_git/worktrees/cabinFever-marbling-metaballs

git status --short --branch

test -f prototypes/marbling-metaball-pools/index.html

test -f prototypes/marbling-metaball-pools/README.md

test -f docs/prototype-plans/marbling-metaball-pools-feedback-iteration-plan.md
```

Plan-only verification for this commit:

```bash
cd /workspace/projects/Griffinhale_git/worktrees/cabinFever-marbling-metaballs

git diff -- docs/prototype-plans/marbling-metaball-pools-feedback-iteration-plan.md

git status --short --branch
```

Prototype implementation smoke test later:

```bash
cd /workspace/projects/Griffinhale_git/worktrees/cabinFever-marbling-metaballs
python3 -m http.server 8123 --directory prototypes/marbling-metaball-pools
```

Open:

```text
http://localhost:8123
```

Manual browser checks for the implementation pass:

- no console errors;
- full-screen cream surface appears;
- quick tap creates a small pool;
- long hold creates a larger organic pool;
- pool shapes remain organic, not overly circular;
- 10-20 pools remain responsive enough to continue painting;
- new pools near old pools do not collapse all pigments into one blob;
- rims/seams remain attractive at lower quality tiers;
- palette cycle still works;
- reset still works;
- touch tap/hold does not scroll the page;
- after all growth finishes, no visible jitter remains;
- resizing does not lose or corrupt existing pools.

Optional syntax/build checks if JavaScript is split out later:

```bash
node --check prototypes/marbling-metaball-pools/sketch.js
npm run lint
```

Do not add these commands as required if the prototype remains self-contained in inline browser JavaScript and the repository lint is unrelated to this standalone prototype.

## Commit checkpoints

Planning commit required now:

- `docs(metaballs): add feedback iteration plan`

Suggested implementation commits later:

1. `perf(metaballs): instrument field rendering cost`
2. `perf(metaballs): add adaptive field quality tiers`
3. `perf(metaballs): reduce lobe budget for crowded scenes`
4. `perf(metaballs): skip field evaluation outside pool bounds`
5. `perf(metaballs): redraw only dirty field bounds`
6. `perf(metaballs): incrementally process large field refreshes` only if needed
7. `docs(metaballs): document performance iteration`

Before each implementation commit:

- run `git status --short --branch`;
- run the relevant manual prototype smoke test;
- confirm only `prototypes/marbling-metaball-pools/` files and any intended docs changed;
- confirm no Next.js app files changed;
- confirm no generated dependency/build artifacts were added;
- confirm the prototype still preserves the "great" organic metaball appeal while reducing lag.

## Implementation guardrails

- Preserve appeal first: performance changes should make the liked prototype usable, not generic.
- Prefer adaptive degradation and local recompute over removing all visual richness.
- Keep defaults mobile-safe.
- Keep settled output static.
- Keep ownership/clipping explicit; do not merge all pigment identities into one global field.
- Keep the prototype standalone and dependency-free.
- If a performance optimization creates visual artifacts, back it out or put it behind a conservative fallback.
