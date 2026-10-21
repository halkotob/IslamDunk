# Islam Dunk: art style for the neighbourhood (v9.2)

This covers the career neighbourhood scenes (home, the street, the masjid front, the corner store) in
`src/career/world/`. It follows the look the game already has: the procedural characters, the gym, the intro
street. Every new prop, building and scene uses these rules.

## Palette

The shared colours are `WP` in `src/career/world/world-art.js`. Use them instead of new hex values.

| Use | Colours |
|---|---|
| Walls | cream `#efe3c6` (shade `#e3d3b0`), brick `#b8735a`, siding blue `#c9d6dc`, sage `#b9c9a3` |
| Roofs | brown `#6b4a3a`, slate `#4f5f73` |
| Trim, frames | warm white `#f6f1e6` |
| Doors | wood `#6b4a2b`, masjid green `#1e5a4a` |
| Ground | grass `#86b45f`, sidewalk `#d8d1c3`, curb `#b1aa9c`, road `#4b4f55`, lane `#e8e2d4` |
| Plants | leaf `#4f9a4a`, leaf shade `#3c7f3a`, leaf light `#6db35c`, hedge `#4f8a3c` |
| Accents | gold `#e8c35a`, masjid green `#1e7a4c`, Al-Amanah teal `#2c6e8f` |
| Interiors | floor `#c8a27a` / `#b08a63`, rug red `#8e2b3a` |
| Outline | `OUTLINE` `#1a1210` (the character outline colour) |

UI on top of a scene uses the game's UI colours: `GOLD`, `IVORY`, `NIGHT` and the dark panels.

## Line weights

- Silhouettes are 2 px in `OUTLINE`, at the scale the thing is drawn.
- Inner details (panel lines, window mullions, plank joints) are 1 px, either in `OUTLINE` or in the fill's own
  darker shade.
- Window frames are 3 px in trim colour with a 1 px outline.
- Text is never smaller than 20 game px. That is 11 CSS px on the smallest phone (667×300), the phone-pass
  minimum. That includes text painted on signs inside a scene, which is checked by the `world-flow` test.

## Shading

- Flat fills only. Gradients are for the sky, the masjid dome and lights only.
- Light comes from the upper left. Each solid gets one darker cel tone, `shade(col, -0.12 … -0.18)`, on the
  side away from the light (the right face) or underneath.
- On round things (tree canopies, bushes) the cel tone is the lower right of each blob, plus a small lighter
  highlight on the upper left of the top blobs.
- Glass shows the sky by day, with one diagonal white sheen at 35% opacity.

## Characters and depth

- Characters are the game's procedural rig, drawn with `musFigure`. A standing figure is about 104 px tall at
  scale 1 (`WORLD_FIG_H`).
- Each scene sets its floor from back (`d = 0`) to front (`d = 1`) with `ground.y0/y1` (screen y) and
  `ground.s0/s1` (scale):

  | Scene | Back to front scale |
  |---|---|
  | Street | 0.96 → 1.10 |
  | Masjid front | 1.00 → 1.12 |
  | Interiors | 1.12 → 1.26 |

- Children are 0.72 of an adult.
- Sizes are set against a person at the back of the floor:
  - a door is about 1.3 × a person;
  - a counter or table top is at waist height (about 0.5 × a person);
  - a bench seat is at about 0.3 × a person.
- Feet sit on the ground line. The walk bot measures each figure's lowest solid pixel against it.

## Props

- A prop is drawn around its own base point `(0, 0)` at scale 1 and baked once (per time of day) at its depth's
  scale.
- Its `box` holds the drawing, plus `pad` for the shadow.
- Its `foot` is the footprint the player can't walk through: `[x0, x1, d0, d1]` relative to the prop's base. Keep
  it to the part that touches the ground (a trunk, the legs of a bench), not the canopy.
- Props are depth-sorted with the characters by their base depth. Anything a person walks in front of or
  behind must be a prop, not part of the background layer.
- Each prop draws its own cast shadow with `wShadow(g, T, …)`, so it follows the time of day.

## Times of day

Four presets live in `TOD` (`world-engine.js`): morning, afternoon, dusk and night.

1. **Sky.** A vertical gradient per preset, plus:
   - clouds by day (pink at dusk);
   - a sun: high in the afternoon, low and glowing at dusk;
   - stars and a crescent at night.
2. **Glass.** Windows show the sky by day and a warm lamp colour at dusk and night (`wGlass`).
3. **Tint.** After the scene and its people are drawn, one full-screen multiply layer is laid over them:
   - morning: warm, 10%;
   - afternoon: none;
   - dusk: amber, 26%;
   - night: blue, 66%.

   Interiors get 55% of it.
4. **Lights.** These are added on top of the tint with `lighter`, so they glow through the dark:
   - window glow at dusk and night;
   - streetlights, with their pool of light on the sidewalk;
   - lamps indoors.

   They live in each scene's `glow` layer.
5. **Shadows.** Shadow direction and length (`sh.dx`, `sh.len`) change with the time of day:
   - long and to the left in the morning;
   - short at midday;
   - long and to the right at dusk;
   - short and soft at night.

## Religious content

- Keep it minimal and respectful.
- The prayer corner at home is decoration only: a rug, a shelf, books, a plant. It has no interaction and no
  mechanic.
- The framed art is a geometric eight-point star, not text.
- Signs say the masjid's name and "All are welcome". The only Arabic (the basmala) appears when the
  calligraphy upgrade is built, as in the existing masjid art.
- No rulings, no jokes about worship, and prayer is never a mechanic.
- New strings go to `docs/review/game-text.csv` (`npm run review:export`) for review.
