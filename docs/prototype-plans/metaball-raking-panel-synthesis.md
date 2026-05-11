# Metaball Raking Panel Synthesis

## Goal

Find the strongest near-term prototype route for making the current metaball marbling sketch support raking/combing: pigment interiors should break into pulled strands or veins while outer metaball borders remain recognizable.

## Panel Summary

### Panelist 1 — Simulation Architect

Recommended a true hybrid architecture:

1. Let metaballs grow and produce the organic initial silhouette.
2. Bake settled field cells into a persistent material raster.
3. Rake/combing edits that material raster.
4. Preserve borders with locked/soft border masks and rim redraw.

Strongest first slice: settled material raster with frozen border mask.

### Panelist 2 — Reality Filter / Implementer

Recommended the smallest high-feasibility prototype:

- Add persistent per-cell displacement vectors, `rakeDx` / `rakeDy`, parallel to the existing `field[]` grid.
- During `evaluateField()`, sample the metaball field at displaced coordinates.
- Raking edits the raster-space coordinate field, not the pool/lobe geometry.
- Use Shift-drag for desktop raking and two-finger drag for touch, preserving existing hold-to-drop behavior.

This is not the final material-raster architecture, but it is the fastest way to test whether raster-space raking can visually break up the metaball result without rewriting the prototype.

### Panelist 3 — Artist / Interaction Designer

Recommended interaction order:

1. Single stylus / needle pull.
2. Protected-rim parallel comb.
3. Wake-line overlay if artifacts need to look intentional.
4. Feather comb later.

Aesthetic success criteria:

- Interior pigment visibly pulls apart into strands/veins.
- Outer silhouette remains recognizable after repeated strokes.
- Rims and seams still read as marbling boundaries.
- Failure mode should look handmade/granular rather than digitally broken.

### Panelist 4 — Skeptic / Adversarial Engineer

Warned that a coarse material raster can easily become smeared pixels with fake pinned borders. Recommended a later comparison against:

- frozen metaball mask + particle/strand rendering clipped by mask.

Skeptic's key kill criteria for raster:

- raking looks blocky at 4–8 px cells,
- borders either leak or look like a static sticker,
- pigment becomes muddy faster than it becomes marbled,
- new drops create confusing ownership rules.

## Decision

Prototype the Reality Filter's raster-space displacement field first.

Reason:

- It is the smallest implementation that exercises the core idea: raster-space raking independent from metaball lobe geometry.
- It preserves the current single-file p5 sketch and existing drop behavior.
- It gives immediate signal before investing in a full baked material raster or particle-strand substrate.
- If it fails visually, the next candidate should be the Skeptic's particle/strand mask approach.

## Prototype Scope

Implement in:

`prototypes/marbling-metaball-pools/index.html`

Add:

- `rakeDx[]`, `rakeDy[]` arrays sized to `fieldCols * fieldRows`.
- `applyRasterRake(x0, y0, x1, y1)` that writes displacement into cells near a stroke segment.
- Displaced field sampling inside `evaluateField()`.
- Shift-drag desktop raking.
- Two-finger touch raking.
- Dirty rect expansion around rake strokes.
- Reset clears rake displacement.

Defer:

- true material ownership advection,
- bilinear material sampling,
- comb tine UI,
- particle strands,
- wake-line overlays,
- quality-tier rake resampling.

## Success Criteria

Validated if:

- a settled pigment field visibly pulls/warps under Shift-drag or two-finger drag,
- existing hold-to-drop still works,
- reset clears raking,
- no console errors on load/basic interaction,
- the result is promising enough to justify a true baked-raster or particle-strand follow-up.

Partial if:

- the deformation works but border preservation is not strong enough,
- the effect reads more like warping than physical combing,
- quality tier changes reset or distort rake state.

Invalidated if:

- raking is visually muddy or blocky,
- the interaction breaks drop placement,
- field sampling artifacts cause pigment to disappear obviously,
- the effect is weaker than the current pure metaball visuals.
