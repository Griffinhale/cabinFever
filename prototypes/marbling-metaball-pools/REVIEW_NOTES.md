# Review Notes

## Commit cadence / milestones

Current prototype work landed as several small commits, but the cadence was not perfectly milestone-aligned. Rather than rewriting shared worktree history, this fix documents the mapping and acknowledges that process exception.

- `8f216a8 docs(metaballs): add implementation plan` — prototype plan and acceptance criteria.
- `59939e3 feat(metaballs): add standalone prototype shell` — isolated p5/HTML prototype scaffold.
- `574087e feat(metaballs): implement implicit pigment pools` — metaball field, ownership clipping, palettes, hold-to-paint behavior.
- `8c0c972 docs(metaballs): document prototype behavior` — README behavior, controls, limitations, and future displacement notes.
- This review fix — long-press reset safety plus review documentation.

Future prototype slices should keep one focused commit per reviewable milestone when practical.
