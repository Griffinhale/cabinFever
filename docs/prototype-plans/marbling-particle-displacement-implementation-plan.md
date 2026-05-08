# Marbling Particle/Fluid-ish Displacement Prototype Implementation Plan

Date: 2026-05-08
Prototype: particle/fluid-ish displacement
Branch: `proto/marbling-particle-displacement`
Prototype folder: `prototypes/marbling-particle-displacement/`

## Prototype purpose

This prototype tests whether a particle-based, fluid-ish displacement model is worth its extra complexity for the cabinFever marbling interaction.

The core question is not “can particles move?” It is:

- Do visible pressure, spreading, and displacement make the experience feel substantially more like real marbling than radial/raster/implicit shape prototypes?
- Can that physical feel be achieved without muddy particle soup, bad performance, or motion that never settles?
- Can the result still satisfy the shared standalone prototype contract: full-screen p5/HTML, blank cream surface, press/hold pigment input, curated palettes, reset, touch support, and a static settled image?

This branch should be treated as a high-risk/high-upside architecture probe. It should prioritize clear comments around force calculation, particle injection, splatting, damping, and settle logic so future reviewers can judge the model rather than reverse-engineering magic constants.

## Architecture summary

Use a standalone p5.js sketch that represents pigment as many lightweight particles/tracers on a 2D surface. A user press creates an injection event; hold duration controls pigment mass and pressure. New pigment adds particles and applies a short-lived radial pressure impulse that can push existing particles away.

The prototype renders particles by splatting them into one or more offscreen p5 graphics buffers, then compositing those buffers onto a cream paper/water background with pigment washes and darker rims. The simulation should damp velocities until particles become effectively still. Once no input is active and velocities fall below a threshold, the composition should stop mutating and become visually static.

Model bias:

- Prefer believable marbling behavior over strict mathematical fluid simulation.
- Avoid Navier-Stokes or dependency-heavy simulation.
- Keep code inspectable in plain JavaScript.
- Keep all core constants named and commented.
- Timebox aggressively; this prototype exists to evaluate the displacement architecture, not to become a finished engine.

## Exact files to create

Create these files only; do not implement or modify the Next.js app in this prototype pass.

```text
prototypes/marbling-particle-displacement/
  index.html
  README.md
```

Optional split files, only if `index.html` becomes too large after the first working prototype:

```text
prototypes/marbling-particle-displacement/
  index.html
  sketch.js
  styles.css
  README.md
```

Do not add package dependencies or build tooling for this branch unless the particle approach proves useful and a later task explicitly approves it.

## p5/HTML structure

`index.html` should be a self-contained static page at first.

Required structure:

- Standard HTML document with mobile viewport meta tag.
- p5.js 1.11.3 loaded from CDN.
- `p5.disableFriendlyErrors = true` before sketch setup.
- Full-window canvas.
- `pixelDensity(1)` for predictable performance.
- CSS reset:
  - `html, body { margin: 0; width: 100%; height: 100%; overflow: hidden; }`
  - `body { touch-action: none; }`
  - no visible scrollbars.
- Tiny fixed corner hint overlay or p5-drawn hint text:
  - `hold to drop · P palette · R reset`
  - include active palette name if easy.
- p5 lifecycle functions:
  - `setup()` creates canvas and offscreen buffers.
  - `draw()` runs simulation only while active, then renders/composites.
  - `windowResized()` resizes canvas and rebuilds/reprojects buffers carefully.
  - `keyPressed()` handles reset and palette cycling.
- Pointer/touch input via p5 handlers initially:
  - `mousePressed()` / `mouseReleased()`
  - `touchStarted()` / `touchEnded()`
  - return `false` from touch handlers to suppress page scrolling/zooming.

If p5 mouse/touch duplication causes double events on mobile, switch to DOM `pointerdown`/`pointerup` listeners attached to the canvas, but keep the standalone p5 sketch shape.

## Interaction model

The user-facing contract should match the shared marbling spec:

- Starts blank on a cream paper/water surface.
- Quick click/tap injects a small but visible amount of pigment at the pointer.
- Press-and-hold injects more pigment and stronger pressure, capped at a maximum.
- The drop appears immediately on press as a small preview/injection.
- On release, the final injection budget is locked and any remaining particles/pressure for that press are emitted.
- Existing pigment may be pushed, stretched, or disturbed by new pigment.
- Palette can be cycled with `P`; existing pigment keeps its original colors.
- `R` resets all particles, injection state, velocity state, and buffers.
- No undo, export, large UI panel, or Next.js integration.

Suggested hold mapping:

- Track `pressStartMs` and pointer position.
- Clamp hold duration between quick-tap floor and long-hold cap.
- Map hold normalized value to:
  - particle count / pigment mass,
  - injection radius,
  - pressure impulse radius,
  - impulse strength.
- Use an area-like curve rather than linear radius if possible, so long holds feel like more paint rather than just a larger brush.

Example target semantics for implementation, not exact required constants:

- quick tap: 40-80 particles, small injection radius, modest impulse.
- long hold: 200-500 particles, larger injection radius, stronger impulse.
- cap total particles to preserve mobile viability.

## Simulation model

Represent pigment with lightweight particle objects.

Each particle should store:

- position: `x`, `y`
- previous or velocity: `vx`, `vy`
- color/material id or direct palette color
- radius or splat size
- mass/alpha contribution
- age
- optional rest flag

Global simulation state:

- `particles[]`
- `activePress`
- `currentPaletteIndex`
- `settled` boolean
- optional spatial grid for neighbor/pressure lookup if particle count grows
- offscreen pigment buffers for rendering

### Injection

On press:

- Start `activePress` at pointer location.
- Choose the next pigment color from the active palette.
- Optionally emit a tiny seed immediately for feedback.

While held or on release:

- Compute normalized hold amount.
- Spawn particles in a disk or noisy ring around pointer.
- Apply initial outward velocity with random angular jitter.
- Apply a pressure impulse to nearby existing particles.
- Mark the simulation as not settled.

### Forces

Use simple, readable forces. Each force should be named and commented.

Recommended initial forces:

1. Radial injection pressure
   - Short-lived push outward from new drop center.
   - Affects both new and existing particles.
   - Main mechanism for visible displacement.

2. Curl/noise flow
   - Subtle wet movement while particles are active.
   - Should be damped and time-limited.
   - Must not create endless idle animation.

3. Local spreading / separation
   - Prevents particles from clumping into dots.
   - Keep cheap; use a spatial hash if needed.
   - Avoid strong repulsion that creates gas-like behavior.

4. Damping/friction
   - Critical for static settle behavior.
   - Velocity should decay predictably.

5. Boundary constraints
   - Keep particles inside canvas.
   - Damp or slide at edges rather than bouncing like arcade balls.

Avoid complex hidden magic. The implementation should clearly explain why each force exists and how it affects marbling feel.

### Settling

The system must not run forever.

Settling strategy:

- Track max or average velocity magnitude.
- Track active pressure impulse lifetimes.
- If no input is active, no impulses remain, and velocity is below threshold for a sustained number of frames, mark `settled = true`.
- When settled, skip force updates and do not mutate particle positions.
- Rendering may continue only if needed by p5, but pixels should remain stable.

If the first attempt never settles, reduce curl/noise duration, increase damping, and freeze tiny velocities to zero.

### Performance guardrails

Particle/fluid-ish displacement is the highest-risk architecture for mobile performance.

Plan for:

- `pixelDensity(1)` always.
- Hard cap on total particles.
- If cap is exceeded, remove or merge oldest/lowest-alpha particles.
- Avoid O(n²) pairwise work beyond small counts.
- Add a simple spatial hash before implementing any neighbor interaction that would otherwise scan all particles.
- Use lower-resolution offscreen splat buffers if full-res splatting is too slow.
- Provide a visible-enough result with modest particle counts, not thousands of tiny points.

## Rendering model

Particles should not read as individual dots. Rendering should make particle material look like pigment floating on water and settling onto paper.

Required approach:

- Draw a cream paper/water background with subtle grain.
- Splat pigment particles into an offscreen buffer.
- Composite pigment onto the main canvas.
- Use alpha, blur-like accumulation, or repeated soft circles to create washes.
- Add darker rims/edges where pigment density is higher or where splats overlap.
- Preserve color identity; avoid turning overlaps into muddy brown/gray.

Possible buffer setup:

- `paperLayer`: static or regenerated background grain.
- `pigmentLayer`: color splats for particles.
- `rimLayer`: darker, lower-alpha edge/rim splats.

Rendering details to test:

- Draw larger, soft translucent circles for each particle rather than single pixels.
- Use palette-specific pigment color with controlled alpha.
- Use darker/stroked small rings or duplicate splats for rim effect.
- If blur is used, keep it cheap and avoid frame-to-frame smearing that never settles.
- Once settled, freeze particle positions and render deterministic static output.

Evaluation warning: if reviewers can identify individual particles instead of pigment pools, the rendering failed even if the simulation moves well.

## Palette, reset, and static-settle behavior

### Palette

Include at least four curated palettes matching the design spec:

- Traditional marbling: indigo, oxblood, ochre, moss, cream.
- Bright playful: coral, turquoise, lemon, violet, ultramarine.
- Portfolio/brand subdued: charcoal, clay, muted teal, cream, copper.
- Monochrome ink: blue-black, gray, cream, pale wash.

Each palette should include:

- `name`
- `surface`
- `grain`
- `pigments[]`
- optional `rim` or per-pigment rim derivation.

Palette cycling with `P` affects future particles only. Existing particles keep their assigned color/material.

### Reset

Reset with `R` should:

- Clear `particles`.
- Clear active press/injection state.
- Clear pressure impulse state.
- Clear/recreate offscreen pigment buffers.
- Regenerate or reset paper layer if appropriate.
- Mark the system settled/blank.

Optional mobile reset affordance:

- A tiny corner hit zone may be added only if keyboard-less testing needs it.
- Avoid accidental resets during drawing.

### Static settle

This architecture must prove it can become still.

Acceptance for static settle:

- After drops finish moving, no visible jitter/curl continues.
- The image remains unchanged while idle.
- New interaction wakes the simulation cleanly.

If the model requires constant animation to look good, document that as a serious limitation against using particle displacement for the final architecture.

## Mobile/touch notes

Mobile/touch is a first-class target, but this prototype may expose limits.

Implementation notes:

- Use `touch-action: none` and return `false` from touch handlers.
- Keep the canvas full-screen and prevent page scroll.
- Avoid relying solely on keyboard for core creation/reset if mobile evaluation needs reset/palette; use tiny corner hit zones only if necessary.
- Use `pixelDensity(1)` regardless of device pixel ratio.
- Keep particle caps lower on small screens or detected touch devices if needed.
- Avoid expensive full-screen filters every frame.
- Test quick tap and long press; long press should not trigger browser text selection, callouts, or page zoom.

Mobile kill criteria:

- Frame rate collapses with a modest 10-15 drop composition.
- Touch interaction scrolls or zooms the page.
- Settled scenes continue burning CPU because the sim never sleeps.

## Acceptance criteria

This prototype is acceptable if it demonstrates the architecture clearly enough to compare against the other marbling prototypes.

Required:

- Opens as a static standalone p5/HTML page.
- Full-screen cream paper/water surface.
- Tiny unobtrusive hints only.
- Quick click/tap injects small pigment at pointer.
- Longer hold injects visibly more pigment and/or stronger pressure.
- New pigment visibly pushes, disturbs, or displaces existing pigment.
- Motion feels watery and meditative, not arcade-like.
- Pigment reads as marbling material, not dots or confetti.
- Colors remain curated and do not quickly become muddy soup.
- `P` cycles palettes for future pigment.
- `R` resets the canvas.
- Desktop mouse and touch input work.
- The system settles into a mostly or fully static final image.
- Performance remains acceptable with a modest number of drops.
- Comments make force and splatting decisions readable.

Architecture evaluation success:

- The prototype gives a credible answer to whether physical displacement is worth the complexity.
- Reviewers can compare its displacement feel against simpler raster/radial/implicit models.

## Known limitations to document in README

Expected limitations for this architecture:

- Particle count and splatting can be expensive on mobile.
- Exact final area/target size is harder to guarantee than raster ownership.
- Clean Voronoi-like bounded regions may be weaker than in raster/radial models.
- Particle colors can become muddy if alpha compositing is not controlled.
- Too much curl/noise can prevent settling.
- Too much separation can look like gas or insects instead of pigment.
- Too little splat smoothing exposes individual particles.
- The model is not a physically accurate fluid simulation.
- No undo/export/Next.js integration in this prototype.

## Staged implementation tasks

### Stage 1: Standalone shell and documentation

Files:

- Create `prototypes/marbling-particle-displacement/index.html`.
- Create `prototypes/marbling-particle-displacement/README.md`.

Tasks:

- Add full-screen p5 canvas.
- Add cream background and tiny hints.
- Add `setup()`, `draw()`, `windowResized()`, and `keyPressed()`.
- Add README with purpose, run command, controls, model summary, and limitations placeholder.

Verification:

- Static server opens a full-screen cream page.
- No console errors.
- Resize works.

Commit checkpoint:

- `feat(particles): add standalone prototype shell`

### Stage 2: Palette and input model

Files:

- Modify `index.html`.
- Update `README.md` controls if needed.

Tasks:

- Add curated palette objects.
- Add palette cycling with `P`.
- Add reset with `R`.
- Add mouse and touch press/release handling.
- Track hold duration and active press preview state.
- Return `false` for touch events.

Verification:

- Quick click/tap records input at pointer.
- Long hold produces a larger normalized amount.
- Palette name cycles.
- Reset clears state.

Commit checkpoint:

- `feat(particles): add palette and press-hold input`

### Stage 3: Particle injection and basic splat rendering

Files:

- Modify `index.html`.

Tasks:

- Define particle data structure.
- Spawn particles from quick tap and long hold.
- Map hold amount to particle count, radius, and color.
- Render particles as soft pigment splats, not point dots.
- Add total particle cap.

Verification:

- Quick tap creates a small pigment bloom.
- Long hold creates visibly more material.
- Pigment color uses active palette.
- Individual particles are not overly obvious.

Commit checkpoint:

- `feat(particles): render pigment splats from injected particles`

### Stage 4: Displacement forces

Files:

- Modify `index.html`.

Tasks:

- Add short-lived radial pressure impulse for each injection.
- Push nearby existing particles away from new drops.
- Add damping/friction.
- Add canvas boundary constraints.
- Add carefully commented force constants.
- If performance requires it, add a simple spatial hash for nearby particle lookup.

Verification:

- New drops visibly disturb older pigment.
- Particles stay inside canvas.
- Motion feels watery, not explosive.
- Performance remains acceptable at modest counts.

Commit checkpoint:

- `feat(particles): add displacement pressure forces`

### Stage 5: Wet flow polish and settling

Files:

- Modify `index.html`.
- Update `README.md` model/limitations.

Tasks:

- Add subtle curl/noise flow only while active.
- Add velocity threshold and sustained-frame settle detection.
- Stop mutating state when settled.
- Tune damping so motion calms down reliably.
- Freeze tiny velocities to zero.

Verification:

- Movement enriches the pigment without endless swimming.
- Composition becomes static after interaction stops.
- New interaction wakes the sim.
- No visible idle jitter.

Commit checkpoint:

- `feat(particles): add wet flow and static settling`

### Stage 6: Marbling visual pass

Files:

- Modify `index.html`.

Tasks:

- Add subtle paper grain.
- Improve pigment washes and rims.
- Tune alpha to avoid muddy soup.
- Consider separate pigment/rim buffers if needed.
- Ensure settled rendering is deterministic.

Verification:

- Screenshot reads as marbling/pigment on cream surface.
- Colors stay distinct after 10-20 drops.
- Rims/edges create organic pooled pigment feel.
- Particles do not look like confetti or smoke.

Commit checkpoint:

- `style(particles): improve pigment wash and paper grain`

### Stage 7: Mobile and comparison readiness

Files:

- Modify `index.html` if needed.
- Finalize `README.md`.

Tasks:

- Test touch quick tap and long press.
- Confirm no page scroll/zoom.
- Tune mobile particle cap if necessary.
- Document model, controls, acceptance notes, and known failure modes.
- Add comparison notes focused on whether displacement justified complexity.

Verification:

- Desktop and touch interactions satisfy the shared contract.
- README is accurate.
- No unrelated app files were modified.

Commit checkpoint:

- `docs(particles): document prototype behavior and limits`

## Verification commands

Run from the worktree root:

```bash
cd /workspace/projects/Griffinhale_git/worktrees/cabinFever-marbling-particles

git status --short

test -f prototypes/marbling-particle-displacement/index.html

test -f prototypes/marbling-particle-displacement/README.md

python3 -m http.server 8123 --directory prototypes/marbling-particle-displacement
```

Open:

```text
http://localhost:8123
```

Manual browser checks:

- Load shows cream full-screen canvas.
- No console errors.
- Quick click creates pigment.
- Long hold creates more pigment/pressure.
- New pigment pushes old pigment.
- `P` cycles palette.
- `R` resets.
- Scene eventually settles and becomes visually static.
- Touch tap/hold works without scrolling.

Optional lightweight static checks before commits:

```bash
git diff --check
git status --short
```

## Commit checkpoints

Implementation subagents should commit in small reviewable increments. Suggested sequence:

1. `feat(particles): add standalone prototype shell`
2. `feat(particles): add palette and press-hold input`
3. `feat(particles): render pigment splats from injected particles`
4. `feat(particles): add displacement pressure forces`
5. `feat(particles): add wet flow and static settling`
6. `style(particles): improve pigment wash and paper grain`
7. `docs(particles): document prototype behavior and limits`

This planning-only task should commit only this plan with:

```text
docs(particles): add implementation plan
```

## Evaluation priorities

When reviewing this branch, prioritize these questions:

1. Does physical displacement materially improve the marbling feel compared with simpler architectures?
2. Does the pigment remain readable, or does it become muddy particle soup?
3. Does performance remain acceptable on desktop and plausible on mobile?
4. Does the motion settle, or does it keep swimming forever?
5. Are the force and splatting comments readable enough that the model can be tuned or ported later?

If the answer to question 1 is weak, choose a simpler architecture. If the answer to question 1 is strong but performance/settling are weak, consider a hybrid such as particle displacement plus raster compositing/freeze.