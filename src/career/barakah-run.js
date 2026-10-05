// ================================================= BARAKAH RUN + LOCAL SHARE CARDS
// Additive local progress only: no career migration, currency, or network schema changes.
const Run = { active: false, wins: 0, points: 0, upgrades: {}, clips: [], choices: [], shieldUsed: false, team: 0 };
const RUN_POWERS = [
  { id:'green', name:'Quiet Focus', desc:'Green window +8% per rank (max +24%).', max:3 },
  { id:'recharge', name:'Second Wind', desc:'Recover 3 more turbo per second while resting.', max:3 },
  { id:'sta', name:'Steady Legs', desc:'Your stamina +1 per rank; stat cap 10.', stat:'sta', max:3 },
  { id:'spd', name:'First Step', desc:'Your speed rating +0.5 per rank; cap 10.', stat:'spd', amount:.5, max:3 },
  { id:'hus', name:'Every Loose Ball', desc:'Your hustle +1 per rank; stat cap 10.', stat:'hus', max:3 },
  { id:'pas', name:'Give and Go', desc:'Your passing +1 per rank; stat cap 10.', stat:'pas', max:3 },
  { id:'def', name:'Hands Up', desc:'Your defense +1 per rank; stat cap 10.', stat:'def', max:3 },
  { id:'stl', name:'Read the Lane', desc:'Your steal rating +1 per rank; stat cap 10.', stat:'stl', max:3 },
  { id:'dnk', name:'Strong Finish', desc:'Your dunk rating +1 per rank; stat cap 10.', stat:'dnk', max:3 },
  { id:'clu', name:'Sabr', desc:'Your clutch rating +1 per rank; stat cap 10.', stat:'clu', max:3 },
  { id:'mateShot', name:'Trust Your Brother', desc:'Teammate shooting +1 per rank; stat cap 10.', stat:'sht', mate:true, max:3 },
  { id:'mateSpeed', name:'Run Together', desc:'Teammate speed +0.5 per rank; stat cap 10.', stat:'spd', amount:.5, mate:true, max:3 },
  { id:'mateDef', name:'Cover My Back', desc:'Teammate defense +1 per rank; stat cap 10.', stat:'def', mate:true, max:3 },
  { id:'fire', name:'Keep It Warm', desc:'Earned on-fire time drains 15% slower per rank.', max:3 },
  { id:'sig', name:'Practice Pays', desc:'Signature cooldown recovers 15% faster per rank.', max:3 },
  { id:'greenPoint', name:'Pure Reward', desc:'A made green jumper earns one extra point.', max:1 },
  { id:'clock', name:'Set the Pace', desc:'CPU shot clock is 2 seconds shorter per rank (min 12).', max:3 },
  { id:'shield', name:'One More Chance', desc:'Cancel the next CPU field goal. Once per run.', max:1 }
];
const RUN_BADGES = [
  { id:'none', name:'No badge', color:'#9fb3c8', desc:'Keep your card simple.' },
  { id:'steady', name:'Steady Heart', color:'#6ce6b3', desc:'Win 3 games in one Barakah Run.' },
  { id:'journey', name:'Long Journey', color:'#e8c35a', desc:'Win 6 games in one Barakah Run.' },
  { id:'weekly', name:'Weekly Regular', color:'#9ecbff', desc:'Complete a Weekly Hot Spot Challenge.' }
];
let replayabilityProgress = null;
function refreshReplayability() { const p=Progress.load(); replayabilityProgress={run:p.barakah||{best:0,points:0}, weekly:p.weekly||{}, badges:p.runBadges||{}, badge:p.runBadge||'none'}; }
function runRank(id) { return Run.active && M.barakah ? Run.upgrades[id] || 0 : 0; }
function openBarakah() { refreshReplayability(); Game.screen='runhome'; Game.idx=0; }
function startBarakah() {
  Object.assign(Run,{active:true,wins:0,points:0,upgrades:{},clips:[],choices:[],shieldUsed:false,newBest:false});
  Run.team=clamp(Run.team,0,TEAMS.length-1); nextBarakahGame();
}
function nextBarakahGame() {
  const clone=T=>Object.assign({},T,{players:T.players.map(p=>Object.assign({},p,{stats:Object.assign({},p.stats)}))});
  const a=clone(TEAMS[Run.team]), b=clone(TEAMS[(Run.team+1+Run.wins%(TEAMS.length-1))%TEAMS.length]);
  const level=Math.min(2.5,0.65+Run.wins*.17);
  // Existing easy-to-very-hard AI ladder; rating growth remains bounded at +2.
  for(const p of b.players) for(const k of Object.keys(p.stats)) p.stats[k]=Math.min(10,p.stats[k]+Math.min(2,Run.wins*.18));
  newMatch(a,b,{barakah:true,humans:runHumans(),aiCfg:[diffAt(1),diffAt(level)],fmt:{format:'quarters',len:45,sc:20},fun:null});
  if(Run.duo==='online'){M.online=true;Net.mid++;Net.evs=[];Net.syncCounters();}
  M.barakah=true; M.barakahRound=Run.wins+1; M.fmt.periods=1; M.fmt.ot=30; M.timeouts=[1,1]; M.dmOverride=1; M._runCounted=false;
  for(const u of RUN_POWERS) if(u.stat && Run.upgrades[u.id]) {
    const p=M.teams[0].players[u.mate?1:0],base=p.st[u.stat] == null ? (u.stat==='hus'||u.stat==='clu'?st7(p,u.stat):5) : p.st[u.stat]; p.st[u.stat]=Math.min(10,base+(u.amount||1)*Run.upgrades[u.id]);
  }
  Game.lastMatch=null; Game.finalTab=0; Game.paused=false; Game.trivia=null; Game.screen='play';
  FX.callout('BARAKAH RUN · GAME '+(Run.wins+1),GOLD,'ONE 45-SECOND QUARTER · TIES GO TO OVERTIME',true);
}
function recordBarakahGame() {
  if(!M.barakah || M._runCounted) return;
  M._runCounted=true; Run.points+=M.teams[0].score;
  if(M.winner===0) Run.wins++;
  const p=Progress.update(o=>{
    const key=Run.duo?'barakahDuo':'barakah', b=o[key]||(o[key]={best:0,points:0});   // duo runs keep their own best
    Run.newBest=Run.wins>b.best; b.best=Math.max(b.best,Run.wins); b.points=Math.max(b.points||0,Run.points);
    o.runBadges=o.runBadges||{}; if(Run.wins>=3)o.runBadges.steady=true;if(Run.wins>=6)o.runBadges.journey=true;
  });
  if(Run.newBest) { FX.callout('NEW BEST!', '#9dffb0',Run.wins+' CONSECUTIVE WINS',true); SFX.best(); }
  if(Run.wins>=1)Ach.unlock('barakah_1');if(Run.wins>=3){Ach.unlock('barakah_3');unlockFun('bigHead');}if(Run.wins>=6){Ach.unlock('barakah_6');unlockFun('lowGrav');}   // fun modes (were Ramadan Tournament rewards)
  refreshReplayability();
}
function collectRunClips() {
  for(const c of M.highlights||[]) if(!Run.clips.includes(c))Run.clips.push(c);
  Run.clips.sort((a,b)=>b.w-a.w); Run.clips.length=Math.min(6,Run.clips.length);
}
function barakahContinue() {
  recordBarakahGame();collectRunClips();Game.idx=0;
  if(M.winner!==0){Run.active=false;Game.screen='runend';return;}
  const eligible=RUN_POWERS.filter(p=>(Run.upgrades[p.id]||0)<p.max&&(!p.stat||(M.teams[0].players[p.mate?1:0].st[p.stat]||5)<10));
  Run.choices=shuffle(eligible).slice(0,3); Run.turn=Run.duo?(Run.wins-1)%2:0;   // duos: picks alternate, Player 1 first
  if(!Run.choices.length){nextBarakahGame();return;}
  Game.screen='runchoice';
}
function pickRunPower(i) {
  if(Game.screen!=='runchoice'||!Run.active)return;
  const p=Run.choices[i];if(!p||(Run.upgrades[p.id]||0)>=p.max)return;
  Run.upgrades[p.id]=(Run.upgrades[p.id]||0)+1;
  if(Object.keys(Run.upgrades).length>=3)Ach.unlock('barakah_combo');
  if(Run.upgrades.green&&Run.upgrades.greenPoint)Ach.unlock('barakah_focus');
  nextBarakahGame();
}
function weeklyKey(date=new Date()) {
  // Local Monday; calendar arithmetic also works across DST and year boundaries.
  const d=new Date(date.getFullYear(),date.getMonth(),date.getDate());d.setDate(d.getDate()-(d.getDay()+6)%7);
  return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');
}
function startWeekly() {
  startDaily();const mg=M.mini;mg.weekly=true;mg.week=weeklyKey();mg.goal=15;mg.timer=120;
  const R=seededRng(hash32('weekly|'+mg.week));
  mg.spots=Array.from({length:36},(_,i)=>{const r=140+(i%3)*65+R()*70,a=R()*2.2-1.1,h=hoops[1];return{x:h.x-Math.cos(a)*r,z:clamp(h.z+Math.sin(a)*r,70,630)};});
  const p=Progress.load().weekly||{};mg.todayBest=(p[mg.week]||{}).best||0;mg.allBest=p.best||0;mg.setSpot();
}
function finishWeekly(mg) {
  if(mg.done)return;mg.done=true;mg.doneT=0;M.hot=null;SFX.buzzer();
  const before=mg.todayBest,all=mg.allBest;
  const p=Progress.update(o=>{const w=o.weekly||(o.weekly={});const e=w[mg.week]||(w[mg.week]={best:0,done:false});e.best=Math.max(e.best,mg.made);e.done=e.done||mg.made>=mg.goal;w.best=Math.max(w.best||0,mg.made);if(e.done){o.runBadges=o.runBadges||{};o.runBadges.weekly=true;}});
  mg.todayBest=p.weekly[mg.week].best;mg.allBest=p.weekly.best;mg.newToday=mg.made>before;mg.newAll=mg.made>all;
  if(mg.made>=mg.goal)Ach.unlock('weekly_goal');if(mg.newToday)FX.callout('NEW WEEKLY BEST!','#9dffb0',mg.made+' FROM THE SPOT',true);
  refreshReplayability();
}
function clipMetadata(idx) {
  return {teams:M.teamDefs.slice(),score:M.teams.map(t=>t.score),who:M.players[idx]?M.players[idx].def.name:'Team play',scene:Object.assign({},M),venue:VL,
    court:courtCv,crowdCanvas:crowdCv,crowdMembers:crowd,eventFrame:Replay.frame(),ballState:ball.state,shot:ball.shot,time:Game.t,event:FX.event,hype:FX.hypeV};
}
const ShareCard={clips:[],index:0,back:'final',card:null,error:''};
function openClipShare(clips,back='final') {
  if(!clips||!clips.length){toast('No captured highlight yet.');return;}
  ShareCard.clips=clips.slice(0,6);ShareCard.index=0;ShareCard.back=back;ShareCard.error='';Game.screen='shareclip';Game.idx=0;selectShareClip(0);
}
function selectShareClip(delta) {
  ShareCard.index=(ShareCard.index+delta+ShareCard.clips.length)%ShareCard.clips.length;
  try{ShareCard.card=buildShareCard(ShareCard.clips[ShareCard.index]);ShareCard.error='';}catch(e){ShareCard.card=null;ShareCard.error='This clip could not be rendered. Try another highlight.';console.warn('Share card',e);}
}
function buildShareCard(clip) {
  if(!clip||!clip.frames.length)throw Error('No replay frames');
  const meta=clip.share||clipMetadata(clip.idx),cv=makeCanvas(1200,800),g=cv.getContext('2d');
  g.fillStyle='#0b1722';g.fillRect(0,0,1200,800);g.strokeStyle=GOLD;g.lineWidth=3;g.strokeRect(18,18,1164,764);
  g.textAlign='center';g.fillStyle=GOLD;g.font='28px '+FONT;g.fillText('ISLAM DUNK',600,63);
  g.font='20px '+FONT;g.fillStyle=IVORY;g.fillText(meta.teams[0].name+'  '+meta.score[0]+' — '+meta.score[1]+'  '+meta.teams[1].name,600,114,970);
  drawCrest(g,72,96,29,meta.teams[0]);drawCrest(g,1128,96,29,meta.teams[1]);
  const savedM=Object.assign({},M),savedCam=Object.assign({},cam),savedVL=VL,parts=FX.parts,pops=FX.pops,sx=FX.sx,sy=FX.sy,flash=FX.flashA;
  const oldCourt=courtCv,oldCrowdCv=crowdCv,oldCrowd=crowd,oldBallState=ball.state,oldShot=ball.shot,oldTime=Game.t,oldEvent=FX.event,oldHype=FX.hypeV;
  let restore=null;
  try {
    Object.assign(M,meta.scene);VL=meta.venue;FX.parts=[];FX.pops=[];FX.sx=FX.sy=FX.flashA=0;
    courtCv=meta.court||courtCv;crowdCv=meta.crowdCanvas||crowdCv;crowd=meta.crowdMembers||crowd;ball.state=meta.ballState||ball.state;ball.shot=meta.shot||null;Game.t=meta.time||0;FX.event=meta.event||null;FX.hypeV=meta.hype||0;
    const peak=clamp(clip.peak==null?clip.frames.length-55:clip.peak,0,clip.frames.length-1);
    restore=Replay.apply(meta.eventFrame||clip.frames[peak]);
    // A card celebrates the featured play, not the entire spread-out roster.
    // Include the subject, ball and closest rim, with head/board/landing room.
    const p=M.players[clip.idx]||M.players[0],h=hoops[ball.x>COURT.L/2?1:0];
    const left=Math.min(p.x,ball.x,h.x)-100,right=Math.max(p.x,ball.x,h.x)+100;
    const top=Math.min(FLOOR_TOP+p.z*ZS-(p.y+150)*depthK(p.z),FLOOR_TOP+ball.z*ZS-ball.y*depthK(ball.z),FLOOR_TOP+h.z*ZS-(RIM_Y+75)*depthK(h.z))-28;
    const bottom=Math.max(FLOOR_TOP+p.z*ZS,FLOOR_TOP+h.z*ZS)+45;
    cam.x=(left+right)/2-W/2;cam.fy=(top+bottom)/2;cam.zoom=Math.min(1.75,W/((right-left)*K_NEAR),H/(bottom-top));
    const scale=Math.min(1128/W,530/H);g.save();g.beginPath();g.rect(36,146,1128,530);g.clip();g.translate(600-W*scale/2,146+(530-H*scale)/2);g.scale(scale,scale);
    g.translate(W/2,H/2);g.scale(cam.zoom,cam.zoom);g.translate(-W/2,-cam.fy);drawScene(g,meta.scene.time||0);g.restore();
  } finally {if(restore)restore();Object.assign(M,savedM);Object.assign(cam,savedCam);VL=savedVL;FX.parts=parts;FX.pops=pops;FX.sx=sx;FX.sy=sy;FX.flashA=flash;
    courtCv=oldCourt;crowdCv=oldCrowdCv;crowd=oldCrowd;ball.state=oldBallState;ball.shot=oldShot;Game.t=oldTime;FX.event=oldEvent;FX.hypeV=oldHype;}
  g.textAlign='center';g.fillStyle=GOLD;g.font='24px '+FONT;g.fillText((clip.label||'HIGHLIGHT').toUpperCase(),600,713,1080);
  g.fillStyle=IVORY;g.font='20px '+BODY;g.fillText(meta.who+' · Masha’Allah!',600,746,1080);
  const badge=selectedRunBadge();if(badge){g.fillStyle=badge.color;g.font='12px '+FONT;g.fillText(badge.name.toUpperCase()+' · ISLAM DUNK',600,772);}
  return cv;
}
function downloadShareCard() {
  if(!ShareCard.card)return;
  try {
    const a=document.createElement('a');a.download='islam-dunk-'+String(ShareCard.clips[ShareCard.index].label||'highlight').toLowerCase().replace(/[^a-z0-9]+/g,'-').slice(0,48)+'.png';a.href=ShareCard.card.toDataURL('image/png');
    document.body.appendChild(a);a.click();a.remove();toast('PNG ready — check your downloads.');
  } catch(e){ShareCard.error='Download unavailable here. Try opening the HTML in a browser with downloads enabled.';}
}
function selectedRunBadge() { const p=replayabilityProgress;return p&&p.badges[p.badge]?RUN_BADGES.find(b=>b.id===p.badge):null; }
function chooseRunBadge(i) {const b=RUN_BADGES[i];if(!b||b.id!=='none'&&!replayabilityProgress.badges[b.id])return;Progress.update(o=>o.runBadge=b.id);refreshReplayability();SFX.good();}
function replayabilityScreen(g) {
  const screen=Game.screen;Game.rects=[];dim(g,.92);g.textAlign='center';g.fillStyle=GOLD;g.font='30px '+FONT;
  g.fillText(screen==='runchoice'?'CHOOSE YOUR NEXT EDGE':screen==='runend'?'ALHAMDULILLAH · RUN COMPLETE':screen==='shareclip'?'SHARE A HIGHLIGHT':screen==='runbadges'?'YOUR PLAYER-CARD BADGE':'BARAKAH RUN',W/2,65);
  if(screen==='runhome') {
    g.fillStyle=IVORY;g.font='16px '+BODY;g.fillText('One 45-second quarter per game. One loss ends the run. Upgrades last this run only.',W/2,112);
    g.fillStyle='#9fb3c8';g.font='14px '+BODY;g.fillText('No entry cost, no paid rewards, no penalty for taking a break.',W/2,140);
    g.font='12px '+BODY;g.fillText('Pause any time. Runs last for this session; personal bests stay saved.',W/2,160);
    g.fillText('Best: '+replayabilityProgress.run.best+' wins solo · '+((Progress.load().barakahDuo||{}).best||0)+' as a duo · Team: '+TEAMS[Run.team].name,W/2,184);
    uiButton(g,W/2-215,207,80,32,'‹',()=>{Run.team=(Run.team+TEAMS.length-1)%TEAMS.length;},false);
    uiButton(g,W/2+135,207,80,32,'›',()=>{Run.team=(Run.team+1)%TEAMS.length;},false);
    drawCrest(g,W/2,232,28,TEAMS[Run.team]);
    drawMenu(g,RUN_HOME,Game.idx,276,i=>runHomeSelect(i));
  } else if(screen==='runchoice') {
    g.fillStyle=IVORY;g.font='15px '+BODY;g.fillText(Run.wins+' wins · '+Run.points+' points · '+(Run.duo?(Run.turn?(Run.duo==='online'?'Your friend\u2019s pick: waiting for them':'Player 2\u2019s pick'):'Player 1\u2019s pick'):'Pick one')+'. All upgrades have a firm cap.',W/2,110);
    Run.choices.forEach((p,i)=>{const x=W/2-444+i*300;panel(g,x,164,288,230,i===Game.idx);g.textAlign='center';g.fillStyle=GOLD;g.font='18px '+FONT;g.fillText(p.name,x+144,205);g.fillStyle=IVORY;g.font='15px '+BODY;wrapTextLeft(g,p.desc,x+18,247,252,24);g.fillStyle='#9fb3c8';g.font='13px '+BODY;g.fillText('Rank '+((Run.upgrades[p.id]||0)+1)+' / '+p.max,x+144,334);uiButton(g,x+34,348,220,34,'Choose',()=>pickRunPower(i),i===Game.idx);});
    g.textAlign='center';g.fillStyle='#9fb3c8';g.font='13px '+BODY;g.fillText('← → choose · Enter confirm · Esc ends your run',W/2,447);
  } else if(screen==='runend') {
    g.fillStyle=IVORY;g.font='42px '+FONT;g.fillText(Run.wins+' WINS',W/2,148);g.font='18px '+BODY;g.fillText(Run.points+' total points · Best '+replayabilityProgress.run.best+' wins',W/2,186);
    const powers=Object.keys(Run.upgrades).map(id=>RUN_POWERS.find(p=>p.id===id).name+' '+Run.upgrades[id]);
    g.font='14px '+BODY;wrapTextLeft(g,powers.length?powers.join(' · '):'Every journey starts with a first game.',W/2-340,230,680,23);
    drawMenu(g,['Share a highlight ('+Run.clips.length+')','New run',runEndBackLabel()],Game.idx,365,i=>{if(i===0)openClipShare(Run.clips,'runend');else if(i===1)startBarakah();else runEndBack();});
  } else if(screen==='shareclip') {
    if(ShareCard.card)g.drawImage(ShareCard.card,W/2-270,92,540,360);
    g.fillStyle=IVORY;g.font='13px '+BODY;g.fillText(ShareCard.error||('Clip '+(ShareCard.index+1)+' / '+ShareCard.clips.length+' · PNG image · No upload'),W/2,474);
    uiButton(g,W/2-290,490,100,32,'‹ Previous',()=>selectShareClip(-1),false);uiButton(g,W/2-170,490,100,32,'Next ›',()=>selectShareClip(1),false);
    uiButton(g,W/2-45,490,180,32,'Download PNG (S)',downloadShareCard,true);uiButton(g,W/2+160,490,110,32,'Back',()=>Game.screen=ShareCard.back,false);
  } else if(screen==='runbadges') {
    g.fillStyle=IVORY;g.font='14px '+BODY;g.fillText('Cosmetic only. Shown on your player card and exported highlight cards.',W/2,108);
    RUN_BADGES.forEach((b,i)=>{const y=160+i*70,on=b.id==='none'||replayabilityProgress.badges[b.id];uiButton(g,W/2-330,y,240,44,b.name+(replayabilityProgress.badge===b.id?' ✓':''),()=>chooseRunBadge(i),Game.idx===i);g.textAlign='left';g.fillStyle=on?b.color:'#7a8794';g.font='14px '+BODY;g.fillText(on?'Unlocked':b.desc,W/2-65,y+27);});
    uiButton(g,W/2-90,475,180,36,'Back',openBarakah,false);
  }
}
// Registration uses the existing achievement store and toast path.
for(const a of [
  {id:'barakah_1',name:'First Step',desc:'Win a game in Barakah Run'},
  {id:'barakah_3',name:'Steady Heart',desc:'Win 3 games in one Barakah Run'},
  {id:'barakah_6',name:'Long Journey',desc:'Win 6 games in one Barakah Run'},
  {id:'barakah_combo',name:'Better Together',desc:'Combine 3 different run upgrades'},
  {id:'barakah_focus',name:'Pure Focus',desc:'Combine Quiet Focus with Pure Reward'},
  {id:'weekly_goal',name:'Weekly Regular',desc:'Complete the Weekly Hot Spot Challenge'}
]){a.icon='trophy';ACHIEVEMENTS.push(a);ACH_BY_ID[a.id]=a;}
{
  const originalNewMatch=newMatch;
  newMatch=function(a,b,opts={}){M.barakah=false;if(!opts.barakah)Run.active=false;return originalNewMatch(a,b,opts);};
  const originalFinish=finishMatch;
  finishMatch=function(){originalFinish.apply(this,arguments);recordBarakahGame();};
  const originalContinue=finalContinue;
  finalContinue=function(){if(M.barakah)return barakahContinue();return originalContinue();};
  const originalRematch=canRematch;
  canRematch=function(){return !M.barakah&&originalRematch();};
  const originalWindow=shotWindow;
  shotWindow=function(p,...args){return originalWindow(p,...args)*(p.team===0?1+.08*runRank('green'):1);};
  const originalPlayer=updatePlayer;
  updatePlayer=function(p,dt){
    const run=Run.active&&M.barakah&&p.team===0;
    if(run&&p.fire)p.fireT+=dt*.15*runRank('fire');
    originalPlayer(p,dt);if(!run)return;
    if(!p.cmd.turbo)p.turbo=Math.min(100,p.turbo+3*runRank('recharge')*dt);
    if(p.cd.sig>0)p.cd.sig=Math.max(0,p.cd.sig-.15*runRank('sig')*dt);
  };
  const originalInbound=inbound;
  inbound=function(team){originalInbound(team);if(M.barakah&&team===1)M.shotClock=Math.max(12,20-2*runRank('clock'));};
  const originalGive=giveBall;
  giveBall=function(p,how){const change=M.possTeam!==p.team;originalGive(p,how);if(change&&M.barakah&&p.team===1)M.shotClock=Math.max(12,20-2*runRank('clock'));};
  const originalScore=onScore;
  onScore=function(h){
    if(!M.barakah||!Run.active||M.phase==='ft')return originalScore(h);
    const sh=ball.shot,team=h===hoops[1]?0:1;
    if(team===1&&runRank('shield')&&!Run.shieldUsed){Run.shieldUsed=true;ball.state='scored';ball.owner=null;ball.shot=null;M.phase='dead';M.deadT=.9;M.nextInbound=0;FX.callout('ONE MORE CHANCE',GOLD,'SHIELD USED · CPU BASKET CANCELLED',true);return;}
    const bonus=team===0&&sh&&sh.hoop===h&&sh.green&&!sh.dunk?runRank('greenPoint'):0;
    if(bonus){M.teams[0].score+=bonus;const q=M.quarter-1;M.teams[0].qs[q]=(M.teams[0].qs[q]||0)+bonus;if(sh.shooter)sh.shooter.stats.pts+=bonus;}
    const result=originalScore(h);if(bonus)FX.pop(h.x,RIM_Y+80,h.z,'GREEN BONUS +1','#9dffb0');return result;
  };
  const dailyFinish=Daily.prototype.finish;
  Daily.prototype.finish=function(){if(this.weekly)return finishWeekly(this);return dailyFinish.call(this);};
  const dailyHUD=drawDailyHUD,dailyResult=drawDailyResult;
  drawDailyHUD=function(g,mg){if(!mg.weekly)return dailyHUD(g,mg);g.fillStyle='rgba(8,14,22,.9)';g.fillRect(W/2-250,8,500,64);g.textAlign='center';g.fillStyle=GOLD;g.font='18px '+FONT;g.fillText('WEEKLY HOT SPOT · '+mg.made+' / '+mg.goal+' · '+Math.ceil(Math.max(0,mg.timer))+'s',W/2,34);g.fillStyle=IVORY;g.font='12px '+BODY;g.fillText('Week of '+mg.week+' · Best '+mg.todayBest+' · No penalty for skipping',W/2,57);if(mg.ready>0)banner(g,'WEEKLY HOT SPOT','15 makes in 120 seconds · move to each glowing spot');};
  drawDailyResult=function(g,mg){if(!mg.weekly)return dailyResult(g,mg);if(!mg.done||mg.doneT<1)return;dim(g,.85);g.textAlign='center';g.fillStyle=GOLD;g.font='32px '+FONT;g.fillText('WEEKLY HOT SPOT',W/2,175);g.fillStyle=IVORY;g.font='24px '+FONT;g.fillText(mg.made+' makes · '+(mg.made>=mg.goal?'Challenge complete!':'Keep practicing, brother'),W/2,235);g.font='16px '+BODY;g.fillText('This week: '+mg.todayBest+' · Best ever: '+mg.allBest,W/2,280);uiButton(g,W/2-200,330,190,42,'Try again (R)',startWeekly,false);uiButton(g,W/2+10,330,190,42,'Finish',goTitle,true);};
  const originalPlay=playUpdate;
  playUpdate=function(dt){if(M.mini&&M.mini.weekly&&M.mini.done&&M.mini.doneT>1&&Input.pressed.KeyR){startWeekly();return;}return originalPlay(dt);};
  const originalFinal=drawFinalScreen;
  drawFinalScreen=function(g){originalFinal(g);if((M.highlights||[]).length)uiButton(g,642,372,118,28,'Share (S)',()=>openClipShare(M.highlights),false);const b=isMine(playerOfGame().p)&&selectedRunBadge();if(b){g.fillStyle=b.color;g.font='11px '+FONT;g.textAlign='center';g.fillText(b.name.toUpperCase(),210,362);}};
  const originalFinalUpdate=finalUpdate;
  finalUpdate=function(){if(Input.pressed.KeyS&&(M.highlights||[]).length){openClipShare(M.highlights);return;}return originalFinalUpdate();};
  const oldUpdate=gameUpdate;
  gameUpdate=function(dt){
    const before=Game.screen;oldUpdate(dt);if(Game.screen!==before)return;
    const s=Game.screen;
    if(s==='runhome') {menuNav(RUN_HOME.length,runHomeSelect);if(menuHit('left'))Run.team=(Run.team+TEAMS.length-1)%TEAMS.length;if(menuHit('right'))Run.team=(Run.team+1)%TEAMS.length;if(menuHit('back'))goTitle();}
    if(s==='runchoice'&&Run.duo==='online'&&Run.turn===1){runGuestPick();if(menuHit('back')){Run.active=false;Game.screen='runend';Game.idx=0;}}
    else if(s==='runchoice'){if(menuHit('left'))Game.idx=(Game.idx+Run.choices.length-1)%Run.choices.length;if(menuHit('right'))Game.idx=(Game.idx+1)%Run.choices.length;if(menuHit('ok'))pickRunPower(Game.idx);if(menuHit('back')){Run.active=false;Game.screen='runend';Game.idx=0;}}
    if(s==='runend'){menuNav(3,i=>{if(i===0)openClipShare(Run.clips,'runend');else if(i===1)startBarakah();else runEndBack();});if(menuHit('back'))runEndBack();}
    if(s==='shareclip'){if(menuHit('left'))selectShareClip(-1);if(menuHit('right'))selectShareClip(1);if(Input.pressed.KeyS||menuHit('ok'))downloadShareCard();if(menuHit('back'))Game.screen=ShareCard.back;}
    if(s==='runbadges'){menuNav(RUN_BADGES.length,chooseRunBadge);if(menuHit('back'))openBarakah();}
  };
  const oldRender=render;
  render=function(g){oldRender(g);if(['runhome','runchoice','runend','shareclip','runbadges'].includes(Game.screen))replayabilityScreen(g);
    if(Game.screen==='play'&&M.barakah){g.fillStyle='rgba(8,16,28,.85)';g.fillRect(W/2-155,112,310,22);g.textAlign='center';g.fillStyle=GOLD;g.font='11px '+FONT;g.fillText('BARAKAH · GAME '+M.barakahRound+' · '+runUpCount()+' UPGRADES'+(runShieldOn()?' · SHIELD':'')+(Run.duo||Game.brun?' · DUO':''),W/2,127);}
  };
}
refreshReplayability();

// ------------------------------------------------------------- season-ending knockout losses
// Losing in the group stage still lets you re-enter. Losing a semifinal or final (after getting
// out of the group) ends the season: summary first, then the year transition.
{
  const _cam = careerAfterMatch;
  careerAfterMatch = function () {
    _cam.apply(this, arguments);
    const b = C.bracket, p = Game.post;
    if (b && b.fmt === 'pool' && b.out && !b.outGroup && b.round >= 1 && p && p.res === 'out') {
      C.seasonOver = { s: C.season || 1, st: M.careerStage, round: p.roundName, opp: p.opp.name, us: p.us, them: p.them };
      p.lines = p.lines.concat([['saleem', 'That ends our season. We gave everything in the ' + p.roundName.toLowerCase() + '. Next year we come back stronger, in sha Allah.'],
        ['tariq', 'Everything we built carries over: the banners, the upgrades, the chemistry. Season ' + ((C.season || 1) + 1) + ' starts back at the Metro League.']]);
      p.summary = M.careerStage; p.seasonEnd = true; saveCareer();
    }
  };
  const _sc = summaryClose;
  summaryClose = function () { _sc.apply(this, arguments); if (C && C.seasonOver) { Game.screen = 'newseason'; Game.idx = 0; } };
}

// ------------------------------------------------------------- smooth inbounds
// After a basket or a dead ball: the inbounding team's nearest player jogs to the ball under the
// hoop, his teammate gets open, the defense drops back, and a real pass starts the possession.
// No teleport and no camera cut. Falls back to the instant inbound if anything stalls.
function smoothInboundOK() { return !M.halfCourt && !M.practice && !M.mini && !M.attract_noInb && Net.role !== 'guest' && !M.sideOut && !M.frontIn && !soloMatch(); }
function inbStep(dt) {
  let I = M.inb;
  if (!I) {
    const team = M.nextInbound, h = defendHoop(team), side = chance(0.5) ? 1 : -1;
    const S = { x: h.x + h.dir * 42, z: clamp(h.z + side * 70, 40, COURT.D - 40) }, T = M.teams[team].players;
    const p = T.slice().sort((a, b) => Math.hypot(a.x - S.x, a.z - S.z) - Math.hypot(b.x - S.x, b.z - S.z))[0], r = T.find(q => q !== p);
    const R = { x: h.x + h.dir * 175, z: clamp(h.z - side * 60, 60, COURT.D - 60) }, a = attackHoop(team), D = M.teams[1 - team].players;
    const Dspots = [{ x: a.x + a.dir * 330, z: 300 }, { x: a.x + a.dir * 300, z: 440 }];
    I = M.inb = { team, p, r, S, R, Dspots, D, t: 0, stage: 'fetch' };
    if (ball.owner && ball.owner.team !== team) { ball.owner = null; ball.state = 'loose'; }
    Object.assign(ball, { shot: null, pass: null }); ball.grabLock = 9;                 // nobody else picks it up
    if (M.mustClear) M.mustClear = [false, false];
  }
  I.t += dt;
  const { p, r } = I;
  if (I.stage === 'fetch') {
    if (Math.hypot(p.x - I.S.x, p.z - I.S.z) < 18 || I.t > 1.4) { ball.grabLock = 0; M.possTeam = -1; giveBall(p, 'inbound'); ball.grabLock = 0; I.stage = 'hold'; I.th = I.t; }
  } else if (I.stage === 'hold') {
    if (M.deadT <= 0 && I.t - I.th > 0.15 && (Math.hypot(r.x - I.R.x, r.z - I.R.z) < 45 || I.t > 2.2) && p.state === 'free' && ball.owner === p) {
      p.face = sgn(r.x - p.x) || p.face; doPass(p, r, false); I.stage = 'pass'; I.tp = I.t;
    }
  } else if (I.stage === 'pass') {
    if (ball.owner === r || (ball.owner && ball.owner !== p) || I.t - I.tp > 1.2) return inbLive();
  }
  if (I.t > 3.2) { M.inb = null; ball.grabLock = 0; M.possTeam = -1; giveBall(p, 'inbound'); M.phase = 'live'; M.shotClock = scReset(); }   // fallback: no teleport, no cut
}
function inbLive() {
  const I = M.inb; M.inb = null;
  if (!ball.owner && ball.state !== 'pass') { ball.grabLock = 0; M.possTeam = -1; giveBall(I.p, 'inbound'); }
  M.phase = 'live'; M.shotClock = scReset(); ball.grabLock = 0;
}
function inbCmd(p) {
  const I = M.inb, c = p.cmd; zeroCmd(c);
  if (M.phase !== 'dead') return false;
  const tgt = p === I.p ? (I.stage === 'fetch' ? I.S : null) : p === I.r ? I.R : I.Dspots[I.D.indexOf(p)];
  if (tgt) { const dx = tgt.x - p.x, dz = tgt.z - p.z, d = Math.hypot(dx, dz); if (d > 6) { const k = Math.min(1, d / 40); c.mx = dx / d * k; c.mz = dz / d * k; } }
  if (p === I.p && I.stage !== 'fetch') c.face = sgn(I.r.x - p.x);
  return true;
}

// ------------------------------------------------------------- depth readability
// Team rings sit on the floor at each player's true depth (lighter team color, bolder for the
// ball handler and his on-ball defender); a light cool haze over the far third of the court makes
// farther players read a little darker. The player art itself is untouched.
const _ringCol = {};
function ringColor(T) {
  const key = T.c1 + T.c2; if (_ringCol[key]) return _ringCol[key];
  const rgb = h => { const m = /^#?([0-9a-f]{6})$/i.exec(h || ''); if (!m) return [230, 230, 230]; const n = parseInt(m[1], 16); return [n >> 16, (n >> 8) & 255, n & 255]; };
  const lum = c => 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
  let c = [rgb(T.c1), rgb(T.c2)].sort((a, b) => lum(b) - lum(a))[0];
  if (lum(c) < 110) c = c.map(v => Math.round(v + (255 - v) * 0.45));
  return (_ringCol[key] = c.join(','));
}
function drawTeamRing(g, p) {
  if (!M.teamDefs || p.y > 60) return;
  const T = M.teamDefs[p.team]; if (!T) return;
  const bo = ball.owner, onBall = bo && (p === bo || (bo.team !== p.team && p === nearestOpp(bo)));
  const [x, y] = P(p.x, 0, p.z), k = depthK(p.z), lift = 1 - Math.min(1, p.y / 60);
  g.save(); g.globalAlpha = (onBall ? 0.85 : 0.55) * lift;
  g.strokeStyle = 'rgba(' + ringColor(T) + ',1)'; g.lineWidth = (onBall ? 2.6 : 1.8) * k;
  g.beginPath(); g.ellipse(x, y + 1, 22 * k, 7.5 * k, 0, 0, Math.PI * 2); g.stroke();
  g.restore();
}
function drawDepthHaze(g) {
  const fy = P(COURT.L / 2, 0, 0)[1], ny = P(COURT.L / 2, 0, COURT.D)[1];
  const gr = g.createLinearGradient(0, fy - 170, 0, fy + (ny - fy) * 0.45);
  gr.addColorStop(0, 'rgba(14,20,34,0.16)'); gr.addColorStop(1, 'rgba(14,20,34,0)');
  g.fillStyle = gr; g.fillRect(-3000, fy - 170, 7000, (ny - fy) * 0.45 + 170);
}

// ================================================= BARAKAH RUN DUOS
// Two players on one team share one run and one score. Local (same keyboard/pads) or online
// (host + guest). Power-up picks alternate, Player 1 first; online, the guest picks on their turn
// from their own screen. Duo runs keep their own personal best; solo runs are unchanged.
const RUN_HOME = ['Begin run', 'Duo run: two players here', 'Duo run online: host a friend', 'Weekly Hot Spot Challenge', 'Player-card badges', 'Back'];
function runHomeSelect(i) {
  if (i === 0) { Run.duo = null; startBarakah(); }
  else if (i === 1) { Run.duo = 'local'; startBarakah(); }
  else if (i === 2) { if (Net.avail !== 'yes') { Game.screen = 'online'; Game.idx = 0; return; } Run.duo = 'online'; Net.host('brun', { a: Run.team, b: (Run.team + 1) % TEAMS.length }); }
  else if (i === 3) startWeekly();
  else if (i === 4) { Game.screen = 'runbadges'; Game.idx = 0; }
  else goTitle();
}
function runHumans() { return Run.duo ? [{ team: 0, slot: 0, pad: 0 }, { team: 0, slot: 1, pad: 1 }] : [{ team: 0, slot: 0, pad: 0 }]; }
function runUpCount() { return Game.brun ? Game.brun.up : Object.keys(Run.upgrades).length; }
function runShieldOn() { return Game.brun ? !!Game.brun.sh : !!(runRank('shield') && !Run.shieldUsed); }
function runDuoState() {
  const scr = Game.screen === 'runchoice' || Game.screen === 'runend' ? Game.screen : null;
  return { r: M.barakahRound || 1, w: Run.wins, pts: Run.points, up: Object.keys(Run.upgrades).length, sh: runShieldOn() ? 1 : 0, scr,
    ch: scr === 'runchoice' ? Run.choices.map(p => p.id) : null, turn: Run.turn || 0, idx: Game.idx, gi: Net.guestHover || 0 };
}
// host: apply the guest's pick on the guest's turn
function runGuestPick() {
  const g = Net.peers().find(p => p.peer === Net.guestPeer), i = (g && g.presence && g.presence.in) || {};
  if (i.ri != null) { Net.guestHover = i.ri; Game.idx = clamp(i.ri, 0, Run.choices.length - 1); }
  if (i.rp && i.rp[0] > (Net.lastRp || 0)) { Net.lastRp = i.rp[0]; pickRunPower(clamp(i.rp[1], 0, Run.choices.length - 1)); }
}
{
  // newMatch resets Run.active for non-run games; a solo run clears the duo flag
  const _sb = startBarakah;
  startBarakah = function () { if (Run.duo === 'online' && Net.role !== 'host') Run.duo = null; Game.brun = null; return _sb.apply(this, arguments); };
  // guest: read the duo state, show the pick / run-end screens, send our pick on our turn
  const _gf = Net.guestFrame;
  Net.guestFrame = function (rdt) {
    _gf.call(this, rdt);
    const N = this.snaps[this.snaps.length - 1], br = N && N.s.br;
    Game.brun = br || null; if (br) { M.barakah = true; M.barakahRound = br.r; }
    if (br && br.scr === 'runend' && this._duoEnd !== br.w + ':' + br.pts) {     // record the shared run on this device too
      this._duoEnd = br.w + ':' + br.pts;
      Progress.update(o => { const b = o.barakahDuo || (o.barakahDuo = { best: 0, points: 0 }); b.best = Math.max(b.best, br.w); b.points = Math.max(b.points || 0, br.pts); });
    }
  };
  const _gt = Net.guestTick;
  Net.guestTick = function (rdt) {
    const br = Game.brun;
    if (Game.screen === 'netplay' && br && br.scr === 'runchoice' && br.turn === 1) {
      const n = (br.ch || []).length || 1; this.rh = this.rh == null ? 0 : this.rh;
      if (menuHit('left')) { this.rh = (this.rh + n - 1) % n; SFX.blip(); }
      if (menuHit('right')) { this.rh = (this.rh + 1) % n; SFX.blip(); }
      if (menuHit('ok')) { this.rp = (this.rp || 0) + 1; this.rpI = this.rh; SFX.good(); }
    }
    _gt.call(this, rdt);
  };
  const _sp = Net.setP;
  Net.setP = function (p) { if (p && p.in && this.role === 'guest' && p.in.ri == null) { this._lastIn = p.in; } return _sp.call(this, p); };
  // guest overlay
  const _r = render;
  render = function (g) {
    _r(g);
    const br = Game.brun; if (Game.screen !== 'netplay' || !br || !br.scr) return;
    dim(g, 0.9); g.textAlign = 'center'; g.fillStyle = GOLD; g.font = '30px ' + FONT;
    if (br.scr === 'runend') {
      g.fillText('ALHAMDULILLAH · RUN COMPLETE', W / 2, 70); g.fillStyle = IVORY; g.font = '42px ' + FONT; g.fillText(br.w + ' WINS', W / 2, 148);
      g.font = '18px ' + BODY; g.fillText(br.pts + ' total points as a duo · Best duo run ' + ((Progress.load().barakahDuo || {}).best || 0) + ' wins', W / 2, 186);
      g.fillStyle = '#9fb3c8'; g.font = '14px ' + BODY; g.fillText('Waiting for your friend to start a new run or head back.', W / 2, 240); return;
    }
    g.fillText('CHOOSE YOUR NEXT EDGE', W / 2, 70);
    const mine = br.turn === 1, sel = mine ? (Net.rh || 0) : br.idx;
    g.fillStyle = IVORY; g.font = '15px ' + BODY; g.fillText(br.w + ' wins · ' + br.pts + ' points · ' + (mine ? 'Your pick: \u2190 \u2192 then Enter' : 'Your friend is picking'), W / 2, 110);
    (br.ch || []).forEach((id, i) => {
      const p = RUN_POWERS.find(q => q.id === id); if (!p) return; const x = W / 2 - 444 + i * 300;
      panel(g, x, 164, 288, 230, i === sel); g.textAlign = 'center'; g.fillStyle = GOLD; g.font = '18px ' + FONT; g.fillText(p.name, x + 144, 205);
      g.fillStyle = IVORY; g.font = '14px ' + BODY; wrapText(g, p.desc, x + 144, 240, 250, 20);
      if (mine) addRect(x, 164, 288, 230, () => { Net.rh = i; Net.rp = (Net.rp || 0) + 1; Net.rpI = i; });
    });
  };
}

