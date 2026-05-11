# Density-Fluid Comb Iteration Plan

## Goal

Make `prototypes/marbling-density-fluid/` read less like a generic smeared fluid and more like classic combed marbled paper: repeated rake/tine traces, dragged bands, feathering, pigment compression where material bunches, pale stretchy lanes where material is pulled thin, and preserved organic drop/paper borders.

This is a planning-only follow-up to the current density-fluid prototype. Preserve the existing architecture: metaball/lobe drops define organic pigment territories; a persistent owner-clipped density/velocity grid carries finite pigment; rendering maps density to wash/base/saturated color. The iteration should add a second, explicit comb/material-line layer on top of the fluid density rather than replacing the density-fluid model.

## Current state observed

The prototype already has the right base pieces:

- `PigmentPool` metaballs, strongest-owner clipping, adaptive 4/6/8 px grid, curated paper/pigment palettes.
- Persistent fluid arrays at field-grid resolution:
  - `fluidOwners`, `fluidMask`, `fluidBorderPin`
  - `fluidDensity`, `fluidDensityNext`
  - `fluidVx`, `fluidVy`, `fluidVxNext`, `fluidVyNext`
  - `fluidBaseDensity`, `fluidStrength`
- Rake mode samples a 6-tooth comb and injects velocity along each pointer segment.
- Density is semi-Lagrangian advected within the same-owner mask, with divergence-based compression and border pinning.
- Rendering already makes low density paler and high density darker/saturated.

Why it still may not feel like classic combed paper:

- The visible result is dominated by coarse scalar density cells. Classic combed paper needs persistent thin, repeated tine tracks that stay legible after the fluid settles.
- The rake injects motion but does not leave an explicit material-coordinate history or line/stripe field.
- Tines currently behave mostly as velocity brushes. Real comb teeth create center pull lanes plus side ridges/deposits and repeated parallel tracks.
- Rendering has density contrast but not enough directional line contrast, feathering along dragged bands, or alternating dark ridge / pale lane structure.

## Design direction

Add an explicit comb-striation substrate layered over the current density fluid:

1. Keep `fluidDensity` as finite material mass and saturation source.
2. Add persistent per-cell material coordinates and comb-line fields that record where/when tines passed.
3. Stamp each tine with a narrow pale center lane, darker side ridges, directional orientation, and an optional feather/fine-rake signal.
4. Advect the comb-line fields with the same owner-clipped velocity used for density so tracks bend with the material, but decay only very slowly.
5. Render final pigment from both density and line fields:
   - density controls mass/saturation/paper exposure;
   - comb fields control repeated dark/pale line contrast and feathered tine traces.

The intended result after one horizontal or vertical rake pass should be visible as a row of parallel, mechanical-but-organic tine lines. After a second pass, the field should show combed paper-like dragged bands and feathering rather than just blurred density patches.

## Concrete code-level changes

### 1. Add persistent comb/material arrays

In the global state near the existing fluid arrays, add:

```js
let fluidMatU;          // Float32Array: persistent local material coordinate across normal-to-stroke direction
let fluidMatV;          // Float32Array: persistent coordinate along stroke/material flow, optional
let fluidLine;          // Float32Array: signed comb mark, negative = pale pulled lane, positive = dark deposited ridge
let fluidLineNext;      // Float32Array scratch for advection
let fluidLineAge;       // Float32Array: recentness/strength gate for crisp line rendering
let fluidLineAgeNext;
let fluidLineDirX;      // Float32Array: dominant local comb direction
let fluidLineDirY;
let fluidRidge;         // Float32Array: explicit side-ridge deposit/saturation boost
let fluidRidgeNext;
let fluidStretch;       // Float32Array: pale/thin lane boost from tine center and divergence
let fluidStretchNext;
```

Memory note: these are one global grid like the existing fluid arrays. At high quality, 8-10 more `Float32Array`s are acceptable for a standalone prototype; if performance/memory is tight, combine related fields:

- `fluidLine` can encode ridge positive / lane negative.
- `fluidLineAge` can double as line strength.
- `fluidLineDirX/Y` can be omitted in the first slice if rendering uses the last stamped direction locally.

### 2. Lifecycle: allocate, clear, capture, restore, resize

Update `allocateFluidGrid()` to allocate and reset all comb arrays. Update `clearFluidCell(idx)` to clear the comb state for cells that leave the visible owner mask:

```js
fluidLine[idx] = 0;
fluidLineAge[idx] = 0;
fluidLineDirX[idx] = 0;
fluidLineDirY[idx] = 0;
fluidRidge[idx] = 0;
fluidStretch[idx] = 0;
```

Update `captureFluidGrid()` / `restoreFluidGrid(previous)` so quality-tier changes and browser resize preserve combed state. Resample new arrays from the previous grid the same way `fluidDensity` and velocity are restored.

When `fluidOwners[idx]` changes to a new pigment owner in `syncFluidFromField()`, initialize comb arrays to neutral values. When the same owner persists, do not reset comb arrays; this is the key to preserving comb traces after raking and later redraws.

### 3. Initialize material coordinates from cell position and stable noise

During allocation or first bake for an owned cell:

```js
fluidMatU[idx] = gx + 0.18 * stableNoise(gx, gy, pool.seed + 1701);
fluidMatV[idx] = gy + 0.18 * stableNoise(gx, gy, pool.seed + 1702);
```

These coordinates are not meant to become a full texture-map system yet. Their job is to give line rendering a stable sub-cell phase so fine comb traces do not flicker and can show slight organic wobble.

If implementing only the minimal slice, skip `fluidMatV` and use `fluidMatU` plus `stableNoise()` in rendering.

### 4. Stamp explicit tine marks in `injectFluidTooth()`

Keep the existing velocity injection, but make each tooth stamp material evidence into nearby cells.

Add constants:

```js
const COMB_CENTER_LANE_RADIUS = 2.2;     // px, pale pull core
const COMB_RIDGE_OFFSET = 4.5;           // px from tooth centerline
const COMB_RIDGE_WIDTH = 3.0;            // px
const COMB_LINE_STRENGTH = 0.72;
const COMB_RIDGE_STRENGTH = 0.36;
const COMB_STRETCH_STRENGTH = 0.44;
const COMB_LINE_DECAY = 0.992;           // per fluid step, very slow
const COMB_AGE_DECAY = 0.985;
const COMB_DIRECTION_BLEND = 0.35;
```

Inside the existing loop after `dist` and `falloff` are known, calculate signed distance to the tooth centerline in the tooth normal direction:

```js
const signed = (cx - nearest.x) * nx + (cy - nearest.y) * ny;
const centerLane = exp(-(signed * signed) / (2 * COMB_CENTER_LANE_RADIUS * COMB_CENTER_LANE_RADIUS));
const ridgeA = exp(-sq(signed - COMB_RIDGE_OFFSET) / (2 * COMB_RIDGE_WIDTH * COMB_RIDGE_WIDTH));
const ridgeB = exp(-sq(signed + COMB_RIDGE_OFFSET) / (2 * COMB_RIDGE_WIDTH * COMB_RIDGE_WIDTH));
const ridge = max(ridgeA, ridgeB);
const lane = centerLane;
```

Then stamp:

```js
const stamp = falloff * lerp(1, 0.18, pin);
fluidLine[idx] = constrain(fluidLine[idx] + ridge * COMB_LINE_STRENGTH * stamp - lane * COMB_LINE_STRENGTH * stamp, -1.4, 1.8);
fluidRidge[idx] = constrain(fluidRidge[idx] + ridge * COMB_RIDGE_STRENGTH * stamp, 0, 2.0);
fluidStretch[idx] = constrain(fluidStretch[idx] + lane * COMB_STRETCH_STRENGTH * stamp, 0, 2.0);
fluidLineAge[idx] = min(1, fluidLineAge[idx] + 0.65 * stamp);
fluidLineDirX[idx] = lerp(fluidLineDirX[idx] || ux, ux, COMB_DIRECTION_BLEND * stamp);
fluidLineDirY[idx] = lerp(fluidLineDirY[idx] || uy, uy, COMB_DIRECTION_BLEND * stamp);
```

This gives each tine a pale lane directly under the tooth and darker ridges at the sides where pigment bunches.

### 5. Deposit/compress density at side ridges and thin center lanes

Currently density changes mostly via velocity advection and divergence. Add direct, conservative-looking local visual bias during tine stamping:

```js
const deposit = ridge * 0.08 * stamp;
const thin = lane * 0.055 * stamp;
fluidDensity[idx] = constrain(fluidDensity[idx] + deposit - thin, 0.03, MAX_DENSITY_VISUAL * 1.25);
```

Keep this modest. The explicit `fluidRidge` / `fluidStretch` fields should drive visual comb contrast; `fluidDensity` should still read as finite pigment mass, not painted-on stripes.

### 6. Advect comb fields with density

In the fluid step inside `applyFluidRake()`, after `advectDensitySemiLagrangian()` add:

```js
advectCombFieldsSemiLagrangian();
dampCombFields();
```

Implementation mirrors density advection and samples only from same-owner cells:

```js
function advectCombFieldsSemiLagrangian() {
  for each owned cell:
    const sx = gx - fluidVx[idx] * FLUID_DT;
    const sy = gy - fluidVy[idx] * FLUID_DT;
    fluidLineNext[idx] = sampleFluidScalar(fluidLine, owner, sx, sy, fluidLine[idx]);
    fluidLineAgeNext[idx] = sampleFluidScalar(fluidLineAge, owner, sx, sy, fluidLineAge[idx]);
    fluidRidgeNext[idx] = sampleFluidScalar(fluidRidge, owner, sx, sy, fluidRidge[idx]);
    fluidStretchNext[idx] = sampleFluidScalar(fluidStretch, owner, sx, sy, fluidStretch[idx]);
    // Optional first slice: do not advect direction fields; only damp/blend on stamp.
}
```

Then swap buffers.

Damping:

```js
fluidLine[i] *= COMB_LINE_DECAY;
fluidLineAge[i] *= COMB_AGE_DECAY;
fluidRidge[i] *= 0.992;
fluidStretch[i] *= 0.990;
```

At pinned borders, blend comb fields toward neutral so outer silhouettes stay organic and not artificially scratched:

```js
const borderNeutral = fluidBorderPin[i] * 0.25;
fluidLine[i] = lerp(fluidLine[i], 0, borderNeutral);
fluidStretch[i] = lerp(fluidStretch[i], 0, borderNeutral);
```

### 7. Optional multi-pass fine rake mode

Classic combed paper often has a coarse rake pass followed by a fine rake/comb. Add a small mode toggle or automatic modifier without overbuilding UI.

Low-friction options:

- Keep toolbar as-is, but if `keyIsDown(ALT)` during rake, use fine rake constants.
- Or add a second rake state by tapping `rake` button again: `rake` -> `fine rake` -> `drop`.

Constants:

```js
const FINE_RAKE_TOOTH_COUNT = 14;
const FINE_RAKE_TOOTH_SPACING = 6;
const FINE_RAKE_RADIUS = 5.5;
const FINE_RAKE_STRENGTH = 1.9;
const FINE_RAKE_LINE_STRENGTH = 0.54;
```

Implementation should route through the same `applyFluidRake()` / `injectFluidTooth()` path by passing a rake profile:

```js
const profile = currentRakeProfile();
for (let i = 0; i < profile.toothCount; i++) { ... }
injectFluidTooth(..., profile);
```

Do not duplicate the solver. Coarse and fine rake differ only by tooth spacing/radius/strength/stamp intensity.

### 8. Rendering formulas for classic comb contrast

Modify `drawFluidCell(gx, gy, idx, pool)` so color comes from density plus line fields.

Existing terms:

```js
const density = constrain(fluidDensity[idx], 0, MAX_DENSITY_VISUAL);
const paleT = constrain(1 - density, 0, 1);
const saturatedT = constrain((density - 1) / (MAX_DENSITY_VISUAL - 1), 0, 1);
```

Add:

```js
const line = constrain(fluidLine[idx], -1.4, 1.8);
const lineAge = constrain(fluidLineAge[idx], 0, 1);
const ridgeT = constrain(fluidRidge[idx] + max(line, 0) * 0.65, 0, 1.6);
const stretchT = constrain(fluidStretch[idx] + max(-line, 0) * 0.75, 0, 1.8);
const combContrast = smoothFalloff(lineAge) * (1 - pin * 0.45);
```

Then adjust density-derived visuals:

```js
const combPaleT = constrain(paleT + stretchT * 0.45 * combContrast, 0, 1);
const combSatT = constrain(saturatedT + ridgeT * 0.55 * combContrast, 0, 1);
const alpha = constrain(
  38 + density * 76 + combSatT * 64 + pin * 44 - combPaleT * 38,
  10,
  205
);
```

Color blend:

```js
let c = mixRgb(pool.rgb.base, pool.rgb.wash, 0.82 * combPaleT);
c = mixRgb(c, pool.rgb.rim, 0.42 * combSatT);
c = mixRgb(c, pool.rgb.rim, pin * 0.60);
```

To create sub-grid line sharpness, add a stable phase gate using material coordinates/noise:

```js
const phase = stableNoise(gx * 3 + floor(fluidMatU[idx] * 11), gy * 3, pool.seed + 2301);
const hairline = combContrast * (phase > lerp(0.72, 0.42, ridgeT) ? ridgeT : 0);
```

Use `hairline` to add a small extra rim-color overlay on dark ridges or to make center lanes skip rendering more often. Keep it subtle to avoid random speckle.

### 9. Preserve organic paper/drop borders

The classic comb effect should live inside pigment bodies. Do not turn outer edges into ruler-straight stripes.

Rules:

- Keep `fluidBorderPin` velocity damping and density restoration.
- Suppress line stamping where `pin` is high: `stamp *= lerp(1, 0.18, pin)`.
- During rendering, reduce comb contrast near pinned borders: `combContrast *= (1 - pin * 0.45)`.
- Continue drawing existing rim/seam accents after the density+line fill.
- If a tine crosses paper, it should not create pigment on paper. It only affects cells with `fluidOwners[idx] >= 0` and `fluidMask[idx] > 0`.

### 10. Dirty rect/performance handling

The current rake already builds a dirty rect and expands by `RAKE_MAX_OFFSET`. After adding comb fields:

- Include `COMB_RIDGE_OFFSET + COMB_RIDGE_WIDTH` in `editPad`.
- Keep dirty expansion large enough for velocity advection plus comb-line advection.
- Avoid full-scene re-render per segment unless coverage exceeds `FULL_REDRAW_COVERAGE`.
- Profile with `DEBUG_PERF = true` after implementation. If high-quality mode slows, reduce line arrays or skip direction fields.

## Implementation order

1. Add comb arrays to allocation/clear/capture/restore first; verify reset, resize, and quality changes do not throw.
2. Add tine stamping fields inside `injectFluidTooth()` without changing rendering yet; temporarily debug by mapping `fluidLine` to alpha if needed.
3. Add `advectCombFieldsSemiLagrangian()` and `dampCombFields()`.
4. Update `drawFluidCell()` to incorporate `fluidLine`, `fluidRidge`, `fluidStretch`, and `fluidLineAge`.
5. Tune constants with one large pool and a single straight rake pass until repeated parallel tine marks are obvious.
6. Add optional fine rake profile only after coarse comb marks are successful.
7. Update `README.md` controls/architecture once behavior is implemented.

## Verification plan

Manual checks:

1. Serve the prototype from `prototypes/marbling-density-fluid/` and open in a browser.
2. Create one large dark pool, switch to rake, drag one slow straight stroke across it.
   - Expected: 6 parallel comb/tine traces are visible, with pale center lanes and darker side ridges.
3. Drag a second pass perpendicular to the first.
   - Expected: dragged bands and feathering emerge; prior tracks bend/soften but remain legible.
4. Rake across several adjacent colors.
   - Expected: comb traces stay clipped to their owner territories; seams remain readable; no pigment appears on paper.
5. Repeatedly rake the same area.
   - Expected: density bunches into saturated bands; over-stretched lanes become paler/paperier without square holes dominating.
6. Test optional fine rake if implemented.
   - Expected: closer repeated hairlines appear without destroying the coarse comb structure.
7. Add new drops after raking.
   - Expected: new pigment bakes in normally and does not erase previous comb fields for existing owners.
8. Test reset, palette, Shift-rake, two-finger rake, resize, and adaptive quality changes.
9. Stress with 10-20 pools.
   - Expected: performance remains usable; if not, drop direction fields or fine-rake defaults before increasing cell size.

Visual success criteria:

- A screenshot should evoke classic combed marbled paper before the UI hint is read.
- Parallel tine spacing is visible and repeated, not only random turbulent streaking.
- Dark ridges and pale lanes alternate along rake paths.
- Organic drop boundaries and paper gaps survive combing.
- Repeated passes produce feathered dragged bands rather than uniform smears.

Failure criteria:

- Rake marks look like square grid artifacts or generic blur.
- Tine lines vanish immediately after advection.
- Density becomes uniformly darker/muddier with no pale stretched lanes.
- Outer pigment silhouettes collapse or get straight comb-cut edges.
- New arrays break resize/reset/quality-tier restoration.

## Commit scope for implementation later

This plan is docs-only. The later implementation should primarily touch:

- `prototypes/marbling-density-fluid/index.html`
- `prototypes/marbling-density-fluid/README.md`

Do not change the Next.js app unless the prototype graduates out of standalone exploration.
