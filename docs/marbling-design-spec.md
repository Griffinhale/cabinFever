# Interactive Marbling Design Spec

Date: 2026-05-08
Project: cabinFever marbling prototype

## Purpose

Build an interactive marbling canvas that starts blank and lets users drop virtual pigment onto a cream paper/water surface. Each drop grows slowly, collides with neighboring drops and edges, and forms organic Voronoi-like bounded regions. The first deliverable should be a standalone p5/HTML prototype, not a full Next.js integration.

## Product Identity

Primary identity is a hybrid of:

1. Interactive art toy / creative playground
2. Portfolio / website background effect

The immediate demo should be a full-screen canvas-only experience. Later, the marbling surface may become part of a navigable website with pages layered around or over it.

## Interaction Model

### Starting State

- Canvas begins blank.
- Background is a white/cream paper-like surface.
- Tiny corner hints are allowed so users can discover the interaction.

### Pointer Input

Core gesture:

- User clicks/taps/presses to drop one color at the pointer location.
- All drops grow slowly after being placed.
- Holding longer means more paint is dropped.
- Paint amount maps to the drop's eventual target size.

Interpretation:

- `pointerdown` starts measuring paint amount.
- `pointerup` finalizes the drop's target radius.
- A minimum quick-tap drop should still exist.
- Longer hold should increase target radius, up to a capped maximum.
- The visual drop may appear immediately on pointerdown and continue gaining target size while held.

### Growth Rules

Growth should be hybrid:

- Each drop has a target max size based on paint amount / hold duration.
- Growth is blocked by collisions with other drops and canvas edges.
- Drops grow slowly and meditatively.
- Once user interaction and growth finish, the image should become static.
- No constant idle animation after the composition settles.

### Collision / Layering Rules

Initial implementation:

- Start simple: new drops visually sit on top of old drops.
- New drops should still be bounded by neighboring geometry/edges where appropriate.
- Full displacement of old pigment is a later feature.

Future implementation:

- New drops placed inside existing pigment should push/displace old pigment outward, closer to physical marbling.

### Reset / Undo

- Reset only.
- No undo/redo in the first demo.

Suggested hidden controls:

- `R` or long-press corner hint: reset canvas.
- Optional: double-tap empty area to reset only if discoverable and not annoying.

### Export

- No export needed now.
- Save/share/export can wait.

## Visual Direction

### Surface

- Cream/white paper-like base.
- Should feel like pigment floating on water before transfer to paper, but visually readable as paper marbling.
- Avoid plain flat white; use subtle grain/noise.

### Drop Boundaries

- Strongly fluid, irregular, water-like edges.
- Avoid perfect geometric circles.
- Boundary should wobble organically but remain coherent.
- The final shape should still preserve the logic of bounded growing regions.

### Color System

- User can cycle through palettes by key/tap.
- Avoid raw random RGB.
- Palettes should be curated.
- Good initial palette categories:
  - Traditional marbling: indigo, oxblood, ochre, moss, cream
  - Bright playful: coral, turquoise, lemon, violet, ultramarine
  - Portfolio/brand subdued: charcoal, clay, muted teal, cream, copper
  - Monochrome ink: blue-black, gray, cream, pale wash

### Motion Feel

- Calm / slow / meditative.
- Visible growth, but not arcade-fast.
- Interaction should feel like adding paint to water, not spawning game objects.

## Device / Platform Targets

- Desktop mouse and mobile/touch are equally important from the start.
- Use pointer events rather than mouse-only events where possible.
- Prevent unwanted page scrolling during canvas interaction in the standalone demo.
- The demo should be full-screen canvas only.

## Technical Direction

### First Refactor Target

Create a standalone p5/HTML prototype first.

Rationale:

- Faster iteration on simulation and feel.
- Avoid React/Next integration complexity while the model is still changing.
- Once the behavior and visual language are proven, port back into Next.js as a clean component.

### Quality Target

Balanced: simple correct model with strong visual styling.

Do not optimize only for beauty while ignoring collision logic. Do not build a dry physics proof with weak visuals. The first prototype should demonstrate both:

- Click/hold paint amount -> target drop size.
- Slow organic growth -> blocked by neighbors/edges.
- Curated marbling aesthetics.

## Current Codebase Assessment

Existing relevant files:

- `src/app/components/CircleDropper.tsx`
- `src/app/components/CircleDropperUtils.tsx`
- `src/app/components/Particle.ts`
- `src/app/page.tsx`
- `src/app/globals.css`

Current strengths:

- p5 is already integrated.
- Particles exist as an abstraction.
- Drops have radial vertices, which is useful for organic deformable boundaries.
- There is already an attempt at per-vertex growth and collision.

Current issues:

- Particles spawn on scroll, not click/touch.
- Spawn position is random, not pointer-based.
- Collision detection is effectively broken because it relies on vertex-to-vertex distance and returns too early.
- Edge handling writes absolute canvas coordinates into local vertex coordinates.
- `maxSize` is defined but unused.
- Visual style is random translucent RGB, not marbling.
- Canvas container is unused by p5 instance.
- Production build is blocked by unrelated Storybook lint errors in `src/stories/Page.tsx`.

## Non-Goals For First Prototype

- No full Next.js page navigation.
- No true pigment displacement of old drops.
- No PNG/video export.
- No undo/redo.
- No complex UI panel.
- No physically accurate Navier-Stokes fluid simulation.

## Acceptance Criteria For First Standalone Demo

A first successful standalone prototype should satisfy:

1. Opens as a single HTML file or simple static p5 sketch.
2. Full-screen cream canvas.
3. Tiny unobtrusive corner hints only.
4. Pointer press creates a drop at the pointer location.
5. Holding longer produces a larger eventual drop.
6. Drops grow slowly after placement.
7. Drops stop growing when they reach target size, canvas edge, or neighboring occupied regions.
8. Boundaries look strongly organic/water-like.
9. Palette can be cycled by key/tap.
10. Reset works.
11. Desktop and touch input both work.
12. When no growth is occurring, the image is static.
