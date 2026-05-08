# Marbling Metaball Pools Prototype

## Purpose

This standalone p5/HTML prototype tests whether metaballs / implicit pigment pools can create a beautiful marbling toy quickly. The goal is fast visual proof: soft pigment blooms on a cream paper/water surface, press-and-hold paint amount, organic boundaries, curated palettes, and a settled static composition.

This prototype is intentionally isolated from the Next.js app. It is one static page with p5.js loaded from a CDN and no build step.

## Run

From this prototype folder:

```bash
cd /workspace/projects/Griffinhale_git/worktrees/cabinFever-marbling-metaballs/prototypes/marbling-metaball-pools
python3 -m http.server 8123
```

Open:

```text
http://localhost:8123
```

You can also open `index.html` directly in a browser, but the static server path is preferred for comparable prototype testing.

## Controls

- Press/tap: start adding pigment at the pointer.
- Hold: increase paint amount and target footprint.
- Release: finalize the pigment pool; it keeps growing slowly until settled.
- `P`: cycle palette for future pools.
- `R` or `Escape`: reset.
- Touch/mobile fallback: tap top-left corner to cycle palette; hold top-right corner for about 750 ms to reset.

Tiny corner hints are the only UI.

## Architecture

Each user-created pigment is a `PigmentPool` with one pigment identity/color and several child metaball lobes. The pool stores:

- center point
- target mass from hold duration
- current mass
- child lobe offsets/radii
- cached lobe sample positions and conservative field bounds
- curated pigment base/rim/wash colors
- numeric RGB channels for cheaper per-cell drawing
- seed for stable organic variation
- settled flag

Child lobes grow from tiny radii toward target radii. Same-pool child lobes are summed as one implicit field, so they merge into an organic continuous pigment pool.

The sketch renders a low-resolution field into an offscreen pigment layer, then composites that over a stable cream paper-grain layer. Round two replaced the fixed 4 px field with adaptive tiers: high uses 4 px cells, medium uses 6 px cells, and low uses 8 px cells for mobile/crowded/slow frames.

## Hold mapping

Hold duration is clamped from a quick-tap minimum to a capped long hold. Duration is eased, mapped to target area/mass, then split across a smaller 3-8 child lobe budget, with an optional 9th lobe only for low-complexity high-quality scenes:

- quick tap: minimum visible small pool
- medium hold: broader pool with more lobes
- long hold: larger footprint with richer asymmetric edges

Mapping to area/mass rather than direct radius keeps the interaction semantically close to adding more paint. The reduced lobe count is compensated with slightly broader lobe radii, asymmetric offsets, stable edge warp, and the existing rim/seam treatment so pools remain organic rather than becoming perfect circles.

## Ownership / clipping strategy

The prototype does not use one global metaball field for all pigments. That would make neighboring colors collapse into one undifferentiated lava-lamp blob.

Instead, every field cell is assigned at most one owner:

1. Evaluate each pool's same-pool lobe field independently.
2. Ignore cells below the occupancy threshold.
3. Choose the pool with the strongest field at that cell.
4. If fields are nearly tied, prefer the newer pool, so fresh pigment reads as lightly layered on top.
5. Draw darker rims at threshold bands and owner-neighbor seams.

This means same-pool lobes merge freely, but different pigment identities are clipped into readable territories. The rule is approximate and visual rather than physically exact, but it directly guards against the key metaball failure mode.

Canvas clipping is implicit: only sampled cells within the canvas are rendered. There is no off-canvas geometry to resolve.

## Rendering model

- Cream/off-white paper surface.
- Stable non-animated grain and faint fiber lines.
- Curated palette pigments only; no random RGB.
- Pigment cells use base color, lighter wash in stronger interiors, and darker rims near boundaries.
- Outer threshold rims and neighbor seam rims make territories readable.
- Stable field noise gently warps lobe influence so edges are water-like without idle jitter.

## Round-two performance pass

Review feedback for this prototype was: metaballs were "great but laggy." The iteration keeps the same organic pigment-pool direction and targets the field rendering bottleneck:

- Adaptive field quality: starts at high quality on normal desktop viewports, starts at medium on coarse-pointer/large viewports, degrades after repeated slow renders, and upgrades conservatively after settled fast frames.
- Smaller lobe budget: long holds now top out around 8 lobes by default instead of 12, with a 9-lobe allowance only when the scene is still simple.
- Pool bounds and candidate filtering: each pool caches conservative pixel/field bounds and precomputed lobe positions; field cells skip pools outside those bounds before doing metaball math.
- Dirty field redraws: growing pools and press previews mark previous/current field bounds dirty, then only those regions are cleared, re-evaluated, and redrawn. Large dirty coverage falls back to a full redraw to avoid seam artifacts.
- Cheaper per-cell drawing: pigment colors are parsed once into numeric RGB channels instead of creating p5 colors for every rendered field cell.

The intended result is a responsive 10-20 pool composition on normal desktop and better touch/mobile behavior, while settled scenes still cache the final pigment layer and stop recomputing.

## Static settling

Pools mutate only while growing. Lobe offsets and radii freeze once target mass is reached. When no pool is growing and there is no active press preview, the sketch stops recomputing the field and reuses the cached pigment layer. The final image should become visually static. Dirty-region updates mean a new or growing pool no longer forces a global field pass unless its bounds cover most of the canvas or the quality tier/resized surface requires a full refresh.

## What to evaluate

- Does it immediately look like pigment on cream water/paper?
- Is press/tap/hold satisfying?
- Does a quick tap still make a visible pool?
- Does a long hold clearly create more pigment?
- Do 10-20 pools look intentional and marbled?
- Do neighboring pools remain readable rather than becoming one blob?
- Are rims/seams attractive enough to compensate for approximate collision semantics?
- Does it remain usable with adaptive 4/6/8 px field resolution on desktop and mobile?

## Known limitations

- Strongest-owner clipping is not true physical displacement.
- Pigment area is approximate after thresholding.
- New pools do not push old material outward; near ties simply prefer newer pigment.
- Adaptive low-resolution field sampling can look softer/blockier on very large displays, high-contrast seams, or during slow mobile/crowded interactions.
- Very crowded scenes can still become visually busy or muddy depending on palette choices.
- Dirty bounds are conservative and unioned into one redraw region; several far-apart simultaneous dirty areas can still redraw more cells than the theoretical minimum.
- Quality tier changes, resize, reset, and large dirty coverage still trigger a full field redraw.
- Boundaries are implicit/rendered, not editable vector contours.
- Top-right reset uses a hold confirmation so accidental mobile corner taps do not clear the composition.

## Manual test notes

- Desktop smoke: use `python3 -m http.server 8123`, create quick taps and long holds, then build a 10-20 pool composition. Expected: interaction remains responsive enough to keep painting, rims/seams remain readable, and the final scene settles without jitter.
- Touch/mobile smoke: tap/hold without page scrolling, use top-left palette cycling and top-right hold-reset, and confirm lower quality tiers stay visually soft rather than harshly pixelated.
- Resize smoke: resize the browser after several pools; the surface and field buffers rebuild and pools remain visible instead of corrupting or disappearing.

## Future displacement support

A later prototype could add true material behavior by layering this implicit renderer over a raster ownership/freezing model:

- freeze settled owner/color per field cell
- allow new pools to push or reassign nearby cells
- add pressure/relaxation around seams
- advect field coordinates or raster cells with a velocity/displacement buffer
- use the metaball field only as a proposal/visual splat while ownership is stored in a persistent material map

That would preserve the visual payoff of implicit pools while giving future marbling versions clearer conservation and displacement semantics.
