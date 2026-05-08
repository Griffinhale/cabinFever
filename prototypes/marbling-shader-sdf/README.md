# Marbling Shader / SDF Prototype

Standalone p5/HTML shell for testing a shader-first marbling surface.

## Run

```bash
cd /workspace/projects/Griffinhale_git/worktrees/cabinFever-marbling-shader/prototypes/marbling-shader-sdf
python3 -m http.server 8123
```

Open `http://localhost:8123`.

## Current behavior

The page loads p5.js from CDN, creates a full-screen WEBGL canvas, and renders a cream paper-like shader background with tiny corner hints. Interaction and drop fields are added in later checkpoints.
