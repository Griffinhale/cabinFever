# Metaball-to-Raster Raking Spike

## Goal

Validate a hybrid marbling architecture where metaballs are used only for beautiful drop growth and organic initial borders, then the settled result is baked into a persistent raster pigment field that raking/combing can physically disturb.

Short version: metaball turns to raster type shit.

## Core Hypothesis

The current implicit metaball field is bad at combing because it has no persistent internal material. Raking the equation either fails to break up the blob or destroys the border. If we bake the settled metaball into raster cells, raking can move pigment ownership/density directly while a frozen border mask preserves the original silhouette.

## Given / When / Then

Given a settled metaball pool with an organic border,
when the user drags a rake/comb through it,
then the interior pigment should visibly split, smear, and form strands while the outer border remains mostly intact.

## Proposed Data Model

Keep the current metaball `pools` as the drop-growth input, but introduce a persistent raster layer:

```js
let pigmentGrid = [];
let maskGrid = [];
let velocityGrid = [];
```

Each cell in `pigmentGrid` stores:

```js
{
  owner: number,        // pigment/pool id, -1 for paper
  strength: number,     // alpha/density
  age: number,          // newer pigment can sit over older pigment
  rgb: { base, rim, wash },
  border: number,       // 0 interior -> 1 protected border
  seed: number
}
```

Each cell in `maskGrid` stores:

```js
{
  inside: boolean,
  border: number,       // protection amount near exterior and seams
  originalOwner: number
}
```

Each cell in `velocityGrid` stores:

```js
{
  vx: number,
  vy: number
}
```

## Architecture

### Phase 1: Metaball growth

Use the existing code nearly unchanged:

- `PigmentPool`
- `evaluateField()`
- strongest-owner clipping
- threshold/rim rendering
- settling logic

During active growth, render from metaballs as today.

### Phase 2: Bake settled field

When a pool settles, or when the whole scene settles, bake field cells into `pigmentGrid`.

For each visible field cell:

- copy owner
- copy strength
- copy pigment RGB
- compute border protection:
  - high if near `FIELD_THRESHOLD`
  - high if `hasDifferentNeighbor(...)`
  - low in interior
- store original owner in `maskGrid`

Important: after baking, raking operates on `pigmentGrid`, not on `pools`.

### Phase 3: Rake/combing

A rake stroke writes velocity into cells near a set of parallel tine lines.

For each tine:

- find cells within radius `tineRadius`
- push pigment along stroke direction and/or sideways depending on mode
- force fades with distance from tine
- force fades near protected borders

Pseudo:

```js
function applyRakeStroke(prev, curr) {
  const dir = normalize(curr - prev);
  const normal = { x: -dir.y, y: dir.x };
  const tines = buildCombTines(prev, curr, normal, tineSpacing, tineCount);

  for (const tine of tines) {
    forEachCellNearSegment(tine.a, tine.b, tineRadius, (gx, gy, dist) => {
      const idx = gx + gy * fieldCols;
      const cell = pigmentGrid[idx];
      const mask = maskGrid[idx];
      if (!cell || cell.owner < 0 || !mask?.inside) return;

      const borderPin = mask.border;
      const falloff = 1 - constrain(dist / tineRadius, 0, 1);
      const force = falloff * falloff * (1 - borderPin);

      velocityGrid[idx].vx += dir.x * force * rakeStrength;
      velocityGrid[idx].vy += dir.y * force * rakeStrength;
    });
  }

  advectPigmentGrid();
}
```

### Phase 4: Advect raster pigment

Use a cheap semi-Lagrangian raster step:

For each cell:

- read local velocity
- sample from upstream coordinate: `x - vx`, `y - vy`
- copy/interpolate pigment from that upstream cell
- preserve protected border cells by blending back toward original values
- decay velocity after each step

Pseudo:

```js
function advectPigmentGrid() {
  const next = pigmentGrid.map(cell => cell ? { ...cell } : null);

  for (let gy = 0; gy < fieldRows; gy++) {
    for (let gx = 0; gx < fieldCols; gx++) {
      const idx = gx + gy * fieldCols;
      const mask = maskGrid[idx];
      if (!mask?.inside) continue;

      const v = velocityGrid[idx];
      const sx = gx - v.vx;
      const sy = gy - v.vy;
      const sampled = samplePigmentGrid(sx, sy);
      if (!sampled) continue;

      const borderPin = mask.border;
      next[idx] = blendCells(sampled, pigmentGrid[idx], borderPin);
    }
  }

  pigmentGrid = next;
  decayVelocityGrid();
}
```

## Border Preservation Strategy

Do not let raking freely edit the border. Preserve it in layers:

1. Exterior mask: cells outside the original baked metaball mask stay paper.
2. Border pinning: cells near exterior or pigment seams resist advection.
3. Rim redraw: after raster interior render, draw original rim/seam cells on top.

This gives the desired illusion:

- interior pigment breaks apart
- silhouette remains organic and stable
- seams still read as marbling borders

## Rendering Stack

Recommended composite order:

1. paper layer
2. raster pigment interior from `pigmentGrid`
3. preserved original rim/seam layer from baked mask
4. optional active metaball preview for new drops

While a pool is still growing, render it metaball-style. Once settled, bake it and remove or ignore it for raster rendering.

## Controls for Spike

Minimal interaction:

- hold/tap: existing drop behavior
- drag: rake stroke
- `C`: cycle comb mode
- `[` / `]`: tine spacing
- `-` / `=`: rake strength
- `R`: reset

Comb modes:

1. single stylus
2. parallel comb
3. wave comb

## Success Criteria

VALIDATED if:

- raking visibly creates combed strands or broken-up pigment interiors
- outer contours remain recognizable after repeated strokes
- performance is acceptable at current quality tiers
- new drops can still be added after baked/raked content exists

PARTIAL if:

- border preservation works but interior motion looks too pixel-smear-y
- combing works only at low resolution
- works for single pigment but not overlapping pigments

INVALIDATED if:

- raster advection destroys the border despite pinning
- visual quality is worse than the current pure metaball prototype
- implementation complexity overwhelms the prototype benefit

## First Implementation Slice

Do this as one spike, not a full refactor:

1. Add `pigmentGrid`, `maskGrid`, `velocityGrid` arrays at field resolution.
2. Add `bakeCurrentFieldToRaster()` after pools settle.
3. Render from raster if a cell has baked pigment; otherwise render metaball as today.
4. Add mouse/touch drag raking after at least one baked pigment exists.
5. Implement simple single-stylus advection first.
6. Add parallel tines only after single-stylus behavior works.
7. Add rim redraw last.

## Main Unknowns

- Whether field-cell resolution is enough for pretty combing, especially at low quality.
- Whether raster smear needs bilinear sampling or nearest-cell is acceptable.
- Whether per-pool baking should happen immediately on settle or only once all motion settles.
- How overlapping/new pigment should interact with already-raked raster pigment.

## Recommendation

Spike this directly in the current standalone HTML prototype. Keep the implementation disposable and avoid touching the Next app. If validated, the real architecture should treat metaballs as a drop-generation frontend and raster/particle state as the actual marbling substrate.
