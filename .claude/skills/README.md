# Project skills

Claude Code loads these in every session on this repository. Each one starts with a short "In Islam Dunk" note on
how this game differs from what the skill assumes.

| Skill | Use it for | Source |
|---|---|---|
| `steam-publish` | Steam store page, Steamworks, uploading the desktop build | awesome-gamedev-agent-skills |
| `itch-publish` | itch.io releases (similar portals) | awesome-gamedev-agent-skills |
| `game-feel` | Juice: screen shake, hit-stop, squash and stretch, layered feedback | awesome-gamedev-agent-skills |
| `game-ui-ux` | Menus, HUD, flow between screens | awesome-gamedev-agent-skills |
| `game-ai` | CPU players: decisions, behaviour trees, difficulty | awesome-gamedev-agent-skills |
| `physics-tuning` | Ball, rim and player movement, fixed timestep | awesome-gamedev-agent-skills |
| `input-systems` | Keyboard, touch and gamepad, buffering, remapping | awesome-gamedev-agent-skills |
| `camera-systems` | Court camera, follow and framing | awesome-gamedev-agent-skills |
| `audio-design` | Sound effects and music | awesome-gamedev-agent-skills |
| `performance-optimization` | Frame-time budgets and profiling | awesome-gamedev-agent-skills |
| `save-systems` | Career saves, versions and migration | awesome-gamedev-agent-skills |
| `game-designer` | Visual polish and atmosphere review | game-creator (adapted note) |
| `improve-game` | Score the game by area, then pick improvements | game-creator (adapted note) |
| `game-design-theory` | Judge concepts and modes for player appeal (Rouse's Game Design: Theory & Practice) | jarrod-claude-skills |
| `character-design` | Silhouettes, shape language, the cast | skills-for-antigravity |
| `game-design` | Core loop, progression, difficulty, player motivation checklist | antigravity-awesome-skills |

Sources and licenses (copies in `licenses/`):
- [gamedev-skills/awesome-gamedev-agent-skills](https://github.com/gamedev-skills/awesome-gamedev-agent-skills),
  Apache-2.0 (LICENSE and NOTICE included).
- [opusgamelabs/game-creator](https://github.com/opusgamelabs/game-creator), MIT (stated in its README and each
  skill's front matter; the repo has no LICENSE file).
- [jarrodmedrano/jarrod-claude-skills](https://github.com/jarrodmedrano/jarrod-claude-skills), MIT (stated in its README and
  `package.json`; the repo has no LICENSE file).
- [omer-metin/skills-for-antigravity](https://github.com/omer-metin/skills-for-antigravity), Apache-2.0.
- [benjaminasterA/antigravity-awesome-skills](https://github.com/benjaminasterA/antigravity-awesome-skills), MIT.

Only `steam-publish` includes a script (`scripts/check_steam_build.py`): it reads Steam build files and reports
problems; it doesn't upload or connect to anything. `itch-publish` describes downloading itch.io's `butler` tool,
for when a release is made there.
