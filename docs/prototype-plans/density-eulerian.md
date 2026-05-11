# Density Eulerian Marbling Prototype Plan

## Concept

Create a standalone prototype at `prototypes/marbling-density-eulerian/` by copying the current `prototypes/marbling-metaball-pools/` sketch, then replacing the current rake displacement/paint-override buffers with a finite-pigment Eulerian density grid.

The visual hypothesis: metaballs still provide beautiful organic drop borders and initial pool shapes, but once pigment exists on the field grid, each field cell stores a finite amount of color. Raking/combing subtracts density at rake teeth and deposits that same material downstream and slightly sideways. Bunched pigment becomes darker/more saturated; stretched pigment becomes lighter/more transparent. Outer silhouettes and seams remain organic because the density grid is initialized from the metaball field and constrained by a soft occupancy/border mask.

This variant should stay self-contained: one `index.html`, one local README, p5 from CDN, no app integration or build step.

## Data Model

Reuse the base prototype's palette, paper layer, toolbar, drop/hold interactions, adaptive field grid, and `PigmentPool` growth model.

Add field-aligned Eulerian storage parallel to `fieldCols * fieldRows`:

```js
let densityGrid = [];      // Float32Array or Array<number>: pigment amount per cell
let ownerGrid = [];        // Int32Array: pool/pigment id, -1 for paper
let colorGrid = [];        // Array or packed channels for base/rim/wash color
let maskGrid = [];         // Float32Array: 0 paper -> 1 editable pigment interior
let borderPinGrid = [];    // Float32Array: 0 free interior -> 1 protected rim/seam
let scratchDensity = [];   // transfer buffer for conservative rake updates
let scratchOwner = [];
let scratchColor = [];
```

Recommended semantics:

- `densityGrid[i]` is finite pigment mass in a cell, not just alpha.
- `densityGrid[i] = 0` means paper, regardless of owner.
- `ownerGrid[i]` identifies the dominant pigment/color family for rendering and downstream deposits.
- `maskGrid[i]` comes from the metaball occupancy threshold; raking should usually deposit only inside editable mask cells.
- `borderPinGrid[i]` is high near exterior thresholds and color seams so rake behavior preserves organic borders.
- Keep total density approximately conserved per rake stroke: track `removedMass` and deposit it into target cells, minus only tiny optional numerical loss/clamping.

Bake/update strategy:

1. During active drops, continue evaluating metaballs as the base prototype does.
2. When a pool settles, or when the full scene settles, write visible metaball cells into the Eulerian grids.
3. If a new drop overlaps existing material, initialize new cells from metaballs and choose owner using the base strongest-owner/newer-pool rule; avoid deleting existing density unless the new drop visibly covers it.
4. On quality-tier changes or resize, rebuild the density grids by resampling old grid values into the new grid, then re-bake still-active pools.

## Rendering Behavior

Render order:

1. Stable cream paper layer.
2. Eulerian pigment grid.
3. Rim/seam accents from `borderPinGrid` and owner-neighbor checks.
4. Active hold preview from metaballs for not-yet-baked pigment.
5. Existing minimal UI/hints.

Cell rendering should map density to pigment appearance:

- Low density: lower alpha, lighter wash color, more paper visible.
- Normal density: base pigment color at expected opacity.
- High density/bunched mass: darker, more saturated, stronger rim/shadow contribution.
- Density gradients: small organic noise/fiber modulation to avoid a flat pixel-grid look.

Suggested mapping:

```js
const d = densityGrid[i];
const normalized = constrain(d / BASE_DENSITY, 0, DENSITY_MAX_VISUAL);
const alpha = 18 + 150 * smoothstep(0, 1.35, normalized);
const bunch = smoothstep(1.0, 2.4, normalized);
const spread = 1 - smoothstep(0.2, 0.9, normalized);
const rgb = mix(mix(wash, base, normalized), rim, bunch * 0.35);
```

Borders:

- Keep exterior cells paper unless `maskGrid` allows pigment.
- Draw darkened accents where `densityGrid` crosses a low-density threshold, where `borderPinGrid` is high, or where neighbor owners differ.
- Do not let low-density interiors erase the original readable silhouette immediately; blend border cells back toward their baked density/color using `borderPinGrid`.

## Rake Behavior

Replace the existing raster-space displacement/paint override rake with direct density transfer.

Stroke preprocessing:

- Smooth/resample pointer movement as in the base prototype.
- Build parallel rake teeth from stroke direction and normal.
- For each tooth segment, visit cells within `RAKE_RADIUS`.
- Fade force by distance to tooth and by `(1 - borderPinGrid[i])`.

Conservative subtract/deposit algorithm:

1. For each affected source cell, compute removable mass:
   - `available = densityGrid[src]`
   - `falloff = toothFalloff * strokeStrength * (1 - borderPinGrid[src])`
   - `remove = min(available, available * falloff * REMOVE_FRACTION)`
2. Subtract `remove` from the source cell.
3. Deposit the same mass into one or more target cells:
   - primary target: downstream along stroke direction by `depositDistanceCells`
   - secondary targets: sideways along normal to create comb ridges and wake breakup
   - optional small jitter/noise for organic strands
4. Weight deposits by editable mask and border resistance.
5. If target weights sum to zero, put the mass back into the source cell.
6. Resolve owner/color in targets by weighted incoming mass; if mixing is too expensive, use the incoming source owner/color when incoming mass exceeds existing local mass.

Pseudo:

```js
function rakeTransfer(srcIdx, gx, gy, dir, normal, falloff) {
  const pin = borderPinGrid[srcIdx] || 0;
  const remove = densityGrid[srcIdx] * falloff * RAKE_REMOVE_FRACTION * (1 - pin);
  if (remove <= MIN_TRANSFER) return;

  densityGrid[srcIdx] -= remove;

  const targets = [
    { x: gx + dir.x * 2.4, y: gy + dir.y * 2.4, w: 0.58 },
    { x: gx + dir.x * 1.4 + normal.x * 0.9, y: gy + dir.y * 1.4 + normal.y * 0.9, w: 0.21 },
    { x: gx + dir.x * 1.4 - normal.x * 0.9, y: gy + dir.y * 1.4 - normal.y * 0.9, w: 0.21 }
  ];

  depositConservedMass(remove, srcIdx, targets);
}
```

Expected visual behavior:

- Teeth leave lower-density troughs instead of only graphical cuts.
- Deposited pigment creates darker saturated ridges downstream/along the sides.
- Repeated combing can pull interiors into strands and islands.
- Protected border cells move less, preserving the organic metaball outline.
- Raking from paper through pigment should still subtract/part material; raking from color should carry that color through deposits.

## Implementation Steps

1. Create `prototypes/marbling-density-eulerian/` by copying `prototypes/marbling-metaball-pools/`.
2. Update title, hint text, README, and comments to identify the Eulerian density variant.
3. Add density/owner/color/mask/border grids alongside the existing adaptive field arrays.
4. Add bake functions from metaball evaluation into the density grid.
5. Change pigment rendering to read density grid cells instead of drawing direct metaball cells after bake.
6. Replace rake displacement buffers with conservative density transfer.
7. Add simple debug counters behind a flag: total density before/after rake, transferred mass, dropped mass, and max cell density.
8. Keep dirty-region redraws if straightforward; otherwise start with full pigment-layer redraw per rake stroke and optimize only if needed.
9. Preserve reset, palette cycling, touch controls, static settling, and adaptive quality behavior from the base prototype.

## Verification Steps

Manual smoke:

- Serve the variant: `cd prototypes/marbling-density-eulerian && python3 -m http.server 8123`.
- Open `http://localhost:8123`.
- Quick taps create visible finite-density pools.
- Long holds create larger/more massive pools.
- Raking through a pool creates light troughs and darker deposited ridges.
- Repeated raking breaks the interior into strands/islands without immediately destroying the outer silhouette.
- Raking near seams keeps neighboring pigments readable.
- Reset, palette, resize, desktop mouse, and touch/two-finger rake still work.

Mass checks:

- With debug enabled, record total density before and after a rake stroke.
- Expected: total density changes only by small floating-point/clamping error, ideally less than 1-3% per aggressive stroke.
- If density is lost because all targets are masked/pinned, confirm fallback returns mass to the source.

Visual comparison:

- Compare against `prototypes/marbling-metaball-pools/`.
- This variant should be less like coordinate warping and more like pigment conservation: bunched zones visibly saturate, spread zones fade.
- Performance should remain acceptable for 10-20 pools at 4/6/8 px field tiers.

## Commit Instructions

For the planning-only commit:

```bash
git status --short
git add docs/prototype-plans/density-eulerian.md
git -c user.name="Griffin" -c user.email="griffinhale.3@gmail.com" commit -m "docs: plan eulerian density marbling prototype"
git rev-parse --short HEAD
```

Do not include implementation files in this commit. The later prototype implementation should be committed separately after creating `prototypes/marbling-density-eulerian/`.
