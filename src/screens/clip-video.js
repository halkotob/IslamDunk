// ================================================= v8.7.1: SHARE A CLIP AS A VIDEO
// From the share screen (post-game Share, Barakah Run "Share a highlight"): "Make video" replays the chosen
// play onto an offscreen 1280x720 canvas at 30 fps, real speed with the instant replay's slow motion around the
// peak (about 5 s), and records it with canvas.captureStream + MediaRecorder: the first type the browser
// supports of MP4 (H.264), WebM VP9, WebM VP8, WebM. No audio, no upload, no account.
// Each frame swaps the clip's scene in and back out exactly as buildShareCard does, so the live state is
// untouched; it never runs during a live match. Without MediaRecorder or captureStream it says so and keeps
// the still image.
const CLIP_TYPES = ['video/mp4;codecs=avc1', 'video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm'];
const CLIP_W = 1280, CLIP_H = 720, CLIP_FPS = 30;
const ClipVid = { state: null, prog: 0, blob: null, url: '', name: '', type: '', msg: '', poster: null, secs: 0, job: null };
function clipVideoType() {
  try {
    if (typeof MediaRecorder === 'undefined' || typeof MediaRecorder.isTypeSupported !== 'function') return null;
    if (typeof HTMLCanvasElement === 'undefined' || typeof HTMLCanvasElement.prototype.captureStream !== 'function') return null;
    return CLIP_TYPES.find(t => MediaRecorder.isTypeSupported(t)) || null;
  } catch (e) { return null; }
}
// the source frame shown in each video frame: a beat on the first frame, real speed (60 fps source, 30 fps out),
// the instant replay's 0.45x slow motion around the peak, then a hold on the last frame
function clipPlan(clip) {
  const n = clip.frames.length, peak = clamp(clip.peak == null ? n - 55 : clip.peak, 0, n - 1), out = [];
  const build = (fast, slow) => { out.length = 0; for (let i = 0; i < 12; i++) out.push(0); let s = 0; while (s < n - 1) { out.push(Math.floor(s)); s += Math.abs(s - peak) < 36 ? slow : fast; } for (let i = 0; i < 15; i++) out.push(n - 1); };
  build(2, 0.9);
  if (out.length < 4.2 * CLIP_FPS) build(1, 0.6);                     // short clips: play them slower rather than end early
  return out.slice();
}
const clipName = (t, fb) => (typeof csClean === 'function' ? csClean(t && t.name, fb) : (t && t.name) || fb);   // custom team names go through the word filter
function clipFrame(g, clip, meta, si, camS, k) {
  const savedM = Object.assign({}, M), savedCam = Object.assign({}, cam), savedVL = VL, parts = FX.parts, pops = FX.pops, sx = FX.sx, sy = FX.sy, flash = FX.flashA;
  const oldCourt = courtCv, oldCrowdCv = crowdCv, oldCrowd = crowd, oldBallState = ball.state, oldShot = ball.shot, oldTime = Game.t, oldEvent = FX.event, oldHype = FX.hypeV;
  let restore = null;
  g.fillStyle = '#0b1722'; g.fillRect(0, 0, CLIP_W, CLIP_H);
  try {
    Object.assign(M, meta.scene); VL = meta.venue; FX.parts = []; FX.pops = []; FX.sx = FX.sy = FX.flashA = 0;
    courtCv = meta.court || courtCv; crowdCv = meta.crowdCanvas || crowdCv; crowd = meta.crowdMembers || crowd;
    ball.state = meta.ballState || ball.state; ball.shot = meta.shot || null; Game.t = (meta.time || 0) + k / CLIP_FPS; FX.event = meta.event || null; FX.hypeV = meta.hype || 0;
    restore = Replay.apply(clip.frames[si]);
    // the camera follows the play: the player, the ball and the nearest rim, eased so it never jumps
    const p = M.players[clip.idx] || M.players[0], h = hoops[ball.x > COURT.L / 2 ? 1 : 0];
    const left = Math.min(p.x, ball.x, h.x) - 120, right = Math.max(p.x, ball.x, h.x) + 120;
    const top = Math.min(FLOOR_TOP + p.z * ZS - (p.y + 150) * depthK(p.z), FLOOR_TOP + ball.z * ZS - ball.y * depthK(ball.z), FLOOR_TOP + h.z * ZS - (RIM_Y + 75) * depthK(h.z)) - 40;
    const bottom = Math.max(FLOOR_TOP + p.z * ZS, FLOOR_TOP + h.z * ZS) + 60;
    const tx = (left + right) / 2 - W / 2, ty = (top + bottom) / 2, tz = clamp(Math.min(W / ((right - left) * K_NEAR), H / (bottom - top)), 1, 1.7);
    if (!camS.on) Object.assign(camS, { on: true, x: tx, fy: ty, z: tz });
    else { camS.x += (tx - camS.x) * 0.18; camS.fy += (ty - camS.fy) * 0.18; camS.z += (tz - camS.z) * 0.12; }
    cam.x = camS.x; cam.fy = camS.fy; cam.zoom = camS.z;
    const sc = Math.min(CLIP_W / W, CLIP_H / H);
    g.save(); g.translate(CLIP_W / 2 - W * sc / 2, CLIP_H / 2 - H * sc / 2); g.scale(sc, sc);
    g.translate(W / 2, H / 2); g.scale(cam.zoom, cam.zoom); g.translate(-W / 2, -cam.fy); drawScene(g, Game.t); g.restore();
  } finally {
    if (restore) restore(); Object.assign(M, savedM); Object.assign(cam, savedCam); VL = savedVL; FX.parts = parts; FX.pops = pops; FX.sx = sx; FX.sy = sy; FX.flashA = flash;
    courtCv = oldCourt; crowdCv = oldCrowdCv; crowd = oldCrowd; ball.state = oldBallState; ball.shot = oldShot; Game.t = oldTime; FX.event = oldEvent; FX.hypeV = oldHype;
  }
  // the overlay: kept small. ISLAM DUNK, the two teams and the score, the play. Nothing personal.
  g.save(); g.textBaseline = 'alphabetic';
  g.fillStyle = 'rgba(8,16,24,0.78)'; g.fillRect(0, 0, CLIP_W, 54);
  g.textAlign = 'left'; g.fillStyle = GOLD; g.font = `26px ${FONT}`; g.fillText('ISLAM DUNK', 24, 37);
  const A = clipName(meta.teams[0], 'Home'), B = clipName(meta.teams[1], 'Away');
  g.textAlign = 'right'; g.fillStyle = IVORY; g.font = `22px ${FONT}`; g.fillText(A + '  ' + meta.score[0] + ' – ' + meta.score[1] + '  ' + B, CLIP_W - 24, 36, CLIP_W - 330);
  const label = String(clip.label || 'HIGHLIGHT').toUpperCase();
  g.font = `30px ${FONT}`; const lw = Math.min(CLIP_W - 80, g.measureText(label).width + 48);
  g.fillStyle = 'rgba(8,16,24,0.8)'; roundRect(g, CLIP_W / 2 - lw / 2, CLIP_H - 72, lw, 50, 25); g.fill();
  g.textAlign = 'center'; g.fillStyle = GOLD; g.fillText(label, CLIP_W / 2, CLIP_H - 36, CLIP_W - 120);
  g.restore();
}
function clipFileName(clip, meta, type) {
  const slug = s => String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 28);
  return 'islam-dunk-' + (slug(meta.teams[0] && (meta.teams[0].short || clipName(meta.teams[0], 'team'))) || 'team') + '-' + (slug(clip.label) || 'highlight') + (type.startsWith('video/mp4') ? '.mp4' : '.webm');
}
const clipLive = () => (Game.screen === 'play' || Game.screen === 'netplay') && M.phase !== 'over';
function startClipVideo() {
  const clip = ShareCard.clips[ShareCard.index]; if (!clip || !clip.frames || !clip.frames.length || clipLive() || ClipVid.state === 'rec') return false;
  clipVideoReset(); ClipVid.back = Game.screen === 'clipvideo' ? ClipVid.back : Game.screen;
  const type = clipVideoType();
  Game.screen = 'clipvideo';
  if (!type) { ClipVid.state = 'fallback'; ClipVid.msg = 'Video isn’t supported in this browser, so here is the still image.'; return false; }
  const meta = clip.share || clipMetadata(clip.idx), plan = clipPlan(clip), cv = makeCanvas(CLIP_W, CLIP_H), g = cv.getContext('2d'), camS = {};
  let rec, chunks = [], stream;
  try {
    clipFrame(g, clip, meta, plan[0], camS, 0);
    stream = cv.captureStream(CLIP_FPS);
    rec = new MediaRecorder(stream, { mimeType: type, videoBitsPerSecond: 5000000 });
  } catch (e) { ClipVid.state = 'fallback'; ClipVid.msg = 'Video couldn’t start here, so here is the still image.'; return false; }
  const job = ClipVid.job = { cancelled: false, cv, rec, plan, i: 0, t0: 0 };
  ClipVid.state = 'rec'; ClipVid.prog = 0; ClipVid.type = type; ClipVid.name = clipFileName(clip, meta, type); ClipVid.secs = plan.length / CLIP_FPS;
  rec.ondataavailable = e => { if (e.data && e.data.size) chunks.push(e.data); };
  rec.onstop = () => {
    try { stream.getTracks().forEach(t => t.stop()); } catch (e) {}
    if (job.cancelled || ClipVid.job !== job) return;
    ClipVid.blob = new Blob(chunks, { type: type.split(';')[0] }); ClipVid.url = URL.createObjectURL(ClipVid.blob);
    ClipVid.state = ClipVid.blob.size ? 'done' : 'fallback'; if (!ClipVid.blob.size) ClipVid.msg = 'The recording came out empty, so here is the still image.';
    ClipVid.prog = 1; ClipVid.job = null;
  };
  const poster = makeCanvas(CLIP_W, CLIP_H); ClipVid.poster = poster;
  const peakAt = plan.indexOf(clamp(clip.peak == null ? clip.frames.length - 55 : clip.peak, 0, clip.frames.length - 1));
  rec.start(250); job.t0 = performance.now();
  const tick = () => {                                   // real time: frame i at t0 + i / 30 s
    if (job.cancelled) return;
    const due = Math.min(plan.length - 1, Math.floor((performance.now() - job.t0) / (1000 / CLIP_FPS)));
    while (job.i < due) { job.i++; clipFrame(g, clip, meta, plan[job.i], camS, job.i); if (job.i === peakAt || (peakAt < 0 && job.i === plan.length >> 1)) poster.getContext('2d').drawImage(cv, 0, 0); }
    ClipVid.prog = job.i / (plan.length - 1);
    if (job.i >= plan.length - 1) { setTimeout(() => { if (!job.cancelled && rec.state !== 'inactive') rec.stop(); }, 150); return; }
    setTimeout(tick, 1000 / CLIP_FPS / 2);
  };
  setTimeout(tick, 1000 / CLIP_FPS);
  return true;
}
function cancelClipVideo() {
  const j = ClipVid.job; if (j) { j.cancelled = true; try { if (j.rec.state !== 'inactive') j.rec.stop(); } catch (e) {} }
  clipVideoReset(); Game.screen = ClipVid.back || 'shareclip';
}
function clipVideoReset() { if (ClipVid.url) { try { URL.revokeObjectURL(ClipVid.url); } catch (e) {} } Object.assign(ClipVid, { state: null, prog: 0, blob: null, url: '', msg: '', job: null }); }
function saveClipVideo() {
  if (!ClipVid.blob) return;
  try { const a = document.createElement('a'); a.download = ClipVid.name; a.href = ClipVid.url; document.body.appendChild(a); a.click(); a.remove(); toast('Video ready: check your downloads.'); }
  catch (e) { ClipVid.msg = 'Saving isn’t available here.'; }
}
function clipCanShare() {
  try { if (!ClipVid.blob || !navigator.share || !navigator.canShare) return false; return navigator.canShare({ files: [new File([ClipVid.blob], ClipVid.name, { type: ClipVid.blob.type })] }); } catch (e) { return false; }
}
function shareClipVideo() {
  if (!clipCanShare()) return saveClipVideo();
  navigator.share({ files: [new File([ClipVid.blob], ClipVid.name, { type: ClipVid.blob.type })], title: 'Islam Dunk' }).catch(() => {});
}
function drawClipVideo(g) {
  dim(g, 0.86);
  g.textAlign = 'center'; g.fillStyle = GOLD; g.font = `26px ${FONT}`; g.fillText(ClipVid.state === 'rec' ? 'Making your clip' : ClipVid.state === 'done' ? 'Your clip' : 'Share a highlight', W / 2, 52);
  const x = W / 2 - 256, y = 76, w = 512, h = 288;
  g.fillStyle = '#0b1722'; g.fillRect(x, y, w, h);
  if (ClipVid.state === 'rec' && ClipVid.job) g.drawImage(ClipVid.job.cv, x, y, w, h);
  else if (ClipVid.state === 'done' && ClipVid.poster) g.drawImage(ClipVid.poster, x, y, w, h);
  else if (ShareCard.card) { const c = ShareCard.card, k = Math.min(w / c.width, h / c.height); g.drawImage(c, W / 2 - c.width * k / 2, y + h / 2 - c.height * k / 2, c.width * k, c.height * k); }
  g.strokeStyle = 'rgba(232,195,90,0.7)'; g.lineWidth = 2; g.strokeRect(x, y, w, h);
  g.fillStyle = IVORY; g.font = `14px ${BODY}`;
  if (ClipVid.state === 'rec') {
    g.fillStyle = 'rgba(255,255,255,0.14)'; roundRect(g, x, y + h + 20, w, 12, 6); g.fill(); g.fillStyle = GOLD; roundRect(g, x, y + h + 20, w * ClipVid.prog, 12, 6); g.fill();
    g.fillStyle = IVORY; g.fillText('Recording in real time: about ' + Math.round(ClipVid.secs) + ' s', W / 2, y + h + 56);
    uiButton(g, W / 2 - 60, 448, 120, 36, 'Cancel', cancelClipVideo, false);
  } else if (ClipVid.state === 'done') {
    const mb = ClipVid.blob ? (ClipVid.blob.size / 1048576).toFixed(1) : '0';
    g.fillText(fitText(g, ClipVid.name + '  •  ' + mb + ' MB  •  no sound', w), W / 2, y + h + 30);
    const share = clipCanShare();
    if (share) uiButton(g, W / 2 - 230, 440, 140, 38, 'Share', shareClipVideo, true);
    uiButton(g, share ? W / 2 - 70 : W / 2 - 150, 440, 140, 38, 'Save', saveClipVideo, !share);
    uiButton(g, share ? W / 2 + 90 : W / 2 + 10, 440, 140, 38, 'Back', cancelClipVideo, false);
  } else {
    g.fillText(fitText(g, ClipVid.msg || '', w + 100), W / 2, y + h + 30);
    uiButton(g, W / 2 - 150, 440, 140, 38, 'Save image', downloadShareCard, true);
    uiButton(g, W / 2 + 10, 440, 140, 38, 'Back', cancelClipVideo, false);
  }
}
{
  const _gu = gameUpdate;
  gameUpdate = function (rdt) {
    if (Game.screen === 'clipvideo') {
      if (menuHit('back')) cancelClipVideo();
      else if (menuHit('ok')) { if (ClipVid.state === 'done') shareClipVideo(); else if (ClipVid.state === 'fallback') downloadShareCard(); }
    } else if (Game.screen === 'shareclip' && Input.pressed.KeyV) { startClipVideo(); Input.pressed.KeyV = false; }
    return _gu.apply(this, arguments);
  };
  const _r = render;
  render = function (g) { _r.apply(this, arguments); if (Game.screen === 'clipvideo') drawClipVideo(g); };
  BACK.clipvideo = () => cancelClipVideo();
}
