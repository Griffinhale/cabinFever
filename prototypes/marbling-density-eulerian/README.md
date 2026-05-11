# Eulerian Finite-Density Marbling Prototype

## Purpose

This standalone p5/HTML prototype implements prototype A from `docs/prototype-plans/density-eulerian.md`: metaball drops initialize an Eulerian finite-pigment density grid, then rake/combing edits that grid by subtracting density from tooth paths and depositing the same pigment downstream and sideways.

The intended visual difference from `marbling-metaball-pools` is conservation of pigment amount. Raking produces pale stretched/troughed regions where density was removed and darker, more saturated ridges where density bunches, while metaball-stamped masks and pinned border/seam cells keep the outside silhouettes organic.

This prototype is intentionally isolated from the app. It is one static page with p5.js loaded from a CDN and no build step.

## Run

From this prototype folder:

```bash
cd /workspace/projects/Griffinhale_git/worktrees/cabinFever-marbling-density-eulerian/prototypes/marbling-density-eulerian
python3 -m http.server 8123
```

Open:

```text
http://localhost:8123
```

## Controls

- Quick tap/click: splatter several small same-color metaball droplets near the pointer.
- Hold: stamp one larger finite-density pigment pool at the pointer.
- Top toolbar:
  - `drop`: hold/tap to place pigment.
  - `rake`: drag to comb density; teeth remove pigment from the path and deposit it downstream/sideways.
  - `palette`: cycle palette for future pools.
  - `reset`: clear the sketch.
- `P`: cycle palette.
- Shift-drag with mouse: rake without switching toolbar mode.
- Two-finger drag on touch: rake without switching toolbar mode.
- `R` or `Escape`: reset.
- Touch/mobile fallback: tap top-left corner to cycle palette; hold top-right corner for about 750 ms to reset.

## Architecture

Each finalized drop creates a `PigmentPool` with several child metaball lobes. Unlike the base prototype, those lobes are not used as the persistent renderer after stamping. Instead, their organic field is baked into parallel field-grid arrays:

- `densityGrid`: finite pigment mass per cell.
- `ownerGrid`: dominant pigment id for each cell.
- `maskGrid`: editable pigment occupancy from the metaball stamp.
- `borderPinGrid`: protection near outer thresholds and color seams.
- packed color-channel arrays for base, rim, and wash colors.

Density controls appearance:

- Low density: lower alpha and lighter wash color, so paper shows through.
- Normal density: readable base pigment.
- High density: darker, more saturated, rim-biased bunching.
- Neighbor seams and paper edges draw darker accents from `borderPinGrid` and owner-neighbor checks.

## Eulerian rake behavior

Raking builds a smoothed multi-tooth comb from the pointer stroke. For every affected source cell, the sketch computes a falloff-weighted removable mass reduced by border pinning, subtracts that mass, and deposits it into three targets: one downstream and two slightly sideways. If all targets are blocked by mask/pinning, mass is returned to the source cell.

This is deliberately visible rather than physically exact: repeated strokes can pull interiors into pale channels, saturated ridges, strands, and islands, while protected border cells resist change enough to preserve the metaball outline.

`DEBUG_MASS` in `index.html` can be set to `true` to log total density and max density during raking.

## What to evaluate

- Quick taps and long holds create obvious finite-density pools.
- Raking through pigment leaves pale troughs and darker bunched deposits.
- Repeated raking breaks interiors into strands/islands without immediately destroying the outer silhouette.
- Pigment seams remain readable when neighboring colors are combed.
- Reset, palette, resize, desktop mouse, Shift-rake, toolbar rake, and touch/two-finger rake remain usable.

## Known limitations

- Drop growth is stamped at release instead of continuously animating to settlement; the focus here is density-grid rake behavior.
- Owner/color mixing is dominant-color based, not spectral/paint mixing.
- The density grid is low-resolution (adaptive 4/6/8 px cells), so very close inspection can reveal cells.
- The mass transfer clamps high-density cells and returns overflow to the source, so extreme repeated rakes are conservative but stylized rather than physically rigorous.
