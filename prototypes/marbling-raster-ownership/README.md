# Marbling Raster Ownership Prototype

## Purpose

This standalone p5 prototype tests raster ownership growth for the cabinFever marbling exploration. The intended model is a shared low-resolution ownership field where each cell belongs to one pigment drop or remains empty.

## Architecture

Initial shell:

- single self-contained `index.html`
- p5.js 1.11.3 loaded from CDN
- full-screen canvas with `pixelDensity(1)`
- cached cream paper/grain layer
- tiny corner hints only

Planned model:

- pointer hold duration maps to pigment amount / target owned-cell area
- drops expand through a frontier of empty grid cells
- existing ownership blocks future claims
- rendering smooths the low-resolution ownership map into organic marbling regions

## Controls

- Press/tap/hold: planned pigment drop gesture
- P: planned palette cycling
- R or Escape: reset/refresh shell state

## Run

```bash
cd /workspace/projects/Griffinhale_git/worktrees/cabinFever-marbling-raster/prototypes/marbling-raster-ownership
python3 -m http.server 8123
```

Open `http://localhost:8123`.

## Evaluate

At this shell stage, verify that the canvas fills the screen, the cream surface is not flat white, touch scrolling is disabled, and hints are unobtrusive.

## Known limitations

This checkpoint is only the prototype shell. It does not yet create drops, own raster cells, smooth pigment regions, or implement displacement.

## Future displacement support

The prototype is intended to keep pigment as a field, which should make later cell reassignment, seam relaxation, or advection easier than independent shape geometry.
