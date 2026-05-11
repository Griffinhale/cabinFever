# Particle Splat Density Marbling Prototype Plan

## Concept

Create a standalone comparison prototype in `prototypes/marbling-density-particles/` by copying the current `prototypes/marbling-metaball-pools/` single-file p5 sketch and replacing the rake internals with finite pigment particles.

The base metaball pools still provide organic drop growth, thresholded silhouettes, rims, seams, palettes, paper grain, adaptive field resolution, toolbar controls, tap/hold dropping, and settled caching. The new idea is that each settled pool owns a finite cloud of small pigment particles clipped to the pool's metaball boundary. Raking moves those particles. Rendering splats and accumulates particle density back into the existing field cells, so pigment bunching raises saturation/opacity and spreading lowers it.

Success should feel less like warping an equation and more like combing finite material: the outside border remains organic, while the interior can thin, bunch, streak, and break apart.

## Data model

Keep the existing `PigmentPool` shape for growth and boundary evaluation, then add particle state:

```js
let pigmentParticles = [];
let particlesByPoolId = new Map();
let densityField = [];
```

Particle record:

```js
{
  id: number,
  poolId: number,
  pigmentIndex: number,
  x: number,
  y: number,
  px: number,
  py: number,
  vx: number,
  vy: number,
  mass: number,
  radius: number,
  age: number,
  seed: number
}
```

Per field cell, replace or extend the current owner/strength record with accumulated material:

```js
{
  owner: number,        // winning pool id/index, -1 for paper
  density: number,      // summed particle splat mass
  strength: number,     // normalized display strength derived from density
  margin: number,       // owner-vs-runner-up density gap for seams
  particleCount: number
}
```

Seeding rules:

- When a pool settles, sample many particles inside that pool's current implicit threshold mask.
- Particle count should scale with target mass/area, not screen size alone; start around 80-220 particles for normal pools and fewer for tap splatters.
- Use rejection sampling against `pool.fieldAt(x, y) >= FIELD_THRESHOLD` within cached pool bounds.
- Distribute particle mass so total pool pigment is approximately conserved: `particle.mass = pool.targetMass / particleCount` or normalized equivalent.
- Give particles slight radius variation and stable seed noise so splats avoid mechanical dots.
- Mark the pool as `particleBaked` once seeded; keep the `PigmentPool` available as the clip/border mask and color source.

## Rendering behavior

Use the existing field grid as the density accumulator instead of only evaluating metaball strength:

1. Clear dirty density cells.
2. Evaluate active growing/unbaked pools with the existing metaball path so hold/drop feedback remains unchanged.
3. For each baked particle in or near dirty rects, splat mass into nearby field cells with a compact kernel, for example quadratic falloff over `particle.radius`.
4. Accumulate density per owner. Each cell tracks the strongest owner density and runner-up density.
5. Convert density to display strength/saturation:
   - low density: lighter wash, lower alpha, possibly paper showing through,
   - medium density: normal base pigment,
   - high density/bunched particles: darker/richer saturation with limited alpha cap,
   - near original boundary or owner seam: preserve darker rim treatment.
6. Draw with the existing paper layer + pigment layer stack. Keep adaptive 4/6/8 px cells.

Border strategy:

- The pool's metaball threshold remains the default exterior clip: particles outside their pool mask are either softly pushed back inward or still rendered only when their splat contributes inside the mask.
- Render original rim/seam cells from the pool field or a baked boundary mask on top, so the silhouette stays organic even while interior density thins.
- Allow intentional interior holes: a cell inside the mask with low particle density should render as weak wash or paper, not as a filled metaball.

Performance guardrails:

- Start with all-particle splatting on dirty redraws; optimize only if slow.
- Limit splat kernel to a small radius in field cells.
- Keep particles in arrays grouped by pool for candidate filtering by pool bounds/dirty rect.
- Rebuild/splat full density on quality tier changes and resize.

## Rake behavior

Reuse the existing toolbar `rake` mode, Shift-drag, and two-finger drag triggers, but make strokes move particles instead of displacing field sample coordinates.

Stroke behavior:

- Resample the pointer path every `RAKE_STEP` pixels.
- Build 4 parallel comb tines using current `RAKE_TOOTH_COUNT` and `RAKE_TOOTH_SPACING` constants.
- For each tine segment, find particles within `RAKE_RADIUS`.
- Move affected particles along the stroke direction with distance falloff.
- Add slight tangent jitter/noise so dragged pigment forms handmade strands rather than perfect lanes.
- Optionally add a small perpendicular separation force so particles split around each tine.
- Apply damping after each stroke update; no continuous simulation loop is required once input stops.

Finite-material rules:

- Raking conserves particle count and mass.
- Bunching occurs naturally when multiple particles are moved into the same cells, increasing density/saturation.
- Spreading occurs when particles are pulled apart, lowering density and revealing wash/paper between strands.
- Do not create new pigment during rake strokes.

Boundary rules:

- Clamp or project particles back inside their source pool mask after movement.
- Use a soft border pin: particles near the exterior threshold move less than deep interior particles.
- If a particle is dragged outside the mask, try a few backtracking steps toward its previous position; if still outside, keep the previous position.
- Neighbor seams should resist cross-pool mixing initially. A later experiment can allow tiny cross-boundary drift, but the first version should keep `poolId` ownership stable.

Implementation slice:

1. Copy `prototypes/marbling-metaball-pools/` to `prototypes/marbling-density-particles/`.
2. Update README/title/hints to identify the particle density variant.
3. Add particle arrays and bake-on-settle seeding.
4. Add density-field splat rendering for baked pools while retaining metaball rendering for active previews/unbaked pools.
5. Replace current rake displacement/cut/paint-buffer behavior with particle movement.
6. Add full rebuild behavior for reset, resize, palette changes, and quality changes.
7. Tune particle count, splat radius, density-to-color mapping, and border pinning.

## Verification steps

Manual smoke test from the variant folder:

```bash
cd prototypes/marbling-density-particles
python3 -m http.server 8123
```

Open `http://localhost:8123` and verify:

- Page loads without console errors.
- Tap creates small splatter pools; hold creates larger organic pools.
- Settled pools seed visible finite pigment density rather than flat filled interiors.
- Rake mode, Shift-drag, and two-finger drag move pigment particles.
- Raking creates darker bunched regions and lighter spread/thinned regions.
- Repeated rakes can break interiors into strands/holes while the outer silhouette remains recognizable.
- Adjacent colors remain readable and do not collapse into one global muddy field.
- New drops can be added after raking existing pigment.
- Reset clears particles, fields, pools, and rake state.
- Resize and adaptive quality changes rebuild density without disappearing/corrupting pigment.
- A 10-20 pool composition remains responsive enough on desktop; low/medium quality remains acceptable on touch/mobile.

Optional instrumentation while tuning:

- Log particle count, field cells splatted, dirty rect area, and render ms under `DEBUG_PERF`.
- Temporarily draw particle points to confirm raking moves finite material as expected.

## Commit instructions for implementation

For the later implementation commit, keep the prototype isolated:

- Only add/edit files under `prototypes/marbling-density-particles/` unless documentation updates are explicitly needed.
- Do not modify the Next.js app.
- Preserve `prototypes/marbling-metaball-pools/` as the baseline comparison.
- Run `git status --short` before committing and stage only the intended files.
- Commit with author `Griffin <griffinhale.3@gmail.com>`.
- Suggested implementation commit message: `feat: prototype particle density marbling rake`.

This planning-only commit should stage and commit only:

```text
docs/prototype-plans/density-particles.md
```

with message:

```text
docs: plan particle density marbling prototype
```
