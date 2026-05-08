# Marbling Boundary Relaxation Raster Field

## Purpose

Standalone p5 prototype for testing a raster ownership field where pigment regions grow, meet, and later negotiate shared boundaries. This folder is intentionally isolated from the Next.js app.

## Run

```bash
cd /workspace/projects/Griffinhale_git/worktrees/cabinFever-marbling-relaxation/prototypes/marbling-boundary-relaxation
python3 -m http.server 8123
```

Open `http://localhost:8123`.

## Controls

- Press/tap: create pigment (implemented in later checkpoint)
- Hold: increase paint amount (implemented in later checkpoint)
- P: cycle palette
- R: reset

## Current state

This first checkpoint contains the standalone full-screen shell, p5 CDN loading, stable cream-paper surface, tiny hints, resize handling, and palette naming. The raster field and relaxation model are added in later commits.
