// node tools/anim-clips.mjs <out dir> [id,id,...]        (after npm run build:review)
// Records animations from the Review Studio's Animations tab (the game's own sim, a fixed seed) as GIFs at 667x300,
// the small phone size, so a reviewer can compare a move before and after a change.
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { chromium } from 'playwright';
import { openStudio } from './studio-run.mjs';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
export const FIXED_12 = ['move/cross', 'move/btb', 'move/hesi', 'move/stepback', 'move/drop', 'pickup/default', 'shoot/floater', 'shoot/hook', 'shoot/upunder', 'dunk/windmill', 'taunt/small', 'react/nod'];
const out = path.resolve(process.argv[2] || 'clips'), ids = (process.argv[3] || FIXED_12.join(',')).split(',');
fs.mkdirSync(out, { recursive: true });
const b = await chromium.launch(), st = await openStudio(b, path.join(ROOT, 'dist/review')), p = st.page;
const W = 667, H = 300;
for (const id of ids) {
  const frames = await p.evaluate(([id, W, H]) => {
    const rs = window.__studio.S.G.rs, have = rs.anims().find(a => a.id === id); if (!have) return null;
    const c = document.createElement('canvas'); c.width = W; c.height = H; const g = c.getContext('2d'), out = [];
    rs.animStart(id, {});
    const shot = () => { g.fillStyle = '#20242c'; g.fillRect(0, 0, W, H); rs.animDraw(g, W, H); g.fillStyle = '#ffffff'; g.font = '13px sans-serif'; const i = rs.animInfo(); g.fillText(id + '  frame ' + i.f + '  ' + i.state, 8, 16); out.push(c.toDataURL('image/png')); };
    shot(); for (let i = 0; i < have.n; i++) { rs.animStep(); if (i % 2 === 1) shot(); }   // 30 fps
    rs.animStop(); return out;
  }, [id, W, H]);
  if (!frames) { console.log('no animation', id); continue; }
  const tmp = fs.mkdtempSync(path.join(out, '.f-'));
  frames.forEach((d, i) => fs.writeFileSync(path.join(tmp, String(i).padStart(4, '0') + '.png'), Buffer.from(d.split(',')[1], 'base64')));
  const gif = path.join(out, id.replace(/\//g, '-') + '.gif');
  execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-framerate', '30', '-i', path.join(tmp, '%04d.png'), '-vf', 'split[a][b];[a]palettegen=max_colors=96[p];[b][p]paletteuse', gif]);
  fs.rmSync(tmp, { recursive: true });
  console.log(gif, frames.length + ' frames');
}
await st.close(); await b.close();
