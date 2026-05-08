# Marbling Boundary Relaxation Raster Field

## Purpose

This standalone p5/HTML prototype tests whether a low-resolution raster ownership field can make marbling regions feel like material territories that negotiate shared boundaries without a full fluid simulation.

The evaluation question is: can area-budgeted pigment cells grow, press against neighbors, and locally relax seams in a way that reads as organic marbling while remaining stable, understandable, and static after settling?

This prototype intentionally does not modify the Next.js app and has no npm/build dependency.

## Architecture

The sketch is a single `index.html` using p5.js 1.11.3 from a CDN.

Simulation state:

- A low-resolution grid, usually 4 CSS pixels per cell on desktop and 5 on smaller screens.
- Typed arrays for `owner`, `pressure`, `age`, `cooldown`, and stable per-cell noise.
- `owner = -1` means empty cream surface; otherwise the cell stores a drop id.
- Each drop stores a seed cell, target mass, current mass, pigment color, frontier cells, seam candidates, and settling counters.

Update model:

1. Press/tap/hold records pointer position and hold duration.
2. Release maps hold duration to a target cell mass/area.
3. A small nucleus is claimed at the pointer. If it lands inside existing pigment, the nucleus can displace those cells to prove the negotiated-boundary case.
4. Growth expands into empty frontier cells with a cost based on seed distance, stable noise, edge penalty, occupied penalty, and local pressure.
5. Occupied neighboring cells are not blindly overwritten during growth. They become seam candidates.
6. A capped local relaxation pass may reassign seam cells when a documented energy score improves. The score considers active drop need, victim surplus, compactness, boundary smoothness, stable organic bias, age resistance, and settled-region resistance.
7. Cooldowns and no-change counters prevent flip-flopping and allow the whole composition to become static.

Rendering model:

- Cream/paper background with stable grain.
- Pigment is rendered from the ownership raster, not separate vector shapes.
- Boundary cells receive a darker rim treatment.
- Stable per-cell wash variation reduces flatness.
- No animated noise is used after settle.

## Controls

- Press/tap: create pigment at the pointer.
- Hold: increase target paint amount / final area.
- P: cycle the active curated palette for future drops.
- R: reset the surface; current palette is preserved.
- D: toggle a small debug text overlay.

Tiny corner hints are the only visible UI.

## Run

```bash
cd /workspace/projects/Griffinhale_git/worktrees/cabinFever-marbling-relaxation/prototypes/marbling-boundary-relaxation
python3 -m http.server 8123
```

Open:

```text
http://localhost:8123
```

No build step is required.

## What to evaluate

Use the same interaction script as the shared prototype comparison:

1. Load the blank cream surface.
2. Quick tap in the center.
3. Long hold near the center.
4. Add two adjacent drops to test shared seams.
5. Add one drop inside or partially inside existing pigment.
6. Add one near the edge.
7. Add 10-20 total drops.
8. Press `P`, then add another drop and confirm old colors remain unchanged.
9. Press `R`.
10. Wait for settling and watch for flicker or boundary churn.

Specific questions:

- Does hold duration clearly map to larger paint area?
- Do new drops visibly squeeze or negotiate existing regions?
- Are seams coherent rather than overlapping independent blobs?
- Does the composition eventually stop mutating?
- Does the relaxation pass improve enough over strict raster occupancy to justify the extra logic?
- Does performance remain acceptable with repeated relaxation passes?

## Known limitations

- This is not a fluid simulation and does not solve pressure globally.
- Boundary pressure is a local heuristic around active seams.
- Mass conservation is approximate; nucleus creation and seam reassignment can steal cells from older drops.
- Extreme crowding may leave drops below target mass or create cramped seams.
- The renderer smooths a low-resolution field but can still show raster artifacts on some boundaries.
- Resize clears the field instead of resampling the existing composition.
- No export, undo, or Next.js integration.
- Touch controls are supported, but keyboard-only palette/reset may be less discoverable on phone-sized devices.

## Future displacement support

This architecture is a practical stepping stone toward displacement because pigment is already represented as a material field. Future work could add:

- Better conservation by tracking per-drop mass debt after displacement.
- Short chain shifts instead of one-cell reassignment.
- Local pressure diffusion over a small stencil before seam scoring.
- Marching-squares or shader-based rendering over the ownership field.
- A resampling strategy for preserving compositions across resize.
- Optional velocity/displacement metadata per cell while still freezing to a static raster after settle.
