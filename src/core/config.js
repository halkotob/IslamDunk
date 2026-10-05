'use strict';
// POLISH PASS PLAN
// 1) Preserve the existing modes and canvas renderer while sharpening athlete silhouettes and action poses.
// 2) Make passes, drives, dunks, and defensive contests communicate their intent and counterplay.
// 3) Keep camera/impact presentation readable, accessible, and inexpensive on mobile.
const REDUCED_MOTION = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
const VERSION = '7.6';
/* =====================================================================
   ISLAM DUNK — 2v2 masjid-league arcade basketball
   Systems (in order): Config & Data · Utils · Audio · Input · Hoops/Net
   physics · Ball physics · Players (actions + animation) · AI · Match
   rules · FX · Renderer · Screens/State machine · Main loop
   ===================================================================== */

// ---------------------------------------------------------------- CONFIG
// W widens to match wide phone screens (menus keep their 960-wide layout, centered)
let W = 960; const H = 540, STEP = 1 / 60;
const COURT = { L: 1320, D: 700 };      // world units (~14 per foot)
const ZS = 0.38;                        // depth compression of the oblique camera
const FLOOR_TOP = 182;                  // screen y of the far sideline (z = 0)
const RIM_Y = 140, RIM_R = 13, BALL_R = 8;
const GRAV = 980, THREE_R = 318, APEX_T = 380 / GRAV;
const JUMP_VY = 380;
const HOOP_DEFS = [{ x: 72, z: 350, dir: 1 }, { x: 1248, z: 350, dir: -1 }];
const SETTINGS = { difficulty: 'medium', rubber: true, format: 'quarters', periodLen: 120, sound: true, fun: { bigHead: false, uncle: false, lowGrav: false } };
// ---- game format: periods, period length and the shot clock tied to it
const PERIOD_OPTS = [30, 45, 60, 120];
const SHOT_CLOCK_FOR = { 30: 0, 45: 0, 60: 15, 120: 24 };      // 0 = no shot clock
const FORMATS = ['quarters', 'halves', 'first21'];
const FORMAT_TXT = { quarters: '4 Quarters', halves: '2 Halves', first21: 'First to 21' };
function periodTxt(len) { return { 30: '30 seconds (no shot clock)', 45: '45 seconds (no shot clock)', 60: '1 minute (15s shot clock)', 120: '2 minutes (24s shot clock)' }[len]; }

// Difficulty changes perception/decision/timing only — never player stats.
const DIFF = {
  easy:   { react: 0.42, noise: 0.30, relErr: 0.17,  contest: 0.24, antic: 0.0, steal: 0.35, shove: 0.10, trivia: 0.60, switchK: 0.55, cross: 0.12, double: false, skillUse: 0, read: 0 },
  medium: { react: 0.24, noise: 0.13, relErr: 0.08,  contest: 0.12, antic: 0.5, steal: 0.60, shove: 0.22, trivia: 0.75, switchK: 0.70, cross: 0.28, double: false, skillUse: 0, read: 0 },
  hard:   { react: 0.11, noise: 0.04, relErr: 0.025, contest: 0.04, antic: 0.9, steal: 0.85, shove: 0.35, trivia: 0.90, switchK: 0.82, cross: 0.42, double: true, skillUse: 0.7, read: 1 }
};

