# The four career world scenes: what uses them (v9.16.1)

The first Studio review marked four whole scenes Delete: **Home**, **The street**, **Masjid Al-Amanah** (the front)
and **Corner Market**. They are the career neighbourhood (`src/career/world/`), so nothing was removed. This is
what each one does, what reaches it, and what would break without it. Mohammad decides.

The whole neighbourhood only exists when **Settings > Career calendar** is on (`worldOn()`). With the calendar off,
career goes straight to the hub and none of these scenes is shown, so that path already works without them.

## How a free day runs

Hub "Continue" on a day with no game → **Home** (wake up in bed) → *Go out* → **The street** → *Go into the store*
→ **Corner Market** → back to the street → *Walk up to the masjid* → **Masjid Al-Amanah** (front) → *Go into the
masjid* → the career hub (the inside of the masjid) → leave → the masjid front → the street → *Go home* → Home →
the bed: *End the day*. Each visit moves the time of day on; at night only Home is open.

## Home (`home`, world-scenes.js:52)

- Every free day starts here: `worldStartDay()` puts you in bed (world-day.js:127). After a game, the next free day
  also starts here.
- The bed is **End the day** (the way a free day ends, besides the *Skip the day* button).
- The mirror is **Change your look** (the creator opened from the world).
- The door is **Go out** (the only way to the street).
- Holiday and Jumu'ah banners show on waking ("Jumu’ah today. The masjid is at the end of the street.").
- Saves remember the scene and spot (`C.cal.loc`).

**Without it:** free days have nowhere to start (`worldStartDay` enters `home` directly: an error), End the day and
the mirror go, and saves made at home would fall back to the hub. The first-run path (step 31) ends on a free day.

## The street (`street`, world-scenes.js:180)

- The only link between Home, the Corner Market and the masjid front (three doors).
- Neighbours to talk to (Yusuf on the bench, Daniel, the kids Bilal and Sami with a ball), short talks that change
  each day.
- On Fridays the masjid door has a beacon (Jumu’ah).

**Without it:** Home's *Go out* leads nowhere; the store and the masjid can't be reached on a free day; the
neighbour talks are gone.

## Masjid Al-Amanah, the front (`masjidfront`, world-scenes.js:281)

- **Go into the masjid** opens the career hub as the inside of the masjid (`worldEnterMasjid`, counts
  `visit_masjid`). Leaving the hub on a free day comes back here.
- **Jumu’ah**: on a Friday the door asks "Attend / Not today" (`jumuah.js` wraps `worldEnterMasjid`), then the
  Jumu’ah room, the reminder and the card.
- Idris walks the forecourt (talks).

**Without it:** the hub can't be entered from a free day, and **Jumu’ah can't be reached at all** (its door question
lives on this scene).

## Corner Market (`store`, world-scenes.js:335)

- Abu Karim's store: Halal Bucks for cosmetics (`World.shop`), owned / worn shown, items feed the creator's rows.
- Counts `visit_store`; once a day; moves the time of day on.

**Without it:** the cosmetics store is gone (the hub's own **Projects** shop for masjid upgrades is separate and
stays). Halal Bucks would only buy masjid projects.

## Tests and Studio items that use them

- Tests: `world-flow`, `world-walk`, `world-robust`, `world-save`, `world-visual` (84 reference images in
  `docs/review/img/world-*.png`), `world-pad`, `jumuah`, `jumuah-visual`, `calendar`, the first-run path.
- Studio: the scene sprites (`sprite/scene/...`), their props (`sprite/prop/<scene>/...`), the world screens
  (`world: ...` in Screens), NPC sprites and dialogue lines.

## If they go

The smallest change that keeps career working is to treat "Career calendar off" as the only path (no free-day walk;
the hub's Continue goes to the next game), and move what only lives in these scenes: Jumu’ah (the door question,
the room) into the hub's calendar, and the cosmetics store into the hub. That is a larger brief of its own.
