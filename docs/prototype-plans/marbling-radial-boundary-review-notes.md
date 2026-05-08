# Marbling Radial Boundary Prototype Review Notes

Date: 2026-05-08
Branch: `proto/marbling-radial-boundary`
Prototype folder: `prototypes/marbling-radial-boundary/`

## Traceability note

The prototype implementation did not follow the intended fine-grained checkpoint cadence exactly. History was not rewritten after review because the branch already had coherent published/local commits and preserving review context is safer than reshaping it after the fact.

This note maps the existing commits to the planned milestones so reviewers can trace what landed where.

## Existing commit to milestone map

| Commit | Subject | Planned milestone coverage |
| --- | --- | --- |
| `545445c` | `docs(radial): add implementation plan` | Planning document, acceptance criteria, staged implementation checkpoints, verification notes. |
| `c9049c4` | `feat(radial): add standalone prototype shell` | Stage 1 shell plus part of Stage 2 scaffolding: standalone p5 HTML, full-screen canvas, surface grain, hint text, palette definitions, reset/palette key handlers. |
| `4ade6b4` | `feat(radial): implement press hold ray growth` | Consolidated implementation work from Stages 3-6: press/hold creation, touch handlers, area-based radius mapping, radial `Drop` model, per-ray growth, edge blocking, neighbor blocking, stable organic rendering, and pigment styling. |
| `69a7bef` | `docs(radial): document prototype behavior and limitations` | Stage 7 documentation and cleanup: README architecture notes, controls, evaluation priorities, known limitations, static-settle behavior, mobile/touch notes. |

## Process exception acknowledged

The intended implementation plan proposed separate commits for palette/reset scaffolding, press/hold creation, bounded ray growth, neighbor blocking, and organic rendering. In practice, several of those steps were combined into `4ade6b4`. That made the review cadence coarser than requested.

Going forward, follow the staged checkpoint cadence during prototype work rather than retroactively correcting it with history rewrites. If a checkpoint is combined for practical reasons, add a short traceability note before review.

## Palette behavior resolution

Palette cycling with `P` is intentional future-drop selection only. It now updates the active palette name and pigment cursor for upcoming drops, but it does not rebuild the existing paper/water surface or recolor settled drops. This keeps the settled composition visually stable after palette changes.

`R` remains the explicit way to clear the composition and rebuild a fresh surface for the currently selected palette. Browser resize may also regenerate the surface to match the new canvas dimensions while preserving drop geometry.
