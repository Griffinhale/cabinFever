# Prototype D: Fluid Density Marbling

## Purpose

This standalone p5/HTML prototype explores a stable-fluid-inspired finite pigment density model for the marbling toy. It keeps the metaball pool drop/growth frontend from `marbling-metaball-pools`, then bakes visible pigment into a clipped density-and-velocity grid. Raking injects velocity into that grid and semi-Lagrangian-style advection moves density inside each pigment territory.

The intended visual difference is obvious finite material behavior:

- bunched/compressed pigment becomes darker and more saturated;
- stretched pigment becomes paler, revealing more paper;
- repeated rake passes break interiors into soft strands and low-density lanes;
- pinned metaball rims and owner seams preserve organic silhouettes instead of letting borders collapse.

This prototype is intentionally isolated from the Next.js app. It is one static page with p5.js loaded from a CDN and no build step.

## Run

From this prototype folder:

```bash
cd /workspace/projects/Griffinhale_git/worktrees/cabinFever-marbling-density-fluid/prototypes/marbling-density-fluid
python3 -m http.server 8123
```

Open:

```text
http://localhost:8123
```

## Controls

- Quick tap/click: splatter several small same-color droplets.
- Hold: grow one larger pigment pool; release finalizes it and it keeps growing until settled.
- Top toolbar:
  - `drop`: hold/tap to place finite pigment density.
  - `rake`: drag to inject velocity and advect density.
  - `palette`: cycle palette for future pools.
  - `reset`: clear the sketch.
- `P`: cycle palette.
- Shift-drag with mouse: rake without switching toolbar mode.
- Two-finger drag on touch: rake without switching toolbar mode.
- `R` or `Escape`: reset.
- Touch/mobile fallback: tap top-left corner to cycle palette; hold top-right corner for about 750 ms to reset.

## Architecture

The sketch retains the base `PigmentPool` metaball/lobe model, adaptive 4/6/8 px field quality, curated palettes, paper grain layer, and strongest-owner clipping. The main difference is the persistent fluid substrate parallel to the field grid:

- `fluidOwners`: owning pigment pool id, or `-1` for paper.
- `fluidMask`: clipped visible owner mask.
- `fluidBorderPin`: protected rim/seam weight.
- `fluidDensity`: finite pigment density/saturation carrier.
- `fluidVx` / `fluidVy`: velocity injected by the rake.
- scratch buffers for density/velocity advection.

Each field render evaluates the metaball owner proposal, then syncs newly visible cells into the fluid grid without erasing existing raked density for matching owners. New drops can therefore bake into the grid after earlier material has been combed.

## Rake / fluid behavior

Rake mode no longer writes paint overrides or coordinate displacement buffers. A smoothed 6-tooth comb samples each pointer segment and adds velocity along the stroke direction, plus a small stable normal jitter. Border and seam cells scale the injected velocity down.

For each rake segment the prototype runs a small number of fluid steps:

1. Clamp/reduce velocity when it would leave the owner mask.
2. Semi-Lagrangian advect velocity.
3. Semi-Lagrangian advect density, sampling only same-owner cells.
4. Apply velocity damping and border density restoration.

The density step includes a simple divergence-based compression term so converging flow makes density visibly saturate while stretching/interpolation creates paler lanes. No new density is painted during raking; new density only enters when new drops are baked from the metaball field.

## Rendering model

Render order:

1. Stable cream paper and grain.
2. Baked fluid density cells.
3. Density-driven color: wash/paper for low density, base for normal density, rim-leaning saturation for high density.
4. Pinned rim/seam accents blended back toward the original metaball contour look.
5. Active hold preview and minimal UI hints.

Low-density cells may render as soft gaps using stable noise so stretched material reads as strands rather than a uniform square smear.

## What to evaluate

- Does a raked large pool form darker bunched streaks and paler stretched lanes?
- Do repeated rake passes break interiors into strand-like density while preserving outside silhouettes?
- Do neighboring colors stay clipped instead of freely bleeding across seams?
- Can new drops be added after raking without wiping earlier combed density?
- Do reset, palette cycling, Shift-drag rake, two-finger rake, and resize remain usable?
- Does performance remain acceptable at adaptive 4/6/8 px grid sizes?

## Known limitations

- This is not a full incompressible Navier-Stokes solver; it is a lightweight stable-fluid-inspired visual substrate.
- Density conservation is approximate. Semi-Lagrangian interpolation and the explicit compression term are tuned for visible marbling payoff rather than physical accuracy.
- Velocity projection is simplified to owner-mask clamping/damping, so very aggressive strokes can still look raster-like at low quality.
- Boundaries are pinned to preserve silhouettes; interiors are much more fluid than edges by design.
- Very crowded scenes may still become visually busy or muddy depending on palette choices.
