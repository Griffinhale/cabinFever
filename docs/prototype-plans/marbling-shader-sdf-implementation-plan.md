# Marbling Shader/SDF Implicit Field Prototype Implementation Plan

Date: 2026-05-08
Branch: `proto/marbling-shader-sdf`
Prototype folder: `prototypes/marbling-shader-sdf/`
Architecture: Shader/SDF implicit field
Status: plan only; do not implement prototype code yet

## Prototype Purpose

Build a standalone p5/HTML prototype that tests whether a shader-first implicit field can produce the strongest visual ceiling for the cabinFever marbling interaction.

This prototype is intentionally focused on visual quality, atmosphere, and portfolio-background potential. It should answer:

- Can a fragment shader make the marbling surface look beautiful immediately?
- Can click/tap/hold still feel like adding pigment rather than toggling a visual effect?
- Can nearest-owner or SDF-style field logic create plausible bounded regions without heavy geometry?
- Can the shader remain commented and understandable enough to port or hybridize later?

Evaluation priorities:

1. Prove visual ceiling and portfolio-background potential.
2. Watch for fake-feeling interaction or weak collision semantics.
3. Keep shader code commented, inspectable, and understandable.

This worktree should not modify the current Next.js app. It should create only standalone prototype files when implementation begins.

## Architecture Summary

The prototype represents pigment drops as data in JavaScript and renders them through a p5 WEBGL fragment shader.

JavaScript owns:

- user input and hold-duration measurement
- drop creation and drop lifecycle
- per-drop current radius/progress toward target radius
- palette selection and reset state
- packing drop data into shader uniforms
- static/settled redraw decisions

The fragment shader owns:

- paper/water background grain
- implicit SDF-like distance evaluation for each drop
- nearest-owner or weighted ownership selection
- organic domain warping around boundaries
- pigment fill, rims, edge feathering, staining, and subtle variation
- final full-screen compositing

Core idea:

- Each drop is an implicit field with center, current radius, target radius, color, age, and noise/warp parameters.
- Each pixel evaluates all active drops up to a fixed maximum.
- The shader chooses a dominant/nearest drop and derives color from distance-to-boundary, owner id, and noise.
- Collision semantics are approximate: neighboring drops appear bounded because ownership is assigned by a nearest/weighted distance rule, not because old material is physically displaced.

This is a visual architecture first. If it wins visually but loses correctness, it may still be valuable as a rendering layer for a later raster-ownership or boundary-relaxation model.

## Exact Files To Create During Implementation

Create only these files for the first implementation pass:

```text
prototypes/marbling-shader-sdf/
  index.html
  README.md
```

Preferred first pass is a self-contained `index.html` containing p5 setup, JavaScript simulation state, vertex shader source, fragment shader source, and CSS.

Split only if the single file becomes too hard to read:

```text
prototypes/marbling-shader-sdf/
  index.html
  sketch.js
  shader.vert
  shader.frag
  styles.css
  README.md
```

Do not add npm dependencies, build tooling, or Next.js integration during this prototype pass.

This plan file is the only file to create in the current planning task:

```text
docs/prototype-plans/marbling-shader-sdf-implementation-plan.md
```

## p5/HTML Structure

`index.html` should include:

- HTML document shell with no page chrome.
- p5.js 1.11.3 from CDN.
- `p5.disableFriendlyErrors = true` before sketch setup.
- CSS:
  - `html, body { margin: 0; padding: 0; overflow: hidden; }`
  - `body { background: #f4efe3; touch-action: none; }`
  - full-screen fixed canvas.
  - tiny unobtrusive hint in one corner.
- p5 global or instance sketch with:
  - `setup()` creates a `WEBGL` canvas at `windowWidth/windowHeight`.
  - `pixelDensity(1)` for predictable shader cost and mobile viability.
  - shader compilation from inline strings or script tags.
  - `draw()` updates growth state and renders one full-screen quad/rect.
  - `windowResized()` resizes canvas and re-sends resolution uniform.
  - keyboard controls for palette and reset.
  - pointer/touch handling.

Recommended render pipeline:

1. Create `theShader` in `setup()`.
2. In each draw:
   - update drop growth only while active press or any drop is growing.
   - set uniforms: resolution, time, palette/surface colors, drop arrays, active count.
   - draw full-screen plane/rect in WEBGL coordinates.
3. If settled, continue drawing identical frames or call `noLoop()` after the final rendered frame. On new input/reset/palette change, call `loop()`.

Use p5 WEBGL carefully:

- Account for WEBGL origin at canvas center.
- Prefer passing pointer coordinates normalized to `[0,1]` or screen pixels with explicit y handling.
- Keep a tiny pass-through vertex shader commented.

## Interaction Model

Core interaction mirrors the shared marbling design spec:

- Canvas starts blank on a cream paper/water surface.
- Pointer/touch press begins a pigment drop at the pointer location.
- Quick tap creates a minimum visible drop.
- Holding longer adds more paint and increases target radius/mass.
- Drop appears immediately and grows slowly while held and after release.
- Growth stops once current radius reaches target radius or the local field is visually bounded by neighboring ownership.
- `P` cycles palettes.
- `R` resets.
- No undo, no export, no large UI panel.

Implementation details:

- Maintain `activePress` with x/y, start time, color choice, seed, and provisional drop id.
- On `pointerdown`/p5 mouse/touch start, create or preview a drop with small current radius and growing target estimate.
- While held, update the provisional target radius based on elapsed hold time.
- On release, finalize target radius using capped hold duration.
- Use an area-feeling mapping even though rendering is implicit:
  - `holdT = clamp((durationMs - minMs) / (maxMs - minMs), 0, 1)`
  - `targetArea = lerp(minArea, maxArea, easeOutCubic(holdT))`
  - `targetRadius = sqrt(targetArea / PI)`
- Ensure quick taps still create a satisfying small drop.

Input should be implemented with browser pointer events if practical because they unify mouse and touch better than p5 mouse-only handlers. If using p5 handlers, include both mouse and touch handlers and return `false` from touch handlers.

## Simulation Model

State in JavaScript:

```text
const MAX_DROPS = 48; // tune between 32 and 64 after performance testing
let drops = [];
let activePress = null;
let currentPaletteIndex = 0;
let needsFrame = true;
```

Each drop stores:

```text
id
centerX, centerY        // normalized 0..1 or pixel coordinates, consistently documented
currentRadius           // pixels or normalized radius; choose one and keep shader comments clear
targetRadius
color                   // rgb normalized 0..1
rimColor                // optional rgb normalized 0..1
seed                    // deterministic random value for warp/noise
createdAtMs
settled                 // true when currentRadius ~= targetRadius
ageLayer                // optional tie-breaker for ownership/layering
```

Growth update:

- Each frame, grow `currentRadius` toward `targetRadius` at a calm speed.
- Use `dt` from elapsed time; do not make growth frame-rate dependent.
- Optional growth easing: larger drops slow slightly near the target.
- Once all drops are within epsilon of their targets and there is no active press, mark composition settled.

Important semantic choice:

- Do not attempt true fluid displacement in this prototype.
- Treat collision/bounding as a rendering/ownership question in the shader.
- Document that this is approximate and may feel fake if boundaries do not respond convincingly.

Shader-side ownership options to test, in order:

1. Nearest warped signed distance:
   - For each pixel/drop, compute warped distance from pixel to drop center minus current radius.
   - The owner is the drop with smallest signed distance among pixels inside any drop.
2. Weighted Voronoi / power distance:
   - `score = distance / radius` or `distance^2 - radius^2`.
   - Larger drops claim more space while still creating shared seams.
3. Age/layer tie-breaker:
   - Newer drops can win near ambiguous seams to satisfy the simple top-layer rule.
   - Use subtly; avoid obvious sticker overlays.

Keep these choices isolated in well-commented shader functions so reviewers can understand the collision illusion.

## Rendering Model

The shader should make the prototype beautiful before the simulation is perfect.

Fragment shader responsibilities:

- Render cream paper/water background with stable grain.
- Evaluate all drops up to `MAX_DROPS`.
- Find owner and second-nearest/competing field for seam/rim effects.
- Draw pigment fill with slight internal tonal variation.
- Draw darker or more saturated boundary rim near implicit edge.
- Draw thin seam accents where two owners nearly tie.
- Apply stable domain warp/noise to avoid perfect circles.
- Avoid time-animated idle noise after settlement.

Recommended shader functions:

```text
hash(), noise(), fbm()
paperGrain(uv)
warpUvForDrop(uv, dropSeed, strength)
dropDistance(uv, drop)
ownershipScore(uv, drop)
pigmentColor(owner, distance, seam, grain)
```

Rendering rules:

- Boundaries must be organic/water-like, not exact circles.
- Warping should be stable per drop and based on coordinates/seed, not continuously animated after growth settles.
- Edge feathering should be subtle enough that drops still read as bounded regions.
- Avoid over-soft metaball soup. Neighboring regions should appear separated or negotiated.
- Prioritize strong screenshots with 10-20 drops.

Optional visual enhancements if time remains:

- Chromatic edge bleed by mixing fill and rim with palette-specific accents.
- Very subtle paper fiber streaks.
- Slight pigment granulation inside drops.
- Soft background staining around drops.
- Debug mode key that shows owner regions or distance fields, but keep hidden from normal UI.

## Palette, Reset, and Static-Settle Behavior

Palette system:

- Include at least four curated palettes:
  - traditional marbling: indigo, oxblood, ochre, moss, cream
  - bright playful: coral, turquoise, lemon, violet, ultramarine
  - portfolio subdued: charcoal, clay, muted teal, cream, copper
  - monochrome ink: blue-black, gray, cream, pale wash
- Each palette should define:
  - `name`
  - `surface`
  - `grain`
  - `pigments`
  - optional `rim`/`accent`
- `P` cycles palette for future drops and updates surface atmosphere.
- Existing drops may keep their colors when palette changes; document this behavior.

Reset behavior:

- `R` clears all drops, clears active press, resets settled state, and redraws blank cream surface.
- Optional `Escape` can also reset.
- No undo/redo.

Static-settle behavior:

- The final composition should become static when all growth completes.
- Shader noise must not drift after settlement.
- If using `u_time`, use it only for active growth/press feedback, or freeze the time value when settled.
- Prefer deterministic coordinate noise for paper and pigment texture.
- If `noLoop()` is used, call `loop()` on new input, reset, resize, or palette change.

## Mobile and Touch Notes

Mobile/touch must be considered from the first implementation pass.

Requirements:

- Use `touch-action: none` and prevent default behavior during canvas interaction.
- Avoid page scroll/zoom while pressing or holding the canvas.
- Use `pixelDensity(1)` to cap shader cost.
- Keep `MAX_DROPS` conservative; 32 may be a better mobile fallback than 64.
- Consider reducing visual complexity on small screens if needed.
- Touch quick tap and touch press-hold should mirror desktop behavior.
- Keyboard controls are not enough for mobile; if needed, make tiny corner hit zones:
  - top-left or bottom-left for palette cycle
  - top-right or bottom-right for reset with a long press or confirmation-like gesture
- Keep these controls unobtrusive and avoid a large panel.

Performance risks:

- Fragment shader loops over every drop for every pixel.
- Full-screen mobile WEBGL can become expensive quickly.
- Domain warping/fbm inside the drop loop is the likely hotspot.

Mitigations:

- Keep the drop loop fixed and bounded.
- Do cheap rejection before expensive noise where possible.
- Use simple hash/noise functions.
- Compute some per-drop values in JavaScript and pass uniforms.
- Disable or simplify high-frequency grain on mobile if necessary.

## Acceptance Criteria

The shader/SDF prototype is successful if:

- It opens as a standalone static p5/HTML page.
- It uses a full-screen cream paper/water canvas.
- It has only tiny unobtrusive hints/controls.
- Click/tap/press creates pigment at the pointer location.
- Quick tap creates a minimum visible drop.
- Holding longer visibly creates more pigment / a larger target presence.
- Drops grow slowly and meditatively.
- Neighboring drops appear bounded, negotiated, or separated by plausible implicit seams.
- Canvas edges are respected visually.
- Boundaries look strongly organic, fluid, and water-like.
- Palette cycling creates distinct visual atmospheres.
- Reset works.
- Desktop and touch interaction both work.
- Once growth finishes, the image becomes static.
- A screenshot with 10-20 drops looks portfolio-worthy, not like generic p5 blobs.
- Shader code is commented enough that another developer can understand the field/ownership model.

Architecture-specific acceptance:

- First screenshot should be beautiful or at least visually promising.
- Collision does not need to be physically exact, but it must not be distractingly fake.
- The code should make the tradeoff explicit: visual shader illusion over strict material conservation.

## Known Limitations

Expected limitations for this architecture:

- Collision semantics are approximate, not physical.
- Paint amount maps to radius/field strength, not conserved pigment mass.
- New drops do not truly displace old pigment.
- Nearest-owner seams may look like a visual trick if not styled carefully.
- Fixed-size shader uniform arrays limit maximum drops.
- p5 WEBGL shader code is less approachable than plain p5 canvas drawing.
- Mobile performance may limit drop count or noise complexity.
- Debugging shader behavior is harder than inspecting geometry or raster ownership.
- If the visual styling is too smooth, it may become metaballs/lava-lamp rather than marbling.

Kill or pivot criteria:

- Interaction feels disconnected from pointer input.
- Hold duration does not produce a clear paint amount difference.
- Neighbor interactions look like overlapping stickers or arbitrary masks.
- Shader complexity grows faster than visual payoff.
- Mobile performance is unacceptable at modest drop counts.

## Staged Implementation Tasks

### Stage 1: Prototype shell

Files:

- Create `prototypes/marbling-shader-sdf/index.html`
- Create `prototypes/marbling-shader-sdf/README.md`

Tasks:

1. Add self-contained p5 WEBGL page.
2. Add fullscreen canvas, no scrolling, cream background fallback.
3. Add tiny hint text.
4. Add pass-through vertex shader and simple fragment shader that draws paper grain.
5. Add resize handling.

Verification:

- Page opens from a static server.
- Fullscreen canvas renders.
- No console errors.

Commit checkpoint:

- `feat(shader): add standalone shader prototype shell`

### Stage 2: Drop data model and input

Files:

- Modify `prototypes/marbling-shader-sdf/index.html`
- Update `prototypes/marbling-shader-sdf/README.md`

Tasks:

1. Add `drops`, `activePress`, and palette state.
2. Add press/tap/hold input handling.
3. Map hold duration to target area/radius.
4. Add JavaScript growth update from current radius to target radius.
5. Draw debug/simple circles through shader uniforms.

Verification:

- Quick tap creates small drop at pointer.
- Long hold creates larger target radius.
- Touch does not scroll the page.

Commit checkpoint:

- `feat(shader): add press-hold implicit drop state`

### Stage 3: Core shader SDF/ownership rendering

Files:

- Modify `prototypes/marbling-shader-sdf/index.html`

Tasks:

1. Pack drop arrays into uniforms.
2. Implement `MAX_DROPS` loop in fragment shader.
3. Implement signed/weighted distance evaluation.
4. Implement owner and second-owner detection.
5. Render pigment fill and implicit boundary rim.
6. Add comments explaining coordinate systems and ownership semantics.

Verification:

- Multiple drops render in the shader.
- Neighboring drops show plausible boundaries or seams.
- Canvas edges remain visually clean.

Commit checkpoint:

- `feat(shader): implement implicit field ownership rendering`

### Stage 4: Organic marbling style pass

Files:

- Modify `prototypes/marbling-shader-sdf/index.html`

Tasks:

1. Add stable domain warp/noise to boundaries.
2. Add paper grain and pigment granulation.
3. Add edge/rim accents and optional subtle internal wash.
4. Tune for screenshot quality with 10-20 drops.
5. Keep shader functions commented.

Verification:

- Drops no longer look circular.
- Still image reads as marbling/pigment on cream paper.
- No idle jitter after growth settles.

Commit checkpoint:

- `style(shader): add organic marbling shader treatment`

### Stage 5: Palette, reset, static settling, mobile polish

Files:

- Modify `prototypes/marbling-shader-sdf/index.html`
- Update `prototypes/marbling-shader-sdf/README.md`

Tasks:

1. Add four curated palettes.
2. Bind `P` palette cycle and `R` reset.
3. Freeze time/noise or stop loop after settlement.
4. Add tiny mobile-friendly palette/reset hit zones only if keyboard-only controls are insufficient.
5. Test desktop and touch flows.
6. Document controls, model, limitations, and evaluation notes.

Verification:

- Palette cycling changes atmosphere.
- Reset clears the canvas.
- Settled image is static.
- Touch works without scroll.

Commit checkpoint:

- `feat(shader): add palettes reset and static settling`

### Stage 6: Final README and comparison notes

Files:

- Update `prototypes/marbling-shader-sdf/README.md`

Tasks:

1. Document purpose and model.
2. Document controls.
3. Document known limitations.
4. Add run instructions.
5. Add what to evaluate against other architecture prototypes.

Verification:

- Another developer can run and evaluate the prototype from README alone.

Commit checkpoint:

- `docs(shader): document prototype behavior and limitations`

## Verification Commands

Plan-only verification for this commit:

```bash
cd /workspace/projects/Griffinhale_git/worktrees/cabinFever-marbling-shader
test -f docs/prototype-plans/marbling-shader-sdf-implementation-plan.md
git status --short
```

Implementation verification once prototype files exist:

```bash
cd /workspace/projects/Griffinhale_git/worktrees/cabinFever-marbling-shader/prototypes/marbling-shader-sdf
python3 -m http.server 8123
```

Open:

```text
http://localhost:8123
```

Manual QA script:

- Load page and confirm blank cream paper/water surface.
- Quick click/tap in center.
- Long hold near center.
- Add two close neighboring drops.
- Add one drop near an edge.
- Add 10-20 drops across the canvas.
- Press `P` and add more drops.
- Press `R` and confirm reset.
- Wait for all growth to settle and confirm no visual jitter.
- Repeat quick tap and long hold on a touch device or mobile emulator.

Browser console checks:

- No shader compile errors.
- No uniform array errors.
- No WebGL warnings that break rendering.

Performance checks:

- Desktop should remain smooth at target drop count.
- Mobile should remain usable at reduced or default target drop count.
- If performance drops, reduce `MAX_DROPS`, simplify noise, or lower shader work inside the drop loop.

## Commit Checkpoints

This planning task commits only:

```text
docs(shader): add implementation plan
```

Suggested implementation commits later:

1. `feat(shader): add standalone shader prototype shell`
2. `feat(shader): add press-hold implicit drop state`
3. `feat(shader): implement implicit field ownership rendering`
4. `style(shader): add organic marbling shader treatment`
5. `feat(shader): add palettes reset and static settling`
6. `docs(shader): document prototype behavior and limitations`

Before each implementation commit:

- run the relevant verification command or browser smoke test;
- inspect `git diff --check`;
- ensure no Next.js app files were changed;
- ensure shader comments explain non-obvious field math.

## Non-Goals

Do not implement these in this prototype pass:

- Next.js integration.
- True Navier-Stokes fluid simulation.
- True material displacement or conservation.
- Export/share.
- Undo/redo.
- Large UI panel.
- Dependency/build tooling additions.
- Production app cleanup.

## Final Evaluation Questions

After implementation, compare this prototype against the others using the shared rubric, with special attention to:

- Is this the most beautiful and portfolio-ready direction?
- Does the interaction still feel like adding pigment?
- Are collision/boundary semantics acceptable despite being shader-driven?
- Is mobile performance viable?
- Is the code understandable enough to maintain or hybridize?
- Would this be better as a final architecture or as a rendering layer over raster ownership?
