# Prototype C: Hybrid Density Overlay Marbling

## Concept

Create a conservative standalone variant at `prototypes/marbling-density-hybrid/` that keeps the current metaball ownership, threshold borders, palette behavior, adaptive field tiers, and organic rim/seam rendering from `prototypes/marbling-metaball-pools/`.

The change is only inside the raking/combing model: remove the current hard paint/cut dominance buffers as the primary visual effect and add a persistent density overlay. Field ownership remains decided by the existing metaball solve; `density[]` changes how much pigment is visible in each owned cell. Raking should bunch pigment into darker/more saturated ridges and spread pigment into paler/translucent channels without replacing ownership or cutting directly to paper.

This prototype should answer: can we make finite-feeling pigment inside stable metaball territories without paying the complexity cost of full raster owner advection?

## Data Model

Start by copying the base prototype into the new standalone directory:

- `prototypes/marbling-density-hybrid/index.html`
- `prototypes/marbling-density-hybrid/README.md`

Keep existing state:

- `pools[]`
- `field[]`
- adaptive `fieldCols`, `fieldRows`, `quality.cellSize`
- dirty rect/full-field redraw flow
- strongest-owner clipping
- rim/seam detection

Replace or demote hard rake buffers:

- keep `rakeDx[]` / `rakeDy[]` only if useful for subtle coordinate warp
- remove hard visual reliance on `rakeCut[]`
- remove hard visual reliance on `rakePaintId[]` / `rakePaintStrength[]`

Add arrays parallel to the field grid:

```js
let density = [];      // pigment amount multiplier per field cell, default 1.0
let densityVel = [];   // signed density transport/relaxation velocity or impulse
let densityStamp = []; // optional stamp/age buffer to avoid repeated over-application per rake sample
```

Suggested value ranges:

- paper/no owner: density ignored or 0
- normal owned pigment: `density = 1.0`
- depleted/spread pigment: clamp near `0.18-0.45`
- bunched pigment: clamp near `1.6-2.4`
- slow relaxation target: 1.0, but do not fully erase combing immediately

Grid lifecycle:

- initialize arrays in `rebuildSurfaces()` and `resetRakeGrid()` equivalents
- resample `density[]` and `densityVel[]` when quality tier changes, similar to current rake buffer resampling
- reset density arrays on reset/resize if the field is rebuilt from scratch
- when new pools appear over empty cells, default visible owned cells toward `density = 1.0`

## Rendering Behavior

Keep the existing owner solve:

1. Evaluate pool fields at the current sample point.
2. Choose the strongest owner with the current threshold/tie/newer-pool rules.
3. Detect exterior rims and owner-neighbor seams exactly as in the base prototype.
4. Use the chosen owner as the only source of hue/palette identity.

Apply density only after ownership is known:

- use density to control alpha and saturation/value, not ownership
- low density: more transparent, lighter wash-biased pigment, paper shows through
- normal density: current base behavior
- high density: higher alpha, more saturated/darker base/rim-biased pigment
- rims/seams should remain readable, but their opacity can be gently modulated by density rather than replaced by density

Suggested mapping:

```js
const d = constrain(density[idx] ?? 1, 0.18, 2.4);
const alphaMul = map(d, 0.18, 2.4, 0.25, 1.18, true);
const saturationT = constrain((d - 0.55) / 1.45, 0, 1);
```

Then blend between wash/base/rim colors according to existing field strength/rim logic plus `saturationT`.

Important constraints:

- do not let density create visible pigment outside cells currently owned by a pool
- do not let density erase borders entirely; exterior and seam rim logic still draws on top
- do not use rake source color as an override; raking changes pigment amount, not pigment identity
- keep paper-start and color-start rake behavior visually unified: both comb density rather than switching between cut and paint modes

## Rake Behavior

Use the current toolbar mode, Shift-drag, and two-finger drag entry points, but reinterpret the stroke.

For each resampled rake segment and each comb tooth:

1. Compute stroke direction and normal.
2. For cells near the tooth line, apply a signed density impulse:
   - center of tooth: deplete/spread pigment, lowering density
   - shoulders just outside tooth: bunch displaced pigment, raising density
   - optional downstream streak: move a small amount along stroke direction for dragged marbling feel
3. Optionally add subtle `rakeDx/rakeDy` displacement for organic waviness, but keep it secondary.
4. Mark affected field rects dirty.

Pseudo behavior:

```js
function applyDensityRakeCell(idx, distToTooth, side, force) {
  const trough = smoothstep(1, 0, distToTooth / tineRadius);
  const shoulder = exp(-sq((distToTooth - tineRadius * 0.85) / (tineRadius * 0.45)));

  density[idx] += shoulder * force * bunchAmount;
  density[idx] -= trough * force * spreadAmount;
  densityVel[idx] += (shoulder - trough) * force * velocityAmount;
  density[idx] = constrain(density[idx], MIN_DENSITY, MAX_DENSITY);
}
```

Add a cheap post-rake density update:

- diffuse a small amount from high-density cells into low-density neighbors inside the same current owner
- conserve approximate local mass if simple enough: subtract from troughs, add to shoulders
- decay `densityVel[]`
- gently relax extreme density toward 1.0 over time only while raking/shortly after raking, not every static frame forever

Conservative implementation order:

1. Disable/remove paint override rendering first.
2. Add direct density trough/shoulder stamping with no advection.
3. Add render mapping for alpha/saturation.
4. Add light same-owner diffusion/relaxation only if direct stamping looks too harsh.
5. Add subtle coordinate displacement only if needed for less mechanical lines.

## Verification Steps

Manual smoke test:

1. Serve the new directory with `python3 -m http.server 8123`.
2. Open `http://localhost:8123`.
3. Confirm tap/hold/drop behavior matches the base metaball prototype.
4. Create adjacent different-color pools and verify strongest-owner borders/seams remain readable.
5. Rake through one color repeatedly; expected result is pale comb channels plus darker bunched ridges inside the same color.
6. Rake across multiple colors; expected result is each territory changing density without source-color paint overrides crossing ownership boundaries.
7. Start a rake on paper and drag into pigment; expected result is density combing, not hard paper cuts.
8. Start a rake in pigment and drag into another pigment; expected result is no dragged source-color dominance.
9. Add new pools after raking; expected result is new pools render normally with density initialized sensibly.
10. Resize and/or trigger adaptive quality changes; expected result is no corrupted density grid.
11. Reset; expected result is clean paper and cleared density state.

Success criteria:

- organic metaball borders are visually close to the base prototype
- internal material visibly breaks into combed bands
- bunching increases saturation/opacity and spreading lowers it
- raking no longer feels like binary cut-to-paper or source-color paint stamping
- the prototype stays responsive at current field quality tiers

Failure criteria:

- density changes are too subtle to read
- density destroys rim/seam readability
- repeated raking floods every cell to min or max density
- color ownership appears to smear across borders
- adaptive tier changes lose or corrupt the combed pattern

## Commit Instructions

For the implementation commit later, keep the variant standalone and do not alter the base prototype except when copying from it. Recommended implementation commit shape:

```bash
git checkout proto/marbling-density-hybrid
git status --short
mkdir -p prototypes/marbling-density-hybrid
cp prototypes/marbling-metaball-pools/index.html prototypes/marbling-density-hybrid/index.html
cp prototypes/marbling-metaball-pools/README.md prototypes/marbling-density-hybrid/README.md
# implement density overlay in the copied files only
git add prototypes/marbling-density-hybrid/index.html prototypes/marbling-density-hybrid/README.md
git -c user.name="Griffin" -c user.email="griffinhale.3@gmail.com" commit -m "feat: prototype hybrid density marbling"
```

For this planning-only task, commit only this file:

```bash
git add docs/prototype-plans/density-hybrid.md
git -c user.name="Griffin" -c user.email="griffinhale.3@gmail.com" commit -m "docs: plan hybrid density marbling prototype"
```
