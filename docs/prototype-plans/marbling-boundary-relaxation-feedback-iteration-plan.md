# Marbling Boundary Relaxation Feedback Iteration Plan

Date: 2026-05-08
Branch: `proto/marbling-boundary-relaxation`
Prototype folder: `prototypes/marbling-boundary-relaxation/`
Existing prototype: `prototypes/marbling-boundary-relaxation/index.html`
Feedback: interesting, but too jagged.

## Goal

Preserve the core negotiated-boundary raster-field concept while making the final image read less jagged, less stair-stepped, and more marbled. The second pass should focus on visual smoothing and seam stability, not on replacing the architecture with radial polygons, metaballs, particles, shaders, or a full fluid simulation.

The best outcome is still recognizably the boundary-relaxation prototype: drops own a raster material field, new pigment can press into existing pigment, and seams settle into static negotiated boundaries. The improvement should make those negotiated seams feel more waterlike and intentional.

## Current state to improve

Current implementation observations from the README and prototype code:

- The simulation uses an ownership raster with `cellSize` 4 on desktop and 5 on smaller screens.
- Pigment is rendered into a low-resolution `p5.Graphics` layer and scaled to the full canvas with smoothing.
- Boundary detection is cell-based via `isBoundaryCell()`.
- Rims are currently painted per boundary cell by darkening the whole low-resolution cell.
- Seam relaxation is local and capped, which is good for stability, but visual output can still expose blocky cell edges.
- The prototype already has anti-churn tools: cooldowns, no-change counters, and static settle behavior.

Likely causes of perceived jaggedness:

1. Simulation cells are large enough that boundary steps remain visible after scaling.
2. Boundary rim treatment emphasizes whole square cells, making stair-steps more obvious.
3. The renderer has only one pigment layer and no intermediate alpha/coverage field.
4. Smoothness scoring discourages checkerboards but does not strongly remove one-cell teeth, bays, and diagonal staircases.
5. Boundary cells change ownership discretely, and immediate rendering shows every discrete move.

## Non-goals

Do not implement a different prototype family in this pass:

- No radial polygon implementation.
- No shader/SDF rewrite.
- No metaball field replacement.
- No particle/fluid simulation.
- No Next.js integration.
- No export, undo, gallery, or UI expansion beyond tiny hints/debug support.

Keep the pass understandable and prototype-sized. If an option creates too much complexity, prefer the simpler visual smoothing path.

## Exact files expected to change in the future implementation pass

Primary files:

- `prototypes/marbling-boundary-relaxation/index.html`
- `prototypes/marbling-boundary-relaxation/README.md`

Planning/documentation files:

- `docs/prototype-plans/marbling-boundary-relaxation-feedback-iteration-plan.md` (this plan)

Optional only if the single HTML file becomes hard to review:

- `prototypes/marbling-boundary-relaxation/sketch.js`
- `prototypes/marbling-boundary-relaxation/styles.css`

Do not modify the Next.js app for this iteration.

## Strategy

Use layered smoothing in this order:

1. Slightly smarter simulation/render resolution.
2. A derived coverage/alpha field from ownership neighbors.
3. Softer, narrower rims that follow contours instead of darkening square cells.
4. A small post-process blur/feather on the pigment layer.
5. Optional marching-squares-ish outline only if the above still reads jagged.
6. Anti-flicker safeguards so smoothing does not hide ongoing churn.

This keeps the simulation model simple while improving the displayed image substantially.

## Rendering direction

### Higher or smarter render resolution

Keep simulation low-resolution enough to perform, but render at an intermediate resolution higher than the simulation grid.

Recommended first attempt:

- Keep simulation `cellSize` at 4 desktop / 5 mobile if performance is fragile.
- Create a separate `renderLayer` or `coverageLayer` at `renderScale = 2` relative to simulation grid.
- For each simulation cell, write a 2x2 block with coverage influenced by neighbor ownership.
- Scale the render layer to the canvas with image smoothing enabled.

Alternative if performance is acceptable:

- Change desktop `cellSize` from 4 to 3.
- Keep mobile at 5 or use adaptive sizing based on `cellCount`.
- Cap maximum grid size to avoid runaway cost on large displays.

Acceptance: boundaries should no longer read as obvious 4-5 px square stairs on desktop.

### Coverage and contour smoothing

Add a derived visual coverage pass without changing ownership:

- For each occupied cell, count same-owner neighbors in an 8-neighborhood.
- Interior cells get high alpha.
- Boundary cells get alpha based on local same-owner density.
- Diagonal-only connections should be feathered more softly than cardinal connections.
- Empty cells next to pigment may receive a tiny translucent wash if it helps soften the edge, but they must not become owned cells.

This makes the display smoother while preserving the negotiated material field as the source of truth.

Suggested helper functions:

- `sameOwnerNeighborCount(x, y, ownerId)`
- `boundaryCoverage(x, y, ownerId)`
- `renderCoveragePixel(renderX, renderY, ownerId, coverage)`

### Feathered rims

Change rim treatment so it stops emphasizing full square boundary cells.

Preferred approach:

- Render pigment fill first with softened alpha.
- Render rim on a separate transparent layer or second pass.
- Rim alpha should be strongest only where a cell touches another owner, not where it touches empty paper unless that looks better in QA.
- Rim should be thin and semi-transparent, more like dye pooling than a hard border.
- Blend rim color into pigment with lower weight than the current full-cell darkening.

Suggested tuning:

- Interior pigment alpha: roughly 165-185.
- Feather alpha: roughly 55-130 depending on coverage.
- Rim alpha: roughly 45-95.
- Rim blend: roughly 0.12-0.22 into dark rim color, not 0.28 across a whole cell.

Acceptance: rims should add marbling definition without outlining every staircase.

### Small blur or dilation/erosion post-process

If coverage smoothing is not enough, add a tiny static post-process to the pigment layer:

- Apply a very small blur to the render layer after writing pigment, ideally only on the display layer.
- Avoid repeated cumulative blur. Rebuild from ownership each dirty render.
- If p5 `filter(BLUR, value)` is too broad or expensive, use one cheap custom alpha average over the render layer.
- Keep blur stable: no time-varying noise and no blur accumulation after settle.

Recommended limit:

- Desktop: 0.6-1.1 px visual blur equivalent.
- Mobile: skip or reduce blur if it affects responsiveness.

Acceptance: a still settled composition should remain crisp enough to read pigment boundaries, but not pixel-grid jagged.

### Marching-squares-ish outline option

Only use this if the simpler coverage/feather pass still looks too jagged.

Prototype-friendly option:

- For each boundary between two owners, emit short contour segments into a high-resolution rim layer.
- Use the 2x2 ownership pattern around each grid corner to choose a small line segment.
- Draw with rounded caps, low alpha, and stable color.
- Keep this as rendering only; do not alter ownership or relaxation.

Do not build a complete polygon extractor unless necessary. The goal is a visually smoother seam, not production geometry.

## Relaxation/simulation direction

Rendering is the main fix, but a small amount of seam cleanup can reduce true geometric jaggedness.

### Smoothness score tuning

Adjust `smoothnessGain()` or add a separate tooth penalty:

- Penalize cells that would create one-cell protrusions.
- Reward moves that fill one-cell notches along an active seam.
- Increase weight for cardinal-neighbor coherence over diagonal-only coherence.
- Keep the energy score simple and commented.

Suggested helpers:

- `countCardinalOwnerNeighbors(x, y, ownerId)`
- `countDiagonalOwnerNeighbors(x, y, ownerId)`
- `toothPenaltyIfClaimed(x, y, claimantId, victimId)`
- `notchFillGain(x, y, claimantId)`

Acceptance: relaxation should reduce obvious one-cell teeth without making drops circular, blobby, or over-smoothed.

### Post-claim seam cleanup

After a relaxation move is accepted:

- Queue neighbors in a slightly larger radius around the moved cell.
- Consider a very small cleanup budget dedicated to notch/tooth fixes near active seams.
- Respect cooldowns and improvement thresholds.
- Never scan the full grid for global smoothing during active simulation.

Acceptance: local seam cleanup should not produce visible flicker or global churn.

### Anti-flicker and static settle

The feedback was jaggedness, not necessarily flicker, but smoothing changes can expose or hide motion. Preserve the existing anti-churn behavior:

- Keep per-cell cooldowns.
- Keep no-change settling.
- Require a positive energy threshold for ownership changes.
- Do not animate noise or rendering after settle.
- Rebuild smoothed layers only when `dirty` or active press changes.

Add optional debug metrics:

- number of changed cells this frame,
- number of seam candidates,
- render layer dimensions,
- blur/coverage mode.

Debug remains off by default.

## Staged implementation tasks

### Task 1: Baseline jaggedness audit

Files:

- `prototypes/marbling-boundary-relaxation/index.html`
- `prototypes/marbling-boundary-relaxation/README.md`

Work:

- Run the current prototype locally.
- Create 10-20 drops using the shared QA script.
- Note whether jaggedness comes mainly from square fill edges, dark rims, true relaxation teeth, or all three.
- Add a short README note in the future implementation commit describing the observed cause and chosen smoothing path.

Verification:

```bash
cd /workspace/projects/Griffinhale_git/worktrees/cabinFever-marbling-relaxation/prototypes/marbling-boundary-relaxation
python3 -m http.server 8123
```

Open:

```text
http://localhost:8123
```

Manual checks:

- Quick tap center.
- Long hold near center.
- Add adjacent drops.
- Add a drop partially inside existing pigment.
- Add 10-20 drops and wait for settle.

Commit checkpoint:

- `docs(relaxation): record jaggedness audit`

### Task 2: Add intermediate render resolution and coverage pass

Files:

- `prototypes/marbling-boundary-relaxation/index.html`

Work:

- Split simulation resolution from render-layer resolution.
- Add constants such as `RENDER_SCALE = 2` and a maximum render pixel budget.
- Replace direct one-cell-to-one-pixel pigment rendering with a coverage-aware render pass.
- Keep ownership as the only source of truth.
- Ensure render buffers are recreated only on resize/init, not every frame.

Verification:

- Prototype still opens without console errors.
- Drops appear at the pointer.
- Settled image remains static.
- Render layer dimensions are reasonable on desktop and mobile-sized viewports.
- Boundaries are visibly smoother than the original.

Commit checkpoint:

- `style(relaxation): smooth ownership raster rendering`

### Task 3: Replace hard square rims with feathered seam rims

Files:

- `prototypes/marbling-boundary-relaxation/index.html`

Work:

- Stop darkening every boundary cell as a full square.
- Add a separate rim computation or second pass with lower alpha and thinner apparent width.
- Prefer owner-owner seams over owner-empty paper edges for strong rim emphasis.
- Keep rim color stable per drop/palette.

Verification:

- Adjacent drops still have readable negotiated seams.
- Rims no longer make stair-steps more obvious.
- Pigment still feels like marbling rather than flat blurred blobs.
- No extra animation after settle.

Commit checkpoint:

- `style(relaxation): feather negotiated boundary rims`

### Task 4: Tune local seam smoothness, not global shape

Files:

- `prototypes/marbling-boundary-relaxation/index.html`

Work:

- Add a small tooth/notch term to the relaxation score.
- Prefer cardinal continuity to diagonal-only bridges.
- Keep the negotiated push behavior visible; do not simply circularize everything.
- Comment each new energy term.

Verification:

- New drops still squeeze or nudge existing regions.
- One-cell spikes and sawtooth seams are reduced.
- No checkerboard flicker.
- No full-grid smoothing pass runs during interaction.

Commit checkpoint:

- `feat(relaxation): reduce jagged seam artifacts`

### Task 5: Add optional tiny static blur or contour line if needed

Files:

- `prototypes/marbling-boundary-relaxation/index.html`

Work:

Choose only one if Tasks 2-4 are insufficient:

Option A: tiny blur

- Rebuild pigment/rim layer from ownership.
- Apply a small non-accumulating blur/alpha average.
- Skip or reduce on mobile if performance drops.

Option B: marching-squares-ish rim

- Draw low-alpha rounded contour segments along owner-owner boundaries.
- Use only local 2x2 ownership patterns.
- Keep it rendering-only.

Verification:

- Smoother seams without muddying colors.
- No visible performance regression with 10-20 drops.
- No flicker or moving noise after settle.

Commit checkpoint:

- `style(relaxation): add soft contour finishing pass`

### Task 6: README update and comparison notes

Files:

- `prototypes/marbling-boundary-relaxation/README.md`

Work:

- Document the second-pass smoothing approach.
- Mention that the raster ownership field remains the source of truth.
- Add limitations: smoothing can hide but not eliminate discrete ownership, extreme crowding can still form hard seams, and render-layer scaling has a performance tradeoff.
- Record whether the prototype now addresses the feedback: interesting but too jagged.

Verification:

- README accurately describes the implemented controls and rendering.
- README does not claim a fluid simulation or shader/SDF model.

Commit checkpoint:

- `docs(relaxation): document smoothing iteration`

## Final verification commands for implementation pass

Repository status:

```bash
cd /workspace/projects/Griffinhale_git/worktrees/cabinFever-marbling-relaxation
git status --short --branch
```

Serve standalone prototype:

```bash
cd /workspace/projects/Griffinhale_git/worktrees/cabinFever-marbling-relaxation/prototypes/marbling-boundary-relaxation
python3 -m http.server 8123
```

Open:

```text
http://localhost:8123
```

Optional static file smoke check:

```bash
cd /workspace/projects/Griffinhale_git/worktrees/cabinFever-marbling-relaxation
python3 - <<'PY'
from pathlib import Path
p = Path('prototypes/marbling-boundary-relaxation/index.html')
text = p.read_text()
assert '<!doctype html>' in text.lower()
assert 'p5' in text.lower()
assert 'function setup' in text
assert 'function draw' in text
print('standalone html smoke check passed')
PY
```

Manual QA script:

1. Load blank cream surface.
2. Quick tap center.
3. Long hold near center.
4. Add two adjacent drops to test negotiated seams.
5. Add one drop inside or partially inside existing pigment.
6. Add one near canvas edge.
7. Add 10-20 total drops.
8. Cycle palette and add another drop.
9. Reset.
10. Repeat on a mobile-sized viewport.
11. Wait for settling and verify no flicker/churn.
12. Compare against the original feedback: seams should be less jagged while still showing negotiated boundaries.

## Acceptance criteria for round two

- The prototype still runs as a standalone static p5/HTML page.
- The simulation remains an ownership/mass raster with local boundary relaxation.
- User can still tap/hold to create different-sized drops.
- New drops still negotiate, squeeze, or slightly push neighboring regions.
- Boundaries appear significantly less jagged in normal viewing.
- Rims look feathered and dye-like, not hard square outlines.
- One-cell teeth and checkerboard artifacts are reduced.
- Settled compositions become visually static.
- Desktop and touch-sized viewport performance remain acceptable with 10-20 drops.
- The implementation remains understandable and documented.

## Risks and fallback choices

Risk: Higher render resolution slows mobile.

Fallback:

- Keep simulation `cellSize` mobile at 5.
- Reduce `RENDER_SCALE` to 1 on small screens.
- Skip optional blur on mobile.

Risk: Coverage smoothing makes boundaries too soft or muddy.

Fallback:

- Reduce feather alpha.
- Keep interiors more opaque.
- Use thin contour/rim accents only on owner-owner seams.

Risk: Seam smoothness tuning makes all drops too circular.

Fallback:

- Lower tooth/notch score weights.
- Preserve stable noise in growth and relaxation.
- Apply smoothing visually rather than changing ownership aggressively.

Risk: Anti-jagged cleanup introduces flicker.

Fallback:

- Increase cooldowns.
- Raise the relaxation score threshold.
- Limit cleanup to newly moved seam neighborhoods.
- Prioritize rendering-only smoothing.

## Commit plan

This planning task should be committed as:

- `docs(relaxation): add feedback iteration plan`

Future implementation commits should be small and reviewable:

1. `docs(relaxation): record jaggedness audit`
2. `style(relaxation): smooth ownership raster rendering`
3. `style(relaxation): feather negotiated boundary rims`
4. `feat(relaxation): reduce jagged seam artifacts`
5. `style(relaxation): add soft contour finishing pass` (optional)
6. `docs(relaxation): document smoothing iteration`

Before final handoff of the implementation pass, run the local server and complete the manual QA script above.
