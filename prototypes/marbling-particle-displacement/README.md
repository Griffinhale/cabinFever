# Marbling Particle/Fluid-ish Displacement Prototype

## Purpose

This standalone p5 prototype tests whether a lightweight particle/pressure model is worth the extra complexity for the cabinFever marbling interaction.

The core question is whether visible displacement -- new pigment physically pushing old pigment -- creates a more convincing marbling feel than simpler radial, raster, shader, or metaball models without causing muddy particle soup, unacceptable mobile performance, or motion that never settles.

## Architecture

The sketch is a single static HTML file using p5.js 1.11.3 from CDN. There is no npm/build step and no Next.js integration.

Main pieces:

- `particles[]`: pigment tracers with position, velocity, cached RGB/rim RGB channels, splat size, alpha, and age.
- `impulses[]`: short-lived radial pressure events created by new drops. These push both new and existing particles.
- `activePress`: tracks pointer location, start time, selected pigment, and how many particles have already been emitted during a hold.
- `paperLayer`: static cream/grain background regenerated on reset/resize/palette surface changes.
- `pigmentLayer` and `rimLayer`: offscreen p5 buffers redrawn from particles each frame. Particles are rendered as translucent soft circles plus darker rims so they read as pooled pigment rather than dots.
- Spatial hash: local separation uses buckets to avoid full O(n^2) neighbor scans.
- Settling: once input is inactive, impulses expire, and velocities remain below threshold for a sustained window, velocities are frozen and `noLoop()` stops ongoing simulation.

Important code comments are included for hold mapping, particle injection/splatting, pressure force application, local spreading, performance tradeoffs, and settle detection.

## Controls

- Press/tap: create a small visible pigment seed at the pointer.
- Hold: gradually emits more pigment while held.
- Release: locks the final paint budget and emits the remaining particles/pressure.
- P: cycle curated palette for future pigment.
- R: reset particles, impulses, buffers, active input, and settle state.
- Touch top-left hint zone: cycle palette without a keyboard.
- Touch top-right hint zone: reset without a keyboard.

Touch handlers return `false`, the page uses `touch-action: none`, and the canvas is full-screen with tiny corner hints/hit zones for palette and reset.

## Run

From the worktree root:

```bash
cd /workspace/projects/Griffinhale_git/worktrees/cabinFever-marbling-particles
python3 -m http.server 8123 --directory prototypes/marbling-particle-displacement
```

Open:

```text
http://localhost:8123
```

You can also open `prototypes/marbling-particle-displacement/index.html` directly in a browser, but using a local server is the preferred comparison path.

## Verification

This is a static standalone prototype, so verification is scoped to the single HTML file and a local static smoke path rather than the app build.

- Syntax check: extract the inline script and run `node --check` against it.
- Static smoke: serve `prototypes/marbling-particle-displacement/` with `python3 -m http.server` and request `/` from localhost to confirm the standalone file is reachable.
- Whitespace check: `git diff --check`.
- App-level lint/build: skipped because this worktree has no installed `node_modules`; the prototype intentionally does not depend on the Next.js app toolchain.

## What to evaluate

Use the same comparison script as the other marbling prototypes:

1. Quick tap in the center.
2. Long hold near the center.
3. Add two neighboring drops.
4. Add a drop inside or very close to existing pigment and watch whether old material is pushed.
5. Add a drop near an edge.
6. Add 10-20 drops across the canvas.
7. Cycle palette once and verify old particles keep their colors.
8. Reset.
9. Wait for motion to settle and verify the image becomes static.

Evaluation priorities:

- Does physical displacement materially improve the marbling feel?
- Does pigment read as pooled material instead of visible particles/confetti?
- Do colors stay curated instead of becoming muddy brown/gray?
- Does a modest 10-20 drop composition remain responsive?
- Does the scene reliably settle, or does it keep swimming?
- Are the force/splatting comments readable enough for future tuning or porting?

## Current behavior notes

- Quick taps emit a minimum visible seed plus a small final budget.
- Long holds map to more particle mass, larger injection radius, wider pressure impulse, and stronger push.
- New drops visibly disturb older particles through pressure impulses.
- Curl/noise flow is intentionally subtle and time-limited so the sketch does not require idle animation to look alive.
- Particle cap is lower on small/touch screens to keep the prototype plausible on mobile.
- Palette/rim colors are parsed once into numeric channels and copied by reference into particles so the render loop avoids constructing p5 color objects from hex strings every frame.
- When particle cap is exceeded, oldest particles are discarded. This is a deliberate prototype performance tradeoff, not a physically conserved pigment model.

## Known limitations

- This is not a physically accurate fluid simulation.
- Exact final drop area/target size is approximate; particle count maps to paint amount but area is emergent.
- Clean Voronoi-like bounded regions are weaker than raster/radial ownership models.
- Heavy compositions can still expose individual particles or become visually noisy.
- Alpha compositing can become muddy if too many contrasting colors are layered in one spot.
- Particle splatting is CPU/GPU overdraw-heavy compared with simpler shape models.
- Oldest-particle culling preserves performance at the cost of mass conservation.
- Too much pressure can look like gas; too little looks like passive blobs. Current constants are tuned for a calm middle ground.
- Touch was implemented through p5 handlers and anti-duplication timing; real-device browser testing is still required.
- No undo, export, save/share, UI panel, or Next.js port in this prototype.

## Future displacement support

If this architecture is promoted, the likely next step is a hybrid:

- Keep particles/pressure for the satisfying dynamic displacement phase.
- Composite or freeze settled pigment into a raster field so old material is cheaper to render and easier to bound.
- Consider a velocity/pressure grid for smoother local flow instead of particle-only impulses.
- Preserve the current settle/noLoop contract so the final artwork is static when idle.
- Port to TypeScript/React only after the standalone architecture comparison chooses particle displacement as worth the complexity.
