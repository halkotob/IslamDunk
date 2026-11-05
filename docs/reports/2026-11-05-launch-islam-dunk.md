# Launch plan: Islam Dunk on (almost) no budget

Written 5 Nov 2026 with the game-trend `launching-on-zero-budget` skill. Fees and rules change: each one below was
checked on this date and needs checking again before you act on it.

## Terms checked today

| Channel | What we found | Source |
|---|---|---|
| Google Play | One-time registration fee. **New personal accounts** (created after 13 Nov 2023) must run a closed test with **12 testers opted in for 14 days in a row** before production; organization accounts (needs a D-U-N-S number, up to ~30 days) are exempt. Pausing the test restarts the count. | [Google Play help](https://support.google.com/googleplay/android-developer/answer/14151465?hl=en-GB), [testerscommunity guide](https://www.testerscommunity.com/blog/google-play-closed-testing-requirements-2026), [extendsclass](https://extendsclass.com/blog/google-plays-closed-testing-requirement-what-developers-need-to-know-in-2026) |
| Apple App Store | $99 a year (individual or organization). A web game wrapped as an app risks rejection for "minimum functionality"; the PWA (Add to Home Screen) is the free iPhone route. | [Adalo guide](https://studio.adalo.com/blog/apple-developer-program-guide), [newly.app](https://newly.app/how-to/apple-developer-program-enrollment) |
| CrazyGames | Free; QA review in a few days; earnings from ads shown through their SDK only; payout monthly over €100 (Tipalti). Current guides say no exclusivity (older terms required it): confirm in their terms. Size limits: 20 MB for the mobile homepage (we are 2 MB). | [CrazyGames docs](https://docs.crazygames.com/requirements/intro/), [Cinevva guide](https://app.cinevva.com/guides/publish-game-crazygames) |
| Poki | Hand-picked; default deal is **web exclusive** (reported as about 5 years) with 50% of earnings on players Poki brings; non-exclusive games get a one-time flat fee instead. Initial download under 8 MB. | [Poki deals](https://sdk.poki.com/deals.html), [Cinevva guide](https://app.cinevva.com/guides/publish-game-poki) |
| YouTube Playables | Early access; apply through an interest form; web builds on Canvas or WebGL qualify. | [YouTube Playables](https://developers.google.com/youtube/gaming/playables) |

**Lock-in warning:** don't sign Poki's web-exclusive deal for this game. Exclusivity would stop the game's own site
(halkotob.github.io) from being the place masjid groups share, and that is the main growth channel below.

## Sequence

1. **This week: start the Play clock.** Open a Google Play developer account and wrap the PWA as a Trusted Web Activity
   (`pwa2play` skill; needs the service worker, W4 in the improvements list, and `assetlinks.json` on the site).
   Recruit 20+ testers from the masjid community and family (more than 12, since dropouts happen) and start the
   14-day closed test immediately.
2. **Same week: the web.** The site is already live. Fix link previews (W1) so every shared link shows the game.
   Submit to CrazyGames (non-exclusive; their SDK handles ads, see the monetization note) and the YouTube Playables
   interest form.
3. **After the 14 days:** release on Google Play. iPhone players keep using the site ("Add to Home Screen" is
   already supported, with the fullscreen prompt).
4. **Later:** the App Store only once there's demand that justifies $99 a year and a native-feeling wrapper; Steam
   for the Electron desktop build if PC players ask for it.

## Organic growth (no ad spend)

The audience is specific and well connected: Muslim youth, families, masjid youth groups, MSAs. Online co-op with a
friend is the hook to promote, and every match already produces a highlight clip (Share → Make video).

- **Post 3 short clips a week** to TikTok, Reels and Shorts, using the game's own highlight videos: movement in the
  first second, the dunk before the setup.
  - Hook 1: "Me and my brother from the masjid, online, different cities" (split screen, both phones).
  - Hook 2: "The imam has a tomahawk dunk" (Sh. character dunk, slow motion from the Dunk lab).
  - Hook 3: "Answer the Noor question right, get the power-up" (the question, the answer, the glowing dunk).
- **Make sharing one tap after a match:** the highlight card and a "Play me online: code UEEG" link (S4 longer codes
  first), so every match invites the next player.
- **Seasonal updates on fixed dates:** Ramadan (night courts, a Ramadan Run), Eid tournaments, Jumu'ah weekly
  challenges. The calendar already models these, so they're content, not new systems.
- **Go where the groups are:** masjid youth programs, MSA group chats, Islamic school PE days. A "masjid league
  night" kit (a QR code to the game, a bracket sheet) costs nothing.

## Monetization (only when there are players)

- The audience and theme make **ad content a risk**: general ad networks can show gambling, alcohol or dating ads
  next to a masjid game. Before any ads, check that the network lets you block those categories (CrazyGames' SDK
  and Google AdSense/AdMob both have category blocking; confirm what can be blocked).
- If ads: rewarded only (an extra Barakah Run life, a cosmetic), never in the first games, never in the middle of an
  online match.
- Better fit: cosmetic purchases (jerseys, courts, taunts already exist), a supporter pack, and masjid or sponsor
  courts (a masjid pays to have its own court in the game).

## Spend rules

- Spend nothing on ads before you know retention (how many players come back the next day and the next week). That
  needs simple, privacy-friendly analytics first (added to the improvements list as G1).
- Spend first on what removes a limit: the Firebase paid plan before promoting online play (S2), then a domain (W5).
