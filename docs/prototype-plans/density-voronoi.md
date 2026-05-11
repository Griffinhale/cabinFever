# Prototype E: Voronoi / Material-Seed Finite Pigment Marbling Plan

Branch: `proto/marbling-density-voronoi`
Prototype folder to create later: `prototypes/marbling-density-voronoi/`
Base prototype: `prototypes/marbling-metaball-pools/`
Status: planning only; do not implement in this commit.

## Concept

Build a standalone p5/HTML variant where pigment is represented by many colored material seeds with finite mass inside the existing organic metaball-style bounded pools. Rendering reconstructs local color from nearest seeds / local Voronoi ownership rather than treating color as an infinite continuous fill. Raking moves the seeds, so pigment bunching makes saturated veins and pigment spreading makes pale washes or exposed paper while the outer pool boundary remains soft and organic.

This prototype should answer whether finite material points can make combing feel more physical: the boundary can stay metaball-like, but the interior color should break apart, streak, clump, thin, and show gaps as if there is a limited amount of pigment.

## Data model

Create the implementation as a self-contained static page copied from the base prototype structure:

- `prototypes/marbling-density-voronoi/index.html`
- `prototypes/marbling-density-voronoi/README.md`

Keep all prototype logic in the HTML unless it becomes too large.

Core state:

- `pools[]`: organic bounded regions, derived from the metaball-pools prototype.
- `seeds[]`: finite material points used for interior pigment reconstruction.
- `rakeStrokes[]` or direct seed displacement state for persistent comb deformation.
- cached low-resolution render grid / pigment layer.
- stable paper grain layer.

Pool fields:

- `id`
- center, lobe offsets, target/current mass, bounds, settled flag
- boundary field parameters and organic edge noise seed
- base pigment palette entry
- seed id range or array of child seed indexes

Seed fields:

- `id`
- `poolId`
- `x`, `y`
- `prevX`, `prevY` for rake velocity / optional streak rendering
- `color` or palette index
- finite `mass` / strength
- local radius of influence derived from mass
- jitter/noise phase for non-grid placement
- optional `lockedInside` / `escaped` flag for boundary handling

Seed creation:

- On tap/hold finalization, derive a finite total pigment mass from hold duration.
- Split that mass into many seeds, e.g. 80-260 per pool depending on target area and quality tier.
- Scatter seeds inside the pool boundary using rejection sampling against the pool field, with denser placement near the press center and slight edge falloff.
- Each seed receives `mass = totalMass / seedCount` with mild random variation; total seed mass per pool should remain conserved.

## Rendering behavior

Render with the same cream paper/water surface and organic outer boundaries as the base prototype, but replace flat interior ownership with seed reconstruction.

Recommended first pass:

1. Draw paper grain once into a cached layer.
2. For each low-resolution grid cell, evaluate the organic pool field to decide whether it is inside any pool boundary.
3. If outside every pool, render paper.
4. If inside a pool, query nearby seeds from that pool or nearby visible pools using a simple spatial hash.
5. Use nearest-seed or weighted k-nearest reconstruction:
   - nearest seed determines the main Voronoi-like color ownership;
   - local density from k nearest same-color seeds controls alpha/saturation;
   - sparse cells fade toward paper/transparent wash;
   - clustered cells become darker, more saturated veins.
6. Add boundary rims from the pool field threshold and seam accents where the nearest seed owner changes abruptly.
7. Apply stable noise and slight color variation per seed/cell to avoid hard computer-generated tessellation.

Important visual rules:

- Finite mass matters: moving seeds apart must reduce saturation instead of stretching a fully saturated color sheet.
- Dense seed clusters should read as pigment veins, knots, and combed ridges.
- Empty or under-seeded interiors should become pale wash or paper gaps.
- Organic pool borders are still governed by the outer pool field, not by the convex hull of seeds.
- Neighboring colors should not collapse into one global blend; use seed ownership and pool clipping to keep pigment identities readable.

Performance plan:

- Use a low-resolution field grid similar to the base prototype's adaptive quality tiers.
- Use a spatial hash keyed by grid buckets to query nearby seeds cheaply.
- Limit k-nearest to a small number, e.g. 3-8 seeds.
- Rebuild the hash only after seed motion, new drops, resize, or reset.
- Redraw dirty regions around moved seeds and active rake strokes when practical; fall back to full redraw for simplicity if needed in the first pass.

## Rake behavior

Raking should directly move finite material seeds rather than only writing raster displacement.

Gesture behavior:

- Keep the base prototype toolbar pattern: `drop`, `rake`, `palette`, `reset`.
- Shift-drag and two-finger drag may remain shortcuts for rake.
- A rake stroke is resampled into evenly spaced points with several comb teeth perpendicular to the stroke direction.

Seed displacement behavior:

- For each stroke segment/tooth, find seeds within a tooth radius.
- Move affected seeds along the stroke tangent, with falloff by distance to the tooth centerline.
- Add slight perpendicular jitter and drag lag so trails look hand-combed instead of perfectly parallel.
- Clamp or softly project moved seeds back inside their source pool boundary unless intentionally testing pigment escaping.
- Preserve each seed's mass; only position changes.
- Optional: if a tooth starts on paper, it can push seeds away to open pale channels; if it starts on pigment, it can pull/carry seeds forward to create colored threads.

Expected effect:

- Seeds swept together create high-density saturated ridges.
- Seeds swept apart create pale troughs.
- Repeated combing produces visible finite-pigment depletion and bunching.
- Pool borders remain soft and organic even when the interior material is torn into strands.

## Verification steps

Before committing the implementation later, verify:

1. `prototypes/marbling-density-voronoi/index.html` opens directly and via `python3 -m http.server`.
2. Quick tap creates a visible finite pigment drop.
3. Long hold creates more total material than a tap without becoming a uniformly flat blob.
4. Raking visibly moves material seeds: saturation increases where seeds bunch and fades where they spread.
5. Repeated rakes can create veins, threads, pale troughs, and paper gaps inside one bounded pool.
6. Organic outer boundaries remain stable and do not turn into rigid Voronoi polygons.
7. Neighboring colors remain readable and do not average into muddy global blends.
8. Reset, palette cycling, resize, mouse, and touch controls still work.
9. A 10-20 pool scene remains interactive on desktop at the default quality tier.
10. The final scene becomes static when there is no active growth or rake motion.

Plan-only verification for this commit:

- Confirm only `docs/prototype-plans/density-voronoi.md` is staged.
- Confirm no prototype implementation files are created in this commit.

## Commit instructions

For this planning commit only:

```bash
git status --short
git add docs/prototype-plans/density-voronoi.md
git -c user.name="Griffin" -c user.email="griffinhale.3@gmail.com" commit -m "docs: plan voronoi density marbling prototype"
```

Do not stage or commit any implementation files. The implementation should happen in a later commit and create the standalone variant directory `prototypes/marbling-density-voronoi/`.
