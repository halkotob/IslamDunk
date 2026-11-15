// v9.21.1 studio-phone (fast): the Review Studio on a phone, from the folder that's published (studio/, else dist/review)
//   - loads at 390x844 and 844x390 (touch, mobile) with no page errors
//   - no sideways scroll; no visible button, field or chip under 44 px; the verdict bar is on screen at the bottom
//   - a verdict and a comment set with the bar and the note sheet export as CSV, and after Clear the CSV imports
//     back the same; an old export (no merge_into / pick columns, 9.2-era) still imports
import fs from 'node:fs';
import path from 'node:path';
import { openStudio } from '../tools/studio-run.mjs';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
export const STUDIO_PHONE_TESTS = {};
const LAYOUT = () => {
  const vis = e => { const r = e.getBoundingClientRect(), cs = getComputedStyle(e); return r.width > 0 && r.height > 0 && cs.visibility !== 'hidden' && cs.display !== 'none' && !e.closest('[hidden]') && !e.closest('#gamehost') && !e.closest('#nav'); };
  const small = [...document.querySelectorAll('#top button, #top input, #top select, #top .chip, #actbar button')].filter(vis).filter(e => { const r = e.getBoundingClientRect(); return r.height < 44 || r.width < 44; }).map(e => (e.id || e.textContent.trim()).slice(0, 20) + ' ' + Math.round(e.getBoundingClientRect().width) + 'x' + Math.round(e.getBoundingClientRect().height));
  const bar = document.querySelector('#actbar'), br = bar.getBoundingClientRect();
  return { phone: document.body.classList.contains('phone'), sideways: document.documentElement.scrollWidth - innerWidth, small, bar: !bar.hidden && br.bottom <= innerHeight + 1 && br.top > innerHeight * 0.5 };
};
STUDIO_PHONE_TESTS['studio-phone'] = async ({ browser }) => {
  const dir = fs.existsSync(path.join(ROOT, 'studio/review.html')) ? path.join(ROOT, 'studio') : path.join(ROOT, 'dist/review');
  const out = {}, detail = [], errs = [];
  for (const [w, h] of [[390, 844], [844, 390]]) {
    const st = await openStudio(browser, dir, { viewport: { width: w, height: h }, mobile: true });
    const p = st.page; errs.push(...st.errors);
    const k = w + 'x' + h; out[k] = await p.evaluate(LAYOUT);
    if (w === 390) {
      // Fix with the bar, a comment in the note sheet, export, clear, import
      await p.tap('#actbar button[data-v="fix"]');
      await p.tap('#actbar button.note'); await p.fill('#n-comment', 'phone note, with a comma'); await p.tap('#notesheet .done');
      out.csv = await p.evaluate(() => {
        const { S, store, phone } = window.__studio, id = S.view[S.cur].id, before = JSON.stringify(store.mark(id));
        const csv = phone.csvText(); store.clearAll();
        const cleared = !store.mark(id);
        window.__studio.importCsv(csv, 'phone.csv');
        const after = store.mark(id);
        // an old export: the 9.2 columns, without merge_into and pick
        const old = 'id,category,name,where,version_added,verdict,comment,suggested,reviewer,role,reviewed_at,build_version\n' + id + ',x,x,x,x,keep,old export,,olduser,Art,2026-01-01T00:00:00.000Z,9.2.2\n';
        window.__studio.importCsv(old, 'old.csv');
        const oldOk = (store.marksFor(id).olduser || {}).verdict === 'keep';
        document.getElementById('dlg').close();
        return { id, same: before === JSON.stringify(after), cleared, verdict: after && after.verdict, comment: after && after.comment, oldOk, saved: document.getElementById('savedtxt').textContent };
      });
    }
    await st.close();
  }
  const lay = Object.entries(out).filter(([k]) => k.includes('x'));
  for (const [k, v] of lay) detail.push(`${k}: phone layout ${v.phone}; sideways scroll ${v.sideways}px; verdict bar at the bottom ${v.bar}; under 44 px: ${v.small.length ? v.small.join(', ') : 'none'}`);
  const c = out.csv || {};
  detail.push(`export -> clear -> import: cleared ${c.cleared}, came back the same ${c.same} (${c.verdict}, “${c.comment}”); an old export imports ${c.oldOk}; ${c.saved}`, ...errs);
  const ok = lay.every(([, v]) => v.phone && v.sideways <= 0 && !v.small.length && v.bar) && c.same && c.cleared && c.verdict === 'fix' && c.comment === 'phone note, with a comma' && c.oldOk && !errs.length;
  return { ok, detail };
};
