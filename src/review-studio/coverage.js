// v9.13: every view the game has, and where the Studio shows it. Checked by the studio-coverage test against the game's
// source, so a view added later fails the test until it has a Studio setup or a reason it can't have one.
//   screens:  every Game.screen name in the source -> a Studio setup (screens.js SCREEN_OF) or NOT_RENDERABLE
//   overlays: every overlay, modal, popup and in-match state below -> the Studio setups that show it (code: a pattern
//             that must still be found in the source, so a renamed or removed view shows up here too)
//   states:   every Game.<x> = { ... } and World.<x> = { ... } object in the source is either an overlay below or
//             listed in NOT_VIEWS with what it is
export const OVERLAYS = [
  ['confirm', 'Confirmation dialog (Game.confirm)', /function askConfirm\(/, ['welcome dialog (first launch)', 'match: leave? (confirm)', 'barakah run: abandon? (confirm)'], ['Game.confirm']],
  ['welcome', 'First-launch welcome (tutorial or play now)', /function showWelcome\(/, ['welcome dialog (first launch)']],
  ['toast', 'Toast message', /function toast\(/, ['toast message']],
  ['achtoast', 'Achievement toast', /function achToast\(/, ['achievement toast']],
  ['tutorial', 'Tutorial cards', /const TUT_STEPS = \[/, ['tutorial: a step', 'tutorial: the last card']],
  ['tipoff', 'Tip-off (BISMILLAH call, jump ball)', /'BISMILLAH!'/, ['match: tip-off']],
  ['inbound', 'Inbound after a score', /function inbound\(/, ['match: inbound']],
  ['freethrows', 'Free throws', /M\.ft = \{/, ['match: free throws']],
  ['hotspot', 'Hot spot', /M\.hot = \{/, ['match: hot spot']],
  ['replay', 'Instant replay', /const Replay = \{/, ['match: replay']],
  ['break', 'Period break (END OF Q1)', /M\.phase = 'break'/, ['match: period break']],
  ['timeout', 'Timeout: call a play', /function drawTimeoutPanel\(/, ['match: timeout (call a play)']],
  ['trivia', 'Noor trivia question', /function openTrivia\(/, ['match: noor question'], ['Game.trivia']],
  ['noorpick', 'Noor power-up choice', /function noorOpenPick\(/, ['match: noor choice']],
  ['pause', 'Pause menu', /function pauseItems\(/, ['match: pause']],
  ['halftime', 'Halftime', /Game\.screen = 'halftime'/, ['halftime']],
  ['results', 'Final score', /Game\.screen = 'final'/, ['final']],
  ['netreport', 'Network report', /const NetReport = \{/, ['online: network report']],
  ['hubmenu', 'Hub corner menu', /const HUB_CORNER = /, ['hub: corner menu'], ['Game.hubMenu']],
  ['hubsub', 'Hub submenus (Schedule, My Player, My Masjid)', /function HUB_MENU|HUB_MENU = /, ['hub calendar: schedule menu']],
  ['worldtalk', 'Neighbourhood speech bubble', /World\.talk = \{/, ['world: speech bubble', 'world: long bubble'], ['World.talk']],
  ['worldshop', 'Neighbourhood store list', /World\.shop = \{/, ['world: shop'], ['World.shop']],
  ['worldmenu', 'Neighbourhood menu', /World\.menu = /, ['world: menu'], ['World.menu']],
  ['worldbanner', 'Neighbourhood banner (Jumu’ah today)', /World\.banner/, ['world: jumuah banner']],
  ['worldprompt', 'Enter / Talk prompt', /World\.near = /, ['world: prompt', 'world: closed prompt']],
  ['jumuah', 'Jumu’ah: the door, the room, the reminder, the card', /Game\.screen = 'jumuah'/, ['jumuah: at the door', 'jumuah: the room', 'jumuah: a reminder', 'jumuah: touched on'], ['Game.jum', 'World.jum']],
  ['story', 'Story scene', /function playStory\(/, ['story'], ['Game.story']],
  ['leaguewait', 'Around the league (waiting)', /Game\.lgWait = /, ['career around the league (waiting)'], ['Game.lgWait']],
  ['calendar', 'Month view', /function openCalendar\(/, ['month view: game'], ['Game.calView']],
  ['creator', 'Player creator', /Game\.creator = \{/, ['creator'], ['Game.creator']],
  ['netlobby', 'Online lobby', /function drawLobby\(/, ['lobby']]
];
// Game.<x> / World.<x> objects that hold state for a view listed above or aren't views at all
export const NOT_VIEWS = {
  'Game.sel': 'the team select’s state (select)', 'Game.retPlay': 'where How to play / Settings return to from the pause menu',
  'Game.summary': 'the season summary’s data (csummary)', 'Game.stats': 'the career stats screen’s state (cstats)', 'Game.post': 'the postgame screen’s data',
  'Game.office': 'the office screen’s state', 'Game.noorLRU': 'which Noor power-ups were offered lately (no view)', 'Game.mus': 'the musalla screen’s state',
  'Game.menus': 'which submenu is open on the title (no view of its own)', 'Game.lastMatch': 'the last match’s setup, for a rematch (no view)',
  'Game.cv': 'the clip video’s state (clipvideo)', 'Game.anim': 'a screen transition (no view)', 'Game.scout': 'the scouting report’s data (scout)',
  'World.btns': 'the neighbourhood’s on-screen buttons (part of each world scene)', 'World.next': 'where a door leads (no view)'
};
