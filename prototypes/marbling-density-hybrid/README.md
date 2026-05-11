# Prototype C: Hybrid Density Marbling

## Purpose

This standalone p5/HTML prototype keeps the successful metaball ownership and rim/seam renderer from `marbling-metaball-pools`, then adds a conservative persistent density overlay. The goal is to make raking read less like hard paint/cut overrides and more like finite pigment redistribution: combed lanes become pale and stretched, while neighboring pushed material becomes darker and more saturated.

The prototype remains intentionally isolated from the Next.js app. It is one static page with p5.js loaded from a CDN and no build step.

## Run

From this prototype folder:

```bash
cd /workspace/projects/Griffinhale_git/worktrees/cabinFever-marbling-density-fluid/prototypes/marbling-density-hybrid
python3 -m http.server 8123
```

Open:

```text
http://localhost:8123
```

## Controls

- Quick tap/click: splatter several small same-color metaball droplets.
- Hold: grow one larger pigment pool at the pointer; release finalizes it and it grows until settled.
- Top toolbar:
  - `drop`: hold/tap to place pigment.
  - `rake`: drag to comb the density overlay inside existing metaball territories.
  - `palette`: cycle palette for future pools.
  - `reset`: clear the sketch.
- `P`: cycle palette for future pools.
- Shift-drag with mouse: temporary rake shortcut.
- Two-finger drag on touch: temporary rake shortcut.
- `R` or `Escape`: reset.
- Touch/mobile fallback: tap top-left corner to cycle palette; hold top-right corner for about 750 ms to reset.

## What changed from the base metaball prototype

The base prototype used persistent raster rake buffers (`rakeDx`, `rakeDy`, cut masks, and dragged-color paint overrides) to deform or hard override the field solve. Prototype C removes that hard override path for this variant.

The metaball solver still decides:

1. Whether a cell belongs to pigment or paper.
2. Which pigment pool owns the cell.
3. Where organic outer rims and inter-color seams appear.

A parallel density overlay now stores:

- `density[]`: pigment amount / visual saturation carrier per field cell.
- `densityVelX[]` and `densityVelY[]`: short-lived rake velocity.
- `densityOwnerId[]`: persistent pool identity for preserving combed material across redraws.
- `densityPinned[]`: high near rims/seams so boundaries stay stable.

Rendering uses density to shift each cell between pale wash, normal pigment, and saturated bunching. Low density lowers alpha and mixes toward the wash color; high density darkens toward base/rim tones. Rims and seams are still drawn from the metaball boundary result so the familiar organic silhouettes remain readable.

## Raking behavior

Raking builds a five-tooth comb along the pointer path. Each tooth:

1. Finds existing owner cells near the tine.
2. Reduces density in the tine lane to create pale stretched regions.
3. Deposits part of that material forward/sideways into cells with the same owner to create saturated bunches.
4. Injects damped velocity into the density overlay and runs a small semi-Lagrangian-style local advection pass.
5. Strongly damps/restores pinned rim and seam cells so boundaries do not collapse.

Pigment does not freely bleed across owner seams in this first slice. New drops can be added after raking; their new owner cells initialize to normal density without clearing existing combed density elsewhere.

## What to evaluate

- Are pale stretched lanes and saturated bunched ridges obvious after raking?
- Do outer silhouettes and inter-color seams remain close to the base metaball look?
- Does the variant feel more materially finite than the previous hard cut/paint rake?
- Can new drops be added after raking without wiping combed state?
- Do reset, palette cycling, Shift-drag rake, and two-finger rake remain usable?

## Known limitations

- This is still a conservative raster overlay, not a physically conservative fluid solver.
- Density redistribution is local and approximate; mass is visually finite but not perfectly conserved.
- The density grid uses the same adaptive field resolution, so very low quality tiers can show blockier streaks.
- Boundaries are preserved by pinning/restoration rather than true pressure or collision constraints.
