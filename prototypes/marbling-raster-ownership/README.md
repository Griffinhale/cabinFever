# Marbling Raster Ownership Prototype

## Purpose

This standalone p5/HTML prototype tests whether raster ownership growth is a good architecture for the cabinFever marbling interaction. It treats pigment as a shared surface field: each simulation cell is either empty or owned by exactly one drop.

The question this prototype answers is whether hold-based paint amount, exclusive ownership, slow frontier growth, and smoothed raster rendering can produce coherent marbling-like bounded regions without the overlap problems of independent drop geometry.

## Architecture

- Single self-contained `index.html`.
- p5.js 1.11.3 from CDN; no npm, bundler, or Next.js dependency.
- Full-screen p5 canvas with `pixelDensity(1)` for predictable grid cost.
- Cached cream paper/grain layer.
- Low-resolution simulation grid (`3-5` CSS pixels per cell depending on viewport).
- Flat typed arrays:
  - `owner`: drop id per cell, `-1` when empty.
  - `age`: claim tick metadata for future rendering experiments.
  - `grainCost`: stable paper/wetness noise used by growth cost.
  - `frontierMark`: duplicate-frontier guard.
- Drop records store seed cell, target area in cells, claimed area, frontier cells, palette colors, and settled state.
- Rendering draws the ownership field into full-resolution p5 graphics layers using soft circles, blurred pigment/rim passes, subtle variation, paper grain, and a light vignette to disguise cell artifacts.

## Controls

- Press/tap/hold on the canvas: create pigment at the pointer.
- Quick tap: creates a minimum visible drop.
- Longer hold: creates more paint by increasing target owned-cell area, capped for performance.
- `P`: cycle the active palette for future drops. Existing drops keep their assigned colors; the paper surface updates to the new palette.
- `R` or `Escape`: reset the canvas.

## Run

```bash
cd /workspace/projects/Griffinhale_git/worktrees/cabinFever-marbling-raster/prototypes/marbling-raster-ownership
python3 -m http.server 8123
```

Open `http://localhost:8123`.

## What to evaluate

- Does hold duration read as paint amount / final area rather than just radius?
- Do neighboring drops form coherent bounded regions because ownership is exclusive?
- Do edge drops stop naturally at the canvas boundary?
- Does the slow frontier growth feel meditative instead of game-like cellular automata?
- Do paper texture, soft cell splats, and rim rendering hide grid artifacts enough for a visual prototype?
- Does a 10-20 drop composition remain legible and screenshot-worthy?
- Does the sketch become visually static after all drops settle?
- Does touch input avoid page scroll/zoom interference?

## Implementation notes

Hold mapping is area-based:

```text
holdT = clamp((holdMs - minHoldMs) / (maxHoldMs - minHoldMs), 0, 1)
eased = easeOutCubic(holdT)
targetAreaCells = lerp(minAreaCells, maxAreaCells, eased)
```

Growth uses strict ownership:

- Empty cells can be claimed.
- Owned cells cannot be claimed by a different drop.
- A drop claims from its frontier until it reaches target area or has no empty frontier left.
- Frontier cost combines distance from seed, stable noise/grain, neighbor support, diagonal-bridge penalty, and slight deterministic jitter.
- The simulation does not reassign or displace existing cells.

Static-settle behavior:

- `draw()` updates and renders while a press preview is active or drops are growing.
- Once all drops are settled and no press is active, the final frame remains unchanged.
- The simulation tick is only advanced while an unsettled drop has active growth work, so idle renders cannot change tick-derived visual variation.
- There is no idle animated noise.

## Known limitations

- Strict ownership means new drops do not push old pigment aside.
- Drops placed inside fully occupied regions may only grow if a nearby empty seed can be found; otherwise they fail silently except for the press preview.
- The simulation is low-resolution, so some grid/cellular character can still appear despite smoothing.
- Frontier growth is not physical fluid dynamics; it is an area-budgeted territory expansion model.
- Visual area after blurred/splatted rendering is approximate even though ownership area is exact in cells.
- Crowded canvases can leave small empty gaps because ownership is blocking, not relaxing.
- Resizing resets the composition.
- No undo, export, saved seeds, true diffusion, physical displacement, or Next.js integration.

## Future displacement support

This architecture is a better displacement foundation than independent polygons because pigment already lives in a shared field. Future experiments could add:

- local cell reassignment or boundary relaxation when new pigment is added;
- pressure-like seam negotiation between neighboring regions;
- advection of ownership/material through a velocity field;
- shader or marching-squares rendering driven by the ownership grid;
- separate pigment density/wetness fields so ownership and visual mixing can diverge.
