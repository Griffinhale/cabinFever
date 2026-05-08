# Marbling Prototype Architecture Options Matrix

Date: 2026-05-08
Project: cabinFever marbling prototype
Status: pre-implementation architecture comparison

## Purpose

This document captures the prototype strategy for the cabinFever marbling interaction before implementation begins.

The target experience is a standalone full-screen p5/HTML creative-coding demo:

- blank cream paper/water surface on load
- tiny corner hints only
- click/tap/press creates pigment at the pointer location
- hold duration controls paint amount and eventual target size
- drops grow slowly and meditatively
- growth stops at target size, canvas edges, or neighboring occupied regions
- boundaries are strongly fluid, irregular, and water-like
- palettes are curated and cyclable
- reset only
- no undo/export/full Next.js refactor yet
- desktop and touch/mobile are both first-class
- once drops settle, the image becomes static

Existing source docs:

- `docs/marbling-design-spec.md`
- `docs/marbling-refactor-plan.md`

The existing implementation plan proposes a radial-boundary growing drop model. This matrix intentionally broadens the design space before committing to one architecture.

## Adversarial summary

The current radial-boundary plan is a good control prototype, not obviously the best final direction.

It is likely to satisfy the checklist quickly because it gives clear click/hold mapping, slow growth, and explicit collision blocking. But it also risks producing technically-correct amoeba stickers rather than convincing marbled pigment. Real marbling is less about isolated blobs stopping at each other and more about pigment fields negotiating, pushing, stretching, and settling on a shared surface.

The radial model is especially vulnerable to these failure modes:

- Star-shaped limitation: every shape is fundamentally radial around one center.
- Weak displacement path: old drops are passive obstacles, not material that can be pushed.
- Awkward semantics: “new drops sit visually on top” conflicts with “new drops should be bounded by existing pigment.”
- Non-shared seams: neighboring noisy polygons may overlap, gap, or form unrelated borders instead of one coherent boundary.
- Delayed beauty: if rendering polish waits until after the geometry model, the prototype may optimize around ugly intermediate shapes.

For this project, visual quality is not a decorative layer. The simulation architecture and rendering architecture must be judged together.

## Prototype set

We will explore all six architecture candidates in separate git worktrees:

1. Radial boundary growth baseline
2. Pixel/grid ownership Voronoi growth
3. Shader/SDF implicit field
4. Particle/fluid-ish displacement
5. Metaballs / implicit pigment pools
6. Precomputed raster field with boundary relaxation

Each prototype should be a standalone p5/HTML sketch and should avoid modifying the current Next.js app.

## Shared constraints for every prototype

Each prototype should attempt the same interaction contract unless the architecture explicitly cannot support it:

- open as a static standalone HTML page
- full-screen canvas
- cream/paper/water base with subtle grain or texture
- no large UI panel
- pointer/touch press creates a drop at the pointer location
- quick tap produces a minimum visible drop
- longer hold produces more paint / larger eventual visual footprint
- growth is visible and slow
- palette cycling exists, even if minimal
- reset exists
- no undo
- no export
- settled state becomes visually static
- desktop mouse and mobile touch should both be considered from the beginning

Implementation defaults:

- Use p5.js 1.11.3 from CDN unless a prototype has a strong reason to use another mode.
- Use `p5.disableFriendlyErrors = true`.
- Use `pixelDensity(1)`.
- Prefer one self-contained `index.html` for each prototype at first.
- Add a short `README.md` per prototype documenting controls, model, and known limitations.

## Scoring rubric

Score each prototype from 1-5 on each dimension.

### 1. Beauty now

How likely is the prototype to produce a compelling screenshot/demo quickly?

Questions:

- Does it immediately read as pigment on cream paper/water?
- Are the colors curated rather than random?
- Are the edges fluid and organic?
- Is the settled image worth looking at?
- Does it avoid generic p5 blob/particle-demo energy?

Weight: 30%

### 2. Interaction feel

How satisfying is the core user gesture?

Questions:

- Does quick tap create a satisfying small drop?
- Does long hold clearly create more paint?
- Does growth feel meditative rather than laggy?
- Does the user feel like they are adding pigment to a surface?
- Does the interaction work equally well with mouse and touch?

Weight: 25%

### 3. Collision / boundary correctness

How well does the geometry obey the current design spec?

Questions:

- Do drops respect canvas edges?
- Do neighboring regions avoid ugly overlap?
- Are bounded regions clear?
- Are there gaps, leaks, flickers, or popping?
- Can the model handle crowded compositions gracefully?

Weight: 20%

### 4. Mobile viability

Can the approach plausibly run on mobile/touch devices?

Questions:

- Does it avoid extreme per-frame CPU/GPU load?
- Does it avoid high-DPI accidental overdraw?
- Does it degrade gracefully with many drops?
- Is touch input straightforward?

Weight: 10%

### 5. Future displacement path

Can the model evolve toward more physical marbling where new pigment pushes old pigment outward?

Questions:

- Is pigment represented as a field/material rather than immutable shapes?
- Can old regions move or deform after creation?
- Can pressure/advection/relaxation be added without replacing the model entirely?

Weight: 10%

### 6. Implementation simplicity

How easy is the prototype to implement, debug, and port later?

Questions:

- Is the model understandable?
- Can it live in standalone p5/HTML cleanly?
- Can it later be ported to TypeScript/React without major conceptual translation?
- Are failure modes easy to inspect?

Weight: 5%

## Candidate 1: Radial boundary growth baseline

### Branch and worktree

Branch:

- `proto/marbling-radial-boundary`

Worktree path:

- `/workspace/projects/Griffinhale_git/worktrees/cabinFever-marbling-radial`

Prototype folder:

- `prototypes/marbling-radial-boundary/`

### Core simulation model

Each drop stores:

- center point
- target radius derived from hold duration
- pigment colors
- created time / seed
- angular samples, likely 128-256
- current radius per angle
- blocked flag per angle

On update:

1. For each unblocked ray, propose a small radial growth step.
2. Convert the proposed point to world coordinates.
3. Stop the ray if it exits the canvas.
4. Stop the ray if it enters another drop’s occupied radial region.
5. Otherwise commit the larger radius.
6. Stop entirely once all rays are blocked or reach target radius.

Rendering should use stable angular noise, curved vertices, rim darkening, translucent fill, and subtle inner wash.

### Visual feel

Organic islands / cells / amoebas growing from click points. With strong styling it can read as marbled pigment pools. Without strong styling it will look like colored blobs with collision.

### Good at

- Simple direct manipulation.
- Clear hold-to-target-radius mapping.
- Slow visible growth.
- Basic edge and neighbor blocking.
- Debuggability.
- Static settled state.
- Matching the literal existing implementation plan.

### Bad at

- True displacement.
- Complex concave shapes.
- Shared boundary coherence.
- Drops placed inside or very near existing drops.
- Avoiding “sticker layer” feel.

### Implementation complexity

Low to medium.

The core model is straightforward in p5 P2D. Most risk is in collision details and visual polish.

### Click/hold paint amount fit

Excellent.

Hold duration can map directly to target radius. A better mapping is target area converted to radius:

- `targetArea = lerp(minArea, maxArea, holdT)`
- `targetRadius = sqrt(targetArea / PI)`

This makes paint amount semantically area-based even inside a radial model.

### Future true marbling displacement

Weak.

Neighboring drops could be hacked to push their radial samples outward, but the model will become brittle. This prototype should be treated as a baseline/control, not a displacement foundation.

### Likelihood of beautiful demo quickly

Medium.

It can become beautiful if rendering is prioritized immediately. Raw radial geometry alone will not carry the art direction.

### What this worktree should prove

Can the existing plan satisfy the written acceptance criteria while producing a visually respectable marbling toy?

### Kill criteria

- If it still looks like generic blobs after palette/rim/grain work.
- If collision seams look visibly broken in common cases.
- If crowded compositions become ugly or confusing.

### Acceptance criteria

- Quick tap creates small growing drop at pointer.
- Long hold creates larger target drop.
- Drops visibly grow slowly.
- Edge blocking works.
- Neighbor blocking mostly works.
- Final image becomes static.
- At least four curated palettes.
- A screenshot with 10-20 drops looks intentional rather than random.

## Candidate 2: Pixel/grid ownership Voronoi growth

### Branch and worktree

Branch:

- `proto/marbling-raster-ownership`

Worktree path:

- `/workspace/projects/Griffinhale_git/worktrees/cabinFever-marbling-raster`

Prototype folder:

- `prototypes/marbling-raster-ownership/`

### Core simulation model

Maintain a low-resolution grid or full-resolution pixel ownership map.

Each cell stores:

- owner drop id, or empty
- pigment color / palette reference
- distance or growth cost from seed
- wetness / edge metadata if needed

Each drop stores:

- seed position in grid coordinates
- paint budget derived from hold duration
- current claimed area
- frontier cells
- color / palette info

On update:

1. New drop starts with a seed cell at pointer location.
2. Frontier expands into neighboring empty cells.
3. Expansion cost is affected by distance, noise, and optional local grain/wetness.
4. Occupied cells cannot be claimed by another drop in the first version.
5. Growth stops when the drop reaches its area budget or has no valid frontier.
6. Render ownership map with smoothing, contours, rims, and texture.

Optional improvement:

- Use marching squares or contour extraction for prettier vector-like boundaries.
- Render at low simulation resolution and high visual resolution.

### Visual feel

Noisy Voronoi/cellular stain growth. Regions can look naturally bounded and organic. Shared boundaries are coherent because they are represented by one ownership field rather than two independent polygons.

### Good at

- Exact paint amount as area budget.
- No-overlap guarantee.
- Canvas edge constraints.
- Many-drop compositions.
- Organic non-circular regions.
- Static final state.
- Strong “bounded growing regions” semantics.

### Bad at

- Can look pixelated/blocky if rendering is weak.
- Frontier growth may feel cellular/game-like.
- Smooth painterly rims require extra work.
- Without careful constraints, a region may grow tendrils or disconnected artifacts.
- More data-structure work than radial polygons.

### Implementation complexity

Medium.

The simulation is not hard, but the rendering quality matters. The prototype needs a good smoothing/contour strategy early.

### Click/hold paint amount fit

Excellent.

This is the cleanest interpretation of hold duration as paint amount because hold maps directly to target area / number of claimed cells.

### Future true marbling displacement

Medium.

Because pigment is already represented as a field, later versions can move/reassign/advect cells. However, a simple ownership map is still not physical until it supports material movement or pressure.

### Likelihood of beautiful demo quickly

High if smoothing and palettes are done early.

This is probably the strongest challenger to the radial plan for a first correct-and-beautiful prototype.

### What this worktree should prove

Can area-budgeted raster growth create more satisfying organic bounded regions than radial rays?

### Kill criteria

- If grid artifacts remain obvious after smoothing.
- If growth feels like cellular automata rather than pigment.
- If performance is poor on full-screen mobile.

### Acceptance criteria

- Hold duration maps to visibly larger claimed area.
- Drops do not overlap because ownership is exclusive.
- Boundaries are organic and continuous.
- The final image looks coherent with 20+ drops.
- The sim can settle and stop updating.

## Candidate 3: Shader/SDF implicit field

### Branch and worktree

Branch:

- `proto/marbling-shader-sdf`

Worktree path:

- `/workspace/projects/Griffinhale_git/worktrees/cabinFever-marbling-shader`

Prototype folder:

- `prototypes/marbling-shader-sdf/`

### Core simulation model

Represent drops as implicit fields evaluated per pixel, likely in a fragment shader.

Each drop stores:

- center
- target radius or strength
- current growth progress
- pigment color
- noise/domain-warp parameters
- creation time / seed

The shader evaluates:

- signed distance to each drop
- nearest or strongest drop ownership
- warped distance for organic boundaries
- pigment fill/rim/edge effects
- paper grain and subtle color variation

Collision can be approximated by nearest-owner logic or weighted Voronoi logic. Growth is represented by increasing radius/field strength over time.

### Visual feel

Smooth, modern, fluid, and potentially portfolio-grade. This can produce lush organic edges, soft washes, chromatic rims, and polished full-screen visuals quickly.

### Good at

- Immediate beauty.
- Smooth full-screen rendering.
- Rich paper/pigment effects.
- Palette atmosphere.
- Portfolio background potential.
- Static final render once uniforms stop changing.

### Bad at

- Honest collision semantics.
- Debuggability.
- Large numbers of drops if shader loops are fixed-size or expensive.
- True area conservation.
- Exact touch/hold-to-paint behavior unless carefully mapped.
- P5 WEBGL/shader ergonomics.

### Implementation complexity

Medium to high.

A simple shader is manageable. A robust interactive shader with many drops, domain warping, and believable collision is more complex.

### Click/hold paint amount fit

Good but approximate.

Hold can map to field radius, field strength, or target mass. It will visually work, but it will not naturally conserve area unless paired with a raster or feedback buffer.

### Future true marbling displacement

Medium.

Shader displacement is visually easy through coordinate warping. True material displacement would require feedback textures, ping-pong buffers, or a separate simulation field.

### Likelihood of beautiful demo quickly

Very high for visual appeal.

Medium for correctness. This prototype may be the best answer if the project’s identity leans toward portfolio background effect rather than simulation toy.

### What this worktree should prove

Can a shader-first illusion create a stronger marbling identity than a more literal geometry model?

### Kill criteria

- If interaction feels fake or disconnected from the pointer.
- If collision/bounding is too obviously cheated.
- If p5 shader complexity slows iteration too much.

### Acceptance criteria

- First screenshot looks beautiful.
- Holding longer visibly produces larger pigment presence.
- Neighboring regions appear bounded or at least plausibly negotiated.
- Palette changes produce distinct atmospheres.
- Runs smoothly full-screen on desktop.

## Candidate 4: Particle/fluid-ish displacement

### Branch and worktree

Branch:

- `proto/marbling-particle-displacement`

Worktree path:

- `/workspace/projects/Griffinhale_git/worktrees/cabinFever-marbling-particles`

Prototype folder:

- `prototypes/marbling-particle-displacement/`

### Core simulation model

Represent pigment as particles or tracers floating on a 2D surface.

Each drop injection creates:

- pigment particles at or around the pointer
- optional pressure impulse
- color/material id
- velocity or flow influence

Existing particles respond to:

- radial pressure from new drops
- curl/noise flow field
- damping/friction
- boundary constraints
- optional short-lived diffusion/spreading

Rendering can splat particles into an offscreen buffer, then blur/threshold/composite to create pigment pools and rims.

### Visual feel

The most liquid and physically suggestive option. Pigment can visibly push, stretch, curl, and settle. It may feel like actual material floating on water instead of shapes drawn on a canvas.

### Good at

- Future displacement.
- Wet/liquid motion.
- New pigment pushing old pigment.
- Expressive emergent texture.
- Later drag/stylus interactions.
- Making the interaction feel alive.

### Bad at

- Clean bounded Voronoi-like regions.
- Predictable target areas.
- Avoiding muddy particle soup.
- Mobile performance.
- Static crisp final image.
- Debugging and tuning.

### Implementation complexity

High.

A naive version is easy, but a beautiful controlled version is hard. It needs careful tuning of forces, damping, splatting, and settling.

### Click/hold paint amount fit

Good.

Hold can map to particle count, injection radius, pigment mass, pressure strength, or injection duration. It will feel intuitive, but exact final size is harder to guarantee.

### Future true marbling displacement

Excellent.

This is the most aligned with real marbling behavior because old pigment can actually move.

### Likelihood of beautiful demo quickly

Medium.

Upside is high, but risk is high. It can become a mesmerizing liquid toy or a noisy particle mess.

### What this worktree should prove

Is visible displacement essential to the project’s identity, and can it be achieved without unacceptable complexity/performance cost?

### Kill criteria

- If particles read as particles rather than pigment.
- If mobile performance is unacceptable.
- If the system never visually settles.
- If colors turn muddy after a few drops.

### Acceptance criteria

- New drops visibly push or disturb existing pigment.
- Motion feels watery and meditative.
- Hold duration creates more pigment/pressure.
- The image can settle to a mostly static final state.
- Performance remains acceptable with a modest number of drops.

## Candidate 5: Metaballs / implicit pigment pools

### Branch and worktree

Branch:

- `proto/marbling-metaball-pools`

Worktree path:

- `/workspace/projects/Griffinhale_git/worktrees/cabinFever-marbling-metaballs`

Prototype folder:

- `prototypes/marbling-metaball-pools/`

### Core simulation model

Each user drop is represented by one or more implicit blobs/metaballs.

A drop stores:

- parent center
- target mass from hold duration
- several child lobes with offsets/radii
- growth progress
- color
- noise/warp seed

The rendered pigment field is computed from the combined influence of blobs. To prevent everything from merging into one lava lamp, the prototype should test one of these constraints:

- nearest-drop ownership clipping
- age/layer-based field priority
- rasterized freeze mask after each drop settles
- soft exclusion between different pigment ids

### Visual feel

Soft, smooth, fluid pigment pools. More liquid than radial polygons, less physically complex than particles. Can look like ink blooms or oil-like colored pools.

### Good at

- Smooth organic edges.
- Fast visual payoff.
- Click/hold satisfaction.
- Lush pigment washes.
- Portfolio background potential.
- Hybridizing later with raster masks or shaders.

### Bad at

- Collision correctness.
- Preventing unwanted merging.
- Exact bounded Voronoi regions.
- True displacement.
- Explaining semantics if fields overlap.

### Implementation complexity

Medium.

P2D raster implementation is possible. Shader version may look better but increases complexity.

### Click/hold paint amount fit

Good.

Hold maps naturally to total blob mass, radius, or number/size of child lobes.

### Future true marbling displacement

Medium.

Coordinate warping and pressure effects can fake displacement, but true conservation requires adding raster/particle state.

### Likelihood of beautiful demo quickly

High for beauty.

Medium for correctness. This is a strong visual wild card.

### What this worktree should prove

Can an implicit blob model produce a more beautiful and satisfying toy than the stricter radial/raster models, even if collision semantics are softer?

### Kill criteria

- If everything visually merges into one undifferentiated blob.
- If boundaries are too soft to read as marbling.
- If collision/ownership hacks become more complex than raster growth.

### Acceptance criteria

- Pigment pools look fluid and organic.
- Hold duration clearly controls pigment mass.
- Neighbor interactions look intentional, not accidental.
- The settled composition is beautiful even if not physically exact.

## Candidate 6: Precomputed raster field with boundary relaxation

### Branch and worktree

Branch:

- `proto/marbling-boundary-relaxation`

Worktree path:

- `/workspace/projects/Griffinhale_git/worktrees/cabinFever-marbling-relaxation`

Prototype folder:

- `prototypes/marbling-boundary-relaxation/`

### Core simulation model

This is a hybrid between raster ownership and physical displacement.

Maintain a raster field where pigment regions have ownership, color, and pressure/mass metadata. When a new drop is added:

1. Create a target mass/area from hold duration.
2. Grow a proposed region from the pointer.
3. Compute boundary pressure against nearby occupied regions.
4. Iteratively relax the boundary so neighboring regions can be squeezed, reassigned, or displaced slightly.
5. Keep total ownership mostly stable, but allow seams to move.
6. Freeze or settle the field after relaxation finishes.

This is not a full fluid simulation. It is a pragmatic “territories negotiating on a wet surface” model.

### Visual feel

Coherent organic cells with more physical push than strict occupancy. Boundaries can look squeezed and negotiated rather than simply blocked. It may capture some marbling displacement without particle/fluid complexity.

### Good at

- Hybrid correctness and beauty.
- Area-based paint amount.
- Shared boundaries.
- Plausible pushing/squeezing.
- Static final state.
- Future displacement path.

### Bad at

- Algorithm ambiguity.
- Tuning complexity.
- Possible flicker if ownership changes visibly.
- Harder debugging than simple raster growth.
- Might be overkill for a first standalone demo.

### Implementation complexity

Medium to high.

Less hard than particles/fluid, harder than simple grid ownership. Needs careful update rules to avoid unstable boundary churn.

### Click/hold paint amount fit

Excellent.

Hold maps directly to area/mass. The relaxation step can then decide how that mass negotiates with existing material.

### Future true marbling displacement

Good.

This is probably the most practical stepping stone toward true displacement while staying in a controllable raster model.

### Likelihood of beautiful demo quickly

Medium-high.

Upside is high, but it has more tuning risk than simple raster ownership.

### What this worktree should prove

Can negotiated raster boundaries produce a more physical marbling feel without the full complexity of particles or shaders?

### Kill criteria

- If boundaries flicker or churn.
- If the model is too hard to reason about.
- If visual improvement over simple raster ownership is marginal.
- If performance suffers from repeated relaxation passes.

### Acceptance criteria

- New drops can visibly squeeze or negotiate with existing regions.
- Hold duration maps to target mass/area.
- Boundaries remain coherent and attractive.
- Settled state becomes static.
- The model feels meaningfully better than strict occupancy.

## Recommended implementation order

Recommended order:

1. `proto/marbling-raster-ownership`
2. `proto/marbling-radial-boundary`
3. `proto/marbling-shader-sdf`
4. `proto/marbling-metaball-pools`
5. `proto/marbling-boundary-relaxation`
6. `proto/marbling-particle-displacement`

Reasoning:

- Raster ownership is the strongest challenger to the current plan and should be tested first.
- Radial boundary is the baseline/control and gives a direct comparison with the existing implementation plan.
- Shader/SDF tests the visual ceiling early.
- Metaballs test a simpler implicit visual wild card before deeper physics.
- Boundary relaxation builds on lessons from raster ownership.
- Particle displacement is highest-risk/highest-upside and should benefit from visual/rendering lessons from the earlier prototypes.

Alternative order if the priority becomes physical marbling over fast beauty:

1. Raster ownership
2. Boundary relaxation
3. Particle displacement
4. Radial boundary
5. Metaballs
6. Shader/SDF

## Timeboxing

Suggested first-pass timebox per prototype:

- Radial boundary: 2-4 hours
- Raster ownership: 3-5 hours
- Shader/SDF: 3-6 hours
- Metaballs: 2-4 hours
- Boundary relaxation: 4-8 hours
- Particle displacement: 4-8 hours

Do not over-polish one prototype before all six exist at a comparable rough level. The point is architectural comparison, not finishing the first branch that starts working.

## Worktree creation plan

Run from the main repo:

```bash
cd /workspace/projects/Griffinhale_git/cabinFever

git -c safe.directory=/workspace/projects/Griffinhale_git/cabinFever worktree add \
  -b proto/marbling-radial-boundary \
  /workspace/projects/Griffinhale_git/worktrees/cabinFever-marbling-radial \
  main

git -c safe.directory=/workspace/projects/Griffinhale_git/cabinFever worktree add \
  -b proto/marbling-raster-ownership \
  /workspace/projects/Griffinhale_git/worktrees/cabinFever-marbling-raster \
  main

git -c safe.directory=/workspace/projects/Griffinhale_git/cabinFever worktree add \
  -b proto/marbling-shader-sdf \
  /workspace/projects/Griffinhale_git/worktrees/cabinFever-marbling-shader \
  main

git -c safe.directory=/workspace/projects/Griffinhale_git/cabinFever worktree add \
  -b proto/marbling-particle-displacement \
  /workspace/projects/Griffinhale_git/worktrees/cabinFever-marbling-particles \
  main

git -c safe.directory=/workspace/projects/Griffinhale_git/cabinFever worktree add \
  -b proto/marbling-metaball-pools \
  /workspace/projects/Griffinhale_git/worktrees/cabinFever-marbling-metaballs \
  main

git -c safe.directory=/workspace/projects/Griffinhale_git/cabinFever worktree add \
  -b proto/marbling-boundary-relaxation \
  /workspace/projects/Griffinhale_git/worktrees/cabinFever-marbling-relaxation \
  main
```

Note: worktree creation should happen only after this matrix is reviewed and approved.

## Commit cadence for implementation subagents

Implementation subagents must commit at reasonable, reviewable checkpoints rather than leaving large uncommitted batches.

Expected cadence:

- Commit after creating the prototype shell and README.
- Commit after input/drop creation works.
- Commit after the core simulation model works at a rough level.
- Commit after first visual styling pass.
- Commit after palette/reset/static-settle behavior.
- Commit after README updates and final cleanup.

Commit messages should be specific to the prototype and milestone, for example:

- `feat(raster): add standalone prototype shell`
- `feat(raster): implement area-budgeted frontier growth`
- `style(raster): add pigment rims and paper grain`
- `docs(raster): document controls and limitations`

Before each commit, subagents should run the available lightweight verification for that prototype, at minimum checking that the HTML file exists, obvious syntax errors are absent, and the README reflects the current behavior. If a prototype has a browser/server smoke test, run it before the final commit for that worktree.

## Per-prototype folder shape

Each worktree should create exactly one prototype folder first:

```text
prototypes/<prototype-name>/
  index.html
  README.md
```

If a single file becomes too large, split only after the prototype proves useful:

```text
prototypes/<prototype-name>/
  index.html
  sketch.js
  styles.css
  README.md
```

Avoid adding dependencies or build tooling during the comparison phase.

## Shared README template for prototypes

Each prototype README should include:

```markdown
# <Prototype Name>

## Purpose

What architecture this prototype tests.

## Model

Short explanation of the simulation model.

## Controls

- Press/tap: create pigment
- Hold: increase paint amount
- P: cycle palette
- R: reset

## What to evaluate

- Beauty
- Interaction feel
- Collision/boundary behavior
- Mobile viability
- Future displacement potential

## Known limitations

List simplifications and failure modes.

## Run

```bash
cd <prototype-folder>
python3 -m http.server 8123
```

Open `http://localhost:8123`.
```

## Comparison session protocol

After all six prototypes exist:

1. Open each prototype at the same viewport size.
2. Use the same interaction script:
   - quick tap in center
   - long hold near center
   - add two neighboring drops
   - add a drop near an edge
   - add 10-20 drops across the canvas
   - cycle palette once
   - reset
3. Record observations in this document or a follow-up comparison doc.
4. Score each prototype using the weighted rubric.
5. Pick one of these outcomes:
   - promote one architecture as the first real standalone demo
   - merge two architectures into a hybrid
   - kill all but one visual direction and rewrite the implementation plan

## Likely hybrid outcomes

The best final answer may not be one pure prototype.

Plausible hybrids:

### Raster ownership + shader rendering

Use raster ownership for correctness and a shader/post-process layer for beauty.

Why it might win:

- Exact area/collision semantics.
- Smooth/polished visual output.
- Good path to static final image.

### Raster ownership + boundary relaxation

Start with strict ownership, then allow local seam negotiation.

Why it might win:

- Strong first implementation path.
- Adds physical push without particle chaos.
- Preserves area-budget semantics.

### Metaball visuals + raster freeze mask

Use implicit blobs while growing, then freeze them into an ownership/texture field.

Why it might win:

- Beautiful growth feel.
- More controllable final state.
- Avoids infinite metaball merging.

### Particle displacement + raster compositing

Use particles/forces for dynamic displacement, but render/freeze to a raster pigment field.

Why it might win:

- Physical motion.
- More stable final image.
- Better bridge to real marbling later.

## Decision bias

Favor prototypes that create beauty early.

This project is an interactive art toy and potential portfolio background. A correct-but-dry simulation is not success. If the user does not want to keep playing after 30 seconds, the model is wrong even if the collision logic is defensible.

At the same time, avoid pure visual cheats that destroy the core gesture. The interaction must still feel like adding pigment with a meaningful amount of paint.

## Next action

After this document is approved:

1. Create the six git worktrees listed above.
2. In each worktree, create the prototype folder and README shell.
3. Implement the six prototypes as timeboxed standalone p5/HTML sketches.
4. Run the comparison protocol.
5. Update this matrix with scores and a final architecture recommendation.
