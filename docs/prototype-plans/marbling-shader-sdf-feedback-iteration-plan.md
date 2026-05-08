# Marbling Shader/SDF Feedback Iteration Plan

Date: 2026-05-08
Branch: `proto/marbling-shader-sdf`
Prototype folder: `prototypes/marbling-shader-sdf/`
Existing prototype: standalone p5/HTML `WEBGL` shader/SDF page
Feedback: prototype URL 3 did not load
Status: plan only; do not implement prototype code in this commit

## Round-Two Goal

The first-pass shader/SDF prototype missed the most basic acceptance test: it did not load for the reviewer. Round two must prioritize reliability over shader ambition.

Primary objective:

1. Reproduce and diagnose the load failure.
2. Make the page open reliably as a static standalone prototype.
3. Add graceful fallback paths so the reviewer sees either the shader version, a simpler canvas version, or a visible diagnostic message instead of a blank/broken page.
4. Preserve the architecture's original visual-ceiling goal once the page is loading.

Visual polish remains important, but it is secondary until the static page can be opened and evaluated consistently.

## User Feedback Context

Feedback by prototype URL order:

1. Raster: cool, but not consistently circular enough.
2. Radial: worked best.
3. Shader/SDF: did not load.
4. Metaballs: great, but laggy.
5. Relaxation: interesting, but too jagged.
6. Particles: worked best.

Interpretation for this branch:

- The shader/SDF prototype cannot compete until load reliability is fixed.
- The successful radial and particle prototypes prove the interaction target is understandable; this branch should not overcomplicate the gesture while debugging the renderer.
- Metaballs being visually strong but laggy reinforces that shader/SDF may still have value if it can load and stay performant.
- Round two should keep the shader's visual-ceiling ambition, but must include a robust 2D fallback so the URL is never dead.

## Current Prototype Notes

Files currently present:

```text
prototypes/marbling-shader-sdf/
  index.html
  README.md
```

The existing prototype is self-contained and uses:

- p5.js 1.11.3 from CDN
- p5 `WEBGL` canvas
- inline vertex and fragment shader strings
- fixed uniform arrays for up to 48 drops
- JavaScript drop state, hold-to-radius mapping, growth, palette cycling, reset, and edge limiting
- shader-side SDF-like ownership, paper grain, pigment/rim/seam styling

Likely load-risk areas to inspect first:

- CDN p5 load failure or blocked network access
- browser lacking WebGL support or WebGL context creation failure
- p5 `createShader` / shader compile failure
- shader syntax incompatibility on some browser/GPU combinations
- uniform array limits or uniform type packing errors
- fragment shader loops too complex for a device/browser and failing compilation
- JavaScript exception during setup before visible UI appears
- page served from an environment where the prototype path or CDN dependency is unavailable

## Exact Files For Round-Two Implementation

Modify only the standalone prototype files unless a tiny test helper is explicitly justified:

```text
prototypes/marbling-shader-sdf/index.html
prototypes/marbling-shader-sdf/README.md
```

This planning commit creates only:

```text
docs/prototype-plans/marbling-shader-sdf-feedback-iteration-plan.md
```

Do not modify the Next.js app during this iteration.
Do not add npm dependencies or build tooling.
Do not change other prototype branches.

## Reliability Acceptance Criteria

Round two is successful only if:

- The URL opens to a visible page rather than a blank screen.
- If p5 fails to load, a visible fallback message appears.
- If WebGL is unavailable, the prototype switches to a 2D canvas fallback.
- If shader compilation fails, the prototype switches to a simpler renderer or displays a readable error overlay.
- Static serving works from `python3 -m http.server`.
- The browser console contains no uncaught startup exceptions on a modern desktop browser.
- A reviewer can still tap/click/hold and see pigment behavior in fallback mode.
- README documents the new diagnostic/fallback behavior and the commands used to verify it.

Architecture-specific acceptance after reliability fixes:

- When WebGL and the shader path work, preserve the high visual-ceiling SDF/paper/pigment treatment.
- When falling back, prioritize functional interaction and clear visibility over perfect marbling style.
- The fallback should be simple enough to load on devices that rejected the shader path.

## Staged Implementation Tasks

### Stage 1: Reproduce and isolate the load failure

Files:

- Inspect `prototypes/marbling-shader-sdf/index.html`
- Update `prototypes/marbling-shader-sdf/README.md` with findings after diagnosis

Tasks:

1. Serve the prototype exactly as a static page.
2. Open it in at least one WebGL-capable browser.
3. Capture browser console errors, shader compile logs, and network failures.
4. Verify whether `p5` loaded before setup runs.
5. Verify whether WebGL context creation succeeds.
6. Verify whether shader compilation/linking succeeds.
7. Identify whether failure is network/CDN, JavaScript startup, WebGL support, GLSL compile, uniform packing, or runtime draw-loop related.

Verification commands:

```bash
cd /workspace/projects/Griffinhale_git/worktrees/cabinFever-marbling-shader/prototypes/marbling-shader-sdf
python3 -m http.server 8123
```

Open:

```text
http://127.0.0.1:8123/
```

Static smoke:

```bash
cd /workspace/projects/Griffinhale_git/worktrees/cabinFever-marbling-shader/prototypes/marbling-shader-sdf
python3 -m http.server 8123 >/tmp/marbling-shader-sdf-http.log 2>&1 &
server_pid=$!
curl -fsS http://127.0.0.1:8123/ >/tmp/marbling-shader-sdf-smoke.html
kill "$server_pid"
test -s /tmp/marbling-shader-sdf-smoke.html
```

JavaScript extraction check:

```bash
cd /workspace/projects/Griffinhale_git/worktrees/cabinFever-marbling-shader/prototypes/marbling-shader-sdf
python3 - <<'PY' > /tmp/marbling-shader-sdf-inline.js
from pathlib import Path
import re
html = Path('index.html').read_text()
match = re.search(r'<script>\n([\s\S]*)\n  </script>', html)
assert match, 'inline script not found'
print(match.group(1))
PY
node --check /tmp/marbling-shader-sdf-inline.js
```

Browser/manual checks:

- Confirm page is not blank.
- Confirm visible hint or diagnostic overlay appears.
- Confirm no uncaught startup exception.
- Record exact browser, OS/device, and console messages in README notes if reproducible.

Commit checkpoint:

```text
chore(shader): diagnose prototype load failure
```

### Stage 2: Add defensive startup and visible diagnostics

Files:

- `prototypes/marbling-shader-sdf/index.html`
- `prototypes/marbling-shader-sdf/README.md`

Tasks:

1. Add a persistent tiny status/diagnostic overlay that can show startup phase and failure reason.
2. Add `window.onerror` and `unhandledrejection` handlers that display visible error text.
3. Add a preflight check for `window.p5` before initializing the sketch.
4. If p5 is unavailable, show a plain DOM fallback message on the cream background instead of failing silently.
5. Wrap shader creation and initial shader use in `try/catch` so compile/runtime failures are caught.
6. Detect whether a WebGL context can be created before committing to the shader renderer.
7. Keep diagnostic UI unobtrusive during normal success, but readable during failure.

Implementation notes:

- The overlay should never depend on p5 or WebGL to render.
- Use simple DOM text so failures before canvas creation are visible.
- Include a short message such as `Shader failed; using 2D fallback` or `p5 failed to load from CDN`.
- Do not expose long stack traces in the normal UI; log full detail to console and show a concise visible message.

Verification:

- Temporarily simulate missing p5 by blocking or renaming the CDN script during local testing, then confirm a visible message appears.
- Temporarily force shader initialization to throw, then confirm the fallback/overlay path appears.
- Confirm normal path still hides or minimizes diagnostics.

Commit checkpoint:

```text
fix(shader): add startup diagnostics and error overlay
```

### Stage 3: Add a robust 2D canvas fallback renderer

Files:

- `prototypes/marbling-shader-sdf/index.html`
- `prototypes/marbling-shader-sdf/README.md`

Tasks:

1. Implement a simple non-WebGL fallback renderer using either p5 2D canvas or plain Canvas 2D.
2. Reuse the existing JavaScript drop state, hold-duration mapping, palettes, reset, and touch handling where possible.
3. Draw the cream paper background in fallback mode.
4. Draw drops as organic-but-simple radial/warped circles, using a small number of deterministic jitter points or layered arcs.
5. Maintain quick tap, hold growth, palette cycling, reset, and static-settle behavior.
6. Ensure fallback does not use shader uniforms, WebGL-only calls, or expensive per-pixel loops.
7. Show a concise status message when fallback mode is active.

Fallback visual target:

- It does not need to match the full shader look.
- It should be attractive enough to evaluate interaction if the shader cannot run.
- It should borrow the strongest lessons from radial/particle feedback: readable circular pigment, calm growth, responsive tap/hold behavior.

Verification:

- Force fallback mode with a temporary flag and verify interaction works.
- Test quick tap, long hold, neighboring drops, edge drops, palette cycle, reset, and settle.
- Confirm fallback remains responsive with 20+ drops.

Commit checkpoint:

```text
fix(shader): add 2d fallback renderer
```

### Stage 4: Reduce shader fragility

Files:

- `prototypes/marbling-shader-sdf/index.html`
- `prototypes/marbling-shader-sdf/README.md`

Tasks:

1. Lower default shader complexity before rebuilding visual detail.
2. Reduce `MAX_DROPS` for the shader path if uniform pressure is suspected; consider 32 as the safe default.
3. Avoid complex noise inside the per-drop loop where possible.
4. Move expensive or repeated values to JavaScript-side precomputed uniforms.
5. Keep shader loops simple and statically bounded.
6. Add a simpler shader quality mode that disables seam/noise extras if compilation or performance is poor.
7. Ensure uniform arrays are always fully populated with numeric values before setting uniforms.
8. Confirm coordinate and radius units are documented near uniform packing.

Suggested shader fallback ladder:

1. Full shader: paper grain, SDF ownership, rims, seams, granulation.
2. Simple shader: paper background plus clean bounded pigment discs/rims with minimal warp.
3. 2D renderer: no WebGL dependency.
4. DOM diagnostic: if even p5/canvas startup fails.

Verification:

- Test full shader path on desktop.
- Test simple shader path by forcing quality mode.
- Confirm no shader compile/link errors.
- Confirm page remains visible if full shader initialization throws.

Commit checkpoint:

```text
fix(shader): simplify shader path for reliable startup
```

### Stage 5: Restore visual ceiling after reliability is proven

Files:

- `prototypes/marbling-shader-sdf/index.html`
- `prototypes/marbling-shader-sdf/README.md`

Tasks:

1. Reintroduce paper grain, pigment variation, boundary warp, rims, and seams incrementally.
2. After each visual feature, test page load and shader compile.
3. Keep full shader visual enhancements behind functions or quality toggles so failures can fall back cleanly.
4. Tune for portfolio-worthy screenshots with 10-20 drops.
5. Avoid animated idle noise after growth settles.
6. Preserve simple readable circularity; do not over-warp into jagged relaxation-like edges.

Visual direction:

- Lean into the original shader/SDF strength: high-quality paper, pigment staining, rim detail, and negotiated seams.
- Borrow from the best feedback on radial/particles: drops should read immediately, gesture should feel responsive, and the result should remain calm and beautiful.
- Avoid metaball-like lag and avoid relaxation-like jaggedness.

Verification:

- Load page fresh with cache disabled.
- Add 10-20 drops and capture screenshot notes.
- Confirm tap/hold still feels like adding pigment.
- Confirm no blank screen after reload.

Commit checkpoint:

```text
style(shader): restore robust marbling shader polish
```

### Stage 6: Final documentation and evaluation handoff

Files:

- `prototypes/marbling-shader-sdf/README.md`

Tasks:

1. Document normal run instructions.
2. Document the fallback ladder and how to recognize active fallback mode.
3. Document manual QA script for reviewer parity.
4. Document known limitations and remaining browser/GPU risks.
5. Record verified environments if available.
6. Keep comparison notes focused on whether shader/SDF is now viable after fixing the load failure.

Verification:

- Another developer can run the prototype and understand what to do if shader fallback appears.
- README accurately matches implemented controls and fallback behavior.

Commit checkpoint:

```text
docs(shader): document fallback and feedback iteration
```

## Round-Two Verification Commands

Plan-only verification for this commit:

```bash
cd /workspace/projects/Griffinhale_git/worktrees/cabinFever-marbling-shader
test -f docs/prototype-plans/marbling-shader-sdf-feedback-iteration-plan.md
git diff --check
git status --short
```

Implementation verification once code changes begin:

```bash
cd /workspace/projects/Griffinhale_git/worktrees/cabinFever-marbling-shader/prototypes/marbling-shader-sdf
python3 -m http.server 8123
```

Open:

```text
http://127.0.0.1:8123/
```

Static HTML smoke:

```bash
cd /workspace/projects/Griffinhale_git/worktrees/cabinFever-marbling-shader/prototypes/marbling-shader-sdf
python3 -m http.server 8123 >/tmp/marbling-shader-sdf-http.log 2>&1 &
server_pid=$!
curl -fsS http://127.0.0.1:8123/ >/tmp/marbling-shader-sdf-smoke.html
kill "$server_pid"
test -s /tmp/marbling-shader-sdf-smoke.html
```

Inline JavaScript syntax check:

```bash
cd /workspace/projects/Griffinhale_git/worktrees/cabinFever-marbling-shader/prototypes/marbling-shader-sdf
python3 - <<'PY' > /tmp/marbling-shader-sdf-inline.js
from pathlib import Path
import re
html = Path('index.html').read_text()
match = re.search(r'<script>\n([\s\S]*)\n  </script>', html)
assert match, 'inline script not found'
print(match.group(1))
PY
node --check /tmp/marbling-shader-sdf-inline.js
```

Manual browser QA:

- Load the page with cache disabled.
- Confirm visible page within one second.
- Confirm no blank screen if WebGL fails or shader fails.
- Quick tap in the center.
- Long hold near the center.
- Add two close neighboring drops.
- Add one drop near an edge.
- Add 10-20 drops across the viewport.
- Press `P` and add more drops.
- Press `R` and confirm reset.
- Wait for growth to settle and confirm no idle jitter.
- Repeat on touch/mobile or mobile emulator.
- Force fallback mode and repeat quick tap, hold, palette, reset.

Browser console checks:

- No uncaught startup exceptions.
- No unhandled promise rejections.
- No shader compile/link errors in normal full-shader mode.
- If fallback triggers, it logs the reason and displays a concise visible status.

## Commit Plan

This planning task commits only:

```text
docs(shader): add feedback iteration plan
```

Suggested implementation commits later:

1. `chore(shader): diagnose prototype load failure`
2. `fix(shader): add startup diagnostics and error overlay`
3. `fix(shader): add 2d fallback renderer`
4. `fix(shader): simplify shader path for reliable startup`
5. `style(shader): restore robust marbling shader polish`
6. `docs(shader): document fallback and feedback iteration`

Before each implementation commit:

- run `git diff --check`;
- run static HTML and inline JavaScript checks;
- serve the prototype locally and manually open it;
- verify no Next.js app files changed;
- verify any temporary forced-failure flags are removed;
- document browser-only limitations clearly if a real browser/WebGL check was unavailable.

## Non-Goals For This Iteration

Do not add:

- Next.js integration
- npm/build tooling
- true fluid simulation
- export/share
- undo/redo
- large UI panels
- cross-prototype refactors
- dependencies beyond the existing p5 CDN usage unless separately approved

## Final Evaluation Questions

After implementation, answer these before comparing again:

- Does the URL reliably show something useful instead of failing to load?
- If the full shader cannot run, does the fallback preserve the core tap/hold interaction?
- Was the original load failure diagnosed well enough to prevent regression?
- Does the full shader path still offer a visual ceiling above the radial/particle directions?
- Does fallback mode make this branch safe to include in future demos even on weaker devices?
- Is shader/SDF still best considered a final architecture, or a visual layer over a more reliable radial/raster/particle interaction model?
