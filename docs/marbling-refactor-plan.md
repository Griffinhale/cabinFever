# Marbling Standalone Prototype Implementation Plan

> **For Hermes:** Use subagent-driven-development skill to implement this plan task-by-task.

**Goal:** Build a standalone p5/HTML marbling prototype where users press/hold to drop pigment, drops grow slowly to a paint-amount target size, and organic boundaries stop against neighboring drops and canvas edges.

**Architecture:** Create a standalone prototype under `prototypes/marbling-standalone/` before porting anything back into the Next.js app. Keep simulation state separate from rendering helpers. Use a radial-boundary drop model: each drop stores sampled boundary rays, grows each ray independently, and blocks rays when the next proposed point would enter another drop or leave the canvas.

**Tech Stack:** Static HTML, p5.js 1.11.3 from CDN, plain JavaScript first for iteration speed. Later port the proven model to TypeScript/React.

---

## Reference Document

Read first:

- `docs/marbling-design-spec.md`

## Implementation Constraints

- Do not modify the current Next.js app during the first prototype pass.
- Do not implement true pigment displacement yet.
- Do not add a large visible control panel.
- Do not add export, undo/redo, or page navigation.
- Optimize for a balanced first prototype: simple correct behavior plus strong visual styling.

## Target Files

Create:

- `prototypes/marbling-standalone/index.html`
- `prototypes/marbling-standalone/README.md`

Optional later, only if the single file becomes too large:

- `prototypes/marbling-standalone/sketch.js`
- `prototypes/marbling-standalone/styles.css`

For the first pass, prefer one self-contained `index.html`.

---

## Task 1: Create the standalone prototype shell

**Objective:** Add a self-contained p5 HTML page with full-screen canvas, cream background, and tiny corner hints.

**Files:**

- Create: `prototypes/marbling-standalone/index.html`
- Create: `prototypes/marbling-standalone/README.md`

**Steps:**

1. Create the directory `prototypes/marbling-standalone/`.
2. Create `index.html` with:
   - p5.js CDN import.
   - `p5.disableFriendlyErrors = true` before sketch code.
   - full-screen canvas.
   - `pixelDensity(1)`.
   - no scrollbars.
   - cream paper-like background.
   - tiny corner hint text: “hold to drop · P palette · R reset”.
3. Add basic `setup()`, `draw()`, `windowResized()`, and `keyPressed()`.
4. Add a README explaining how to open the prototype.

**Verification:**

Run a local static server:

```bash
cd /workspace/projects/Griffinhale_git/cabinFever/prototypes/marbling-standalone
python3 -m http.server 8123
```

Expected:

- Browser opens a cream full-screen canvas.
- No console errors.
- Resizing the window resizes the canvas.

---

## Task 2: Add curated palette system

**Objective:** Replace random RGB with curated pigment palettes and palette cycling.

**Files:**

- Modify: `prototypes/marbling-standalone/index.html`

**Steps:**

1. Define a `PALETTES` array with at least four palette objects:
   - traditional marbling
   - bright playful
   - portfolio subdued
   - monochrome ink
2. Each palette should include:
   - `name`
   - `surface`
   - `grain`
   - `pigments`
   - optional `rim` / `shadow` colors
3. Add `currentPaletteIndex`.
4. Add `nextPalette()` bound to `P`.
5. On palette change, update only future drops at first. Do not recolor existing drops unless later desired.
6. Update hint text to include the active palette name.

**Verification:**

- Pressing `P` cycles palette names.
- New drops after cycling use the new palette.
- Existing drops keep their old colors.

---

## Task 3: Implement pointer press/hold/drop state

**Objective:** Capture press duration and map paint amount to target radius.

**Files:**

- Modify: `prototypes/marbling-standalone/index.html`

**Steps:**

1. Add global state:
   - `drops = []`
   - `activePress = null`
2. Implement pointer-style p5 handlers:
   - `mousePressed()` for desktop
   - `mouseReleased()` for desktop
   - `touchStarted()` for mobile
   - `touchEnded()` for mobile
3. Start `activePress` on press:
   - x/y pointer location
   - start time
   - selected pigment color
4. On release, compute hold duration:
   - minimum duration floor for quick taps
   - cap duration so target radius cannot become absurd
5. Map hold duration to target radius:
   - quick tap: small but visible drop
   - long hold: large drop
6. Create a new `Drop` at the press location with that target radius.
7. Return `false` from touch handlers to prevent scroll/zoom interaction in the demo.

**Verification:**

- Quick click creates a small growing drop at pointer position.
- Longer hold creates a larger eventual drop.
- Touch interaction works without page scroll in the demo.

---

## Task 4: Create the Drop radial-boundary model

**Objective:** Implement a drop class with sampled boundary rays and independent growth per ray.

**Files:**

- Modify: `prototypes/marbling-standalone/index.html`

**Drop properties:**

- `center`
- `targetRadius`
- `baseColor`
- `rimColor`
- `createdAt`
- `angles[]`
- `radii[]`
- `blocked[]`
- `noiseSeed`
- `growthRate`

**Steps:**

1. Create `class Drop`.
2. In constructor, generate 128-192 angular samples.
3. Initialize all radii small, e.g. 1-3 px.
4. Store `blocked[i] = false` for each ray.
5. Add `worldPoint(i, radiusOverride)` helper.
6. Add `radiusAtAngle(angle)` helper for collision checks.
7. Add `isGrowing()` helper that returns true if any ray can still grow and at least one radius is below target.

**Verification:**

- Creating a Drop object does not throw.
- A single drop can render as a polygon.
- A single drop grows toward its target radius.

---

## Task 5: Implement growth against target size and canvas edges

**Objective:** Make drops grow slowly and stop at their target radius or canvas boundary.

**Files:**

- Modify: `prototypes/marbling-standalone/index.html`

**Steps:**

1. Add `Drop.update()`.
2. For each ray:
   - skip if blocked
   - skip if current radius >= target radius
   - compute proposed next radius
   - compute proposed world point
   - if proposed point is outside canvas, mark ray blocked
   - otherwise set radius to proposed radius
3. Add slight per-ray growth variation using noise or deterministic angular variation.
4. Ensure no ray grows past target radius.
5. Track whether any drops are still growing so `draw()` can become static later if desired.

**Verification:**

- A drop near an edge stops at that edge instead of drawing outside.
- A drop in the center stops at its target radius.
- Growth is calm and slow, not instant.

---

## Task 6: Implement drop-to-drop blocking

**Objective:** Stop each boundary ray before it invades another drop’s occupied region.

**Files:**

- Modify: `prototypes/marbling-standalone/index.html`

**Collision approach:**

For each proposed point on drop A:

1. For each other drop B:
   - compute vector from B center to proposed point
   - compute angle of that vector
   - get B boundary radius at that angle
   - if distance from B center to proposed point is less than B boundary radius plus margin, block A’s ray
2. If blocked by any drop, do not grow that ray.
3. Otherwise grow normally.

**Important:**

- Do not use vertex-to-vertex distance as the main collision check.
- Do not return after the first vertex pair.
- Keep collision approximate and stable.

**Verification:**

- Two drops placed near each other stop at a shared boundary instead of overlapping heavily.
- Multiple drops create Voronoi-like bounded regions.
- New top-layer drops may visually appear over old drops, but their growing boundary should still respond to occupied space according to the selected simple model.

---

## Task 7: Add organic water-like boundary deformation

**Objective:** Make boundaries strongly fluid and irregular while preserving collision logic.

**Files:**

- Modify: `prototypes/marbling-standalone/index.html`

**Steps:**

1. Add visual-only boundary modulation when rendering, or controlled modulation during growth.
2. Prefer stable noise tied to:
   - drop seed
   - angle
   - maybe creation time
3. Avoid animated idle noise after drops settle.
4. Keep deformation bounded so collision behavior remains understandable.
5. Render with `curveVertex()` or enough polygon samples to look smooth.

**Verification:**

- Drops no longer look like perfect circles.
- Boundaries feel fluid/water-like.
- Shapes do not jitter when idle.

---

## Task 8: Improve marbling rendering style

**Objective:** Make the prototype look like pigment on a cream water/paper surface rather than flat translucent blobs.

**Files:**

- Modify: `prototypes/marbling-standalone/index.html`

**Steps:**

1. Add subtle background grain.
2. Render each drop with:
   - translucent fill
   - slightly darker rim
   - optional inner wash/highlight
3. Consider drawing each drop into an offscreen layer if helpful.
4. Avoid excessive alpha stacking that makes colors muddy.
5. Keep rendering performant at full screen.

**Verification:**

- First impression reads as marbling/pigment, not random circles.
- Drops remain visually distinct.
- Cream surface is not flat white.

---

## Task 9: Add reset and static-idle behavior

**Objective:** Keep the demo minimal and calm after growth completes.

**Files:**

- Modify: `prototypes/marbling-standalone/index.html`

**Steps:**

1. Bind `R` to reset all drops.
2. Optional: bind `Escape` to reset as well.
3. In `draw()`, update drops only while any drop is growing or while the user is pressing.
4. If everything is settled, keep rendering the same final frame without unnecessary state mutation.
5. Avoid visible UI beyond tiny hints.

**Verification:**

- Pressing `R` clears canvas.
- Once all drops finish growing, the composition becomes static.
- New interaction resumes growth/rendering as expected.

---

## Task 10: Test desktop and mobile/touch behavior

**Objective:** Verify the prototype works with mouse and touch from the beginning.

**Files:**

- Modify as needed: `prototypes/marbling-standalone/index.html`
- Update: `prototypes/marbling-standalone/README.md`

**Steps:**

1. Test mouse click quick tap.
2. Test mouse press-and-hold.
3. Test touch tap.
4. Test touch press-and-hold.
5. Confirm canvas does not scroll while touching.
6. Confirm reset and palette controls work on desktop.
7. If mobile needs no keyboard, add tiny tappable corner regions for palette/reset only if necessary.

**Verification:**

- Desktop and mobile/touch both satisfy the core interaction.
- No accidental page scrolling in standalone demo.
- No console errors.

---

## Task 11: Document prototype behavior and limitations

**Objective:** Make the prototype understandable for future porting into Next.js.

**Files:**

- Update: `prototypes/marbling-standalone/README.md`

**README should include:**

- Purpose of the prototype.
- How to run it.
- Controls.
- Interaction model.
- Current simplifications:
  - top-layer drops first
  - no true displacement yet
  - no export
  - no undo
- Notes for future Next.js port.

**Verification:**

- A developer can read the README and understand what the prototype demonstrates.

---

## Task 12: Prepare future Next.js port notes

**Objective:** Capture how the standalone prototype should eventually return to the app.

**Files:**

- Update: `docs/marbling-design-spec.md` or create `docs/marbling-next-port-notes.md`

**Notes should cover:**

- Replace scroll-driven `CircleDropper` behavior.
- Convert prototype `Drop` model to TypeScript.
- Use a React ref so p5 attaches to a specific container.
- Keep p5 instance lifecycle inside `useEffect`.
- Support full-screen demo route first.
- Fix or remove Storybook lint blocker before production build.

**Verification:**

- The future porting path is clear without reading this chat.

---

## Manual QA Checklist

Use this checklist before calling the prototype complete:

- [ ] Blank cream surface on load.
- [ ] Tiny corner hints only.
- [ ] Quick click/tap creates small drop at pointer.
- [ ] Long hold creates larger target drop.
- [ ] Drops grow slowly and meditatively.
- [ ] Drops stop at target size.
- [ ] Drops stop at canvas edges.
- [ ] Drops avoid major overlap with neighbors.
- [ ] Multiple drops create bounded/Voronoi-like regions.
- [ ] Boundaries look strongly fluid/organic.
- [ ] Palette cycling works.
- [ ] Reset works.
- [ ] No export UI.
- [ ] No undo/redo UI.
- [ ] Desktop and touch both work.
- [ ] No console errors.

## Suggested Commit Sequence

1. `docs: add marbling design spec and prototype plan`
2. `feat: create standalone marbling p5 shell`
3. `feat: add press-hold drop creation`
4. `feat: implement bounded radial drop growth`
5. `feat: add organic marbling rendering`
6. `docs: document marbling prototype controls and limitations`
