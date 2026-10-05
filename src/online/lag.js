// ================================================= v7.4: LAG AND INPUT LAG
// 1. Fixed send rates: host snapshots at NET_HZ; guest input goes out at once on any button
//    change, plus a NET_HZ heartbeat for the stick. (Was: every rendered frame, both sides.)
// 2. Smaller snapshots: events are sent only for EV_KEEP ms after they happen (the guest already
//    de-duplicates by id); venue and format only in a match's first 3 s, then now and then.
// 3. The guest's own actions start on its screen the moment the button goes down (jump, shot
//    windup and release, steal, pass pose); the host stays authoritative for every outcome. If the
//    host never confirms the action, the guest's player blends back over ~100 ms.
// 4. Lag compensation, capped at LC_MAX: a guest jump starts on the host as far along as the guest
//    saw it start, and a guest steal is judged against where the handler was when the guest saw him.
const NET_HZ = 30, EV_KEEP = 300, LC_MAX = 0.15;
Net.snapDue = function (rdt) {
  this.snapAcc = (this.snapAcc || 0) + rdt;
  if (this.snapAcc < 1 / NET_HZ) return false;
  this.snapAcc = Math.min(this.snapAcc - 1 / NET_HZ, 1 / NET_HZ); return true;
};
{
  const _le = Net.logEv;
  Net.logEv = function (e) { _le.call(this, e); (this.evT = this.evT || {})[this.evId] = nowMs(); };
  const _sn = Net.snapshot;
  Net.snapshot = function () {
    const o = _sn.call(this);
    if (o.sc === 'lobby' || o.mid == null) return o;
    const now = nowMs();
    if (o.mid !== this._midSeen) { this._midSeen = o.mid; this._midAt = now; this._snapN = 0; }
    this._snapN = (this._snapN || 0) + 1;
    const early = now - this._midAt < 3000;
    if (o.e) { o.e = o.e.filter(ev => now - ((this.evT || {})[ev[0]] || 0) <= EV_KEEP); if (!o.e.length) delete o.e; }
    if (!early && this._snapN % 60) delete o.vn;                       // venue: first 3 s, then every 2 s
    if (!early && this._snapN % 15) delete o.fx;                       // format/fun/difficulty: every 0.5 s
    return o;
  };
  // guest input: on change, or at NET_HZ for the stick; carries the lag estimate for compensation
  const _sp = Net.setP;
  Net.setP = function (patch) {
    if (this.role === 'guest' && patch && patch.in && Object.keys(patch).length === 1) {
      const i = patch.in, now = nowMs();
      i.lc = Math.round(Math.min(250, (this.rtt || 120) + (this.rdelay || 60)));
      const key = [i.ac, i.bc, i.xc, i.sc, i.rc, i.bh, i.ah, i.xh, i.t, i.rp && i.rp[0], i.ri].join(',');
      if (key === this._inKey && now - (this._inAt || 0) < 1000 / NET_HZ) { this._inPend = patch; return; }
      this._inKey = key; this._inAt = now; this._inPend = null;
    }
    return _sp.call(this, patch);
  };
}
// ---- guest: predict our own actions
const Pred = { act: null, aT0: 0, aCtx: null, off: null };
function predOwn() { return M.players && M.players.find(p => p.human === 1); }
function predStart(type) { const me = predOwn(); if (!me) return; Pred.act = { type, t: 0, ok: false, rel: false, vy: type === 'jump' ? 400 + me.st.def * 7 : (me.jumpVy || JUMP_VY) }; }
{
  const _hc = humanCmd;
  humanCmd = function (pad, c) {
    _hc(pad, c);
    if (Net.role !== 'guest' || Game.screen !== 'netplay' || Net.reconnecting || Net.noPredict) return;
    const me = predOwn(); if (!me || Pred.act) { if (Pred.act && Pred.act.type === 'shot' && !c.bHeld) Pred.act.rel = true; return; }
    const mine = ball.owner === me, bo = ball.owner, onD = bo && bo.team !== me.team, ground = me.state === 'free' && me.y < 1;
    if (c.b && ground) {
      if (mine) { const h = attackHoop(me.team); if (!(c.turbo && dxz(me, h) < 170)) predStart('shot'); }   // (dunks stay host-driven)
      else if (!bo || onD) predStart('jump');
    }
    if (c.a) { Pred.aT0 = nowMs(); Pred.aCtx = mine ? 'ball' : onD ? 'def' : null; }
    if (!c.aHeld && Pred.aT0) {
      const held = nowMs() - Pred.aT0; Pred.aT0 = 0;
      if (ground && Pred.aCtx === 'def' && held < STEAL_TAP * 1000 && !c.turbo) predStart('steal');
      else if (ground && Pred.aCtx === 'ball' && mine && held < PASS_HOLD * 1000) predStart('pass');
    }
  };
  const _gf = Net.guestFrame;
  Net.guestFrame = function (rdt) {
    _gf.call(this, rdt);
    const me = predOwn(); if (!me) { Pred.act = null; return; }
    const hostY = me.y, A = Pred.act;
    if (A) {
      A.t += rdt;
      const G = grav(), N = this.snaps[this.snaps.length - 1], raw = N && N.s.p && N.s.p[M.players.indexOf(me)], hs = raw ? NS[raw[6]] : 'free';
      const fam = { jump: ['jump', 'land'], shot: ['windup', 'shoot', 'land', 'dunk'], steal: ['steal'], pass: ['pass'] }[A.type];
      if (fam.includes(hs)) A.ok = true;
      let done = false;
      if (A.type === 'jump') { const y = A.vy * A.t - 0.5 * G * A.t * A.t; if (y <= 0 && A.t > 0.05) done = true; else { me.state = 'jump'; me.st_t = A.t; me.y = Math.max(0, y); } }
      else if (A.type === 'shot') {
        if (A.t < 0.1) { if (A.rel) done = true; else { me.state = 'windup'; me.st_t = A.t; me.y = 0; } }     // released this early = pump fake
        else { const ts = A.t - 0.1, y = A.vy * ts - 0.5 * G * ts * ts; if (y <= 0 && ts > 0.05) done = true; else { me.state = 'shoot'; me.st_t = ts; me.y = Math.max(0, y); } }
      } else if (A.type === 'steal') { if (A.t > 0.28) done = true; else { me.state = 'steal'; me.st_t = A.t; } }
      else if (A.type === 'pass') { if (A.t > 0.2) done = true; else { me.state = 'pass'; me.st_t = A.t; } }
      if (!A.ok && A.t > (this.rtt || 120) / 1000 + 0.3) done = true;         // the host never confirmed it: let go
      if (done) { Pred.off = { y: me.y - hostY }; me.y = hostY; Pred.act = null; }
      else animate(me, rdt);                                              // pose follows the predicted state this frame
    }
    if (!Pred.act && Pred.off) {                                           // blend back to the host's view (~100 ms)
      const k = Math.exp(-rdt / 0.035); Pred.off.y *= k; me.y = Math.max(0, me.y + Pred.off.y);
      if (Math.abs(Pred.off.y) < 0.5) Pred.off = null;
    }
  };
}
// ---- host: lag compensation for the guest's jumps and steals (capped)
const LagHist = [];
function guestLC() { if (Net.lcOff) return 0; const gp = Lobby.guestPres(); const lc = gp && gp.in && gp.in.lc; return clamp((+lc || 0) / 1000, 0, LC_MAX); }   // Net.lcOff: test switch
{
  const _um = updateMatch;
  updateMatch = function (dt) {
    _um(dt);
    if (Net.role === 'host' && M.online && M.players) {
      LagHist.push({ t: M.time, p: M.players.map(q => [q.x, q.z]) });
      while (LagHist.length && M.time - LagHist[0].t > 0.4) LagHist.shift();
    }
  };
  const _sj = startJump;
  startJump = function (p) {
    const was = p.state; _sj(p);
    if (Net.role !== 'host' || p.human !== 1 || p.state !== 'jump' || was === 'jump') return;
    const l = guestLC(); if (l <= 0) return;
    const G = grav(); p.y = Math.max(0, p.vy * l - 0.5 * G * l * l); p.vy -= G * l; p.st_t = l;   // as far along as the guest saw it
  };
  const _ts = trySteal;
  trySteal = function (p) {
    if (Net.role !== 'host' || p.human !== 1 || !M.online) return _ts(p);
    const l = guestLC(), at = M.time - l, H = LagHist.find(e => e.t >= at) || LagHist[0];
    if (!H || l <= 0) return _ts(p);
    const keep = M.players.map(q => [q.x, q.z]);
    M.players.forEach((q, i) => { if (q !== p && H.p[i]) { q.x = H.p[i][0]; q.z = H.p[i][1]; } });   // the floor as the guest saw it
    try { return _ts(p); } finally { M.players.forEach((q, i) => { if (q !== p) { q.x = keep[i][0]; q.z = keep[i][1]; } }); }
  };
}
// ---- connection notices; host stepping away (tab hidden)
{
  try { document.addEventListener('visibilitychange', () => { if (Net.role === 'host') Net.setP({ away: document.hidden ? 1 : 0 }); }); } catch (e) {}
  const _r = render;
  render = function (g) {
    _r(g);
    const pill = (txt, col) => { g.font = `12px ${FONT}`; const w = g.measureText(txt).width + 26; g.fillStyle = 'rgba(8,14,22,0.85)'; roundRect(g, W / 2 - w / 2, 64, w, 24, 12); g.fill(); g.textAlign = 'center'; g.fillStyle = col; g.fillText(txt, W / 2, 80); };
    if (Game.screen === 'netplay' && !Net.reconnecting && Net.lastSnapAt && nowMs() - Net.lastSnapAt > 350) pill('Connection unstable', '#ffd76a');
    if (Game.screen === 'play' && Net.role === 'host' && M.online && Net.guestPeer) {
      const gp = Lobby.guestPres(); if (gp && gp.in && gp.in.q && Net._lastQ !== gp.in.q) { Net._lastQ = gp.in.q; Net._qAt = nowMs(); }
      if (Net._qAt && nowMs() - Net._qAt > 1200) pill('Your friend’s connection is unstable', '#ffd76a');
    }
    if (Game.screen === 'netplay' && Net.reconnecting) { const hp = (Net.hostPeer() || {}).presence; if (hp && hp.away) pill('Host stepped away (app in the background)', '#ffd76a'); }
  };
}

