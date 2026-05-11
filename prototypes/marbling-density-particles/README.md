# Particle Splat Density Marbling Prototype

## Purpose

This standalone p5/HTML prototype tests a finite-pigment marbling variant. Metaball pools still create organic drop silhouettes and readable pigment territories, but each settled pool bakes into a finite cloud of pigment particles. The renderer splats those particles into a density field: dense clusters become richer saturated veins, while sparse regions fade to light wash or paper.

This prototype is intentionally isolated from the Next.js app. It is one static page with p5.js loaded from a CDN and no build step.

## Run

From this prototype folder:

```bash
cd prototypes/marbling-density-particles
python3 -m http.server 8123
```

Open:

```text
http://localhost:8123
```

## Controls

- Quick tap/click: splatter several small same-color droplets.
- Hold: grow one larger pigment pool at the pointer; release finalizes it and it settles into finite particles.
- Top toolbar:
  - `drop`: hold/tap to place pigment.
  - `rake`: drag to comb finite pigment particles.
  - `palette`: cycle palette for future pools.
  - `reset`: clear pools, particles, density field, and rake state.
- `P`: cycle palette for future pools.
- Shift-drag with mouse: rake without switching toolbar mode.
- Two-finger drag on touch: rake without switching toolbar mode.
- `R` or `Escape`: reset.
- Touch/mobile fallback: tap top-left corner to cycle palette; hold top-right corner for about 750 ms to reset.

The visible hint names the variant and reminds testers that dense clusters saturate while sparse areas fade.

## Architecture

The prototype starts from the metaball-pools sketch, preserving:

- standalone p5.js HTML
- drop/tap/hold interaction
- toolbar rake/palette/reset controls
- curated palettes
- paper grain layer
- adaptive 4/6/8 px field quality
- metaball growth and organic exterior boundaries
- owner clipping so adjacent pigment colors stay readable

The new material model adds:

- `pigmentParticles`: all finite pigment particles
- `particlesByPoolId`: grouped particles for each settled pool
- particle records with pool id, pigment index, position, velocity, mass, splat radius, age, and stable seed
- density field cells that track owner, density, strength, owner margin, and particle count

When a `PigmentPool` settles, rejection sampling seeds particles inside the pool's threshold mask. Particle count scales with target mass and lobe count, with small splatters receiving fewer particles and larger holds receiving more. Particle mass is divided across the seeded particles so raking conserves material.

## Rendering model

Growing pools and hold previews are still evaluated as metaballs so drop feedback remains immediate.

Settled pools render from particle density:

1. Clear the dirty field cells.
2. Evaluate only active/unbaked pools with the original metaball solver.
3. Splat each baked particle into nearby field cells with a compact quadratic kernel.
4. Track the strongest owner density and runner-up margin per cell.
5. Convert density to color:
   - low density: low alpha, light wash, paper shows through
   - medium density: normal pigment body
   - high density: darker, more saturated clustered veins
6. Preserve a thin metaball rim for baked pools so the exterior silhouette remains organic even when interiors thin or break apart.

## Rake behavior

Rake mode, Shift-drag, and two-finger drag now move particles rather than writing raster coordinate offsets. The stroke is resampled and applied through four comb teeth. Particles near each tine are pulled along the stroke with distance falloff, slight tangent jitter, and a small perpendicular separation force.

Boundary behavior is intentionally conservative: each particle keeps its source pool id, movement is softened near the exterior threshold, and attempted moves outside the original pool mask are backtracked or pinned. This keeps adjacent colors readable while making the visual difference obvious: repeated rakes bunch particles into saturated strands and thin other areas into faded wash or holes.

## What to evaluate

- Page loads without console errors.
- Taps create visible small splatter pools.
- Holds create larger organic pools.
- Settled pools show finite density variation rather than flat filled interiors.
- Rake mode, Shift-drag, and two-finger drag move pigment into strands.
- Raking creates darker bunched regions and lighter sparse regions.
- The outer silhouette remains recognizable because the original threshold rim is retained.
- Adjacent colors remain readable.
- New drops can be added after raking existing pigment.
- Reset clears pools, particles, fields, and rake state.
- Resize and adaptive quality changes rebuild density without losing pigment.

## Known limitations

- The pool boundary is still an implicit mask, not a physically displaced fluid interface.
- Particles are clipped to their source pool and do not cross-mix between pigments.
- Dirty redraws are conservative and may redraw more cells than strictly necessary.
- Very crowded compositions can still become visually busy.
- The HTTP smoke test verifies loading, not full human visual inspection.
