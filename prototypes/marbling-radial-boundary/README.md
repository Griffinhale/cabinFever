# Marbling Radial Boundary Growth Prototype

## Purpose

This standalone p5.js prototype tests sampled radial-ray boundary growth as the baseline/control architecture for the cabinFever marbling exploration.

The question it is meant to answer is narrow: can many independently growing radial samples produce a calm, bounded, organic pigment interaction that is good enough to compare against raster, shader, metaball, particle, and boundary-relaxation prototypes?

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

On each update while growth is active:

1. Every unblocked ray proposes a small outward step.
2. The proposed radius is capped by the drop target radius.
3. The proposed point is rejected if it exits the canvas.
4. The proposed point is rejected if it falls inside another drop's current sampled radial boundary plus a small margin.
5. Accepted rays advance; rejected rays become permanently blocked to avoid seam jitter.
6. When no rays can grow, the drop settles.

Rendering uses stable visual-only boundary modulation, translucent pigment fills, darker rims, inner washes, and a subtle paper/water grain layer. The noise is not animated after settlement.

## Controls

- Press / tap: begin adding pigment at the pointer
- Hold: increase paint amount and target footprint
- Release: create the growing drop
- P: cycle palette for future drops only; settled drops and the existing surface stay visually stable
- R: reset all drops and rebuild the paper surface for the active palette
- Escape: reset

Touch input uses p5 touch handlers and returns `false` to suppress page scrolling/zooming in the standalone demo. Palette/reset are keyboard controls in this version.

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

- Does quick tap create a minimum visible drop?
- Does holding clearly create a larger eventual footprint?
- Is growth slow and meditative rather than instant?
- Do canvas edges block growth?
- Does neighbor blocking prevent major overlaps?
- Do multiple drops create bounded, Voronoi-like regions?
- Do stable noisy contours read as water-like pigment, or as amoeba/sticker blobs?
- Are seams between adjacent drops acceptable, gapped, or visibly overlapping?
- Does the radial star-shaped constraint show up in normal use?
- Does the settled frame become static?

## Known limitations

- Star-shaped geometry: every drop is described from one center, so concave or highly squeezed shapes are limited.
- No true pigment displacement: existing drops are obstacles, not material pushed outward by new drops.
- Non-shared seams: neighboring drops keep independent boundaries, so small gaps or overlaps can happen.
- Drops placed inside existing pigment are ambiguous and may settle as tiny blocked marks.
- Area conservation is approximate after uneven ray blocking.
- Crowded compositions can still become visually busy or sticker-like.
- Palette cycling affects future drops only; existing drops keep their original pigment colors and the current surface is not regenerated. Use reset to rebuild the surface for the active palette.
- Mobile core press/tap works, but palette/reset remain desktop keyboard controls for this pass.

## Future displacement support

This prototype is not a strong foundation for true marbling displacement. A future version could try to push older drops by modifying their radial samples, but that is likely to become brittle because each region remains star-shaped from a single center.

If displacement becomes important, compare this baseline against raster ownership, boundary relaxation, or particle/fluid-ish prototypes where pigment is represented as a field or movable material.

## Files

- `index.html`: self-contained p5 sketch, styles, simulation, input, and rendering
- `README.md`: this documentation
