# Marbling Radial Boundary Growth Prototype Implementation Plan

Date: 2026-05-08
Branch: `proto/marbling-radial-boundary`
Worktree: `/workspace/projects/Griffinhale_git/worktrees/cabinFever-marbling-radial`
Prototype folder: `prototypes/marbling-radial-boundary/`
Status: plan only; do not implement prototype code in this commit

## Prototype purpose

Build a standalone p5/HTML prototype that tests the radial boundary growth architecture as the baseline/control for the cabinFever marbling exploration.

The prototype should answer one narrow question:

Can sampled radial rays satisfy the original marbling plan well enough to produce a calm, beautiful, bounded pigment interaction?

Specifically, prove or disprove that this model can support:

- press/tap at pointer location to add pigment
- hold duration mapped to paint amount / eventual target size
- slow visible growth after placement
- growth blocked by target size, canvas edges, and neighboring occupied drops
- organic water-like boundaries
- curated palette cycling
- reset-only controls
- static final settled compositions
- desktop and mobile/touch interaction

Evaluation priorities:

- Prove whether sampled radial rays can satisfy the original plan.
- Watch for an amoeba/sticker feel where drops look like isolated pasted blobs rather than marbled pigment.
- Watch for broken seams, visible gaps, major overlaps, and inconsistent shared boundaries.
- Watch for the radial star-shape limitation: each region is fundamentally described from one center and may not handle concave or squeezed shapes convincingly.

## Architecture summary

Use one self-contained p5.js sketch in a static HTML page. Each drop is a radial polygon described by many angular samples. Each angular sample stores a current radius and a blocked flag. During growth, each unblocked ray proposes a small outward step. The step is accepted only if it stays inside the canvas, remains below the drop target radius, and does not enter the occupied radial region of another drop.

This is intentionally not a full fluid simulation and not true pigment displacement. It is a fast, inspectable baseline for comparing against raster, shader, particle, metaball, and boundary-relaxation prototypes.

Primary model:

- `Drop.center`: pointer location where pigment was placed
- `Drop.targetRadius`: derived from hold duration via area-based mapping
- `Drop.angles[]`: stable angular samples, likely 160-224 samples
- `Drop.radii[]`: current boundary radius per sample
- `Drop.blocked[]`: per-ray collision/edge stop state
- `Drop.seed`: stable random/noise seed for organic deformation
- `Drop.colors`: fill, rim, wash/highlight colors from curated palette
- `Drop.createdAt`: used only for growth timing, not idle animation

Core growth loop:

1. For each drop still growing, iterate its rays.
2. Skip rays already blocked or at target radius.
3. Compute a small proposed radius increment with mild per-ray variation.
4. Convert the proposed radius/angle to a world point.
5. Block if the point exits the canvas.
6. Block if the point falls inside another drop's current radial boundary plus a margin.
7. Otherwise commit the radius.
8. Once no ray can grow, the drop is settled.

Rendering uses stable boundary modulation and p5 `curveVertex()` or high-sample polygons. Noise should be stable after settlement; avoid perpetual idle wobble.

## Exact files to create

Create only these files during implementation of this prototype:

- `prototypes/marbling-radial-boundary/index.html`
- `prototypes/marbling-radial-boundary/README.md`

Optional split only if the single file becomes too hard to maintain:

- `prototypes/marbling-radial-boundary/sketch.js`
- `prototypes/marbling-radial-boundary/styles.css`

Do not modify the current Next.js app for this prototype. Do not add package dependencies or build tooling.

This planning commit creates only:

- `docs/prototype-plans/marbling-radial-boundary-implementation-plan.md`

## p5 / HTML structure

Initial implementation should prefer a self-contained `index.html`:

- HTML document with p5.js 1.11.3 loaded from CDN.
- Inline CSS:
  - `html, body { margin: 0; width: 100%; height: 100%; overflow: hidden; touch-action: none; }`
  - full-screen canvas
  - tiny fixed corner hint text
- Inline script:
  - set `p5.disableFriendlyErrors = true`
  - define constants, palettes, state, utility functions, `Drop` class, p5 lifecycle handlers

Required p5 lifecycle and handlers:

- `setup()`
  - `createCanvas(windowWidth, windowHeight)`
  - `pixelDensity(1)`
  - initialize palette and surface grain
- `draw()`
  - update active press preview / target amount
  - update growing drops while needed
  - render cream surface and drops
  - stop mutating state when settled
- `windowResized()`
  - resize canvas
  - rebuild background grain or mark it dirty
  - preserve existing drops; edge behavior after resize can be documented as approximate
- `keyPressed()`
  - `P`: cycle palette for future drops
  - `R`: reset all drops
  - optional `Escape`: reset
- pointer/touch handlers
  - p5 mouse handlers for desktop
  - p5 touch handlers for mobile
  - return `false` from touch handlers to suppress scrolling/zooming in the standalone demo

## Interaction model

Starting state:

- blank cream paper/water surface
- no drops
- tiny hint text only, e.g. `hold to drop · P palette · R reset`

Pointer behavior:

- quick tap/click creates a small visible drop at pointer location
- press-and-hold creates a larger eventual drop
- active press may show a subtle preview ring or wet spot, but it must remain unobtrusive
- release finalizes the target paint amount and creates the growing drop

Hold mapping:

- use an area-based mapping so paint amount is semantically mass/area, not just radius
- example:
  - `holdMs = clamp(now - pressStart, 80, 1400)`
  - `t = smoothstep(0, 1, holdMs / 1400)`
  - `targetArea = lerp(minArea, maxArea, t)`
  - `targetRadius = sqrt(targetArea / PI)`
- quick tap should still create a minimum drop
- cap maximum radius to avoid one press filling the whole screen on mobile

Layering semantics:

- first version may render newer drops above older drops
- collision should still prevent major geometry invasion into existing occupied regions
- drops placed inside existing pigment are a known weak case; document behavior rather than trying to solve true displacement

## Simulation model

Drop construction:

- choose 160-224 angular samples for a balance of smoothness and speed
- initialize all radii at 1-3 px
- set each ray's blocked flag to `false`
- store a stable per-drop seed for boundary variation
- assign pigment colors from the active palette
- optionally vary sample angles slightly or vary growth speed per ray, but keep the sample order stable

Growth:

- growth rate should be calm and visible, roughly a few pixels per second per ray
- rays can grow independently
- rays stop at target radius, canvas bounds, or neighboring occupied regions
- growth variation can be created with stable noise based on angle and seed
- no ray should exceed target radius
- once a ray is blocked, it should generally stay blocked to avoid flicker

Neighbor collision:

For a proposed point on drop A:

1. Loop over all other drops B.
2. Compute vector from B center to proposed point.
3. Compute angle and distance in B's radial coordinate system.
4. Query B's current boundary radius at that angle using interpolation between neighboring samples.
5. If distance is less than `B.radiusAtAngle(angle) + collisionMargin`, reject/block A's ray.

Important constraints:

- do not use vertex-to-vertex distance as the main collision check
- do not return early from only one vertex comparison
- avoid repeated unblocking that causes seam jitter
- keep collision approximate but stable

Static settle:

- global `anyGrowing` should track whether any drop can still grow
- after all drops settle and no press is active, draw/render should avoid changing simulation state
- if using `noLoop()`, call `loop()` when interaction resumes; otherwise keep `draw()` deterministic and non-mutating while settled

## Rendering model

Visual direction:

- cream/white paper-water base, not flat white
- subtle grain/noise surface
- strongly organic but coherent pigment boundaries
- calm, meditative growth
- final screenshot should feel intentional, not like random p5 circles

Drop rendering:

- render filled boundary from current radial samples
- use stable visual modulation for water-like edges
- use `beginShape()` with `curveVertex()` and duplicate first/last points for smooth closed curves, or draw a high-sample polygon if more stable
- render translucent pigment fill
- render a darker or more saturated rim along the boundary
- add optional inner wash/highlight for pigment depth
- avoid excessive alpha stacking that muddies colors

Organic boundary strategy:

- prefer stable noise tied to drop seed and angle
- keep deformation bounded relative to current radius
- do not animate idle noise after settlement
- avoid extreme spikes that make rays look like starbursts

Debug option:

- optional hidden debug key can toggle ray vertices/collision flags if useful, but no visible debug UI should ship by default

## Palette, reset, and static-settle behavior

Palettes:

Include at least four curated palettes:

1. Traditional marbling: indigo, oxblood, ochre, moss, cream
2. Bright playful: coral, turquoise, lemon, violet, ultramarine
3. Portfolio subdued: charcoal, clay, muted teal, cream, copper
4. Monochrome ink: blue-black, gray, cream, pale wash

Palette cycling:

- `P` cycles the active palette
- palette changes affect future drops only in the first version
- existing drops retain their original colors
- hint text should include the current palette name if space allows

Reset:

- `R` clears all drops and active press state
- reset also rebuilds or redraws the clean cream surface
- no undo/redo
- no export

Static-settle:

- when all drops stop growing, the image should become static
- no continuous idle animation, wobble, or diffusion after settlement
- user interaction should restart updates

## Mobile / touch notes

Mobile and touch are first-class for this prototype.

Implementation notes:

- use p5 touch handlers in addition to mouse handlers
- return `false` from touch handlers
- CSS should include `touch-action: none`
- avoid relying only on keyboard controls for mobile-critical behavior
- keyboard `P` and `R` are acceptable for desktop; if mobile testing shows reset/palette are inaccessible, add tiny corner hit zones without creating a large UI panel
- account for different viewport sizes when choosing min/max target radius
- use `pixelDensity(1)` to reduce mobile overdraw
- avoid extremely high angular sample counts or expensive per-pixel effects

Touch acceptance:

- tap creates a small drop
- press-and-hold creates a larger drop
- canvas does not scroll during drawing
- reset/palette behavior is either documented as desktop-only or available through tiny corner zones

## Acceptance criteria

The radial prototype is acceptable when:

1. It opens as a static standalone p5/HTML page.
2. It shows a full-screen cream paper/water surface on load.
3. UI is limited to tiny unobtrusive hints.
4. A pointer press/tap creates pigment at the pointer location.
5. Holding longer creates a larger eventual drop than quick tapping.
6. Drops grow slowly and visibly after placement.
7. Drops stop at their target size.
8. Drops stop at canvas edges.
9. Neighbor blocking mostly prevents major overlaps.
10. Multiple drops create bounded, Voronoi-like regions.
11. Boundaries are organic/water-like rather than perfect circles.
12. At least four curated palettes exist and can be cycled.
13. Reset clears the canvas.
14. Desktop mouse and mobile/touch input both work.
15. Once growth finishes, the image is static.
16. A 10-20 drop composition looks intentional enough to compare against the other architecture prototypes.

## Known limitations

Expected limitations of radial boundary growth:

- Star-shaped geometry: every drop is described from one center, limiting concave or squeezed shapes.
- Weak displacement path: old pigment is treated as an obstacle, not material that can be pushed outward.
- Sticker/amoeba risk: rendered drops may look like independent pasted blobs unless styling is strong.
- Non-shared seams: adjacent drops maintain independent boundaries, so gaps, overlaps, or visually broken seams can appear.
- Drops placed inside existing pigment are ambiguous in the first version.
- Crowded compositions may become visually confusing.
- Area conservation is approximate after rays block unevenly.
- This prototype should be considered a baseline/control, not necessarily the final architecture.

Kill or downgrade the architecture if:

- it still looks like generic blobs after palette/rim/grain work
- common neighbor collisions show broken seams or obvious overlaps
- crowded compositions look incoherent
- the star-shape limitation prevents convincing marbling forms

## Staged implementation tasks

### Stage 1: Prototype shell

Files:

- create `prototypes/marbling-radial-boundary/index.html`
- create `prototypes/marbling-radial-boundary/README.md`

Tasks:

- add p5 CDN shell
- create full-screen canvas
- add cream surface and subtle grain
- add tiny hints
- implement resize and basic key handlers

Checkpoint commit:

- `feat(radial): add standalone prototype shell`

### Stage 2: Palette and reset scaffolding

Files:

- modify `prototypes/marbling-radial-boundary/index.html`
- update `prototypes/marbling-radial-boundary/README.md`

Tasks:

- define curated palettes
- implement `P` palette cycling
- implement `R` reset
- document controls

Checkpoint commit:

- `feat(radial): add palettes and reset controls`

### Stage 3: Press/hold drop creation

Files:

- modify `prototypes/marbling-radial-boundary/index.html`
- update README if controls change

Tasks:

- add `activePress` state
- implement mouse and touch handlers
- map hold duration to target area/radius
- create drops on release
- return `false` for touch handlers

Checkpoint commit:

- `feat(radial): add press hold drop creation`

### Stage 4: Radial drop simulation

Files:

- modify `prototypes/marbling-radial-boundary/index.html`

Tasks:

- implement `Drop` class
- generate angular samples
- implement per-ray growth
- stop at target radius
- stop at canvas edges
- render simple polygons/curves

Checkpoint commit:

- `feat(radial): implement bounded ray growth`

### Stage 5: Neighbor blocking

Files:

- modify `prototypes/marbling-radial-boundary/index.html`

Tasks:

- implement `radiusAtAngle()` interpolation
- block proposed points against other drops' radial regions
- tune collision margin
- verify two-drop and crowded cases

Checkpoint commit:

- `feat(radial): block growth against neighboring drops`

### Stage 6: Marbling visual pass

Files:

- modify `prototypes/marbling-radial-boundary/index.html`

Tasks:

- add stable organic boundary modulation
- add pigment fill, rim, wash/highlight
- tune grain and alpha
- avoid idle jitter

Checkpoint commit:

- `style(radial): add organic pigment rendering`

### Stage 7: Static settle, mobile pass, documentation

Files:

- modify `prototypes/marbling-radial-boundary/index.html`
- update `prototypes/marbling-radial-boundary/README.md`

Tasks:

- ensure settled state is static
- test touch behavior and no-scroll behavior
- document model, controls, evaluation notes, and limitations
- final cleanup before comparison

Checkpoint commit:

- `docs(radial): document prototype behavior and limitations`

## Verification commands

Plan-only verification for this commit:

```bash
cd /workspace/projects/Griffinhale_git/worktrees/cabinFever-marbling-radial
test -f docs/prototype-plans/marbling-radial-boundary-implementation-plan.md
git status --short
git diff -- docs/prototype-plans/marbling-radial-boundary-implementation-plan.md
```

Implementation-time smoke checks:

```bash
cd /workspace/projects/Griffinhale_git/worktrees/cabinFever-marbling-radial/prototypes/marbling-radial-boundary
python3 -m http.server 8123
```

Open `http://localhost:8123` and verify:

- no console errors
- full-screen cream surface
- pointer/touch drop creation
- hold creates larger target size
- growth is slow and bounded
- edge blocking works
- neighbor blocking mostly works
- palette cycling works
- reset works
- settled frame is static

Optional static checks:

```bash
cd /workspace/projects/Griffinhale_git/worktrees/cabinFever-marbling-radial
git diff --check
python3 - <<'PY'
from pathlib import Path
for path in [
    Path('prototypes/marbling-radial-boundary/index.html'),
    Path('prototypes/marbling-radial-boundary/README.md'),
]:
    if path.exists():
        print(path, 'exists')
PY
```

## Commit checkpoints

This plan commit:

- `docs(radial): add implementation plan`

Recommended implementation commits after this plan:

1. `feat(radial): add standalone prototype shell`
2. `feat(radial): add palettes and reset controls`
3. `feat(radial): add press hold drop creation`
4. `feat(radial): implement bounded ray growth`
5. `feat(radial): block growth against neighboring drops`
6. `style(radial): add organic pigment rendering`
7. `docs(radial): document prototype behavior and limitations`

Before each implementation commit:

- run lightweight checks relevant to that stage
- keep changes scoped to `prototypes/marbling-radial-boundary/`
- do not modify the Next.js app
- update README when behavior or controls change

## Final comparison notes to capture after implementation

During comparison against other prototypes, explicitly record:

- Does the radial model meet the original acceptance criteria?
- Does the settled composition look like marbling or like amoeba stickers?
- Are seams between neighbors coherent, gapped, or overlapping?
- Does the radial/star-shaped constraint become visible in normal use?
- How does it perform on mobile with 10-20 drops?
- Is the simplicity worth the weaker displacement path?
