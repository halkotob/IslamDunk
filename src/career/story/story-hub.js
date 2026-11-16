// ================================================= v9.22: THE CAREER STORY — the hub
// Four entries and nothing else: Continue (the next scene or game), Gym (practice and drills), Masjid (walk around,
// talk, use things), My Player (stat upgrades, look, Journal). Beside them: the chapter, the next event and, once
// Sh. Saleem has started it, the school wing fundraiser. The corner menu (Save and load, Title) stays.
const STORY_FUND_GOAL = 100000;
const STORY_KIND_TXT = { scene: 'Story', walk: 'Walk around', drill: 'Practice', play: 'Game', choice: 'Your choice' };
function storyContinueLabel() {
  const S = storyScene();
  if (!S) return 'Continue';
  if (S.unbuilt || (S.ch > STORY_BUILT && S.ch <= 5)) return 'Continue (next update)';
  return 'Continue';
}
function storyOpenMusalla() { enterGym(); openMusalla(); }
function storyOpenOffice() { enterGym(); openOffice(); }
function storyHubItems() {
  return [
    { label: storyContinueLabel(), act: () => storyRun() },
    { label: 'Gym', act: () => enterGym() },
    { label: 'Masjid', sub: [
      { label: 'The musalla', act: () => storyOpenMusalla() },
      { label: 'Sh. Saleem’s office', act: () => storyOpenOffice() },
      { label: 'Outside', act: () => { Game.screen = 'masjid'; Game.masjidView = 'ext'; } },
      { label: 'Projects', act: () => { Game.screen = 'shop'; Game.idx = 0; Game.shopTab = Game.shopTab || 'masjid'; } }] },
    { label: 'My Player', sub: [
      { label: 'Upgrade stats', act: () => { Game.screen = 'train'; Game.idx = 0; } },
      { label: 'Look', act: () => { Game.creator = { idx: 0, isNew: false }; Game.screen = 'creator'; } },
      { label: 'Journal', act: () => openJournal() },
      { label: 'League & stats', act: () => openStats() }] }
  ];
}
// the old hub's builders (Bracket, Season N, Goals, Schedule...) are replaced by the four entries
hubExtra = function () { return storyHubItems(); };
function storyNextText() {
  const S = storyScene(); if (!S) return { head: '', name: '', sub: '' };
  if (S.unbuilt || (S.ch > STORY_BUILT && S.ch <= 5)) return { head: 'NEXT', name: CHAPTERS[Math.min(S.ch, CHAPTERS.length - 1)].name, sub: (S.ch <= 5 ? 'Chapter ' + S.ch : 'It') + ' arrives in the next update.' };
  const n = typeof storyNextExtra === 'function' ? storyNextExtra(S) : '';
  return { head: 'NEXT  •  ' + (STORY_KIND_TXT[S.kind] || '').toUpperCase(), name: S.name, sub: n || 'Continue to play it.' };
}
drawHub = function (g) {
  const ch = CHAPTERS[storyChapter()], T = amanahTeam(), TT = Input.touchMode && g === ctx, px = g => hubPx(g);
  g.fillStyle = 'rgba(4,8,14,0.6)'; g.fillRect(-400, 0, W + 800, H);
  g.textAlign = 'left'; g.fillStyle = GOLD; g.font = `24px ${FONT}`; g.fillText(fitText(g, (ch.n <= 5 ? 'Chapter ' + ch.n + ': ' : '') + ch.name, W - 170), 104, 36);
  g.fillStyle = IVORY; g.font = `14px ${BODY}`; g.fillText(fitText(g, 'Masjid Al-Amanah, Eastside', W - 170), 104, 60);
  // ---- your card
  const L = HubL.left, x0 = L.x + 16, x1 = L.x + L.w - 16;
  panel(g, L.x, L.y, L.w, L.h, false);
  drawPortrait(g, 110, 262, playerDef(), T, 1.7, 'thobe');
  g.textAlign = 'left'; g.fillStyle = '#fff'; g.font = `18px ${FONT}`; g.fillText(fitText(g, C.name || 'You', x1 - 170), 170, 130);
  g.fillStyle = HUB_GOLD_DIM; g.font = `13px ${BODY}`; const lh = Math.max(20, px(g) + 6);
  g.fillText('#' + C.look.num, 170, 130 + lh);
  g.fillStyle = '#f2cf6b'; g.fillText(C.bp + ' BP', 170, 130 + 2 * lh);
  g.fillStyle = '#9dffb0'; g.fillText(C.hb + ' HB', 170, 130 + 3 * lh);
  let y = Math.max(292, 130 + 3 * lh + 30);
  g.fillStyle = HUB_GOLD_DIM; g.font = `11px ${FONT}`; g.fillText('TOP STATS', x0, y); y += 10;
  for (const st of hubTopStats(3)) {
    g.font = `13px ${BODY}`; const rh = Math.max(22, px(g) + 8);
    g.fillStyle = IVORY; g.fillText(fitText(g, st.label, 100), x0, y + rh - 7);
    buildPips(g, 150, y + rh - 16, st.base, st.mod);
    g.font = `12px ${FONT}`; g.fillStyle = '#fff'; g.textAlign = 'right'; g.fillText(String(st.eff), x1, y + rh - 7); g.textAlign = 'left';
    y += rh;
  }
  if (C.prayBonus) {
    g.font = `12px ${FONT}`; const ph = Math.max(26, px(g) + 12); y += 8;
    g.fillStyle = 'rgba(30,90,74,0.9)'; roundRect(g, x0, y, x1 - x0, ph, ph / 2); g.fill();
    g.fillStyle = '#f2cf6b'; g.fillText(fitText(g, 'Salah bonus ready for the next game', x1 - x0 - 24), x0 + 14, y + ph / 2 + px(g) * 0.36);
  }
  // ---- the four entries
  panel(g, 336, 84, 290, 440, false);
  drawMenuStack(g, 'hub', hubExtra([]), 168, TT ? 64 : 56, 262);
  // ---- the next event
  const N = storyNextText();
  g.font = `12px ${FONT}`; const hp = px(g); g.font = `17px ${FONT}`; const np = px(g); g.font = `13px ${BODY}`; const sp = px(g);
  const nh = 22 + hp + 14 + np + 12 + 2 * (sp + 6) + 14;
  panel(g, 642, 84, 290, nh, true);
  g.textAlign = 'left'; g.fillStyle = HUB_GOLD_DIM; g.font = `12px ${FONT}`; g.fillText(fitText(g, N.head, 250), 662, 84 + 18 + hp);
  g.fillStyle = '#fff'; g.font = `17px ${FONT}`; g.fillText(fitText(g, N.name, 250), 662, 84 + 18 + hp + 12 + np);
  g.fillStyle = IVORY; g.font = `13px ${BODY}`; wrapTextLeft(g, N.sub, 662, 84 + 18 + hp + 12 + np + 10 + sp, 250, sp + 6);
  // ---- the fundraiser
  if (C.story.fundOn) {
    const fy = 84 + nh + 12, fh = 22 + hp + 14 + 14 + 12 + sp + 14;
    panel(g, 642, fy, 290, fh, false);
    g.fillStyle = HUB_GOLD_DIM; g.font = `12px ${FONT}`; g.fillText('SCHOOL WING FUNDRAISER', 662, fy + 18 + hp);
    const k = clamp(C.story.fund / STORY_FUND_GOAL, 0, 1), my = fy + 18 + hp + 12;
    meter(g, 662, my, 250, 14, k, '#57e389');
    g.fillStyle = IVORY; g.font = `13px ${BODY}`; g.fillText(fitText(g, '$' + C.story.fund.toLocaleString('en-US') + ' of $' + STORY_FUND_GOAL.toLocaleString('en-US'), 250), 662, my + 26 + sp * 0.6);
  }
  drawHubCorner(g);
};
