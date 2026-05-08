# Marbling Particle/Fluid-ish Displacement Prototype

## Purpose

Standalone p5 prototype for testing whether lightweight particles and pressure impulses make cabinFever marbling feel more physical than simpler radial, raster, or implicit shape approaches.

## Run

```bash
cd /workspace/projects/Griffinhale_git/worktrees/cabinFever-marbling-particles/prototypes/marbling-particle-displacement
python3 -m http.server 8123
```

Open http://localhost:8123.

## Controls

- Press/tap: create pigment at the pointer.
- Hold: increase paint amount, particle budget, footprint, and pressure.
- P: cycle palette.
- R: reset.

## Current status

Initial standalone shell: full-screen cream p5 canvas with tiny hints. Simulation and rendering are implemented in later commits.
