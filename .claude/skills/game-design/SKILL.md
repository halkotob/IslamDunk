---
name: game-design
description: "Game design principles. GDD structure, balancing, player psychology, progression."
allowed-tools: Read, Glob, Grep
risk: unknown
source: community
---
> **In Islam Dunk:** the game is plain JavaScript drawn on one 2D canvas, with no engine. `src/manifest.json` lists the
> files that are joined into one script; later files extend earlier ones by reassigning global functions. Read the
> files for the area you're working on, use `docs/IMPROVEMENTS.md` for known issues and add findings there, and
> follow the release steps the repo uses (tests with `npm test`, version in `src/core/config.js` and `package.json`,
> a CHANGELOG entry).
> The cast is masjid brothers, sheikhs and families (`src/data/`); treat respectful, accurate depiction of Muslim
> dress and practice as a hard rule. Where the references disagree with the owner's direction, say so and follow
> the owner.


# Game Design Principles

> Design thinking for engaging games.

---

## 1. Core Loop Design

### The 30-Second Test

```
Every game needs a fun 30-second loop:
1. ACTION → Player does something
2. FEEDBACK → Game responds
3. REWARD → Player feels good
4. REPEAT
```

### Loop Examples

| Genre | Core Loop |
|-------|-----------|
| Platformer | Run → Jump → Land → Collect |
| Shooter | Aim → Shoot → Kill → Loot |
| Puzzle | Observe → Think → Solve → Advance |
| RPG | Explore → Fight → Level → Gear |

---

## 2. Game Design Document (GDD)

### Essential Sections

| Section | Content |
|---------|---------|
| **Pitch** | One-sentence description |
| **Core Loop** | 30-second gameplay |
| **Mechanics** | How systems work |
| **Progression** | How player advances |
| **Art Style** | Visual direction |
| **Audio** | Sound direction |

### Principles

- Keep it living (update regularly)
- Visuals help communicate
- Less is more (start small)

---

## 3. Player Psychology

### Motivation Types

| Type | Driven By |
|------|-----------|
| **Achiever** | Goals, completion |
| **Explorer** | Discovery, secrets |
| **Socializer** | Interaction, community |
| **Killer** | Competition, dominance |

### Reward Schedules

| Schedule | Effect | Use |
|----------|--------|-----|
| **Fixed** | Predictable | Milestone rewards |
| **Variable** | Addictive | Loot drops |
| **Ratio** | Effort-based | Grind games |

---

## 4. Difficulty Balancing

### Flow State

```
Too Hard → Frustration → Quit
Too Easy → Boredom → Quit
Just Right → Flow → Engagement
```

### Balancing Strategies

| Strategy | How |
|----------|-----|
| **Dynamic** | Adjust to player skill |
| **Selection** | Let player choose |
| **Accessibility** | Options for all |

---

## 5. Progression Design

### Progression Types

| Type | Example |
|------|---------|
| **Skill** | Player gets better |
| **Power** | Character gets stronger |
| **Content** | New areas unlock |
| **Story** | Narrative advances |

### Pacing Principles

- Early wins (hook quickly)
- Gradually increase challenge
- Rest beats between intensity
- Meaningful choices

---

## 6. Anti-Patterns

| ❌ Don't | ✅ Do |
|----------|-------|
| Design in isolation | Playtest constantly |
| Polish before fun | Prototype first |
| Force one way to play | Allow player expression |
| Punish excessively | Reward progress |

---

> **Remember:** Fun is discovered through iteration, not designed on paper.

## When to Use
This skill is applicable to execute the workflow or actions described in the overview.
