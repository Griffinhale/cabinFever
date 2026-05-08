# Marbling Metaballs / Implicit Pigment Pools Implementation Plan

Date: 2026-05-08
Branch: `proto/marbling-metaball-pools`
Prototype folder: `prototypes/marbling-metaball-pools/`
Status: plan only; do not implement prototype code in this commit

## Prototype purpose

Build a standalone p5/HTML prototype that tests whether metaballs / implicit pigment pools can create a beautiful marbling toy faster than stricter radial or raster simulations.

This prototype should answer:

1. Can implicit pigment pools immediately feel fluid, soft, and marbled?
2. Does click/tap/hold map satisfyingly to pigment mass?
3. Can neighboring pools look intentional without collapsing into one undifferentiated lava-lamp blob?
4. Can ownership / clipping semantics be documented clearly enough that future implementers know what counts as collision behavior?
5. Can the sketch settle into a static final image after growth stops?

Evaluation priority: prove the visual toy quickly. Beauty and interaction feel are the main reasons to build this architecture. At the same time, watch carefully for the major failure mode: all fields merging into one soft blob with unclear pigment ownership.

## Architecture summary

Each user-created pigment drop is an implicit pool made from several child lobes. A pool has one pigment identity/color, one target mass derived from hold duration, and multiple child metaballs that grow from small radii toward target radii.

Rendering samples an implicit field on a 2D grid or pixel buffer:

- Same-pool child lobes merge freely to form organic continuous pools.
- Different pigment pools do not simply add into one global field; they are resolved through an ownership/clipping strategy.
- The first implementation should use nearest-owner / strongest-owner clipping with age-aware tie breaking, because it is simple, debuggable, and directly addresses the lava-lamp merge risk.
- A raster freeze mask may be added later in this prototype if live ownership still looks too slippery.

Recommended first-pass strategy:

1. P2D p5 sketch, not WEBGL/shader.
2. Maintain a low-resolution render field, e.g. 2-4 px cells, then draw upscaled rectangles or write pixels.
3. For each cell, evaluate influence from all child lobes.
4. Assign owner to the pool with strongest normalized field influence above threshold.
5. Render owner color, rim, wash, and paper grain from field strength / boundary proximity.
6. Growth updates only while pools are not settled or the user is pressing.
7. Once all pools reach target and ownership is stable, stop mutation so the composition is static.

This is not a physically accurate fluid simulation and does not need true displacement. It is an implicit visual model with explicit ownership rules.

## Exact files to create

Create these files only when implementing the prototype, not in this planning commit:

- `prototypes/marbling-metaball-pools/index.html`
- `prototypes/marbling-metaball-pools/README.md`

Optional split only if the single HTML becomes hard to manage:

- `prototypes/marbling-metaball-pools/sketch.js`
- `prototypes/marbling-metaball-pools/styles.css`

Create this planning file now:

- `docs/prototype-plans/marbling-metaball-pools-implementation-plan.md`

Do not modify the Next.js app during prototype implementation.

## p5 / HTML structure

First implementation should be a self-contained static page:

- `<!doctype html>` shell
- p5.js 1.11.3 loaded from CDN
- `p5.disableFriendlyErrors = true` before sketch code
- CSS:
  - `html, body { margin: 0; padding: 0; overflow: hidden; background: ...; touch-action: none; }`
  - canvas displayed block/full-screen
  - optional tiny fixed hint overlay in a corner
- p5 setup:
  - `createCanvas(windowWidth, windowHeight)`
  - `pixelDensity(1)`
  - initialize paper grain buffer / random seed
- p5 loop:
  - update active press preview
  - update growing pools
  - recompute field while dirty/growing
  - render paper surface + pigment field + hints
- p5 resize:
  - resize canvas
  - rebuild field buffers and paper grain
  - keep existing pools in screen coordinates for first pass; optional later proportional remap
- input handlers:
  - mouse and touch handlers through p5 functions initially
  - return `false` from touch handlers
  - prevent page scroll and double-tap zoom as much as practical in the standalone demo

Prefer one self-contained `index.html` for speed and easy comparison with other prototypes.

## Interaction model

Core gesture:

- Pointer down starts a pigment press at the pointer location.
- A small preview pool may appear immediately while holding.
- Hold duration increases target pigment mass up to a cap.
- Pointer up finalizes the pool.
- Quick tap still creates a minimum visible pool.

State:

- `pools = []`
- `activePress = null`
- `paletteIndex = 0`
- `dirty = true`
- `settled = false`

Active press should store:

- `x`, `y`
- `startedAt`
- selected pigment color
- seed
- optional preview target mass

Hold-to-mass mapping:

- Clamp hold duration, e.g. 80 ms minimum to 1500-2200 ms maximum.
- Map duration to target area/mass, not directly to radius.
- Convert mass into child lobe radii so long holds become broader / richer pools.
- Example semantics for implementation:
  - quick tap: 3-4 lobes, small total radius
  - medium hold: 5-7 lobes, medium pool
  - long hold: 8-12 lobes, large pool with more asymmetric edge detail

Controls:

- Press/tap: create pigment pool
- Hold: increase pigment amount
- `P`: cycle palette
- `R`: reset
- Optional: `Escape`: reset
- Optional mobile fallback: tiny corner tap regions for palette/reset only if keyboard-free mobile testing needs them

No undo, no export, no large control panel.

## Simulation model

### Pool object

Each pigment pool should contain:

- `id`
- `center: { x, y }`
- `createdAt`
- `color`
- `rimColor`
- `washColor` or alpha parameters
- `targetMass`
- `currentMass`
- `growthRate`
- `settled`
- `seed`
- `lobes[]`

Each child lobe should contain:

- local offset angle / distance from parent center
- current offset multiplier or settled offset
- current radius / strength
- target radius / strength
- growth variation
- noise phase / seed

### Growth

Growth should be visible, slow, and meditative:

1. New pool starts with tiny child lobes around the pointer.
2. Each frame, increase `currentMass` toward `targetMass`.
3. Grow child lobe radii proportionally to current mass.
4. Let lobe centers drift only during growth, using very small seeded offsets; stop drifting after settle.
5. Mark pool settled when lobe radii reach target and optional drift finishes.

Do not animate idle noise after all pools settle.

### Implicit field evaluation

For each field cell/pixel sample:

1. For each pool, compute a same-pool field from its lobes.
2. A simple contribution is `strength = (radius^2) / (distance^2 + epsilon)` or a smoother falloff such as `smoothstep(radius, 0, distance)`.
3. Combine child lobes by summing within one pool.
4. Normalize or compare against a threshold to decide whether the cell is occupied by that pool.
5. Across different pools, assign only one owner per sample.

Recommended ownership/clipping rule for first pass:

- Compute `poolField` for every pool.
- Ignore pools below a minimum threshold.
- Owner is the pool with the strongest `poolField` at the sample.
- Tie-break by newest pool or highest field margin; document the chosen rule in README.
- Add a small boundary margin/noise term so seams are organic but stable.

This lets same-color lobes merge into lush pools while different pigment identities remain clipped into readable territories.

### Lava-lamp merge protection

The prototype must explicitly guard against all pigments merging into one blob:

- Never use one global metaball threshold for all colors without ownership resolution.
- Same-pool lobes may merge; different pools require ownership clipping.
- Boundaries between pools should be visible through rim lines, color contrast, or threshold seams.
- If nearest/strongest ownership still feels unclear, add a `freezeMask` after each pool settles:
  - store final owner/color per field cell
  - future pools can draw over or be clipped by the frozen mask according to a documented layer rule

Document the final chosen semantics in the prototype README.

## Rendering model

Rendering should sell pigment on cream water/paper, not a generic blob demo.

Surface:

- Cream/off-white background.
- Subtle fixed paper grain/noise.
- Grain must be stable, not animated.

Pigment field:

- Use curated palette colors, no raw random RGB.
- Render each owned cell with:
  - base pigment color
  - alpha based on field strength
  - darker/saturated rim near threshold
  - lighter inner wash/highlight where field is broad
  - optional color variation from stable grain/noise
- Avoid excessive alpha stacking that muddies colors.
- Consider rendering to an offscreen `p5.Graphics` field buffer and blitting to screen.

Boundary/rim detection options:

- Field threshold band: if owner field is near threshold, draw darker rim.
- Neighbor contrast: if adjacent sampled cells have a different owner or empty owner, draw rim.
- Combined: threshold rim for outer paper edge, neighbor rim for pigment-pigment seams.

Performance defaults:

- Start with a field cell size of 3 or 4 px.
- Reduce to 2 px only if desktop performance allows.
- Recompute the full field only while dirty/growing/pressing.
- If many pools become expensive, cap active visible pools or lower field resolution before adding complex optimization.

## Palette, reset, and static-settle behavior

Palette system:

- Include at least four curated palettes:
  - Traditional marbling: indigo, oxblood, ochre, moss, cream
  - Bright playful: coral, turquoise, lemon, violet, ultramarine
  - Portfolio subdued: charcoal, clay, muted teal, cream, copper
  - Monochrome ink: blue-black, gray, cream, pale wash
- Each palette should define:
  - `name`
  - `surface`
  - `grain`
  - `pigments`
  - `rim` / `shadow` settings if useful
- Pressing `P` changes the palette for future pools first.
- Existing pools should keep their original pigment color unless explicitly redesigned later.

Reset:

- `R` clears all pools, resets active press, rebuilds the field buffer, and redraws the paper surface.
- No undo/redo.

Static-settle:

- Track whether any pool is growing or active press preview exists.
- When nothing is growing, stop changing pool state, lobe offsets, noise, and field samples.
- Redrawing a stable buffer is okay; visual jitter is not.
- Acceptance requires the settled image to become static.

## Mobile / touch notes

Mobile and touch are first-class for this prototype:

- Use full-screen canvas.
- Set CSS `touch-action: none` and no body scroll.
- Return `false` from p5 touch handlers.
- Keep `pixelDensity(1)` to avoid high-DPI overload.
- Default field resolution should be mobile-safe, likely 4 px cells at first.
- Keep hints tiny and non-blocking.
- If keyboard shortcuts are unavailable, reserve tiny corner tap zones:
  - one corner for palette cycle
  - one corner for reset with a longer press or confirm-like delay if accidental reset is likely
- Test quick taps and press-holds with touch; ensure long press does not select text or scroll the page.

## Acceptance criteria

The implemented prototype is successful if:

1. It opens as a standalone static p5/HTML sketch.
2. It shows a full-screen cream paper/water surface with subtle stable grain.
3. Tiny corner hints are the only UI.
4. Pointer/touch press creates pigment at the pointer location.
5. Holding longer clearly creates more pigment mass than a quick tap.
6. Pigment pools grow slowly and visibly after creation.
7. Same-pool lobes merge into fluid organic shapes.
8. Different pigment pools have a documented ownership/clipping strategy.
9. Neighbor interactions look intentional and do not all collapse into one lava-lamp blob.
10. Boundaries/rims read as marbling or ink/oil pigment on a surface.
11. Palette cycling works and uses curated colors.
12. Reset works.
13. Desktop and mobile/touch input both work.
14. Once all growth finishes, the image becomes static.
15. A 10-20 pool composition looks beautiful enough to justify deeper exploration.

## Known limitations

Expected limitations for this architecture:

- Collision/boundary correctness is approximate.
- Strongest-owner clipping is not true physical displacement.
- Pigment area may not be exactly conserved after thresholding.
- Boundaries may look too soft unless rims are emphasized.
- Crowded scenes can become visually muddy if palettes/alpha are not tuned.
- Low-resolution field sampling can create blockiness if cell size is too large.
- Full-resolution sampling may be too slow on mobile.
- Same-pool metaballs naturally merge; this is desirable only within one pigment identity.
- Different-pool merging is the main architectural risk and must be prevented or clearly constrained.
- Future true marbling displacement would require adding raster ownership, particle state, feedback buffers, or another material representation.

## Staged implementation tasks

### Task 1: Standalone shell

Create `prototypes/marbling-metaball-pools/index.html` and `README.md`.

Implement:

- p5 CDN shell
- full-screen canvas
- cream background
- fixed paper grain placeholder
- tiny hints
- `setup()`, `draw()`, `windowResized()`, `keyPressed()`

Verify:

- page opens with no console errors
- resizing works
- no scrollbars

Suggested commit:

- `feat(metaballs): add standalone prototype shell`

### Task 2: Palette and reset foundation

Implement:

- curated palette array
- pigment color picker
- `P` palette cycling
- `R` reset
- hint text with active palette name

Verify:

- palette name changes
- reset clears state
- existing future behavior can preserve old colors

Suggested commit:

- `feat(metaballs): add palettes and reset controls`

### Task 3: Pointer/touch press-hold model

Implement:

- `activePress`
- mouse and touch handlers
- quick-tap minimum
- hold-duration cap
- target mass mapping
- optional visual press preview

Verify:

- quick click/tap produces a small planned pool
- long hold produces larger planned mass
- touch does not scroll the page

Suggested commit:

- `feat(metaballs): add press-hold pigment creation`

### Task 4: Pool and lobe simulation

Implement:

- `PigmentPool` class or plain object factory
- child lobe generation from seed
- current/target radii
- slow growth update
- settled detection

Verify:

- single pool grows from tiny to target
- lobe layout is organic, not perfectly circular
- settled pools stop mutating

Suggested commit:

- `feat(metaballs): implement implicit pool growth model`

### Task 5: Field evaluation and ownership clipping

Implement:

- low-resolution field buffer
- per-cell pool field evaluation
- same-pool lobe merge
- strongest-owner clipping across pools
- thresholding
- age/tie-break rule

Verify:

- two pools can approach without becoming one global blob
- ownership rule is stable frame to frame
- edge/canvas clipping is naturally respected by field bounds

Suggested commit:

- `feat(metaballs): add field ownership clipping`

### Task 6: Marbling rendering pass

Implement:

- paper grain buffer
- base pigment wash
- threshold rims
- neighbor seam rims
- stable color/grain variation
- optional offscreen buffer caching

Verify:

- first screenshot reads as pigment/marbling
- boundaries are fluid and clear
- colors remain curated and not muddy

Suggested commit:

- `style(metaballs): add marbling pigment rendering`

### Task 7: Static settle and performance tuning

Implement:

- dirty flag
- only recompute field when growing/pressing/resized/reset/palette hint changes
- field resolution tuning
- optional frame timing debug comments removed before final

Verify:

- settled image stops changing
- 10-20 pools remain usable on desktop
- mobile-safe settings are documented

Suggested commit:

- `perf(metaballs): cache settled pigment field`

### Task 8: Documentation and comparison notes

Update `prototypes/marbling-metaball-pools/README.md` with:

- purpose
- controls
- simulation model
- rendering model
- ownership/clipping strategy
- known limitations
- what to evaluate
- run instructions

Verify:

- README explains how this prototype prevents lava-lamp merging
- README admits collision is approximate

Suggested commit:

- `docs(metaballs): document prototype behavior`

## Verification commands

Use these during implementation:

```bash
cd /workspace/projects/Griffinhale_git/worktrees/cabinFever-marbling-metaballs

git status --short --branch

test -f prototypes/marbling-metaball-pools/index.html

test -f prototypes/marbling-metaball-pools/README.md

python3 -m http.server 8123 --directory prototypes/marbling-metaball-pools
```

Then open:

```text
http://localhost:8123
```

Manual browser checks:

- no console errors
- full-screen cream surface
- quick click creates small pool
- long hold creates larger pool
- nearby pools remain visually distinct
- same-pool lobes merge fluidly
- palette cycle works
- reset works
- touch tap/hold works without scroll
- after all growth finishes, no visible animation or jitter remains

If a lightweight JavaScript syntax check is needed after splitting files:

```bash
node --check prototypes/marbling-metaball-pools/sketch.js
```

For plan-only verification in this commit:

```bash
cd /workspace/projects/Griffinhale_git/worktrees/cabinFever-marbling-metaballs

test -f docs/prototype-plans/marbling-metaball-pools-implementation-plan.md

git diff -- docs/prototype-plans/marbling-metaball-pools-implementation-plan.md

git status --short --branch
```

## Commit checkpoints

Planning commit required now:

- `docs(metaballs): add implementation plan`

Implementation commits later should be reviewable and staged roughly as:

1. `feat(metaballs): add standalone prototype shell`
2. `feat(metaballs): add palettes and reset controls`
3. `feat(metaballs): add press-hold pigment creation`
4. `feat(metaballs): implement implicit pool growth model`
5. `feat(metaballs): add field ownership clipping`
6. `style(metaballs): add marbling pigment rendering`
7. `perf(metaballs): cache settled pigment field`
8. `docs(metaballs): document prototype behavior`

Before each implementation commit:

- Check `git status --short --branch`.
- Run the relevant verification command.
- Confirm no Next.js app files were modified.
- Confirm no generated dependency or build artifacts were added.

## Implementation guardrails

- Do not implement prototype code in the planning commit.
- Keep this prototype focused only on metaballs / implicit pigment pools.
- Do not drift into radial-boundary, full raster-ownership, shader-only, particle-fluid, or boundary-relaxation architectures except where explicitly noted as fallback/hybrid comparison.
- Do not add dependencies or build tooling.
- Prefer beauty quickly, but document any collision cheat honestly.
- Make ownership/clipping strategy explicit in comments and README.
- If everything merges into one lava-lamp blob, treat that as an architecture failure unless fixed by ownership or freeze masking.
