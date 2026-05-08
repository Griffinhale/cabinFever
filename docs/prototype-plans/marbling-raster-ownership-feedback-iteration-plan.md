# Marbling Raster Ownership Feedback Iteration Plan

Date: 2026-05-08
Branch: `proto/marbling-raster-ownership`
Prototype folder: `prototypes/marbling-raster-ownership/`
Round: feedback iteration / round two
Commit for this planning task: `docs(raster): add feedback iteration plan`

## Feedback source and interpretation

The feedback mapping is by URL order, not by original prototype numbering.

For URL order item 1, raster ownership, the user said the prototype was cool but growth was not consistently circular enough.

Related comparison notes:

- URL order item 2, radial, worked best.
- URL order item 6, particles, worked best.
- URL order item 4, metaballs, was great but laggy.
- URL order item 5, boundary relaxation, was interesting but too jagged.
- URL order item 3, shader/SDF, did not load.

This plan keeps the raster ownership architecture because its strengths are still valuable:

- exact area-budgeted paint amount;
- exclusive ownership / no overlap;
- coherent shared seams;
- static settled output;
- a plausible future path toward raster displacement or relaxation.

The round-two goal is not to make raster ownership identical to the radial prototype. The goal is to make quick taps and held drops read as coherent circular pigment blooms first, then allow organic seam deformation only where collisions, canvas edges, and controlled texture justify it.

## Problem statement

The first raster prototype expands from a frontier using distance, noise, neighbor support, diagonal penalties, and jitter. That can produce interesting organic bounded regions, but it can also make young or isolated drops look uneven, lumpy, directional, or cellular before they reach their area budget.

The user specifically noticed circular inconsistency. For this prototype, that means:

- a single quick tap should form a small mostly round bloom;
- a single long hold should form a larger mostly round bloom;
- a drop with no nearby obstacles should not sprout directional tendrils;
- noisy texture should perturb the boundary without overwhelming the circular target;
- collisions and edges may flatten or deform the circle, but the deformation should be explainable;
- the preview ring should match the eventual visual footprint closely enough that the interaction feels honest.

## Non-goals and constraints

- Do not modify the Next.js app.
- Do not change files under `src/`.
- Do not add dependencies, build tooling, or a framework.
- Do not implement true physical displacement in this iteration.
- Do not add a large visible UI panel.
- Do not replace the raster ownership model with radial polygons.
- Do not make boundaries perfectly geometric; preserve marbling texture, rims, and shared raster ownership.
- This planning task must commit only this markdown plan.

## Exact files for the later implementation iteration

Modify:

- `prototypes/marbling-raster-ownership/index.html`
- `prototypes/marbling-raster-ownership/README.md`

Do not modify:

- `src/**`
- Next.js app files
- package/build configuration

This planning task creates only:

- `docs/prototype-plans/marbling-raster-ownership-feedback-iteration-plan.md`

## Design approach

Round two should make the raster frontier prefer an isotropic disk until blocked. The simulation remains area-budgeted, but the frontier scoring should be circularity-aware instead of just locally organic.

Main changes:

1. Use a stronger radial bias / area-budget model.
2. Replace the current sparse frontier sampling with more isotropic frontier scoring.
3. Track directional balance by angular sectors around each drop seed.
4. Add soft ring targets so each growth phase fills missing sectors near the current expected radius.
5. Keep organic noise, but reduce it from a primary growth driver to a boundary texture modifier.
6. Smooth preview and rendering so the visual edge reads as a circular pigment bloom, not individual raster cells.

## Proposed simulation changes

### 1. Area budget remains the source of truth

Keep hold duration mapped to target area cells:

```text
holdT = clamp((holdMs - HOLD_MS_MIN) / (HOLD_MS_MAX - HOLD_MS_MIN), 0, 1)
eased = easeOutCubic(holdT)
targetAreaCells = round(lerp(MIN_TARGET_AREA_CELLS, maxAreaCells, eased))
targetRadiusCells = sqrt(targetAreaCells / PI)
```

Add explicit derived radius values to each drop:

- `targetRadiusCells`
- `currentEquivalentRadiusCells = sqrt(claimedAreaCells / PI)`
- `maxAllowedRadiusCells = targetRadiusCells * radiusOvershootAllowance`

Use these only to score frontier cells and previews. Ownership area remains exact in cells.

### 2. Isotropic frontier scoring

Replace the current growth cost emphasis:

```text
distanceCost + supportCost + diagonalPenalty + edgeWetness + wobble + jitter
```

with a more circular cost:

```text
radialErrorCost
+ angularBalanceCost
+ ringBandCost
+ compactnessCost
+ obstacleContactCost
+ smallOrganicNoise
+ tinyDeterministicJitter
```

Recommended weights for first tuning pass:

- `radialErrorCost`: high, approximately `abs(distanceFromSeed - desiredRadiusForPhase) * 1.3`
- `angularBalanceCost`: high for underfilled sectors, negative bonus for sectors behind the average
- `ringBandCost`: medium, penalize cells far outside the current target growth ring
- `compactnessCost`: medium, reward 4-connected and 8-connected support
- `obstacleContactCost`: small bonus near occupied neighbors only after the drop is mature enough, so seams fill cleanly
- `smallOrganicNoise`: low, roughly 10-20% of the previous noise influence
- `tinyDeterministicJitter`: very low, only to break ties

The intent is: grow like an expanding disk; use noise to roughen the edge; let neighbors and edges carve the disk.

### 3. Directional balance / angular sectors

Add sector tracking per drop:

- `sectorCount`: 24 or 32 sectors.
- `sectorClaims`: number of claimed cells in each sector.
- `sectorMaxRadius`: farthest claimed distance in each sector.
- `sectorFrontierPressure`: optional count of available frontier cells in each sector.

On every successful claim, update the sector for the claimed cell. During scoring, prefer frontier cells in sectors whose claimed area or max radius is below the drop's current average.

This directly addresses asymmetric growth caused by frontier queue order, sparse sampling, or local noise.

Acceptance detail:

- A single unblocked drop should not have one sector more than about 25-30% farther than the opposite sector while it is still growing, except for brief transient frames.
- In the settled state, unblocked single drops should have a roundness ratio near target: `minSectorRadius / maxSectorRadius >= 0.72` for quick taps and `>= 0.78` for medium/long holds, ignoring small boundary noise.

### 4. Ring targets / phase radius

For each drop, calculate the expected radius for the current claimed area:

```text
phaseRadiusCells = sqrt((claimedAreaCells + claimsThisFrameLookahead) / PI)
```

Prefer frontier cells whose distance from the seed is near `phaseRadiusCells`, while also allowing inner holes/gaps to fill first. This prevents long early arms and keeps growth visually circular.

Suggested scoring rules:

- Strongly penalize a cell with `distance > phaseRadiusCells + ringLeadCells`.
- Give a bonus to cells with `distance < phaseRadiusCells - innerFillSlackCells` if they fill an under-supported interior area.
- Keep `ringLeadCells` small, for example 1.5-2.5 cells.
- Increase slack slightly for large holds so big blooms do not look mechanically perfect.

### 5. Frontier selection fairness

The current implementation samples a small strided subset of frontier cells. That is performant, but it can miss better cells and amplify directionality.

Options to test in order:

1. Increase `FRONTIER_SAMPLE_COUNT` from 10 to 24 or 32.
2. Use two-pass sampling: always include candidates from underfilled angular sectors, then fill remaining slots with strided frontier candidates.
3. Maintain per-sector frontier buckets if the simple sample increase is not enough.

Keep performance bounded. Do not sort the entire frontier every frame unless the frontier remains small enough in practice.

### 6. Organic noise becomes edge detail, not shape driver

Reduce the influence of `grainCost`, `wobble`, and `jitter` in `growthCost()`. They should vary boundary texture but should not determine the main direction of expansion.

Recommended behavior:

- Early growth: mostly circular, very little noise.
- Middle growth: small edge waviness.
- Near target radius: slightly more boundary texture so the final edge still feels handmade.
- Near other drops/edges: collision shape can dominate over circular preference.

### 7. Obstacle-aware circularity

Strict circularity should weaken when a drop touches existing pigment or the canvas edge. Add a local blocked/obstacle awareness term:

- If a sector has no available frontier because it is blocked by ownership or canvas edge, stop penalizing that sector as underfilled.
- Prefer growth in still-open sectors, but do not overextend them so far that the drop becomes a crescent/tendril.
- Track whether a drop is `unobstructed`, `partiallyObstructed`, or `crowded` based on blocked sector ratio.

This preserves raster ownership strengths while avoiding impossible circularity demands in crowded compositions.

## Proposed preview and rendering changes

### 1. Preview honesty

The existing preview ring already shows radius from area. Keep it, but update it to communicate raster behavior better:

- Draw a soft filled wash inside the ring during hold.
- Add a faint noisy rim only after a longer hold.
- Keep the preview circular and centered on the pointer.
- If the pointer is near canvas edge or occupied cells, optionally tint/soften the blocked side, but do not overbuild this in round two.

### 2. Smoother pigment edge

The circular consistency problem is partly simulation and partly rendering. Make sure an actually round ownership field renders round:

- Increase soft cell overlap slightly for isolated drops.
- Blur rim enough to hide cell stair-steps but not enough to make colors muddy.
- Consider a one-pass boundary normal/splat direction so rim cells draw ellipses along the local boundary instead of random circles.
- Keep settled rendering static; no animated noise.

### 3. Optional contour fallback

If circularity improves in the owner grid but still looks blocky on screen, test a light contour rendering pass before more simulation changes:

- Extract boundary cells for each drop.
- Draw a smoothed outline through sampled boundary points, or use marching squares if needed.
- Keep ownership as the source of truth; contour rendering is visual only.

This is optional and should come after scoring/balance changes.

## Staged implementation tasks

### Stage 1: Document baseline and add hidden diagnostics

Files:

- Modify `prototypes/marbling-raster-ownership/index.html`
- Modify `prototypes/marbling-raster-ownership/README.md`

Tasks:

1. Add or document a hidden debug toggle, for example `D`, that can show seed point, target radius, current equivalent radius, and sector spokes.
2. Add helper functions for circularity measurement:
   - `sectorForCell(drop, x, y)`
   - `distanceFromSeed(drop, x, y)`
   - `computeDropRoundness(drop)`
3. Keep debug UI hidden by default.
4. Update README with the feedback goal: more consistently circular growth while preserving raster ownership.

Verification:

- Normal UI still only shows tiny hints.
- Debug mode can be toggled without changing simulation behavior.
- Existing press/hold/drop controls still work.

Checkpoint commit:

- `chore(raster): add circularity diagnostics`

### Stage 2: Add radius and sector state to drops

Files:

- Modify `prototypes/marbling-raster-ownership/index.html`

Tasks:

1. Add `targetRadiusCells` when each drop is created.
2. Add sector arrays such as `sectorClaims` and `sectorMaxRadius`.
3. Update sector state inside `claimCell()` or immediately after successful claims.
4. Add blocked-sector detection for canvas edges and occupied neighbor walls.
5. Keep data structures small and per-drop; no full-grid scans per frame.

Verification:

- Quick and long holds still produce correct target area values.
- Claimed cell count still stops at `targetAreaCells`.
- Sector state updates for every claimed cell.

Checkpoint commit:

- `feat(raster): track drop radius and sector balance`

### Stage 3: Replace frontier scoring with circular growth scoring

Files:

- Modify `prototypes/marbling-raster-ownership/index.html`

Tasks:

1. Rewrite `growthCost()` around radial error, phase ring, angular balance, compactness, and reduced noise.
2. Increase or adapt `FRONTIER_SAMPLE_COUNT` to evaluate enough candidates for stable circularity.
3. Add candidate bonuses for underfilled sectors.
4. Reduce old noise/jitter weights that create directional artifacts.
5. Preserve strict `owner[idx] === -1` ownership checks.

Verification:

- A single quick tap grows as a small mostly circular bloom.
- A single long hold grows as a larger mostly circular bloom.
- Growth still looks organic at the rim, not mechanically perfect.
- Two neighboring drops still stop at a shared ownership boundary.

Checkpoint commit:

- `feat(raster): bias frontier growth toward circular blooms`

### Stage 4: Obstacle-aware balance and ring tuning

Files:

- Modify `prototypes/marbling-raster-ownership/index.html`

Tasks:

1. Tune sector balance so unblocked sectors fill evenly.
2. Detect blocked sectors and avoid over-penalizing them.
3. Tune ring lead/slack for quick taps, medium holds, and long holds.
4. Test edge drops so they flatten naturally at boundaries without sprouting arms.
5. Test crowded compositions so drops remain bounded and legible.

Verification:

- Isolated drops are consistently circular.
- Edge drops are clipped/flattened by the canvas rather than jagged or tendril-like.
- Neighbor-blocked drops deform around seams without uncontrolled growth in the opposite direction.

Checkpoint commit:

- `feat(raster): tune obstacle-aware circular growth`

### Stage 5: Preview and render smoothing pass

Files:

- Modify `prototypes/marbling-raster-ownership/index.html`
- Modify `prototypes/marbling-raster-ownership/README.md`

Tasks:

1. Make hold preview a soft circular wash plus ring that matches area-derived target radius.
2. Tune pigment cell radius/alpha/blur so round ownership fields render round.
3. Tune rim drawing so boundaries feel smoother and less jagged.
4. If needed, prototype a small visual-only contour or boundary splat improvement.
5. Update README with the final round-two model and known limitations.

Verification:

- Preview circle approximates final unblocked footprint.
- Settled quick tap and hold drops read as circular pigment blooms.
- Grid artifacts are less visible than in round one.
- No idle animation is introduced.

Checkpoint commit:

- `style(raster): smooth circular pigment blooms`

### Stage 6: Final QA and comparison notes

Files:

- Modify `prototypes/marbling-raster-ownership/README.md`

Tasks:

1. Run the manual acceptance script below.
2. Record round-two observations in README.
3. Document remaining limitations honestly.
4. Ensure no Next.js files were touched.

Verification:

- Git status contains only raster prototype and docs changes expected for the implementation iteration.
- Browser smoke test passes.
- README matches actual behavior.

Checkpoint commit:

- `docs(raster): document circular growth iteration`

## Round-two acceptance criteria

The iteration is successful when all of these are true:

1. The prototype remains a standalone p5/HTML sketch.
2. No Next.js files are modified.
3. Quick tap creates a small, mostly circular pigment bloom at the pointer.
4. Long hold creates a larger, mostly circular pigment bloom at the pointer.
5. For isolated drops, the final footprint has no obvious arms, lopsided wedges, or directional bias.
6. For isolated drops, circularity is visually consistent across at least five repeated quick taps and five repeated medium/long holds.
7. Organic boundary texture remains visible but does not dominate the global circular form.
8. Neighboring drops still respect exclusive ownership and do not overlap cells.
9. Shared boundaries remain coherent and visually smoother than jagged boundary relaxation.
10. Edge drops flatten against canvas bounds without growing outside the canvas.
11. The hold preview ring/wash roughly matches the final unblocked footprint.
12. A 10-20 drop composition remains legible, bounded, and screenshot-worthy.
13. The settled image becomes static with no idle noise or mutation.
14. Desktop mouse and touch interactions still work.
15. README documents the circularity iteration and remaining limitations.

## Manual QA script

Use the same viewport size for before/after comparison when possible.

1. Reset.
2. Quick tap in the center five times, resetting between taps.
   - Expected: each result is a small mostly circular bloom.
3. Reset.
4. Medium hold in the center five times, resetting between holds.
   - Expected: each result is a larger circular bloom with only mild organic edge variation.
5. Reset.
6. Long hold in the center.
   - Expected: large circular bloom, no long arms.
7. Add two neighboring medium holds.
   - Expected: circular growth until contact; seam is coherent and not overlapping.
8. Add one drop near each canvas edge.
   - Expected: edge-clipped circles, not jagged tendrils.
9. Add 10-20 mixed quick taps and holds.
   - Expected: bounded regions remain legible; circular consistency remains better than round one.
10. Press `P` and add more drops.
    - Expected: future drops use new palette; existing drops keep colors.
11. Press `R`.
    - Expected: reset clears all ownership and render state.
12. Test on touch/mobile viewport.
    - Expected: tap/hold works and the page does not scroll.

## Verification commands

From the raster worktree:

```bash
cd /workspace/projects/Griffinhale_git/worktrees/cabinFever-marbling-raster

git status --short --branch

test -f prototypes/marbling-raster-ownership/index.html

test -f prototypes/marbling-raster-ownership/README.md

test -f docs/prototype-plans/marbling-raster-ownership-feedback-iteration-plan.md

python3 - <<'PY'
from pathlib import Path
p = Path('prototypes/marbling-raster-ownership/index.html')
text = p.read_text()
for needle in ['p5.js', 'setup', 'draw', 'pixelDensity(1)', 'holdDurationToAreaCells', 'owner', 'frontier']:
    assert needle in text, needle
print('basic raster prototype checks passed')
PY

cd prototypes/marbling-raster-ownership
python3 -m http.server 8123
```

Then open:

```text
http://localhost:8123
```

For this planning-only commit, the lightweight verification is:

```bash
cd /workspace/projects/Griffinhale_git/worktrees/cabinFever-marbling-raster

git status --short --branch

test -f docs/prototype-plans/marbling-raster-ownership-feedback-iteration-plan.md

git diff -- docs/prototype-plans/marbling-raster-ownership-feedback-iteration-plan.md
```

## Commit checkpoints

This planning task produces exactly one docs-only commit:

- `docs(raster): add feedback iteration plan`

Later implementation should use these reviewable commits:

1. `chore(raster): add circularity diagnostics`
2. `feat(raster): track drop radius and sector balance`
3. `feat(raster): bias frontier growth toward circular blooms`
4. `feat(raster): tune obstacle-aware circular growth`
5. `style(raster): smooth circular pigment blooms`
6. `docs(raster): document circular growth iteration`

Before each implementation commit:

- Run the relevant verification commands.
- Check `git status --short --branch`.
- Confirm no `src/**` or Next.js files are modified.
- Confirm changes are limited to `prototypes/marbling-raster-ownership/` and intended docs.

## Risks and mitigations

Risk: Strong circular bias removes the organic marbling feel.

Mitigation: Keep global growth circular but leave small stable boundary texture in the final rim. Use noise as edge detail, not as primary shape direction.

Risk: More frontier sampling hurts performance.

Mitigation: Increase samples gradually, cap active drops, and only move to sector frontier buckets if needed.

Risk: Collision with existing ownership makes perfect circularity impossible.

Mitigation: Track blocked sectors and judge circularity only for unobstructed sectors. Deformed circles are acceptable when the deformation is caused by neighbors or canvas edges.

Risk: Rendering still looks jagged after simulation improves.

Mitigation: Tune soft splats/rims first; test visual-only contour rendering only if necessary.

## Expected outcome

After implementation, raster ownership should still feel like the same strong area-budgeted, bounded-region prototype, but isolated drops should read more like circular pigment blooms. It should borrow the successful circular clarity of the radial prototype without giving up raster ownership's exact area budget, no-overlap guarantee, and coherent shared seams.
