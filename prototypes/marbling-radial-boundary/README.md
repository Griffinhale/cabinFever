# Marbling Radial Boundary Growth Prototype

## Purpose

This standalone p5.js prototype tests sampled radial-ray boundary growth as the baseline/control architecture for the cabinFever marbling exploration.

The question it is meant to answer is narrow: can many independently growing radial samples produce a calm, bounded, organic pigment interaction that is good enough to compare against raster, shader, metaball, particle, and boundary-relaxation prototypes?

## Round-two feedback pass

Radial boundary was one of the strongest round-one results, so this pass preserves the sampled radial architecture instead of replacing it. The polish focuses on calmer circular expansion, smoother rims, softer neighbor seams, low-cost pigment texture, and touch-accessible controls.

Round-two changes:

- narrower per-ray growth variation and ease-out near the target radius for more meditative blooms
- render-only contour smoothing and reduced early-growth jitter so small taps read as clean circles
- subtler rim styling, translucent wet-edge halo, and layered inner washes
- sparse deterministic flecks per drop for a particle-inspired pigment/granule texture without particle simulation
- slightly tighter collision margin plus visual halo coverage to soften tiny neighbor gaps
- top-right touch hit zones for palette and reset, matching the existing P/R keyboard controls

## Architecture / model

The sketch is a single static `index.html` that loads p5.js 1.11.3 from a CDN. There is no npm install, build step, or Next.js integration.

Each pigment drop stores:

- center point from the pointer press
- target radius derived from hold duration through an area/mass mapping
- 192 angular ray samples
- current radius per ray
- permanent blocked flag per ray
- stable noise/jitter seed
- curated fill, wash, and rim colors
- a small fixed set of static flecks used only as render texture

On each update while growth is active:

1. Every unblocked ray proposes a small outward step.
2. The proposed radius is capped by the drop target radius.
3. The proposed point is rejected if it exits the canvas.
4. The proposed point is rejected if it falls inside another drop's current sampled radial boundary plus a small margin.
5. Accepted rays advance; rejected rays become permanently blocked to avoid seam jitter.
6. When no rays can grow, the drop settles.

Rendering uses stable visual-only boundary modulation, render-only contour smoothing, translucent pigment fills, darker rims, inner washes, sparse flecks, and a subtle paper/water grain layer. The noise and flecks are not animated after settlement.

## Controls

- Press / tap: begin adding pigment at the pointer
- Hold: increase paint amount and target footprint
- Release: create the growing drop
- P: cycle palette for future drops only; settled drops and the existing surface stay visually stable
- R: reset all drops and rebuild the paper surface for the active palette
- Escape: reset
- Top-right P zone: touch-accessible palette cycling
- Top-right R zone: touch-accessible reset

Touch input uses p5 touch handlers and returns `false` to suppress page scrolling/zooming in the standalone demo. The tiny top-right hit zones are intentionally unobtrusive and avoid adding a control panel.

## Run

```bash
cd /workspace/projects/Griffinhale_git/worktrees/cabinFever-marbling-radial/prototypes/marbling-radial-boundary
python3 -m http.server 8123
```

Open `http://localhost:8123`.

You can also open `index.html` directly in a browser, but a local static server is preferred for consistent browser behavior.

## What to evaluate

Use the shared comparison protocol with quick taps, long holds, edge placement, neighboring drops, and a 10-20 drop composition.

Key evaluation priorities for this radial model:

- Does quick tap create a minimum visible drop that stays clean and circular?
- Does holding clearly create a larger eventual footprint with calm circular bloom?
- Is growth slow and meditative rather than instant?
- Do canvas edges block growth?
- Does neighbor blocking prevent major overlaps?
- Do multiple drops create bounded, Voronoi-like regions with softened seams?
- Do stable noisy contours, washes, and flecks read as water-like pigment rather than amoeba/sticker blobs?
- Are seams between adjacent drops acceptable, gapped, or visibly overlapping?
- Does the radial star-shaped constraint show up in normal use?
- Does the settled frame become static?
- Are the tiny touch controls usable without interfering with drawing?

## Known limitations

- Star-shaped geometry: every drop is described from one center, so concave or highly squeezed shapes are limited.
- No true pigment displacement: existing drops are obstacles, not material pushed outward by new drops.
- Non-shared seams: neighboring drops keep independent boundaries, so small gaps or overlaps can happen; the round-two halo softens but does not solve this.
- Sparse flecks are decorative render texture, not moving particles or fluid simulation.
- Drops placed inside existing pigment are ambiguous and may settle as tiny blocked marks.
- Area conservation is approximate after uneven ray blocking.
- Crowded compositions can still become visually busy, especially after many high-alpha overlaps.
- Palette cycling affects future drops only; existing drops keep their original pigment colors and the current surface is not regenerated. Use reset to rebuild the surface for the active palette.
- The top-right touch zones reserve a small corner area; drawing near that corner may trigger palette/reset instead of pigment.

## Future displacement support

This prototype is not a strong foundation for true marbling displacement. A future version could try to push older drops by modifying their radial samples, but that is likely to become brittle because each region remains star-shaped from a single center.

If displacement becomes important, compare this baseline against raster ownership, boundary relaxation, or particle/fluid-ish prototypes where pigment is represented as a field or movable material.

## Files

- `index.html`: self-contained p5 sketch, styles, simulation, input, and rendering
- `README.md`: this documentation
