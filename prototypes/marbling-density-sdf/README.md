# SDF Stripe Density Marbling Prototype

## Purpose

Prototype F tests a finite-density marbling model where organic boundaries come from the same metaball/SDF field as the base prototype, but interior color is no longer a flat owner color or rake paint override. Each occupied field cell stores material coordinates (`u`, `v`) and a finite stripe density. Raking/combing warps those coordinates and changes local density, so tight bands become saturated dark veins and stretched bands fade into pale washes while the outer contour remains a soft SDF mask.

This prototype is intentionally isolated from the Next.js app. It is one static page with p5.js loaded from a CDN and no build step.

## Run

From this prototype folder:

```bash
cd /workspace/projects/Griffinhale_git/worktrees/cabinFever-marbling-density-sdf/prototypes/marbling-density-sdf
python3 -m http.server 8123
```

Open:

```text
http://localhost:8123
```

## Controls

- Quick tap/click: splatter several small same-color metaball droplets.
- Hold: grow one larger pigment pool at the pointer; release finalizes it and it keeps growing slowly until settled.
- Top toolbar:
  - `drop`: hold/tap to place pigment.
  - `rake`: drag directly to comb material-coordinate stripes.
  - `palette`: cycle palette for future pools.
  - `reset`: clear the sketch.
- `P`: cycle palette for future pools.
- Shift-drag with mouse: rake without switching toolbar mode.
- Two-finger drag on touch: rake without switching toolbar mode.
- `R` or `Escape`: reset.
- Touch/mobile fallback: tap top-left corner to cycle palette; hold top-right corner for about 750 ms to reset.

The bottom hint names the variant and calls out that the SDF border stays masked while the rake warps finite bands.

## Architecture

The base `PigmentPool` metaball model is preserved: each user-created pigment has a center, mass, several child lobes, a curated palette color, stable seed, growth animation, cached field bounds, and a settled flag. Same-pool lobes sum into one organic implicit field. Different pigment identities are still clipped by strongest owner/newer tie semantics.

This variant adds a parallel field-resolution `materialGrid`. For each visible cell it stores:

- source `poolId` and render owner
- SDF-ish `sdf`, soft `mask`, and protected `border`/seam amount
- material coordinates `u` and `v`
- finite pigment `density`
- per-pool stripe phase/scale/seed and RGB palette data

The boundary source and color source are deliberately separate:

1. The renderer evaluates the same-pool metaball field and chooses the winning owner.
2. Field strength becomes a soft SDF mask and border/seam signal.
3. New owner cells initialize material coordinates from world-space position projected onto a per-pool stripe axis with stable low-frequency noise.
4. Color is computed from periodic stripes in `u` multiplied by finite local density.
5. Rim/seam darkening comes from `border`, not from stripe density, so repeated combing does not erase the contour.

## Rake / density behavior

Raking no longer cuts the field, displaces ownership sampling, or paints carried color. It only edits material cells already inside the SDF mask:

- Multiple comb tines are built from the same toolbar/Shift/touch rake interaction as the base prototype.
- Cells near a tine get a falloff-weighted change to `u` and `v`.
- Border and seam cells are pinned, reducing comb force near organic contours.
- Local compression increases finite density; stretched/off-center areas lose density.
- Density is clamped to keep the effect bounded and readable.

Expected visual result: classic marbled bands bunch into darker saturated veins along repeated comb paths, stretched lanes become lighter and show more paper, and the pool silhouette remains organic because the SDF mask is not cut by the rake.

## Performance notes

The adaptive field tiers from the base prototype are retained: high uses 4 px cells, medium 6 px cells, and low 8 px cells. Rendering still uses a stable cream paper layer plus an offscreen pigment layer. Dirty-region redraws are retained for drops/growth/rake edits; large dirty coverage falls back to a full redraw.

Quality-tier changes resample the material grid nearest-neighbor so combed bands usually survive adaptive tiering. Browser resize rebuilds surfaces and field buffers; material is reinitialized as cells are evaluated.

## What to evaluate

- Do settled pools clearly show finite striped pigment rather than flat owner color?
- Does raking repeatedly through a pool produce saturated bunched veins and pale stretched lanes?
- Does a paper-start rake avoid cutting the SDF boundary open?
- Do outer rims and pigment-pigment seams remain readable after combing?
- Can new drops be added after raking and receive their own stripe material?
- Does the adaptive 4/6/8 px grid remain usable for a 10-20 pool composition?

## Known limitations

- Density conservation is approximate and local; there is no global per-pool renormalization pass yet.
- Material-grid resampling during quality changes is nearest-neighbor.
- New pools still use strongest-owner/newer-tie clipping rather than physically pushing older material outward.
- The SDF is field-margin based rather than a true Euclidean signed distance transform.
- At low quality, thin stripes can look blockier because material is evaluated per field cell.
