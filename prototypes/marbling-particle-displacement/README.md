# Marbling Particle/Fluid-ish Displacement Prototype

## Purpose

This standalone p5 prototype tests whether a lightweight particle/pressure model is worth the extra complexity for the cabinFever marbling interaction.

The core question is whether visible displacement -- new pigment physically pushing old pigment -- creates a more convincing marbling feel than simpler radial, raster, shader, or metaball models without causing muddy particle soup, unacceptable mobile performance, or motion that never settles.

Round-two feedback said the particle URL worked best. This pass therefore preserves the physical/water feel and focuses on reducing lag risk: live particle caps are stricter, active splats can render at lower resolution, old quiet pigment is baked into raster cache layers, and settling is more aggressive.

## Architecture

The sketch is a single static HTML file using p5.js 1.11.3 from CDN. There is no npm/build step and no Next.js integration.

Main pieces:

- `particles[]`: recent/live pigment tracers with position, velocity, cached RGB/rim RGB channels, splat size, alpha, age, quiet-frame tracking, last impulse frame, and lifecycle state (`active`/`cooling`).
- `impulses[]`: short-lived radial pressure events created by new drops. These push both new and existing live particles.
- `activePress`: tracks pointer location, start time, selected pigment, and how many particles have already been emitted during a hold.
- `paperLayer`: static cream/grain background regenerated on reset/resize/palette surface changes.
- `bakedPigmentLayer` and `bakedRimLayer`: persistent full-size raster cache for settled/retired pigment.
- `activePigmentLayer` and `activeRimLayer`: tier-scaled offscreen buffers redrawn from live particles each frame. Low/balanced tiers render these below full resolution and composite them back to canvas size.
- Spatial hash: local separation uses buckets to avoid full O(n^2) neighbor scans, with per-tier neighbor limits.
- Settling: once input is inactive, impulses expire, and velocities remain below threshold for a sustained window, quiet particles are baked, velocities are frozen, and `noLoop()` stops ongoing simulation.

Important code comments are included for hold mapping, particle injection/splatting, pressure force application, local spreading, performance tradeoffs, raster baking, and settle detection.

## Performance safeguards added in round two

- Quality tiers are named constants instead of scattered caps:
  - `low mobile`: selected for touch/small screens; live cap 850, active splat scale 0.62, reduced curl/separation.
  - `balanced`: default for normal desktop/tablet; live cap 1400, active splat scale 0.82.
  - `high desktop`: selected for spacious screens; live cap 2100, full-size active splats.
- `Q` cycles quality tiers for comparison without changing the core interaction.
- Active particle caps now bake oldest overflow into persistent raster layers before removal, so cap enforcement no longer simply erases pigment mass.
- Quiet particles retire into baked pigment/rim layers after sustained low velocity and no recent impulse.
- Only live particles pay simulation and active redraw cost; baked pigment remains visible as static pixels.
- Separation checks and wet curl are tier-limited and age-limited so old pigment does not keep doing unnecessary force work.
- The overlay reports palette, quality tier, motion state, live particle count/cap, and baked particle count.

## Controls

- Press/tap: create a small visible pigment seed at the pointer.
- Hold: gradually emits more pigment while held.
- Release: locks the final paint budget and emits the remaining particles/pressure.
- P: cycle curated palette for future pigment.
- Q: cycle quality tier (`low mobile`, `balanced`, `high desktop`).
- R: reset live particles, baked raster layers, impulses, buffers, active input, and settle state.
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
4. Add a drop inside or very close to existing pigment and watch whether old live material is pushed.
5. Add a drop near an edge.
6. Add 10-20 drops across the canvas.
7. Wait and confirm the live count drops while visible pigment remains through the baked cache.
8. Cycle palette once and verify old particles/baked pigment keep their colors.
9. Cycle quality with Q and confirm the scene remains responsive.
10. Reset.
11. Wait for motion to settle and verify the image becomes static.

Evaluation priorities:

- Does physical displacement still materially improve the marbling feel?
- Does pigment read as pooled material instead of visible particles/confetti?
- Do colors stay curated instead of becoming muddy brown/gray?
- Does a modest 10-20 drop composition remain responsive?
- Does the scene reliably settle, or does it keep swimming?
- Does retirement to baked layers avoid obvious particle-culling erasure?
- Are the force/splatting/cache comments readable enough for future tuning or porting?

## Current behavior notes

- Quick taps emit a minimum visible seed plus a small final budget.
- Long holds map to more particle mass, larger injection radius, wider pressure impulse, and stronger push.
- New drops visibly disturb older live particles through pressure impulses.
- Recent pigment remains particle-based so it can stretch, shove, and drift like material on water.
- Quiet/old pigment eventually bakes into raster layers. This keeps compositions visible while reducing per-frame simulation and active splat redraw.
- Curl/noise flow is intentionally subtle, tier-limited, and time-limited so the sketch does not require idle animation to look alive.
- Particle cap is lower on small/touch screens to keep the prototype plausible on mobile.
- Palette/rim colors are parsed once into numeric channels and copied by reference into particles so the render loop avoids constructing p5 color objects from hex strings every frame.
- Resize clears the baked raster cache in this standalone prototype; live particles are clamped to the new canvas and continue.

## Known limitations

- This is not a physically accurate fluid simulation.
- Baked pigment is static. It remains visible and cheap, but later drops do not physically re-displace it as strongly as live particles.
- Exact final drop area/target size is approximate; particle count maps to paint amount but area is emergent.
- Clean Voronoi-like bounded regions are weaker than raster/radial ownership models.
- Heavy compositions can still expose individual particles or become visually noisy, especially before baking catches up.
- Alpha compositing can become muddy if too many contrasting colors are layered in one spot.
- Low tier trades fidelity for responsiveness through a smaller active splat buffer and stricter force budget.
- Resize discards baked pigment rather than proportionally copying cached pixels.
- Touch was implemented through p5 handlers and anti-duplication timing; real-device browser testing is still required.
- No undo, export, save/share, UI panel, or Next.js port in this prototype.

## Future displacement support

If this architecture is promoted, the likely next step is to keep the hybrid approach and improve the boundary between live and baked pigment:

- Keep particles/pressure for the satisfying dynamic displacement phase.
- Composite or freeze settled pigment into raster fields so old material is cheaper to render and easier to bound.
- Consider a local raster-warp or rehydration pass if static baked pigment feels too inert near later drops.
- Consider a velocity/pressure grid for smoother local flow instead of particle-only impulses.
- Preserve the current settle/noLoop contract so the final artwork is static when idle.
- Port to TypeScript/React only after the standalone architecture comparison chooses particle displacement as worth the complexity.
