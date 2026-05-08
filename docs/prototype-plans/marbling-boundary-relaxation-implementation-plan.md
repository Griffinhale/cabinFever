# Marbling Boundary Relaxation Raster Field Implementation Plan

Date: 2026-05-08
Branch: `proto/marbling-boundary-relaxation`
Prototype folder: `prototypes/marbling-boundary-relaxation/`
Architecture: boundary relaxation raster field

## Prototype purpose

This prototype tests whether a low-resolution raster pigment field can create marbling regions that negotiate and push shared boundaries without implementing a full fluid simulation.

The key evaluation question is:

Can raster regions with area/mass budgets and local relaxation passes feel more physically marbled than strict raster ownership, while remaining stable, understandable, performant, and static after settling?

This prototype should focus only on the boundary relaxation raster field architecture. It should not implement radial polygon drops, shader-only implicit fields, metaball pooling, or particle/fluid simulation. It may borrow rendering lessons from other prototypes, but the simulation state must be an ownership/mass raster.

## Evaluation priorities

Prioritize proving these ideas:

- Raster ownership can represent pigment regions as material-like territories.
- New pigment can negotiate, squeeze, or slightly push neighboring regions instead of simply stopping at occupied cells.
- Hold duration maps clearly to target area/mass.
- Shared boundaries remain coherent and organic.
- Settled compositions become visually static.

Watch carefully for these failure modes:

- Boundary flicker while ownership changes.
- Unstable churn where cells repeatedly swap owners after the image should settle.
- Relaxation rules becoming too complex to reason about or tune.
- Visual improvement over strict raster ownership being too small to justify the added algorithmic complexity.
- Repeated relaxation passes harming mobile performance.

Comment the relaxation passes carefully. Future readers should be able to understand why each pass exists, what invariant it protects, and what visual/physical behavior it is meant to create.

## Architecture summary

Use a standalone p5/HTML sketch with a low-resolution simulation grid and high-resolution canvas rendering.

The simulation owns a raster field where each cell stores pigment ownership and lightweight physical metadata:

- `owner`: drop id or `-1` for empty surface.
- `colorIndex` or resolved pigment color.
- `mass`: local contribution to the owning drop's area/mass.
- `pressure`: temporary value used during relaxation.
- `age`: when the cell was claimed, useful for stable tie-breaking.
- `edgeNoise`: stable per-cell/per-drop noise used for organic seams.

Each drop stores:

- `id`
- seed position in grid coordinates
- target mass/area from hold duration
- current mass/area
- pigment colors
- active frontier cells
- created frame/time
- relaxation energy/settle counter
- status: `growing`, `relaxing`, or `settled`

When a user creates a drop:

1. Convert pointer position to simulation grid coordinates.
2. Map hold duration to target mass/area.
3. Seed or overlay a small initial occupied region.
4. Expand into nearby empty cells first.
5. Where expansion meets occupied cells, create boundary pressure.
6. Run a capped number of local relaxation passes per frame.
7. Allow local seam movement only when it improves a simple energy/cost function.
8. Freeze the field when all drops have reached target mass or no beneficial local moves remain.

This is not Navier-Stokes, not particle advection, and not true conservation physics. It is a pragmatic raster territory model for wet pigment boundaries.

## Exact files to create

Create only documentation in this planning task:

- `docs/prototype-plans/marbling-boundary-relaxation-implementation-plan.md`

Future implementation should create these prototype files:

- `prototypes/marbling-boundary-relaxation/index.html`
- `prototypes/marbling-boundary-relaxation/README.md`

Optional future split, only if `index.html` becomes too large:

- `prototypes/marbling-boundary-relaxation/sketch.js`
- `prototypes/marbling-boundary-relaxation/styles.css`

Do not modify the Next.js app during this prototype.

## p5/HTML structure

Prefer a self-contained `index.html` for the first implementation pass.

Recommended structure:

- HTML head
  - viewport metadata for mobile
  - p5.js 1.11.3 CDN script
  - inline CSS that removes margins, prevents scroll, and sets touch behavior
- Body
  - no visible app chrome
  - p5 canvas only
- Inline sketch code
  - `p5.disableFriendlyErrors = true`
  - constants for grid scale, palettes, simulation limits, and interaction timing
  - global state for grid, drops, active press, palette index, dirty/static flags
  - setup/resizing functions
  - input handlers
  - simulation update functions
  - rendering functions
  - debug helpers guarded by a flag

Required p5 functions:

- `setup()`
  - `pixelDensity(1)`
  - create full-window canvas
  - initialize simulation grid
  - precompute stable paper grain/field noise
- `draw()`
  - update active press preview
  - run growth and relaxation only while dirty/active
  - render the cream surface, pigment field, rims, and tiny hints
  - stop mutating state once settled
- `windowResized()`
  - resize canvas
  - rebuild or rescale simulation grid with a documented simple policy
- `keyPressed()`
  - `P` cycles palette
  - `R` resets
  - optional `D` toggles debug overlay
- pointer/touch handlers
  - p5 mouse/touch handlers are acceptable for this standalone sketch
  - return `false` from touch handlers to prevent page scroll/zoom

## Interaction model

Core gesture:

- Press/tap starts pigment placement at the pointer.
- A quick tap still creates a minimum visible drop.
- Holding longer increases paint amount.
- Releasing finalizes the drop's target area/mass.
- The drop continues growing/relaxing calmly after release until it settles.

Hold mapping should be area-based:

- Compute normalized hold amount: `holdT = clamp((durationMs - minHoldMs) / holdRangeMs, 0, 1)`.
- Ease it for better feel: `paintT = easeOutCubic(holdT)`.
- Map to target grid cells or mass: `targetMass = lerp(minMass, maxMass, paintT)`.

Pointer preview:

- While pressing, render a subtle translucent preview at the pointer.
- The preview may show the current target footprint estimate, but it must not mutate the raster field until the drop is committed unless a later implementation intentionally supports live injection.

Controls:

- Press/tap: create pigment.
- Hold: increase paint amount.
- `P`: cycle curated palette for future drops.
- `R`: reset to a blank cream surface.
- Optional `D`: debug ownership/pressure/frontier overlay for development only.

## Simulation model

### Grid resolution

Use a fixed low-resolution simulation grid based on viewport size, for example:

- `cellSize = 3` or `4` CSS pixels on desktop.
- Consider `cellSize = 4` or `5` on mobile if performance needs help.
- `gridW = ceil(width / cellSize)`.
- `gridH = ceil(height / cellSize)`.

Keep `pixelDensity(1)` so canvas and grid costs are predictable.

### Cell data

Use typed arrays for stability and performance:

- `owner = new Int16Array(gridW * gridH)`; `-1` means empty.
- `mass = new Float32Array(gridW * gridH)`.
- `pressure = new Float32Array(gridW * gridH)`.
- `age = new Uint16Array(gridW * gridH)` or similar.
- Optional `edgeNoise = new Float32Array(gridW * gridH)`.

Initialize owners to `-1` on reset.

### Drop creation

On release:

1. Create a `Drop` record with target mass and pigment metadata.
2. Claim the seed cell if empty.
3. If the seed cell is occupied, allow the new drop to claim a tiny initial nucleus around the pointer and mark displaced neighbors for relaxation. This is the key case that differentiates this prototype from strict raster ownership.
4. Add neighboring cells to the drop frontier.
5. Mark the simulation dirty.

### Growth pass

Each active frame, for each non-settled drop:

1. Expand into a small budgeted number of frontier cells.
2. Prefer empty cells by lowest cost.
3. Cost should combine:
   - distance from the drop seed
   - stable noise for organic boundaries
   - canvas edge penalty if needed
   - pressure from neighboring owners
4. Stop direct growth when target mass is reached or no frontier remains.
5. Record boundary contacts with other owners for relaxation.

### Pressure pass

Compute a local pressure field around active drop boundaries:

- New or still-growing drops exert outward pressure proportional to unmet mass and local overlap/contact.
- Existing settled drops resist movement with an age/stability term.
- Pressure should decay quickly over distance; keep it local to seam neighborhoods.
- Do not compute global fluid pressure.

The pressure pass exists to identify candidate seam cells, not to simulate continuous flow.

### Relaxation pass

Run a capped number of local seam relaxation passes per frame.

A candidate move may reassign one boundary cell from owner A to owner B, or swap/shift a short local chain of cells, only if it improves a simple energy score.

Suggested energy terms:

- mass error: owners closer to target mass are preferred
- compactness: cells closer to their owning seed are preferred
- boundary smoothness: avoid one-cell spikes and checkerboard patterns
- noise bias: stable noise creates organic irregularity
- age resistance: older settled regions resist but are not immovable

Rules:

- Never allow unbounded global churn.
- Only inspect cells near active seams.
- Require a minimum energy improvement threshold before reassigning ownership.
- Add a per-cell cooldown or age penalty to prevent flip-flopping.
- Cap relaxation passes per frame and per drop.
- Stop relaxation after a no-change frame count threshold.

This section must be commented heavily in code when implemented.

### Settling model

A drop becomes settled when:

- it has reached its target mass or cannot gain more mass,
- no beneficial relaxation moves occur for several frames,
- and its active frontier is empty or inactive.

The whole sketch is settled when every drop is settled and there is no active press. Once settled, the image should be static: no animated noise, no changing pressure, no idle mutation.

## Rendering model

Render from raster ownership, not independent vector shapes.

Recommended first-pass rendering:

1. Draw cream/paper background.
2. Draw subtle stable grain.
3. Render each occupied grid cell as pigment color into the canvas or an offscreen graphics buffer.
4. Smooth the visual result so grid cells do not read as pixels.
5. Add darker/lighter rim treatment along owner changes.
6. Add subtle inner wash variation using stable noise.
7. Draw tiny corner hints above the canvas.

Rendering options, in increasing complexity:

- Direct cell rectangles with no stroke for the first debugging pass.
- Draw to a lower-res `p5.Graphics` buffer, then scale with smoothing.
- Use alpha feathering by sampling neighbor ownership around each cell.
- Add contour/rim pixels where neighboring cells have different owners.
- Later, if needed, implement marching-squares-style contours for smoother boundaries.

Avoid per-frame animated boundary noise after settle. Organic texture should be stable and tied to seed/cell/drop, not time.

Debug overlay:

- Optional, toggled by `D`.
- Can show active frontiers, pressure values, recently changed cells, and owner ids.
- Must be off by default.

## Palette, reset, and static-settle behavior

### Palette

Include at least four curated palettes:

- Traditional marbling: indigo, oxblood, ochre, moss, cream.
- Bright playful: coral, turquoise, lemon, violet, ultramarine.
- Portfolio subdued: charcoal, clay, muted teal, cream, copper.
- Monochrome ink: blue-black, gray, cream, pale wash.

Palette cycling behavior:

- `P` changes the active palette for future drops.
- Existing drops keep their colors.
- Hint text should show the active palette name.

### Reset

`R` should:

- clear all drops,
- reset all grid arrays,
- reset pressure/frontier/debug state,
- restore blank cream surface,
- keep the currently selected palette unless there is a strong reason to reset it.

### Static settle

After all drops settle:

- no simulation passes should run,
- no time-varying rendering should occur,
- the image should remain unchanged until the next user interaction, palette change, reset, or resize.

This is required by the design spec and is also useful for performance.

## Mobile and touch notes

Mobile/touch support is first-class.

Implementation notes:

- Add viewport meta tag: `width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no`.
- Use CSS `touch-action: none` on the body/canvas.
- Return `false` from touch handlers.
- Avoid high-DPI simulation cost by using `pixelDensity(1)`.
- Consider a larger `cellSize` on small screens.
- Keep per-frame relaxation budgets small.
- Avoid large allocations in `draw()`.
- Make hints readable but unobtrusive on small screens.
- If keyboard palette/reset controls are not enough on mobile, add tiny tappable corner zones for palette/reset only after the core model works.

## Acceptance criteria

A successful first implementation of this prototype should satisfy:

1. Opens as a standalone static p5/HTML page.
2. Full-screen cream/paper canvas with subtle stable grain.
3. Tiny unobtrusive hints only.
4. Pointer press/tap creates pigment at the pointer location.
5. Holding longer creates a larger target mass/area.
6. Drops grow slowly and meditatively.
7. New drops can visibly negotiate, squeeze, or slightly push nearby existing regions.
8. Shared boundaries remain coherent and attractive.
9. Boundaries look organic and water-like, not blocky or game-grid-like.
10. Palette cycling works and affects future drops.
11. Reset works.
12. Desktop mouse and mobile/touch both work.
13. Settled compositions become static.
14. With 10-20 drops, the image looks intentional rather than random.
15. The model is understandable enough that the relaxation code can be explained in comments.

Comparative acceptance:

- It should feel meaningfully more physical than strict raster ownership.
- If it does not visibly improve on strict occupancy, record that as a limitation and do not overbuild it.

## Known limitations

Expected simplifications:

- This is not a full fluid simulation.
- Pressure is local and heuristic.
- Area/mass conservation is approximate.
- Relaxation may not handle extremely crowded compositions perfectly.
- Grid resolution can create artifacts unless rendering smooths them.
- New drops inside existing pigment are the hardest case and should be evaluated honestly.
- The first pass may use simple cell reassignment instead of continuous displacement.
- No undo/redo.
- No export.
- No Next.js integration.

Main risks:

- Flicker from cells swapping owners repeatedly.
- Churn from relaxation rules without a clear stopping condition.
- Overcomplicated energy functions that become hard to tune.
- Performance issues from too many passes or full-grid scans.
- Visuals looking worse than simpler raster ownership because of unstable seams.

## Staged implementation tasks

### Task 1: Prototype shell

Create:

- `prototypes/marbling-boundary-relaxation/index.html`
- `prototypes/marbling-boundary-relaxation/README.md`

Implement full-screen p5 setup, cream background, tiny hints, resize handling, and no-scroll CSS.

Verification:

- Page opens without console errors.
- Canvas fills the viewport.
- Resizing does not break the canvas.

Commit checkpoint:

- `feat(relaxation): add standalone prototype shell`

### Task 2: Grid and palette foundations

Implement typed-array grid state, reset, curated palettes, and static paper grain.

Verification:

- Reset clears all arrays.
- Palette cycling changes the active palette name.
- No simulation allocations happen repeatedly in `draw()`.

Commit checkpoint:

- `feat(relaxation): add raster field and palettes`

### Task 3: Press/hold drop creation

Implement pointer/touch press tracking, hold-to-target-mass mapping, drop records, and seed claiming.

Verification:

- Quick tap creates a minimum-mass drop at the pointer.
- Long hold creates a larger target-mass drop.
- Touch does not scroll the page.

Commit checkpoint:

- `feat(relaxation): add press hold pigment creation`

### Task 4: Empty-cell frontier growth

Implement basic raster expansion into empty cells before any displacement/relaxation.

Verification:

- A single drop grows to target mass.
- Multiple separated drops grow independently.
- Growth is slow and calm.
- Canvas edges are respected.

Commit checkpoint:

- `feat(relaxation): implement area budgeted raster growth`

### Task 5: Boundary pressure detection

Detect seams between active drops and existing regions. Compute local pressure values and candidate relaxation cells.

Verification:

- Debug overlay can show seam/pressure cells.
- Pressure remains local rather than full-grid noisy.
- No visible behavior changes are required yet beyond debug instrumentation.

Commit checkpoint:

- `feat(relaxation): detect boundary pressure candidates`

### Task 6: Local relaxation pass

Implement cautious owner reassignment at active seams using a simple, documented energy score.

Verification:

- New drops near/inside existing regions can move seams slightly.
- Reassignment is stable and does not flicker.
- Relaxation has hard per-frame caps.
- Code comments explain each energy term.

Commit checkpoint:

- `feat(relaxation): add stable boundary relaxation`

### Task 7: Anti-churn and settle behavior

Add cooldowns, no-change counters, drop statuses, and whole-sketch static settling.

Verification:

- Active compositions eventually settle.
- No cells keep swapping after settle.
- Static final image does not animate or mutate.

Commit checkpoint:

- `feat(relaxation): add settle and anti churn controls`

### Task 8: Marbling rendering pass

Improve raster rendering with stable organic texture, smoothed cell output, rims, washes, and paper grain.

Verification:

- Grid artifacts are minimized.
- Shared seams look fluid and intentional.
- Screenshot with 10-20 drops looks marbled rather than cellular.

Commit checkpoint:

- `style(relaxation): add marbling raster rendering`

### Task 9: Mobile/touch QA and README

Test interaction on desktop and touch-sized viewport. Update README with controls, model, limitations, and evaluation notes.

Verification:

- Desktop and mobile interaction both satisfy the acceptance criteria.
- README accurately documents the actual implementation.

Commit checkpoint:

- `docs(relaxation): document controls and limitations`

## Verification commands

Planning-file verification:

```bash
cd /workspace/projects/Griffinhale_git/worktrees/cabinFever-marbling-relaxation
test -f docs/prototype-plans/marbling-boundary-relaxation-implementation-plan.md
git status --short --branch
```

Future prototype verification:

```bash
cd /workspace/projects/Griffinhale_git/worktrees/cabinFever-marbling-relaxation/prototypes/marbling-boundary-relaxation
python3 -m http.server 8123
```

Open:

```text
http://localhost:8123
```

Manual QA script:

1. Load blank cream surface.
2. Quick tap center.
3. Long hold near center.
4. Add two adjacent drops to test negotiated seams.
5. Add one drop inside or partially inside an existing region.
6. Add one drop near canvas edge.
7. Add 10-20 total drops.
8. Cycle palette once and add another drop.
9. Reset.
10. Wait for settling and verify no flicker/churn.

Optional static checks after code exists:

```bash
cd /workspace/projects/Griffinhale_git/worktrees/cabinFever-marbling-relaxation
python3 -m py_compile /dev/null
```

There is no build step expected for the standalone static prototype.

## Commit checkpoints

This planning task should be committed as:

- `docs(relaxation): add implementation plan`

Future implementation should use small reviewable commits:

1. `feat(relaxation): add standalone prototype shell`
2. `feat(relaxation): add raster field and palettes`
3. `feat(relaxation): add press hold pigment creation`
4. `feat(relaxation): implement area budgeted raster growth`
5. `feat(relaxation): detect boundary pressure candidates`
6. `feat(relaxation): add stable boundary relaxation`
7. `feat(relaxation): add settle and anti churn controls`
8. `style(relaxation): add marbling raster rendering`
9. `docs(relaxation): document controls and limitations`

Before every implementation commit, run at least:

```bash
git status --short --branch
```

Before final prototype handoff, run the local server and complete the manual QA script.
