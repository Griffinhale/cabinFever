# Marbling Shader / SDF Implicit Field Prototype

## Purpose

This standalone prototype tests whether a shader-first implicit field can provide the strongest visual ceiling for the cabinFever marbling interaction. It prioritizes portfolio-background atmosphere, stable paper/pigment texture, and understandable shader code while preserving the core gesture: press/tap/hold to add pigment.

It deliberately does not touch the Next.js app and has no npm/build dependency.

## Architecture

The prototype is a single `index.html` using p5.js 1.11.3 from the CDN in `WEBGL` mode.

JavaScript owns:

- pointer/touch input
- press duration measurement
- hold-duration to target-area/radius mapping
- drop growth over time
- curated palette selection
- reset behavior
- static-settle detection
- packing drop state into shader uniform arrays
- edge-aware target/current radius limiting so drops near canvas edges stay bounded

The fragment shader owns:

- cream paper/water background grain
- stable per-drop boundary warping
- signed-distance-like drop evaluation
- weighted nearest-owner selection
- pigment fill, rims, seams, stains, and granulation

Drop uniform packing is documented in the shader:

- `u_dropGeom[i] = vec4(centerX01, centerY01, currentRadiusPx, seed)`
- `u_dropColor[i] = vec4(fillR, fillG, fillB, age01)`; `age01` subtly varies layer depth in crowded compositions
- `u_dropRim[i] = vec4(rimR, rimG, rimB, targetRadiusPx)`; `targetRadiusPx` estimates growth/wetness while a drop settles

The collision model is an illusion: pixels choose an implicit owner using warped signed distance and weighted/power-distance scoring. This creates plausible negotiated seams, but it is not physical material conservation.

Drops are bounded before they reach the shader: JavaScript caps each current/target radius by the drop center's distance to the nearest canvas edge minus an 8px paper margin, with a 10px minimum visible radius for direct edge taps. This keeps edge drops understandable instead of allowing large offscreen circles that are only clipped by the canvas.

## Controls

- Press/tap: create pigment at the pointer.
- Hold: increase paint amount / eventual target footprint.
- Quick tap: creates a minimum visible drop.
- `P`: cycle palette.
- `R`: reset.
- `Escape`: reset.
- Touch/mobile: top-left invisible corner zone cycles palette; top-right invisible corner zone resets.

The canvas intentionally has only a tiny lower-left hint.

## Run

From this folder:

```bash
cd /workspace/projects/Griffinhale_git/worktrees/cabinFever-marbling-shader/prototypes/marbling-shader-sdf
python3 -m http.server 8123
```

Open:

```text
http://localhost:8123
```

Because p5 is loaded from a CDN, the page needs network access for first load unless the dependency is already cached.

## Verification

Static checks used for this prototype:

```bash
python3 - <<'PY' > /tmp/marbling-shader-sdf-inline.js
from pathlib import Path
import re
html = Path('index.html').read_text()
match = re.search(r'<script>\n([\s\S]*)\n  </script>', html)
assert match, 'inline script not found'
print(match.group(1))
PY
node --check /tmp/marbling-shader-sdf-inline.js
python3 -m http.server 8123
curl -fsS http://127.0.0.1:8123/ >/tmp/marbling-shader-sdf-smoke.html
```

If a real browser/WebGL session is unavailable in the verification environment, record that limitation explicitly and use the static smoke above to confirm the standalone HTML serves correctly. Final acceptance should still include opening `http://localhost:8123` in a WebGL-capable browser and testing tap/hold, edge drops, palette cycling, reset, and settle behavior.

## What to evaluate

Use the shared prototype comparison script:

1. Load the blank cream surface.
2. Quick tap in the center.
3. Long hold near the center.
4. Add two close neighboring drops.
5. Add one drop near an edge.
6. Add 10-20 drops across the viewport.
7. Press `P` and add more drops.
8. Press `R` and confirm reset.
9. Wait until growth settles and confirm the image becomes static.
10. Repeat tap and hold on touch/mobile or a mobile emulator.

Evaluate especially:

- visual ceiling and screenshot quality
- whether the gesture feels like adding pigment rather than toggling blobs
- whether implicit seams feel plausible or fake
- desktop/mobile viability at up to 48 active drops
- whether this shader could become a rendering layer over a stricter raster/displacement model

## Curated palettes

The prototype includes four palettes:

- traditional marbling: indigo, oxblood, ochre, moss, cream
- bright playful: coral, turquoise, lemon, violet, ultramarine
- portfolio subdued: charcoal, clay, muted teal, cream, copper
- monochrome ink: blue-black, grays, pale wash

Cycling palettes changes the paper atmosphere and future drops. Existing drops keep their original colors so the composition can accumulate mixed palette history.

## Static-settle behavior

Drops grow slowly toward their target radius using frame-time-based growth. Once there is no active press and every drop is within the settle epsilon of its target radius, the sketch stops looping with `noLoop()`. Shader noise is coordinate/seed based, not idle-time animated, so the final composition does not drift or jitter.

New input, reset, palette change, or resize calls `loop()` and resumes rendering.

## Known limitations

- Collision semantics are approximate, not physical.
- Paint amount maps to target radius/field strength, not conserved pigment mass.
- New drops do not truly displace old pigment.
- Edge drops are intentionally radius-limited rather than physically displaced back into the page.
- Weighted nearest-owner seams may still read as a shader trick in crowded compositions.
- Fixed uniform arrays cap the prototype at 48 drops; older drops are discarded after the cap.
- Full-screen fragment shader cost scales with viewport size and active drop count.
- Mobile performance may require a lower drop cap or simpler shader noise.
- Debugging shader ownership is harder than inspecting raster or geometry state.
- The model is better at visual ceiling than physically honest marbling.

## Future displacement support

This branch is useful as a visual renderer even if another architecture wins the simulation comparison. Future directions:

- feed the shader from a raster ownership texture instead of uniform drop arrays
- add ping-pong feedback textures for advected pigment/displacement
- keep the current paper, rim, stain, and granulation shader as a post-process layer
- use pressure/displacement fields to warp existing pigment when a new drop is added
- combine this visual treatment with raster ownership or boundary relaxation for stronger collision semantics
