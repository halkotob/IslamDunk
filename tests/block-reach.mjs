// v9.33 (refine 6, tests/run.mjs registers it):
//   block-reach  (fast) a block jump against a shot in the air lunges toward the ball (from the side and from behind:
//                it moves toward the ball, a short capped distance, and stops); the block chance by angle and reach:
//                in front > beside > far off, behind still a real chance, far off small, out of reach none; Lockdown
//                reaches farther
export function blockReachTests({ newContext, open }) {
  const T = {};
  T['block-reach'] = async ({ browser, base }) => {
    const errs = [], ctx = await newContext(browser, { seed: true }), p = await open(ctx, base + '/', errs, 'block-reach');
    const r = await p.evaluate(() => {
      const out = {};
      const setup = () => {
        newMatch(soloTeam(TEAMS[0], 0), soloTeam(TEAMS[1], 1), { humans: [], fmt: { format: 'quarters', len: 600 } }); M.phase = 'live';
        M.cmdHook = q => { zeroCmd(q.cmd); return true; };
        const [A, B] = M.players, h = attackHoop(0), f = sgn(COURT.L / 2 - h.x) * -1 || 1;   // f: the way to the rim
        place(A, h.x - f * 320, 350); place(B, h.x - f * 200, 350); A.y = B.y = 0; A.state = B.state = 'free';
        giveBall(A, 'inbound'); launchShot(A, h, true, 2); ball.shot.t = 0.1;
        ball.x = A.x + f * 12; ball.z = A.z; ball.y = 135;                 // (the ball at his release point: launchShot places it on the next frame)
        return { A, B, h, f };
      };
      // the chance by where the hand meets the ball
      const at = (dx, dz, ahead) => {
        const { B, f } = setup(); B.st.def = 7; ball.x += f * (ahead || 0);           // (ahead: the ball already on its way to the rim)
        B.x = ball.x + f * dx; B.z = ball.z + dz; B.y = ball.y - 104; B.face = sgn(ball.x - B.x) || 1;
        const c = blockChance(B); return c ? +c.p.toFixed(3) : 0;
      };
      out.front = at(10, 0, 50); out.side = at(0, 14); out.behind = at(-10, 0); out.far = at(0, 31); out.none = at(0, 60);
      { const { B } = setup(); B.st.def = 7; B.x = ball.x; B.z = ball.z + 34; B.y = ball.y - 104; out.lockNo = !!blockChance(B); B.perk = 'lockdown'; out.lockYes = !!blockChance(B); }
      // the lunge, from the side and from behind
      const lunge = (dx, dz) => {
        const { B, f } = setup(); B.x = ball.x + f * dx; B.z = ball.z + dz; B.cd.jump = 0;
        const x0 = B.x, z0 = B.z, tx = ball.x, tz = ball.z;
        startJump(B); const had = !!B.reach;
        for (let i = 0; i < 14; i++) updateMatch(STEP);                      // (the lunge is 0.18 s)
        const mx = B.x - x0, mz = B.z - z0, d0 = Math.hypot(tx - x0, tz - z0);
        return { had, toward: +((mx * (tx - x0) + mz * (tz - z0)) / d0).toFixed(1), moved: +Math.hypot(mx, mz).toFixed(1), left: B.reach == null };
      };
      out.lungeSide = lunge(0, 110); out.lungeBehind = lunge(-90, 30);
      { const { B } = setup(); B.x = ball.x; B.z = ball.z + 400; B.cd.jump = 0; startJump(B); out.farNoLunge = !B.reach; }
      return out;
    });
    await ctx.close();
    const L = [r.lungeSide, r.lungeBehind];
    const ok = r.front > r.side && r.side > r.far && r.far > 0 && r.far < 0.14 && r.behind >= 0.05 && r.none === 0 && !r.lockNo && r.lockYes
      && L.every(l => l.had && l.toward > 15 && l.moved < 45 && l.left) && r.farNoLunge && !errs.length;
    return { ok, detail: [JSON.stringify(r), ...errs] };
  };
  return T;
}
