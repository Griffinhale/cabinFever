# Marbling Particle Displacement Feedback Iteration Plan

Date: 2026-05-08
Prototype: particle displacement, round-two feedback pass
Branch: `proto/marbling-particle-displacement`
Prototype folder: `prototypes/marbling-particle-displacement/`
Existing implementation plan: `docs/prototype-plans/marbling-particle-displacement-implementation-plan.md`

## Feedback summary

The particle displacement prototype was one of the two approaches the user said "worked best". The other strongest result was the radial prototype. The feedback does not ask for a conceptual rewrite; it says to preserve the successful feel while reducing the highest risks.

Comparison notes from the full round:

1. Raster: cool, but not consistently circular enough.
2. Radial: worked best.
3. Shader/SDF: did not load.
4. Metaballs: great, but laggy.
5. Relaxation: interesting, but too jagged.
6. Particles: worked best.

Round two should therefore keep the physical/water displacement behavior that made particles successful, but make the implementation safer: less lag, fewer particles/overdraw spikes, clearer quality tiers, stronger settle behavior, and a path to rasterizing old pigment so the scene does not keep paying full particle-render cost forever.

## Round-two goal

Improve the existing standalone p5 particle prototype without changing its core appeal:

- Preserve: press/hold pigment input, visible physical displacement, watery drift, pooled pigment/rim look, curated palettes, static settled image, full-screen standalone prototype.
- Improve: frame stability, particle cap behavior, render overdraw, mobile/touch risk, deterministic settling, visual continuity when old particles are culled or frozen.
- Avoid: a full app integration, dependency additions, heavy fluid solvers, shader-only rewrites, or changing the prototype into the radial model.

The architecture target is a hybrid particle/raster sketch:

- Recent and active pigment remains particle-based so new drops can push and stretch nearby material.
- Quiet old pigment can be baked into a cached raster splat layer so settled areas remain visible but no longer need per-frame particle simulation and full splat redraw.
- Quality tiers choose particle cap, splat scale, cache resolution, and update cadence based on screen size/touch/device pressure.

## Exact files to modify or create

Round-two implementation should be limited to the standalone prototype and its docs unless a later task explicitly expands scope.

Modify:

```text
prototypes/marbling-particle-displacement/index.html
prototypes/marbling-particle-displacement/README.md
```

Create only if the single HTML file becomes too hard to review:

```text
prototypes/marbling-particle-displacement/sketch.js
prototypes/marbling-particle-displacement/styles.css
```

Do not modify:

```text
src/app/**
package.json
package-lock.json
next.config.mjs
tsconfig.json
```

Planning-only output for this task:

```text
docs/prototype-plans/marbling-particle-displacement-feedback-iteration-plan.md
```

## Preserve what worked

The first pass appears to have succeeded because it was not just drawing expanding circles. It created a convincing sense that pigment was floating on water and that new pigment physically disturbed older pigment.

Do not regress these behaviors:

- New drops must visibly shove, stretch, or open space in existing pigment.
- Press-and-hold must feel like adding more paint, not simply scaling a static brush.
- Motion should stay calm and meditative, not explosive or arcade-like.
- Pigment should read as soft pooled material with darker rims, not dots/confetti.
- The scene must settle to a static final image when idle.
- Existing pigment must keep its assigned colors after palette changes.
- The standalone prototype should remain easy to open from `prototypes/marbling-particle-displacement/`.

## Main risks to reduce

### 1. Lag from too many live particles

Current README already notes particle caps and oldest-particle culling. Round two should make this more intentional:

- Replace one global particle cap with tiered caps.
- Track active, cooling, and baked particles separately.
- Bake old/quiet particles into a raster cache before dropping them, so culling does not visually erase pigment mass.
- Keep active particle count low enough that pressure, separation, and rendering remain responsive.

### 2. Overdraw from full redraw splatting

The current render path clears and redraws all particle splats into full-size offscreen layers every frame. This preserves correctness, but it scales poorly.

Round-two options:

- Keep full redraw only for active particles.
- Add a persistent `bakedPigmentLayer` and `bakedRimLayer` for settled/retired pigment.
- Composite order: paper -> baked pigment -> active pigment -> active rim -> overlay.
- Consider a lower-resolution active splat buffer for low/mobile tiers, then draw it scaled up.
- Avoid expensive full-canvas filters every frame.

### 3. Simulation cost and neighbor lookup

The current spatial hash is good. Round two should make the force budget stricter:

- Apply separation only to active particles or particles near live impulses.
- Limit neighbor checks with a small per-particle maximum.
- Skip wet curl on low tiers after a short age window.
- Skip all force work when there is no input, no impulse, and no active velocity.
- Add simple counters in the overlay while tuning: active particles, baked particles, tier, and settled state.

### 4. Settling reliability

The prototype only remains viable if it sleeps. Round two should make settle behavior more robust:

- Distinguish `settled`, `cooling`, and `active` states.
- Freeze tiny velocities earlier.
- Retire particles to baked raster when below speed threshold for a sustained local window.
- Confirm `noLoop()` is reached after idle settle.
- Make new input wake the sim and only affect active/neighborhood particles, not force a costly full scene reactivation.

### 5. Mobile/touch quality risk

The first pass included touch handling and mobile caps, but user feedback flagged lag in metaballs and particles are also at risk. Round two should make degradation graceful:

- Define quality tiers up front.
- Use conservative defaults on touch/small screens.
- Provide a manual quality cycle key only if helpful for comparison, e.g. `Q quality`, without cluttering the UI.
- Keep touch hit zones for palette/reset if they are already working.
- Ensure browser scroll/zoom remains suppressed.

## Proposed quality tiers

Use named tier constants instead of scattered magic numbers.

```text
high desktop
- active particle cap: 1800-2200
- total visible baked budget: raster only, no active cost
- active splat buffer scale: 1.0
- separation checks: enabled for active/neighborhood particles
- wet curl: enabled but time-limited
- target: best comparison visuals

balanced default
- active particle cap: 1100-1500
- active splat buffer scale: 0.75-1.0
- separation checks: limited
- wet curl: short window only
- target: default desktop and larger tablets

low mobile
- active particle cap: 650-950
- active splat buffer scale: 0.5-0.75
- separation checks: minimal or impulse-neighborhood only
- wet curl: reduced or disabled after release
- target: stable touch interaction and no runaway lag
```

Tier selection:

- Start with low tier when `navigator.maxTouchPoints > 0` or `min(width, height) < 760`.
- Start with balanced tier on normal desktop.
- Use high only on larger screens when performance appears stable.
- Optional: allow `Q` to cycle tiers for testing and update the hint/overlay.

## Hybrid rasterized splat cache

This is the most important round-two architecture improvement.

### New buffers

Add persistent baked buffers:

```text
paperLayer          static surface/grain
bakedPigmentLayer   retired pigment color splats
bakedRimLayer       retired rim splats
activePigmentLayer  current live particle splats
activeRimLayer      current live rim splats
```

If memory becomes a concern, keep only one baked layer and one active layer at low tier, or lower the active layer resolution.

### Particle lifecycle

Add lifecycle fields or derive them clearly:

```text
state: "active" | "cooling" | "baked"
quietFrames: number
lastImpulseFrame: number
```

A particle should be eligible for baking when:

- no active press is affecting it,
- it is outside current impulse radius or all impulses are expired,
- speed remains below a threshold for enough frames,
- age is past a short minimum so fresh drops do not bake immediately.

When baking:

- Draw its final pigment/rim contribution into `bakedPigmentLayer` / `bakedRimLayer`.
- Remove it from the live `particles[]` array.
- Increment a `bakedParticleCount` diagnostic counter.
- Do not mutate baked pixels until reset/resize/palette surface regeneration.

### Important caveat

Baked pigment cannot be physically displaced unless it is rehydrated or approximated. Preserve the successful displacement feel by delaying baking near recent drops:

- Keep particles live for a local area around active/new drops.
- On injection, only nearby live/cooling particles need to move.
- Do not attempt a complex baked-layer warp in this pass unless performance is already stable.
- If old baked pigment not moving feels wrong, document it and consider a later local raster-warp experiment.

## Staged implementation tasks

### Stage 1: Baseline instrumentation and safety constants

Files:

```text
prototypes/marbling-particle-displacement/index.html
prototypes/marbling-particle-displacement/README.md
```

Tasks:

- Add named quality tier config objects.
- Move particle caps, damping, splat scale, curl strength, and separation limits into tier config.
- Add lightweight diagnostics to the existing overlay: tier, live particle count, baked count, settled/cooling state.
- Add optional `Q` quality cycle if it helps compare tiers; keep the visible hint tiny.
- Keep current visuals and controls otherwise unchanged.

Verification:

```bash
cd /workspace/projects/Griffinhale_git/worktrees/cabinFever-marbling-particles
git diff --check
python3 - <<'PY'
from pathlib import Path
html = Path('prototypes/marbling-particle-displacement/index.html').read_text()
script = html.split('<script>', 1)[1].split('</script>', 1)[0]
Path('/tmp/marbling-particles-round2-stage1.js').write_text(script)
PY
node --check /tmp/marbling-particles-round2-stage1.js
python3 -m http.server 8123 --directory prototypes/marbling-particle-displacement
```

Manual checks:

- Existing quick tap, long hold, palette, reset, touch behavior still work.
- Overlay reports tier and particle counts.
- No obvious visual regression from round one.

Commit checkpoint:

```text
feat(particles): add quality tiers and diagnostics
```

### Stage 2: Active render budget and lower-resolution splat option

Files:

```text
prototypes/marbling-particle-displacement/index.html
prototypes/marbling-particle-displacement/README.md
```

Tasks:

- Rename current pigment/rim buffers to active buffers or clearly document their active role.
- Support tier-controlled active buffer scale if performance needs it.
- Keep `pixelDensity(1)` on all buffers.
- Render active buffers at lower resolution on low tier and composite scaled to canvas.
- Avoid changing the paper layer resolution unless memory/performance requires it.
- Tune splat radius/alpha per tier so lower-res rendering still reads as soft pigment, not blocky blobs.

Verification:

```bash
git diff --check
node --check /tmp/marbling-particles-round2-stage2.js
```

Use the same script-extraction command as Stage 1 with the updated output path before running `node --check`.

Manual checks:

- Pigment still reads as pooled/watery, not pixelated.
- Low tier has visibly lower cost but acceptable appearance.
- Existing particle displacement is still noticeable.

Commit checkpoint:

```text
perf(particles): add tiered active splat rendering
```

### Stage 3: Rasterized baked splat cache

Files:

```text
prototypes/marbling-particle-displacement/index.html
prototypes/marbling-particle-displacement/README.md
```

Tasks:

- Add persistent `bakedPigmentLayer` and `bakedRimLayer`.
- Add per-particle quiet tracking or equivalent lifecycle state.
- Bake quiet particles into persistent layers once eligible.
- Remove baked particles from `particles[]` so simulation/render cost drops.
- Ensure reset clears baked layers.
- Ensure resize handles baked content intentionally:
  - acceptable prototype behavior: clear baked pigment on resize and document it, or
  - better behavior: copy old baked layers into resized buffers proportionally.
- Update README to explain the hybrid particle/raster strategy.

Verification:

```bash
git diff --check
node --check /tmp/marbling-particles-round2-stage3.js
```

Manual checks:

- After drops settle, live particle count decreases while visible pigment remains.
- New drops still displace recent/live pigment.
- Baked pigment does not disappear when particle cap is reached.
- Reset clears both live and baked pigment.
- Scene still reaches `settled`/`noLoop()`.

Commit checkpoint:

```text
perf(particles): cache settled pigment splats
```

### Stage 4: Force-budget tuning and improved settling

Files:

```text
prototypes/marbling-particle-displacement/index.html
prototypes/marbling-particle-displacement/README.md
```

Tasks:

- Restrict separation to active/cooling particles and/or particles near live impulses.
- Keep pressure impulse as the dominant displacement force.
- Reduce curl duration and strength on low/balanced tiers.
- Add a clearer lifecycle state: active during input/impulses, cooling during residual motion, settled when asleep.
- Freeze tiny velocities consistently before they cause visual jitter.
- Confirm `noLoop()` is called when settled and `loop()` is called on new input, reset, resize, palette change, and quality change.

Verification:

```bash
git diff --check
node --check /tmp/marbling-particles-round2-stage4.js
```

Manual checks:

- 10-20 drop composition remains responsive.
- No endless shimmer or hidden CPU burn when idle.
- New input wakes the simulation cleanly.
- Motion remains watery rather than stiff.
- Pressure still visibly opens/displaces nearby pigment.

Commit checkpoint:

```text
perf(particles): tighten force budget and settling
```

### Stage 5: Visual preservation pass

Files:

```text
prototypes/marbling-particle-displacement/index.html
prototypes/marbling-particle-displacement/README.md
```

Tasks:

- Tune alpha/rim/splat size after caching so baked and active pigment look continuous.
- Ensure recent drops remain circular enough to compete with the radial prototype while preserving organic displacement.
- Avoid jagged relaxation-like boundaries.
- Avoid metaball-style lag from over-smooth huge blobs.
- Keep colors distinct after many drops.
- Document any tradeoff where baked older pigment cannot be displaced as strongly as live pigment.

Verification:

```bash
git diff --check
node --check /tmp/marbling-particles-round2-stage5.js
```

Manual comparison script:

1. Quick tap in center.
2. Long hold near center.
3. Add two adjacent drops.
4. Add a drop inside/near existing pigment and watch displacement.
5. Add a drop near an edge.
6. Add 10-20 drops across the canvas.
7. Wait for settle and confirm the image is static.
8. Cycle palette and verify old pigment keeps its colors.
9. Reset.
10. Repeat on low/touch tier if available.

Commit checkpoint:

```text
style(particles): preserve watery pigment feel after caching
```

### Stage 6: Documentation and final comparison notes

Files:

```text
prototypes/marbling-particle-displacement/README.md
```

Tasks:

- Update architecture notes for quality tiers and baked raster cache.
- Document controls, including `Q` if added.
- Document known limitations:
  - baked pigment is cheaper but less physically re-displaceable,
  - exact final area remains emergent,
  - low tier trades fidelity for responsiveness,
  - real-device testing is still required if not performed.
- Add a short round-two evaluation note: particles worked best because of physical/water feel; this pass focuses on preserving that while reducing lag risk.

Verification:

```bash
git diff --check
git status --short
```

Commit checkpoint:

```text
docs(particles): document feedback iteration behavior
```

## Final verification commands

Run from the worktree root:

```bash
cd /workspace/projects/Griffinhale_git/worktrees/cabinFever-marbling-particles

git status --short

test -f prototypes/marbling-particle-displacement/index.html
test -f prototypes/marbling-particle-displacement/README.md
test -f docs/prototype-plans/marbling-particle-displacement-feedback-iteration-plan.md

python3 - <<'PY'
from pathlib import Path
html = Path('prototypes/marbling-particle-displacement/index.html').read_text()
script = html.split('<script>', 1)[1].split('</script>', 1)[0]
Path('/tmp/marbling-particles-round2-final.js').write_text(script)
PY
node --check /tmp/marbling-particles-round2-final.js

git diff --check
python3 -m http.server 8123 --directory prototypes/marbling-particle-displacement
```

Open:

```text
http://localhost:8123
```

Manual acceptance checks:

- Full-screen cream/water surface loads without console errors.
- Quick tap creates immediate pigment.
- Long hold creates more pigment and pressure.
- New drops still visibly disturb existing live pigment.
- Visual style remains soft, circular/pigment-like, and watery.
- Active particle count is bounded by tier.
- Old quiet pigment can remain visible after live particle retirement.
- 10-20 drop composition remains usable on the selected tier.
- Idle scene becomes static and the sketch sleeps.
- Palette cycling affects future pigment only.
- Reset clears live particles, baked layers, impulses, and settle state.
- Touch tap/hold does not scroll or zoom the page.

## Round-two acceptance criteria

The feedback iteration is successful if:

- It still feels like one of the best prototypes because of physical/water displacement.
- Lag risk is reduced through active particle caps, quality tiers, and/or baked raster cache.
- Particle culling no longer obviously erases old artwork.
- Settled scenes become static and cheap.
- The prototype remains standalone and easy to compare with radial.
- The README clearly documents how the performance safeguards work.

## Kill or defer criteria

Do not keep adding complexity if these happen:

- The hybrid cache makes the interaction feel less alive than the current prototype.
- Baked/live visual seams are more distracting than particle lag.
- Low tier becomes too muddy/blocky to evaluate.
- Displacement only works when all particles stay live, making the approach unsuitable for mobile.

If one of these occurs, document the limitation and consider using the radial prototype as the base with a small particle-inspired displacement accent rather than promoting full particle displacement.

## Commit checkpoints for implementation pass

Suggested implementation sequence:

1. `feat(particles): add quality tiers and diagnostics`
2. `perf(particles): add tiered active splat rendering`
3. `perf(particles): cache settled pigment splats`
4. `perf(particles): tighten force budget and settling`
5. `style(particles): preserve watery pigment feel after caching`
6. `docs(particles): document feedback iteration behavior`

This planning-only task should commit only this plan with:

```text
docs(particles): add feedback iteration plan
```
