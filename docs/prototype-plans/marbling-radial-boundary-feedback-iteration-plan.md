# Marbling Radial Boundary Feedback Iteration Plan

Date: 2026-05-08
Branch: `proto/marbling-radial-boundary`
Worktree: `/workspace/projects/Griffinhale_git/worktrees/cabinFever-marbling-radial`
Prototype folder: `prototypes/marbling-radial-boundary/`
Status: round-two plan only; do not implement prototype code in this commit

## Feedback context

User feedback by prototype order:

1. Raster: cool but not consistently circular enough.
2. Radial boundary: worked best.
3. Shader: did not load.
4. Metaballs: great but laggy.
5. Relaxation: interesting but too jagged.
6. Particles: worked best.

This plan is for prototype 2, radial boundary. Since it worked best, the round-two pass should preserve the current architecture and improve polish, consistency, and mobile/touch feel. Do not radically replace sampled radial growth with raster ownership, metaballs, full particle simulation, or boundary relaxation.

## Current prototype summary

Existing files:

- `prototypes/marbling-radial-boundary/index.html`
- `prototypes/marbling-radial-boundary/README.md`
- `docs/prototype-plans/marbling-radial-boundary-implementation-plan.md`
- `docs/prototype-plans/marbling-radial-boundary-review-notes.md`

Current implementation strengths to preserve:

- Standalone p5/HTML prototype with no build step and no Next.js integration.
- Press/tap creates pigment at the pointer location.
- Hold duration maps to area/paint amount and target radius.
- Drops grow visibly and slowly after release.
- Sampled radial rays stop at target size, canvas edge, and neighboring radial regions.
- Settled compositions become static via `noLoop()`.
- Stable visual-only boundary modulation avoids idle wobble.
- Curated palette cycling affects future drops only, preserving settled compositions.
- Touch handlers exist and suppress page scroll in the standalone page.

Current limitations to address without changing architecture:

- Geometry can still read as star-shaped or amoeba-like if edge modulation is too uneven.
- Neighbor seams are approximate and can show tiny gaps/overlaps.
- Circular growth should feel more consistently smooth and meditative because circularity was the main weakness in another prototype and a strength here.
- Mobile users have no touch-accessible reset/palette controls.
- Particle prototype also worked best, so a tiny particle-inspired wash may help, but only as cheap rendering polish, not a simulation rewrite.

## Round-two goal

Double down on why radial boundary worked: calm circular expansion with organic marbling edges.

The iteration should make the prototype feel:

- more consistently circular during early and mid growth,
- smoother and less jagged at the rim,
- more meditative in growth timing,
- more polished at contact seams and canvas edges,
- slightly more fluid/pigment-like through low-cost wash details,
- better on touch/mobile without adding a heavy UI.

## Non-goals

Do not do these in the round-two implementation:

- Do not rewrite the prototype into raster, metaball, particle, shader, or relaxation architecture.
- Do not add dependencies, package scripts, or Next.js app integration.
- Do not add complex panels, sliders, export, undo/redo, or persistent settings.
- Do not introduce perpetual idle animation after settlement.
- Do not add expensive per-pixel effects every frame.
- Do not use high-count independent particles as simulation state.
- Do not make the boundary jaggier in pursuit of organic detail.

## Exact files to modify during implementation

Primary implementation files:

- `prototypes/marbling-radial-boundary/index.html`
- `prototypes/marbling-radial-boundary/README.md`

Documentation/planning files for this plan-only commit:

- `docs/prototype-plans/marbling-radial-boundary-feedback-iteration-plan.md`

Only modify additional files if an implementation stage uncovers a clear need. If that happens, document the reason in the implementation commit body.

## Proposed implementation approach

### 1. Cleaner circular growth envelope

Purpose: preserve radial boundary as the winning behavior and make it feel intentionally circular rather than randomly lumpy.

Implementation notes for `index.html`:

- Keep `SAMPLE_COUNT` near the current 192 unless performance testing proves a small change is needed.
- Add a stronger separation between simulation radius and visual edge noise:
  - simulation radii should grow smoothly and monotonically;
  - visual modulation should stay bounded and only decorate the contour.
- Reduce early-growth edge noise amplitude so small/young drops read as clean circles.
- Scale visual jitter by growth progress, for example:
  - near start: almost circular;
  - mid/settled: subtle organic rim variation;
  - never spiky.
- Consider smoothing the rendered radii with a small circular neighbor average before drawing, without altering collision radii.
- Keep target radius as the hard cap for simulation rays.

Acceptance notes:

- A quick tap should create a clean small circular pigment mark.
- A long hold should expand as a smooth circle first, then gain mild organic character.
- Edge noise should not create a jagged or starburst silhouette.

### 2. More meditative expansion timing

Purpose: emphasize the calm growth that made radial work well.

Implementation notes for `index.html`:

- Tune `growthRate` and `growthJitter` so drops visibly bloom but do not crawl.
- Reduce per-ray growth variance if it makes the perimeter uneven during expansion.
- Add an ease-out feel as rays approach target radius, but keep the final settle reliable.
- Keep `noLoop()` / `wake()` behavior intact.
- Avoid animation after all drops settle.

Suggested tuning direction:

- Decrease the spread in `growthJitter` from the current broad range to a narrower range.
- Use radius-progress damping rather than random delay if more calmness is needed.
- Verify crowded 10-20 drop scenes still settle quickly.

### 3. Edge and rim polish

Purpose: make the successful architecture look more marbled and less like opaque stickers.

Implementation notes for `index.html`:

- Refine rim stroke alpha and width so edges are crisp but not cartoon outlines.
- Add one or two very cheap inner wash contours based on scaled versions of the same radial shape.
- Add a soft boundary halo or wet edge using translucent stroke/fill, not blur filters.
- Keep all wash details tied to each drop's stable seed so settled images remain static.
- Avoid muddy alpha stacking when many drops overlap.

Particle-inspired polish, performance-safe version:

- Add optional sparse pigment flecks or wash speckles as deterministic render details per drop.
- Store a small fixed array of flecks on each `Drop` at construction, e.g. 8-18 flecks per drop.
- Position flecks in polar coordinates within the drop and render only if inside the current grown radius.
- Do not simulate moving particles; they are static decorative pigment granules/wash marks.
- Keep flecks very low alpha and small enough to read as marbling texture.

### 4. Neighbor seam refinement

Purpose: preserve bounded regions while reducing visible broken seams.

Implementation notes for `index.html`:

- Keep radial-region collision (`other.radiusAtAngle(angle)`) as the core neighbor blocker.
- Tune `COLLISION_MARGIN` so it prevents major overlaps without producing obvious gaps.
- If needed, use different margins for simulation blocking and visual rendering:
  - simulation margin controls geometry;
  - visual rim/halo can softly cover tiny gaps.
- Avoid unblocking rays after collision; permanent blocking prevents jitter.
- Do not attempt true displacement in this pass.

Acceptance notes:

- Two neighboring long-hold drops should meet with a believable soft seam.
- A crowded composition should retain clear bounded regions.
- Small gaps are acceptable if visually softened; obvious overlaps are not.

### 5. Touch/mobile refinement

Purpose: make the winning prototype usable on mobile without a large UI.

Implementation notes for `index.html` and `README.md`:

- Keep `touch-action: none` and `return false` from touch handlers.
- Add tiny corner hit zones only if they remain unobtrusive:
  - one tiny reset zone for mobile;
  - optionally one tiny palette zone for mobile.
- Hit zones should not interfere with drawing in the main canvas.
- Update hint text to mention tap/hold and tiny controls if added.
- Ensure press preview is visible but subtle on small screens.
- Re-check min/max radius mapping on narrow portrait screens.

Mobile acceptance notes:

- Tap creates a small clean drop.
- Hold creates a noticeably larger drop.
- Page does not scroll/zoom while drawing.
- User can reset on a touch-only device without a keyboard, if tiny reset zone is added.

### 6. README update

Purpose: document what changed and how the round-two prototype should be evaluated.

Implementation notes for `README.md`:

- Add a short round-two feedback note: radial worked best and this pass preserves architecture.
- Document any new touch zones or visual polish behavior.
- Update known limitations if seam softening or flecks introduce tradeoffs.
- Keep the architecture description honest: this is still sampled radial boundary growth, not particle fluid simulation.

## Staged implementation tasks

### Stage 1: Circularity tuning

Files:

- `prototypes/marbling-radial-boundary/index.html`

Tasks:

- Separate simulation smoothness from visual edge noise more clearly.
- Reduce early-growth visual jitter.
- Optionally add render-only circular smoothing for contour points.
- Tune bounds so small drops remain clean and circular.

Checkpoint commit:

- `style(radial): refine circular growth silhouette`

Verification:

- Quick tap creates a clean small circle.
- Long hold starts circular and blooms smoothly.
- No starburst/jagged boundary is introduced.

### Stage 2: Meditative growth timing

Files:

- `prototypes/marbling-radial-boundary/index.html`

Tasks:

- Narrow per-ray growth variance.
- Add or tune ease-out near target radius.
- Preserve static settle behavior.
- Verify 10-20 drops still settle acceptably.

Checkpoint commit:

- `style(radial): tune meditative expansion timing`

Verification:

- Growth remains visible and calm.
- Settled state freezes.
- Interaction wakes the sketch after `noLoop()`.

### Stage 3: Rim, wash, and seam polish

Files:

- `prototypes/marbling-radial-boundary/index.html`

Tasks:

- Tune rim stroke weight/alpha.
- Add soft low-cost wash/halo details.
- Optionally add deterministic sparse flecks per drop.
- Tune visual seam coverage without changing core collision architecture.

Checkpoint commit:

- `style(radial): polish pigment rim and wash`

Verification:

- Pigment reads less like flat stickers.
- Neighbor seams are softer.
- No perpetual animation or large performance hit is introduced.

### Stage 4: Touch/mobile usability pass

Files:

- `prototypes/marbling-radial-boundary/index.html`
- `prototypes/marbling-radial-boundary/README.md`

Tasks:

- Test touch input path.
- Add tiny reset/palette hit zones only if needed.
- Tune hint text for small screens.
- Re-check radius mapping in portrait and landscape.
- Document mobile controls.

Checkpoint commit:

- `feat(radial): refine touch controls`

Verification:

- Tap/hold works on mobile viewport.
- No scroll/zoom while drawing.
- Reset is accessible on touch-only devices if implemented.

### Stage 5: Documentation and final comparison note

Files:

- `prototypes/marbling-radial-boundary/README.md`
- optionally `docs/prototype-plans/marbling-radial-boundary-review-notes.md` if a traceability note is needed

Tasks:

- Update README with round-two changes.
- Capture any implementation tradeoffs.
- Record whether checkpoint cadence was followed.
- Keep limitations clear and honest.

Checkpoint commit:

- `docs(radial): document feedback iteration`

Verification:

- README matches implemented controls and behavior.
- Known limitations remain visible.
- No docs claim true fluid/particle displacement.

## Round-two acceptance criteria

The feedback iteration is acceptable when:

1. The prototype remains standalone at `prototypes/marbling-radial-boundary/index.html`.
2. The radial sampled boundary architecture remains intact.
3. Quick taps produce clean, consistently circular small drops.
4. Long holds produce larger drops with calm circular bloom.
5. Organic edge variation is subtle and polished, not jagged.
6. Growth is meditative and visibly smoother than round one.
7. Rims and inner washes improve marbling feel without sticker-like outlines.
8. Any particle-inspired detail is decorative, deterministic, sparse, and cheap.
9. Neighbor seams are visually softened while major overlaps remain blocked.
10. Settled compositions remain static with no idle wobble.
11. Touch drawing still works and does not scroll the page.
12. Mobile reset/palette behavior is either improved or clearly documented.
13. A 10-20 drop composition looks intentional and performs smoothly.
14. README reflects the implemented round-two behavior.

## Verification commands

Plan-only verification for this commit:

```bash
cd /workspace/projects/Griffinhale_git/worktrees/cabinFever-marbling-radial
test -f docs/prototype-plans/marbling-radial-boundary-feedback-iteration-plan.md
git diff --check
git status --short
git diff -- docs/prototype-plans/marbling-radial-boundary-feedback-iteration-plan.md
```

Implementation-time local server:

```bash
cd /workspace/projects/Griffinhale_git/worktrees/cabinFever-marbling-radial/prototypes/marbling-radial-boundary
python3 -m http.server 8123
```

Manual browser checks at `http://localhost:8123`:

- Load with no console errors.
- Confirm full-screen cream surface.
- Quick tap creates a clean small drop.
- Long hold creates a larger, calm circular bloom.
- Multiple drops meet with acceptable seams.
- Canvas edge blocking still works.
- Palette cycling still affects future drops only.
- Reset clears drops and rebuilds the surface.
- Settled frame becomes static.
- Touch input works without page scroll/zoom.
- Mobile reset/palette access matches README.

Optional static checks after implementation:

```bash
cd /workspace/projects/Griffinhale_git/worktrees/cabinFever-marbling-radial
git diff --check
python3 - <<'PY'
from pathlib import Path
for path in [
    Path('prototypes/marbling-radial-boundary/index.html'),
    Path('prototypes/marbling-radial-boundary/README.md'),
]:
    text = path.read_text()
    print(path, len(text), 'bytes')
PY
```

Optional Next.js sanity check only if shared app files are touched unexpectedly:

```bash
cd /workspace/projects/Griffinhale_git/worktrees/cabinFever-marbling-radial
npm run build
```

This should not be necessary for a properly scoped standalone prototype iteration.

## Commit checkpoints

This plan-only commit:

- `docs(radial): add feedback iteration plan`

Recommended implementation commits after this plan:

1. `style(radial): refine circular growth silhouette`
2. `style(radial): tune meditative expansion timing`
3. `style(radial): polish pigment rim and wash`
4. `feat(radial): refine touch controls`
5. `docs(radial): document feedback iteration`

Before each implementation commit:

- Keep changes scoped to `prototypes/marbling-radial-boundary/` unless docs need a traceability update.
- Run `git diff --check`.
- Smoke-test `index.html` through a local server for interactive changes.
- Verify settled compositions remain static.
- Update README when controls, mobile behavior, or visual model changes.

## Final comparison notes to capture after implementation

During the next review, explicitly record:

- Did radial remain one of the best prototypes after polish?
- Does circular growth now feel more consistent than round one?
- Did rim/wash polish improve marbling feel without hurting performance?
- Did any particle-inspired details help, or did they add visual noise?
- Are mobile/touch controls good enough for continued exploration?
- Are radial/star-shaped limitations still acceptable compared with particles?
