# Prototype F: SDF Boundary + Stripe Density Marbling

## Concept

Create a standalone p5/HTML variant at `prototypes/marbling-density-sdf/` that keeps the base prototype's organic metaball drop language, but changes the internal pigment model from displaced fields to conserved material coordinates.

The prototype should answer: can a bounded metaball silhouette stay organic while raking/combing breaks its interior into classic marbled bands where pigment is finite? Inside each settled pool, color comes from stripe/material-coordinate density. Raking warps material coordinates and locally compresses or stretches stripes. Compressed stripes become darker/more saturated; stretched stripes become lighter/more washed out. The boundary remains a soft SDF/field mask, not the source of internal color detail.

## Data Model

Start by copying the base prototype files:

- `prototypes/marbling-metaball-pools/index.html`
- `prototypes/marbling-metaball-pools/README.md`

into:

- `prototypes/marbling-density-sdf/index.html`
- `prototypes/marbling-density-sdf/README.md`

Keep `PigmentPool` growth, palette handling, press/hold behavior, toolbar controls, adaptive field tiers, paper layer, and reset/palette shortcuts as much as possible.

Replace the current rake-displacement ownership override with per-cell material state at field resolution:

```js
let materialGrid = [];
```

Each visible cell stores approximately:

```js
{
  poolId: number,          // source pigment identity
  owner: number,           // render-pool index or id lookup
  sdf: number,             // signed-ish boundary distance/field margin; positive inside
  mask: number,            // smooth 0..1 occupancy from SDF/field threshold
  border: number,          // 0 interior -> 1 protected rim/seam
  u: number,               // material coordinate across stripes
  v: number,               // material coordinate along stripes
  dux: number, duy: number,// optional local coordinate Jacobian / finite differences
  density: number,         // conserved pigment density multiplier
  stripePhase: number,     // stable per-pool phase offset
  stripeScale: number,     // per-pool stripe frequency
  seed: number,
  rgb: { base, rim, wash }
}
```

Boundary source:

- Continue evaluating each pool's same-pool metaball field independently.
- The winning pool at a cell defines the bounded region.
- Convert field strength to a soft SDF-like mask: `mask = smoothstep(threshold - band, threshold + band, field)`.
- Store `sdf` or `field - FIELD_THRESHOLD` for rim shading and border pinning.
- Store `border` high near exterior threshold and pigment-pigment seams.

Stripe/material source:

- On bake/settle, initialize material coordinates from world space plus stable per-pool rotation/noise:
  - `u = dot(pos - pool.center, stripeAxis) / stripeScale + phase + lowFreqNoise`
  - `v = dot(pos - pool.center, stripeTangent) / stripeScale`
- Initial finite pigment is encoded as stripe density, not infinite procedural color:
  - `stripe = periodicPulse(u)` or sum of narrow sinusoidal/ridged bands.
  - `density = baseAmount * stripeCoverage`, normalized per pool so total pigment is bounded.
- Preserve a per-pool total pigment estimate for debug/verification: sum of density * mask over cells.

## Rendering Behavior

Composite order:

1. stable cream paper/grain layer
2. settled density/material field inside SDF masks
3. protected rim/seam overlay from SDF/border cells
4. active hold/drop preview rendered with the existing metaball look
5. minimal UI hints/toolbars

For each material cell:

- Skip if `mask <= 0` or no owner.
- Recompute visual stripe value from warped `u` and local `density`.
- Alpha/saturation follows conserved density:
  - compressed/high density: stronger base color, darker saturated veins
  - stretched/low density: lighter wash, lower alpha, more paper showing through
- Boundary opacity remains controlled by `mask` so the silhouette stays soft and organic.
- Rim/seam darkening uses `border` and SDF margin, independent of stripe density, so repeated raking does not erase the outer contour.

Suggested color mapping:

```js
const densityT = constrain(cell.density / nominalDensity, 0, 2.5);
const stripeT = periodicStripe(cell.u);
const pigmentT = stripeT * densityT;
const washMix = 1 - constrain(pigmentT, 0, 1);
const rimMix = cell.border * 0.65 + smoothstep(1.1, 2.2, densityT) * 0.25;
```

Performance target: keep rendering at the existing 4/6/8 px field tiers. Dirty-region redraws are optional for the first implementation; a full material-field redraw is acceptable for the prototype if interaction remains responsive.

## Rake Behavior

Raking should operate on material coordinates and density, not on the boundary mask.

For each rake/comb segment:

- Build parallel tine strokes like the base prototype.
- For cells near each tine and inside `mask`:
  - compute falloff from tine distance
  - reduce effect near `border`
  - displace material coordinates perpendicular/parallel to the stroke to create combed bands
  - update density using local compression/stretching so pigment amount is approximately conserved

Simple first pass:

```js
cell.u += normalDot * combStrength * falloff * (1 - borderPin);
cell.v += alongDot * dragStrength * falloff * (1 - borderPin);
cell.density *= 1 + compressionAmount;
cell.density = clamp(cell.density, minDensity, maxDensity);
```

Better conservation pass:

- Treat the rake as a local coordinate warp rather than color painting.
- Estimate compression from neighboring `u/v` differences after the stroke.
- If stripe spacing tightens, increase density; if spacing opens, decrease density.
- After each stroke, renormalize total density per pool or per dirty region toward the stored pool total to avoid pigment gain/loss drift.

Expected visual behavior:

- A paper-start rake does not cut the boundary open; it combs existing material inside masks.
- A color-start rake does not need paint overrides; the visible carried color comes from the warped stripes already inside that pool.
- Repeated combing should create tight veins, stretched pale lanes, and broken internal banding while the SDF boundary/rim remains readable.
- New drops can still be added after raking; once they settle, bake their own SDF mask and stripe material over/alongside existing material using the existing strongest-owner/newer-tie policy.

## Verification Steps

Manual smoke tests:

1. Run the standalone variant:
   - `cd prototypes/marbling-density-sdf`
   - `python3 -m http.server 8123`
   - open `http://localhost:8123`
2. Create quick taps and long holds; verify organic metaball borders still match the base prototype.
3. Wait for settling; verify each pool fills with finite stripe/band material rather than flat color.
4. Drag the rake/comb through one pool repeatedly; verify bands compress into saturated veins and stretch into pale washes.
5. Confirm the outer contour and seam rims remain mostly stable after repeated rakes.
6. Add a new drop after raking; verify it appears on top, settles, and receives its own stripe material.
7. Build a 10-20 pool composition; verify performance is still usable at adaptive 4/6/8 px tiers.
8. Resize the browser; verify grids rebuild without corrupting masks/material.
9. Mobile/touch smoke: tap/hold/drop, toolbar rake, two-finger/alternate rake if preserved, top-left palette, top-right hold reset.

Validation criteria:

- Validated: combing produces recognizable marbled stripe bands with density-driven saturation changes, and borders remain organic/readable.
- Partial: density/saturation reads well but band warping is too coarse, or borders are stable only at high/medium quality.
- Invalidated: material conservation is not visible, raking looks like simple color displacement/cutting, or the SDF boundary breaks under normal combing.

## Commit Instructions

Planning commit only for this task:

```bash
git status --short
git add docs/prototype-plans/density-sdf.md
git -c user.name="Griffin" -c user.email="griffinhale.3@gmail.com" commit -m "docs: plan sdf stripe density marbling prototype"
git status --short
```

Do not implement `prototypes/marbling-density-sdf/` in this commit. The implementation should be a later commit that copies the base prototype into the new standalone variant and applies the SDF/material-coordinate density changes there.
