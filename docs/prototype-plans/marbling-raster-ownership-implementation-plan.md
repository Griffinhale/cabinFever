# Marbling Raster Ownership Growth Implementation Plan

Date: 2026-05-08
Branch: `proto/marbling-raster-ownership`
Prototype folder: `prototypes/marbling-raster-ownership/`
Architecture: raster ownership growth / pixel-grid Voronoi expansion

## Prototype purpose

This prototype tests whether a raster ownership field can produce the cabinFever marbling interaction more convincingly than independent radial drop geometry.

The core hypothesis is that marbling regions should be represented as a shared surface field, not as separate overlapping shapes. Every simulation cell is owned by exactly one pigment drop or remains empty. Drops expand by claiming empty neighboring cells until their paint budget is exhausted or their frontier is blocked by canvas edges and already-owned cells.

This should prove or disprove:

- Hold duration maps naturally to target area / paint amount.
- Exclusive grid ownership creates coherent bounded regions without overlap.
- Shared seams are easier to reason about than per-drop polygon collisions.
- Organic frontier growth can look like pigment rather than cellular automata.
- Early smoothing and polish can hide pixel/grid artifacts enough for a beautiful demo.
- The model can settle to a static final image after all growth completes.

## Architecture summary

Use a standalone p5/HTML prototype with a low-resolution simulation grid and higher-resolution visual rendering.

The simulation owns a rectangular grid, for example 2-4 screen pixels per cell at desktop size, adjusted for mobile performance. Each cell stores ownership and optional metadata. Each user drop stores a seed, a target area budget derived from press duration, a current claimed area, and a frontier of candidate cells. On each update step, active drops claim a bounded number of frontier cells according to distance, noise, and local growth cost.

Initial version is strict ownership:

- Empty cells can be claimed.
- Owned cells cannot be claimed by a different drop.
- No displacement or reassignment yet.
- Canvas edges naturally block growth because there are no valid cells outside the grid.
- Growth ends when the drop reaches its target area or has no valid frontier.

Rendering should be treated as a first-class part of the architecture, not as a final decoration. The main risk is visible grid/pixel artifacts, so the plan prioritizes smoothing, contour/rim polish, and paper/pigment texture early.

## Exact files to create

Create only these prototype files during implementation:

- `prototypes/marbling-raster-ownership/index.html`
- `prototypes/marbling-raster-ownership/README.md`

Keep the first pass self-contained in `index.html` for fast iteration.

Optional split only after the prototype works and the single file becomes hard to maintain:

- `prototypes/marbling-raster-ownership/sketch.js`
- `prototypes/marbling-raster-ownership/styles.css`

Do not modify the current Next.js app during this prototype.
Do not implement prototype code as part of this planning task.

## p5 / HTML structure

`index.html` should contain:

- Minimal HTML shell with no build tooling.
- p5.js 1.11.3 from CDN.
- `p5.disableFriendlyErrors = true` before sketch setup.
- Full-screen canvas attached to the document body.
- CSS that removes margin, scrollbars, selection, and touch callouts.
- `touch-action: none` on the canvas/body to prevent mobile scroll/zoom during drawing.
- `pixelDensity(1)` in `setup()` for predictable grid/render behavior.
- Tiny unobtrusive corner hints: `hold to drop · P palette · R reset` plus current palette name.
- p5 lifecycle functions:
  - `setup()` creates canvas, allocates grid, creates paper texture layer.
  - `draw()` updates active growth only when needed and renders the current state.
  - `windowResized()` rebuilds canvas/grid safely or resets with clear documentation.
  - `keyPressed()` handles palette cycling and reset.
  - pointer/touch handlers start/finalize a press.

Recommended implementation constants:

- `CELL_SIZE`: start at 3 or 4 CSS pixels; consider 2 for desktop if performance allows.
- `MAX_CLAIMS_PER_FRAME`: cap work per frame to keep growth calm and mobile-safe.
- `MIN_TARGET_AREA_CELLS` and `MAX_TARGET_AREA_CELLS`: derived from viewport size.
- `HOLD_MS_MAX`: cap long holds, around 1200-1800ms.
- `GROWTH_STEPS_PER_FRAME`: small enough that expansion is visible and meditative.

## Interaction model

Core gesture:

- Pointer down / touch start begins measuring paint amount at the pointer location.
- While held, optionally preview the seed point and estimated target area with a subtle non-final ring/wash.
- Pointer up / touch end finalizes the drop.
- Quick taps still create a minimum visible pigment region.
- Longer holds produce larger target area up to a capped maximum.

Hold duration should map to target area, not radius:

```text
holdT = clamp((holdMs - minHoldMs) / (maxHoldMs - minHoldMs), 0, 1)
eased = easeOutCubic(holdT)
targetAreaCells = round(lerp(minAreaCells, maxAreaCells, eased))
```

This is an evaluation priority: hold duration is semantically paint amount, and in the raster architecture paint amount should mean target area / number of owned cells.

Input notes:

- Prefer Pointer Events if using direct DOM listeners on the p5 canvas.
- If using p5 handlers, implement both mouse and touch paths carefully and return `false` from touch handlers.
- Ignore secondary touches in the first version.
- Clamp pointer positions to the canvas bounds before converting to grid coordinates.
- If a press starts on an already-owned cell, still allow a seed attempt but expect growth to be limited unless empty neighboring cells exist. Document this limitation.

## Simulation model

### Grid state

Maintain flat typed arrays for predictable performance:

- `owner`: integer drop id per cell, `-1` for empty.
- `age`: optional claim frame/time per cell for subtle rendering variation.
- `cost`: optional static grain/wetness cost generated from noise.
- `edge`: optional boundary flag or computed during render.

Grid dimensions:

```text
gridW = ceil(width / CELL_SIZE)
gridH = ceil(height / CELL_SIZE)
cellIndex = y * gridW + x
```

### Drop state

Each drop should store:

- `id`
- `seedX`, `seedY` in grid coordinates
- `screenX`, `screenY` for previews/debugging
- `targetAreaCells`
- `claimedAreaCells`
- `frontier` queue / array of cell indices
- `frontierSet` or marker array to avoid duplicate frontier entries
- `color`, `rimColor`, wash/accent colors from current palette
- `createdAt`
- `settled`
- `noiseSeed`

### Growth rules

On creation:

1. Convert pointer to grid cell.
2. Create a drop with area budget from hold duration.
3. If the seed cell is empty, claim it immediately.
4. Add empty neighbors around the seed to the frontier.
5. If seed is occupied, search a small radius for nearest empty cell; if none exists, create a tiny blocked/settled drop record only if needed for feedback, or ignore with a subtle pulse.

Per frame:

1. Iterate active drops in creation order or round-robin order.
2. For each active drop, claim up to N cells while under budget.
3. Choose the next frontier cell by lowest growth cost.
4. Cost should combine:
   - distance from seed, to discourage long tendrils
   - stable noise/grain, to create organic irregular boundaries
   - neighbor support count, to prefer coherent filled regions
   - slight age/order jitter, to avoid square waves
5. Claim only empty cells.
6. After claiming a cell, add its empty 4- or 8-connected neighbors to the frontier.
7. Stop the drop when `claimedAreaCells >= targetAreaCells` or frontier is exhausted.
8. Stop global simulation when all drops are settled and no press preview is active.

Use 8-neighbor expansion for organic growth, but penalize diagonal-only bridges so regions do not become disconnected-looking. The model should prioritize bounded regions and coherent ownership over maximal noisy tendrils.

### Bounded regions and ownership evaluation

This prototype is specifically judged on grid ownership and bounded regions:

- No two drops may own the same cell.
- Existing regions should act as hard obstacles in version one.
- Shared boundaries should be coherent because there is exactly one owner field.
- Crowded compositions should remain legible with 10-20+ drops.
- Growth near canvas edges should stop naturally and cleanly.

## Rendering model

Rendering must be polished early because raster ownership can fail visually if it looks pixelated.

Recommended first rendering pass:

1. Draw cream paper/water base from palette.
2. Draw cached subtle paper grain/noise layer.
3. Render the ownership grid to an offscreen `p5.Graphics` layer at grid resolution or canvas resolution.
4. For each owned cell, fill with the owner's pigment color plus subtle per-cell variation.
5. Upscale with smoothing, not nearest-neighbor block scaling.
6. Add boundary/rim pass where a cell has at least one neighbor with a different owner or empty owner.
7. Add inner wash/highlight pass with low alpha to avoid flat fills.
8. Draw tiny corner hints last.

Smoothing options to test early:

- Canvas 2D `imageSmoothingEnabled = true` when upscaling a low-res pigment layer.
- Render cells larger than grid but with no stroke and alpha blending.
- Draw boundary cells as soft circles/ellipses instead of hard squares.
- Add a lightweight blur filter to the pigment layer if acceptable in p5/browser performance.
- Use marching-squares contour extraction if block artifacts remain too visible after simpler smoothing.

Evaluation priority: actively watch for pixel/grid artifacts. If the first version reads as a tile map, stop adding simulation features and improve smoothing/polish before proceeding.

Visual target:

- Cream/paper surface, not flat white.
- Curated pigment colors, not random RGB.
- Irregular organic edges, not square blobs.
- Soft but readable rims.
- Settled image should be static and screenshot-worthy.

## Palette, reset, and static-settle behavior

### Palette behavior

Define at least four curated palettes:

- Traditional marbling: indigo, oxblood, ochre, moss, cream.
- Bright playful: coral, turquoise, lemon, violet, ultramarine.
- Portfolio subdued: charcoal, clay, muted teal, cream, copper.
- Monochrome ink: blue-black, gray, cream, pale wash.

Each palette should include:

- `name`
- `surface`
- `grain`
- `pigments`
- `rim` or rim derivation rules
- optional wash/highlight colors

Pressing `P` cycles the active palette for future drops only. Existing owned cells keep their assigned drop colors. The paper/surface can either update with the palette or stay as initially chosen; choose one behavior and document it in the README.

### Reset behavior

Pressing `R` resets:

- drops array
- owner grid
- active frontiers
- active press state
- render layers / dirty flags

No undo/redo in this prototype.
No export in this prototype.

### Static-settle behavior

The composition should become static when:

- no active press is being held
- all drops are settled
- no render-affecting state is changing

Implementation approach:

- Maintain a `dirty` flag.
- Update and redraw while drops are growing or input preview is active.
- Once settled, continue drawing the same final frame without mutating noise, positions, colors, or ownership.
- Do not animate idle noise after settlement.

## Mobile and touch notes

Mobile/touch is first-class for this architecture.

Requirements:

- Disable page scrolling and pinch/drag interference in the standalone demo.
- Use `pixelDensity(1)` to avoid accidental high-DPI grid explosion.
- Choose `CELL_SIZE` based on viewport/device if needed; mobile may need larger cells.
- Cap max target area and claims per frame relative to grid size.
- Avoid expensive per-frame full-grid scans when only a few frontier cells change.
- Touch tap and touch hold should match mouse click and mouse hold.
- Provide a non-keyboard path only if needed after testing, such as tiny corner tap zones for palette/reset. Keep them unobtrusive.
- Avoid hover-only affordances.

Performance target:

- Smooth interaction on a typical phone with a modest number of drops.
- Graceful degradation if the grid is large: slower growth is acceptable; jank is not.

## Acceptance criteria

The raster ownership prototype is acceptable when:

1. It opens as a standalone static p5/HTML page.
2. It presents a full-screen cream paper/water surface.
3. UI is limited to tiny unobtrusive hints.
4. Mouse click and touch tap create pigment at the pointer location.
5. Press/hold duration maps to larger target area, not merely radius.
6. Drops grow slowly and visibly after placement.
7. Growth stops when the drop reaches its target owned-cell budget.
8. Growth stops cleanly at canvas edges.
9. Growth stops at neighboring owned regions because ownership is exclusive.
10. Multiple drops create coherent bounded/Voronoi-like regions.
11. There are no major overlaps because each grid cell has only one owner.
12. Boundaries look organic and continuous rather than square/pixelated.
13. Pixel/grid artifacts are actively smoothed or visually disguised.
14. At least four curated palettes exist and `P` cycles future pigment colors.
15. `R` resets the canvas.
16. Desktop mouse and mobile/touch interactions both work.
17. When all growth finishes, the image becomes static.
18. A 10-20 drop composition looks intentional enough to compare against the other architecture prototypes.
19. README documents controls, model, and limitations.

## Known limitations

Expected limitations for this prototype:

- Strict ownership means new drops do not push or displace old pigment.
- Drops placed inside fully occupied regions may fail to grow unless nearby empty cells exist.
- Low-resolution grids can produce visible cell artifacts if rendering polish is insufficient.
- Frontier growth can look like cellular automata if cost/noise/smoothing are poorly tuned.
- Area budgets are exact in cells, but visual area after smoothing/blur may be approximate.
- Full marching-squares contour extraction may be deferred if simpler smoothing is enough.
- Very crowded canvases can leave small empty gaps if frontier rules are too conservative.
- Resizing may require resetting the simulation in the first version.
- No undo, export, true fluid dynamics, pigment diffusion, or physical displacement.

## Staged implementation tasks

### Stage 1: Shell and documentation

Files:

- Create `prototypes/marbling-raster-ownership/index.html`
- Create `prototypes/marbling-raster-ownership/README.md`

Tasks:

1. Add full-screen p5 shell.
2. Add CSS for no margins, no scroll, and touch-safe interaction.
3. Add cream surface, paper grain placeholder, and tiny hint text.
4. Add README with purpose, run command, controls, and planned model.

Verification:

- Open the static page through a local server.
- Confirm full-screen cream canvas and no console errors.

Checkpoint commit:

- `feat(raster): add standalone prototype shell`

### Stage 2: Palette and input/hold model

Tasks:

1. Add curated palettes and active palette state.
2. Add `P` palette cycling.
3. Add `R` reset stub.
4. Implement pointer/touch press tracking.
5. Map hold duration to target area cells.
6. Add a subtle active-press preview.

Verification:

- Quick tap and long hold compute visibly different target area values.
- Touch interaction does not scroll the page.
- Palette hint updates.

Checkpoint commit:

- `feat(raster): add hold-based paint budget input`

### Stage 3: Grid ownership model

Tasks:

1. Allocate typed-array ownership grid.
2. Implement coordinate conversion between canvas pixels and grid cells.
3. Implement drop records with seed, target area, claimed area, and frontier.
4. Claim seed cell and initialize frontier.
5. Implement frontier expansion into empty cells.
6. Stop drops at area budget or exhausted frontier.
7. Track active/settled state.

Verification:

- Ownership cell count increases slowly over time.
- Target budget is respected.
- Adjacent drops do not claim the same cells.
- Edge drops remain inside the grid.

Checkpoint commit:

- `feat(raster): implement area-budgeted frontier growth`

### Stage 4: Organic growth tuning

Tasks:

1. Add stable noise/grain cost.
2. Add neighbor-support scoring to reduce tendrils.
3. Add round-robin or fair active-drop updates.
4. Tune growth speed for calm, meditative expansion.
5. Add debug toggle if useful, but keep it hidden from normal UI.

Verification:

- Bounded regions are clear.
- Growth does not form disconnected islands or long ugly tendrils.
- Hold duration remains legible as area.

Checkpoint commit:

- `feat(raster): tune organic bounded growth`

### Stage 5: Rendering polish and smoothing

Tasks:

1. Render pigment ownership with curated colors.
2. Add paper grain texture.
3. Add rim/boundary detection and darker/softer edge treatment.
4. Add inner wash/highlight variation.
5. Smooth upscaled grid output.
6. If artifacts remain obvious, test marching-squares or soft boundary splats.

Verification:

- Boundaries are organic and continuous.
- Grid artifacts are not the dominant visual impression.
- Screenshot with 10-20 drops looks like intentional marbling exploration.

Checkpoint commit:

- `style(raster): add pigment smoothing and paper grain`

### Stage 6: Reset, static-settle, mobile pass

Tasks:

1. Complete reset behavior.
2. Add dirty/static-settle logic.
3. Verify no idle mutation after settlement.
4. Tune mobile grid size and claims-per-frame caps.
5. Add tiny touch-accessible palette/reset zones only if keyboard controls are insufficient on mobile.
6. Update README with actual controls, model, limitations, and evaluation notes.

Verification:

- `R` clears everything.
- Settled composition remains static.
- Mouse and touch both work.
- README matches behavior.

Checkpoint commit:

- `docs(raster): document controls and limitations`

## Verification commands

From the raster worktree:

```bash
cd /workspace/projects/Griffinhale_git/worktrees/cabinFever-marbling-raster

git status --short --branch

test -f prototypes/marbling-raster-ownership/index.html

test -f prototypes/marbling-raster-ownership/README.md

cd prototypes/marbling-raster-ownership
python3 -m http.server 8123
```

Then open:

```text
http://localhost:8123
```

Manual browser checks:

- No console errors on load.
- Full-screen cream surface.
- Quick click/tap creates a small growing region.
- Long hold creates a larger target area.
- Edge growth stops at canvas bounds.
- Neighboring drops form bounded regions without overlapping ownership.
- Pixel/grid artifacts are not visually dominant.
- `P` cycles palette for future drops.
- `R` resets.
- Touch does not scroll the page.
- Settled image becomes static.

Optional lightweight static checks after files exist:

```bash
python3 - <<'PY'
from pathlib import Path
p = Path('prototypes/marbling-raster-ownership/index.html')
text = p.read_text()
for needle in ['p5.js', 'setup', 'draw', 'pixelDensity(1)', 'touch']:
    assert needle in text, needle
print('basic html checks passed')
PY
```

## Commit checkpoints

This planning task should produce one docs-only commit:

- `docs(raster): add implementation plan`

Implementation should later use these reviewable checkpoints:

1. `feat(raster): add standalone prototype shell`
2. `feat(raster): add hold-based paint budget input`
3. `feat(raster): implement area-budgeted frontier growth`
4. `feat(raster): tune organic bounded growth`
5. `style(raster): add pigment smoothing and paper grain`
6. `docs(raster): document controls and limitations`

Before each implementation commit:

- Run the available verification commands for that stage.
- Check `git status --short --branch`.
- Confirm the commit touches only this prototype folder or its README unless a docs update is explicitly intended.

## Evaluation priorities

When comparing this prototype to the other marbling architectures, prioritize:

- Hold duration as target area / paint amount, not just radius.
- Grid ownership as the source of truth for collision and final regions.
- Coherent bounded regions and shared seams.
- Clean behavior at canvas edges.
- Absence of overlapping ownership.
- Early smoothing and polish so the model is judged as marbling, not as a grid demo.
- Pixel/grid artifact detection at normal desktop and mobile viewport sizes.
- Static settled compositions that remain visually pleasing.

If the prototype fails, it should fail informatively: either strict raster ownership is too cellular/pixelated for the desired art direction, or it needs to be hybridized with shader rendering, marching-squares contours, or boundary relaxation.
