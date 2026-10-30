// node tools/screen-census.mjs        (after npm run build:review) writes docs/review/screen-census.json
// v9.13: every screen the Studio shows, set up at desktop and the two phone sizes, with what it draws: the words, the
// numbers, the tap targets, and the phone text audit's result (text past the edge, small text, overlapping targets).
// The Studio's Screens tab reads it (counts, flags: crowded, text-heavy; numbers also shown on another screen).
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';
import { openStudio } from './studio-run.mjs';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
export async function screenCensus(browser) {
  const st = await openStudio(browser, path.join(ROOT, 'dist/review')), p = st.page;
  p.setDefaultTimeout(0);
  const raw = await p.evaluate(() => window.__studio.census());
  await st.close();
  return summarize(raw);
}
// words and numbers from the desktop texts; the audit for every size
export function summarize(raw) {
  const out = {}, numsBy = {};
  const words = t => (t.match(/[A-Za-z’'][A-Za-z’'-]*/g) || []).length;
  const nums = t => (t.match(/\d[\d,.:%]*\d|\d/g) || []).filter(n => n.replace(/\D/g, '').length >= 2 && !/^(19|20)\d\d$/.test(n) && !/^\d{1,2}:\d\d$/.test(n));   // 2+ digits, not a year, not a clock
  for (const [name, sizes] of Object.entries(raw)) {
    const d = sizes.desktop || Object.values(sizes)[0] || {};
    const texts = d.texts || [], N = [...new Set(texts.flatMap(nums))];
    out[name] = { words: texts.reduce((a, t) => a + words(t), 0), taps: d.taps || 0, numbers: N.slice(0, 40), audit: {} };
    // the phone text audit: pass = nothing past the edge, no small text, no overlapping tap targets, no errors. At desktop
    // size the small-text rule (a phone's minimum) is shown but doesn't fail it
    for (const [sz, r] of Object.entries(sizes)) out[name].audit[sz] = r.error ? { error: r.error } : { pass: !(r.overflow || (sz !== 'desktop' && r.small) || r.overlaps || r.errors), overflow: r.overflow, small: r.small, overlaps: r.overlaps, errors: r.errors };
    for (const n of N) (numsBy[n] = numsBy[n] || new Set()).add(name);
  }
  // numbers (3 or more characters, so not every "12") that another screen also shows
  for (const [name, o] of Object.entries(out)) {
    const sh = {};
    for (const n of o.numbers) if (n.length >= 3 && numsBy[n].size > 1 && numsBy[n].size <= 6) for (const other of numsBy[n]) if (other !== name) (sh[other] = sh[other] || []).push(n);
    o.shared = Object.entries(sh).map(([s, ns]) => ({ screen: s, numbers: ns.slice(0, 6) })).sort((a, b) => b.numbers.length - a.numbers.length).slice(0, 6);
  }
  return out;
}
if (process.argv[1] && process.argv[1].endsWith('screen-census.mjs')) {
  const b = await chromium.launch(), t0 = Date.now();
  const c = await screenCensus(b); await b.close();
  fs.writeFileSync(path.join(ROOT, 'docs/review/screen-census.json'), JSON.stringify({ built: new Date().toISOString().slice(0, 10), screens: c }, null, 1) + '\n');
  console.log(`docs/review/screen-census.json: ${Object.keys(c).length} screens in ${Math.round((Date.now() - t0) / 1000)} s`);
}
