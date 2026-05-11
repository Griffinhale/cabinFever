# Prototype D: Stable-Fluid-Inspired Finite Pigment Density Marbling

## Concept

Create a standalone variant at `prototypes/marbling-density-fluid/` by copying the current `prototypes/marbling-metaball-pools/` prototype, then replacing the current rake buffer illusion with a small stable-fluid-style substrate.

The metaball system remains the drop/growth frontend because it already gives attractive organic silhouettes. Once pigment is visible, each pool also owns a clipped density-and-velocity grid. Raking injects velocity into that grid, then density is semi-Lagrangian advected inside the pool mask. The result should make pigment behave like finite material: compressed/bunched areas render more saturated, stretched/spread areas render paler, and repeated combing can break the interior into strands while the original organic boundary is mostly preserved.

Primary hypothesis: a small damped density+velocity grid per pigment territory will produce more convincing finite pigment movement than coordinate displacement alone, without needing a full fluid solver or touching the Next app.

## Data model

Keep the existing `PigmentPool` shape, palette model, press/hold growth mapping, adaptive field quality, paper layer, and strongest-owner clipping. Add raster-fluid state at field-grid resolution:

```js
let fluidCols;
let fluidRows;
let fluidCellSize;
let fluidOwners;      // Int16Array, pool id or -1
let fluidMask;        // Float32Array, 0 outside -> 1 inside clipped owner mask
let fluidBorderPin;   // Float32Array, 0 interior -> 1 protected rim/seam
let fluidDensity;     // Float32Array, finite pigment amount/saturation carrier
let fluidDensityNext; // Float32Array scratch
let fluidVx;          // Float32Array
let fluidVy;          // Float32Array
let fluidVxNext;      // optional scratch for velocity advection/diffusion
let fluidVyNext;
```

Suggested first-slice simplification:

- Use one global fluid grid matching the active field grid rather than per-pool arrays.
- `fluidOwners[idx]` stores the baked visible owner from the metaball solve.
- `fluidMask[idx]` clips advection so density cannot enter paper or another pigment territory unless explicitly allowed later.
- `fluidBorderPin[idx]` is high near exterior threshold rims and color seams; interior is low.
- `fluidDensity[idx]` starts around `1.0` for occupied cells, with optional initial variation from field strength/noise.
- Density is finite in practice: advection samples/moves existing density; no new density is created during raking. New drops add density only when baked into the grid.

Resize/quality-tier changes should rebuild the fluid grid from existing pools if no raking has happened yet. After raking, prefer resampling the fluid arrays to the new grid so combed state survives tier changes.

## Rendering behavior

Render order:

1. Stable cream paper/grain layer from the base prototype.
2. Active growing metaball previews for unbaked/new pools, if any.
3. Baked fluid density layer for settled or rasterized pigment.
4. Preserved rim/seam accents using `fluidBorderPin` and existing palette rim colors.
5. Minimal toolbar/hints matching the base prototype.

For each fluid cell with `owner >= 0` and `mask > 0`:

- Convert density to visual alpha/saturation:
  - `density < 1.0`: lighter wash, lower alpha, more paper showing through.
  - `density ~= 1.0`: normal base pigment.
  - `density > 1.0`: darker/more saturated pigment, capped to avoid mud.
- Keep per-pool curated colors; do not introduce random RGB.
- Preserve organic borders by blending rim/seam cells back toward the original metaball look according to `fluidBorderPin`.
- Allow low-density interior cells to look broken/open, but avoid cutting hard square holes by adding stable noise and soft alpha thresholds.

Recommended constants to tune in the prototype:

```js
const FLUID_STEPS_PER_RAKE = 2;
const FLUID_DT = 0.72;
const VELOCITY_DAMPING = 0.84;
const DENSITY_DAMPING = 0.995;
const BORDER_VELOCITY_SCALE = 0.08;
const BORDER_DENSITY_BLEND = 0.65;
const MAX_DENSITY_VISUAL = 2.4;
const MIN_VISIBLE_DENSITY = 0.05;
```

## Rake behavior

Rake mode should inject velocity, not directly paint channels.

Interaction baseline:

- Reuse toolbar `drop`, `rake`, `palette`, `reset`.
- Keep Shift-drag and two-finger drag as rake shortcuts.
- For each pointer segment, resample into short subsegments so fast strokes do not skip cells.
- Build a comb from 4-7 parallel tine segments around the pointer path.
- Each tine adds velocity along the stroke direction, with optional small normal turbulence/noise to avoid overly mechanical streaks.

Pseudo-flow:

```js
function applyRakeSegment(prev, curr) {
  const dir = normalize(curr - prev);
  const normal = { x: -dir.y, y: dir.x };
  for (const tine of buildCombTines(prev, curr, normal)) {
    forEachFluidCellNearSegment(tine, tineRadius, (idx, dist01) => {
      if (fluidOwners[idx] < 0 || fluidMask[idx] <= 0) return;
      const pin = fluidBorderPin[idx];
      const falloff = (1 - dist01) * (1 - dist01);
      const force = rakeStrength * falloff * lerp(1, BORDER_VELOCITY_SCALE, pin);
      fluidVx[idx] += dir.x * force;
      fluidVy[idx] += dir.y * force;
      fluidVx[idx] += normal.x * noiseJitter * force;
      fluidVy[idx] += normal.y * noiseJitter * force;
    });
  }

  for (let i = 0; i < FLUID_STEPS_PER_RAKE; i++) {
    projectOrClampVelocityToMask();
    advectVelocitySemiLagrangian(); // optional for first slice; damping-only is acceptable initially
    advectDensitySemiLagrangian();
    dampVelocity();
    pinBorders();
  }
}
```

Semi-Lagrangian density step:

- For each inside cell, backtrace from `(gx, gy)` to `(gx - vx * dt, gy - vy * dt)`.
- Bilinearly sample density only from cells with the same owner and nonzero mask.
- If the backtrace leaves the owner mask, clamp to the nearest valid current cell or blend toward the original/pinned border density.
- Write into `fluidDensityNext`, swap buffers, then damp lightly.
- Do not add density during advection; saturation changes come from density bunching/smearing and interpolation.

Boundary strategy:

- Exterior paper cells always remain paper.
- Velocity crossing out of the owner mask is reduced or reflected.
- Border/seam cells get strong velocity damping and partial density restoration so silhouettes remain organic.
- The interior can separate into low-density lanes; the outer silhouette should not collapse after repeated strokes.

## Implementation outline

1. Create `prototypes/marbling-density-fluid/` by copying `prototypes/marbling-metaball-pools/`.
2. Update title, hints, README, and inline comments to identify Prototype D / density-fluid.
3. Add fluid arrays and lifecycle helpers: allocate, clear, resize/resample, bake from current field, mark raked state dirty.
4. Bake visible metaball cells into fluid arrays when pools settle; initially bake the whole settled field for simplicity.
5. Replace current rake displacement/paint override buffers with velocity injection plus density advection.
6. Render fluid density cells with density-driven wash/base/saturated coloring and preserved rims.
7. Keep active drop creation working after raking by baking new settled cells into the fluid grid without erasing existing raked density elsewhere.
8. Add debug toggles only if useful: show density, show velocity, show mask/pinning.
9. Keep the prototype standalone: p5 CDN, one `index.html`, no Next.js integration.

## Verification steps

Manual smoke:

1. Serve the new directory:

   ```bash
   cd /workspace/projects/Griffinhale_git/worktrees/cabinFever-marbling-density-fluid/prototypes/marbling-density-fluid
   python3 -m http.server 8123
   ```

2. Open `http://localhost:8123`.
3. Create quick taps and long holds; confirm silhouettes match the organic metaball baseline.
4. Switch to rake and drag through a single large pool; confirm the interior forms streaks/low-density lanes while the edge remains mostly stable.
5. Repeatedly rake across the same area; confirm bunching gets more saturated and spread areas get paler instead of all color staying uniform.
6. Rake across neighboring colors; confirm pigment does not freely bleed across clipped owner seams in the first slice.
7. Add new drops after raking; confirm they render and bake without wiping earlier combed fluid state.
8. Test reset, palette cycling, Shift-drag rake shortcut, and touch/two-finger rake behavior.
9. Resize the browser; confirm either resampling or full rebuild behaves intentionally and does not corrupt arrays.
10. Stress 10-20 pools; confirm frame rate remains usable at adaptive 4/6/8 px grid sizes.

Success criteria:

- Finite-density behavior is obvious: same pigment mass can look bunched/darker or spread/lighter.
- Raking breaks internal material into strands or soft gaps.
- Organic outer boundaries and inter-color seams remain readable.
- The sketch settles static when idle; no continuous jitter.
- Performance is acceptable for a standalone exploration.

Failure criteria:

- Density advection looks like square pixel smear with no marbling payoff.
- Borders collapse or leak badly after a few strokes.
- New drops cannot coexist with raked fluid state.
- Solver complexity overwhelms the visual benefit compared with simpler raster raking.

## Commit instructions

For the implementation commit later, include only the standalone variant files unless the README plan intentionally changes. Use Griffin identity:

```bash
git add prototypes/marbling-density-fluid docs/prototype-plans/density-fluid.md
git -c user.name="Griffin" -c user.email="griffinhale.3@gmail.com" commit -m "feat: prototype fluid density marbling"
```

For this planning-only task, commit only this plan file:

```bash
git add docs/prototype-plans/density-fluid.md
git -c user.name="Griffin" -c user.email="griffinhale.3@gmail.com" commit -m "docs: plan fluid density marbling prototype"
```
