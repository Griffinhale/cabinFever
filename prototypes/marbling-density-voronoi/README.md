# Marbling Density Voronoi Prototype

## Purpose

Prototype E tests a finite-pigment marbling model: colored material is stored as many seed points with mass inside soft organic metaball-style pool boundaries. Rendering reconstructs interior color from nearest/local seeds instead of filling the whole pool uniformly.

The intended visual difference from the metaball-pools prototype is obvious finite density:

- dense seed clusters become saturated veins, knots, and ridges;
- sparse areas fade to pale wash or exposed paper gaps;
- rake gestures move seed material directly, preserving mass while changing density;
- outer pool borders remain soft and organic rather than turning into hard Voronoi hulls.

This prototype is standalone p5.js in a single HTML file, isolated from the Next.js app.

## Run

From this prototype folder:

```bash
cd /workspace/projects/Griffinhale_git/worktrees/cabinFever-marbling-density-voronoi/prototypes/marbling-density-voronoi
python3 -m http.server 8123
```

Open:

```text
http://localhost:8123
```

The page can also be opened directly as `index.html`.

## Controls

- Quick tap/click: splatter several small finite-material pools.
- Hold: place one larger pool; longer holds create more total seed mass.
- Toolbar:
  - `drop`: tap/hold to add pigment.
  - `rake`: drag to comb the material seeds.
  - `palette`: cycle palette for future drops.
  - `reset`: clear the sketch.
- `P`: cycle palette.
- `R` or `Escape`: reset.
- Shift-drag with mouse: rake without switching tools.
- Two-finger drag on touch: rake without switching tools.
- Touch/mobile fallback: tap top-left to cycle palette, hold top-right to reset.

## Architecture

The sketch keeps the base cream paper surface, toolbar pattern, palettes, tap/hold mapping, and organic pool boundary approach from `marbling-metaball-pools`.

Core state:

- `pools[]`: organic bounded regions with metaball-ish lobes, target/current mass, cached bounds, and palette colors.
- `seeds[]`: finite material points with `poolId`, position, previous position, mass, influence radius, RGB identity, and stable jitter phase.
- `seedHash`: spatial hash for local seed lookup and rake candidates.
- low-resolution `field[]`: cached per-cell pool ownership and seed reconstruction data.
- cached `paperLayer` and `pigmentLayer`.

When a pool is created, total pigment mass is split into roughly 70-260 seeds. Seeds are rejection-sampled inside the source pool boundary with a center-biased distribution and mild mass variation. Seed mass is preserved after creation.

## Rendering model

For each low-resolution grid cell:

1. Evaluate organic pool fields and choose one pool owner using strongest-field ownership with newer-pool tie bias.
2. Clip rendering to the winning pool's soft metaball boundary.
3. Query nearby seeds from that pool in the spatial hash.
4. Use weighted nearest-seed ownership for the main color identity.
5. Use summed local seed influence as finite-density saturation/alpha.
6. Fade sparse cells toward wash/paper, and darken dense cells into veins.
7. Add threshold rims, owner-neighbor rims, and small nearest-seed seam accents.

The boundary remains an organic pool field; the interior pigment is reconstructed from finite seed material.

## Rake model

Raking directly moves seeds instead of writing a raster displacement field. Each stroke segment is resampled into multiple comb teeth perpendicular to the stroke direction. Seeds near a tooth are moved along the stroke tangent with distance falloff, slight drag lag, and perpendicular jitter. Moved seeds are softly projected back inside their source pool boundary.

Expected effect:

- swept-together seeds create saturated ridges and colored threads;
- swept-apart seeds leave pale troughs and paper gaps;
- repeated combing shows finite pigment depletion/bunching;
- neighboring colors remain readable because seeds keep their pool/color identity.

## Performance notes

- Adaptive 4/6/8 px field tiers are retained.
- Spatial hash buckets reduce nearby seed queries and rake candidate scans.
- Dirty rects redraw local pool/rake regions when possible, falling back to full redraw for large coverage.
- Settled scenes reuse the cached pigment layer until new input, resize, palette change, or reset.

## What to evaluate

- Does the result clearly differ from a uniformly filled metaball pool?
- Do quick taps and long holds show finite material amount?
- Does raking visibly move pigment density into veins while opening pale gaps?
- Do soft organic boundaries remain stable after seed motion?
- Can a 10-20 pool scene remain interactive at the default quality tier?

## Known limitations

- This is a visual prototype, not a full fluid simulation.
- Pool boundaries do not deform from seed density; they remain implicit masks.
- Projection keeps seeds inside their source pool, so intentional pigment escaping is not modeled.
- Low-resolution cells can show pixel/block artifacts at lower quality tiers.
- Very crowded scenes can still become visually busy depending on palette and rake usage.
