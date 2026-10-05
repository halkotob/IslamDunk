// ================================================================ CAREER: GYM
function startMini(kind, opp) {
  Gym.overlay = null;
  setupMini(kind, { opp, humans: [{ team: 0, slot: 0, pad: 0 }] });
  Gym.drill = { kind, mini: true };
  gymToast(kind === 'lightning' ? 'Lightning: shoot from the line. If the player behind you scores first, you\u2019re out.' : 'HORSE: make a shot, then your opponent has 10 seconds to match it from the same spot.', 4.5);
  SFX.blip();
}
function finishMini() {
  const mg = M.mini, r = mg.result(); let bp, line;
  if (mg.kind === 'lightning') { bp = [0, 60, 35, 20, 12, 6][r.place] || 6; line = 'You finished ' + ordinal(r.place) + ' of 5'; }
  else { bp = r.won ? 45 + (5 - r.mine) * 3 : 12 + r.theirs * 2; line = (r.won ? 'You won, ' : 'You lost, ') + 'you had ' + ('HORSE'.slice(0, r.mine) || 'no letters') + (r.won ? '' : ''); }
  const won = mg.kind === 'lightning' ? r.place === 1 : !!r.won;
  bp = drillBP(bp); const hb = practiceHB(won);
  bankPractice(bp, hb);
  Gym.result = { title: mg.kind === 'lightning' ? 'Lightning' : 'HORSE vs ' + M.players[1].def.name, line, bp, pb: 0, hb, best: false, kind: mg.kind };
  Gym.drill = null;
}
const HORSE_OPPS = [['saleem', 'Sh. Saleem'], ['nasser', 'Nasser'], ['khalil', 'Khalil'], ['mahmoud', 'Uncle Mahmoud'], ['rafiq', 'Uncle Rafiq']];
const DRILL_MENU = () => [
  { label: 'Free throws', act: () => { Gym.overlay = null; startDrill('ft'); } },
  { label: 'Three-point challenge', act: () => { Gym.overlay = null; startDrill('three'); } },
  { label: 'Cone dribble', act: () => { Gym.overlay = null; startDrill('cones'); } },
  { label: '1v1 vs Nasser', act: () => { Gym.overlay = null; startDrill('v1'); } },
  { label: 'Lightning', act: () => startMini('lightning') },
  { label: 'HORSE', sub: HORSE_OPPS.map(([id, name]) => ({ label: 'vs ' + name, act: () => startMini('horse', id) })) },
  { label: 'Back', act: () => { Gym.overlay = null; } }
];
function openDrills() { if (Gym.drill || Gym.walk || Gym.fade) return; Gym.overlay = 'drills'; const m = menuState('gymdrills'); m.sub = -1; SFX.blip(); }
function drawDrillsMenu(g) {
  dim(g, 0.55);
  const o = Math.round((W - 960) / 2), rw = W; g.save(); g.translate(o, 0); W = 960; Game.ox = o;
  panel(g, W / 2 - 200, 56, 400, 400, true);
  g.textAlign = 'center'; g.fillStyle = GOLD; g.font = `24px ${FONT}`; g.fillText('Drills', W / 2, 92);
  drawMenuStack(g, 'gymdrills', DRILL_MENU(), 150, 40);
  g.fillStyle = '#9fb3c8'; g.font = `12px ${BODY}`; g.fillText('\u2191 \u2193 choose, Enter to start, Esc to close', W / 2, 440);
  W = rw; Game.ox = 0; g.restore();
}

// ============================================================ SHEIKH'S OFFICE
const OFFICE_SPOT = { x: 800, z: 36 };
function enterOffice() {
  if (Gym.drill || Gym.walk || Gym.fade) return;
  const me = M.players[0];
  if (ball.owner === me) { ball.owner = null; ball.state = 'loose'; ball.vx = ball.vz = ball.vy = 0; ball.y = BALL_R; }
  Gym.walk = { t: 0, to: 'office', spot: OFFICE_SPOT };
}
function openOffice() { Game.screen = 'office'; Game.office = { sel: 0, panel: null, fadeIn: 0.5 }; }
function leaveOffice() { Game.office = null; Game.screen = 'gym'; const me = M.players[0]; place(me, 800, 90); me.face = 1; }
// Short, accurate explanations for each TRIVIA entry (same order).
const TRIVIA_WHY = [
  'The Quran has 114 surahs, from Al-Fatihah to An-Nas.',
  'Al-Fatihah is called Umm al-Kitab because it opens the Quran and gathers its core themes.',
  'Al-Baqarah has 286 ayat, more than any other surah.',
  'Al-Kawthar has only three short ayat, making it the shortest surah.',
  'The Quran itself says it was sent down in the month of Ramadan (Al-Baqarah 2:185).',
  'The first revelation came in the Cave of Hira, on Jabal an-Nur near Makkah.',
  'The first words revealed were the opening of Surah Al-Alaq: \u201CRead in the name of your Lord.\u201D',
  'At-Tawbah is the only surah that does not begin with Bismillah.',
  'An-Naml opens with Bismillah and has it again inside the letter of Sulayman (27:30).',
  'Ayat al-Kursi is verse 255 of Surah Al-Baqarah.',
  'The Prophet \uFDFA said Surah Al-Ikhlas equals a third of the Quran (Sahih al-Bukhari).',
  'The Quran is divided into 30 ajza\u2019, so many people read one juz\u2019 a day in Ramadan.',
  'The Hijrah in 622 CE marks the start of the Hijri calendar.',
  'The Prophet \uFDFA was born in Makkah.',
  'He was born in the Year of the Elephant, when Abraha\u2019s army marched on Makkah.',
  'Badr, in 2 AH, was the first major battle between the Muslims and Quraysh.',
  'The Battle of Badr took place in Ramadan, 2 AH.',
  'At Al-Khandaq in 5 AH, the Muslims dug a trench to defend Madinah.',
  'The Treaty of Hudaybiyyah was agreed in 6 AH and brought a truce with Quraysh.',
  'Maryam is the only woman named in the Quran, and a surah carries her name.',
  'Five daily prayers are obligatory: Fajr, Dhuhr, Asr, Maghrib and Isha.',
  'Surah Al-Isra opens with the Night Journey from Masjid al-Haram to Masjid al-Aqsa.',
  'Hadith encourage reciting Surah Al-Kahf on Friday.',
  'Al-Kahf tells of young believers who sheltered in a cave and slept for many years.',
  'Surah Al-Qadr says Laylatul Qadr is better than a thousand months (97:3).',
  'Masjid Quba, built on arrival near Madinah during the Hijrah, was the first masjid the Prophet \uFDFA built.',
  'The qiblah was changed from Jerusalem to the Ka\u2019bah in 2 AH (Al-Baqarah 2:144).',
  'The revelation came over about 23 years.',
  'The angel Jibril brought the revelation to the Prophet \uFDFA.',
  'Al-Fatihah has seven ayat and is recited in every rak\u2019ah of salah.',
  'An-Nas is the 114th and final surah in the order of the Mushaf.',
  'Musa is named more than any other prophet in the Quran, over 130 times.',
  'Surah Yusuf (12:3) calls its account \u201Cthe best of stories.\u201D',
  'An-Nahl means \u201CThe Bee,\u201D and the surah mentions honey as a healing for people (16:69).',
  'The first revelation came when the Prophet \uFDFA was about 40 years old.',
  'Madinah was called Yathrib before the Hijrah.',
  'Surah Al-Jumu\u2019ah calls believers to hurry to the Friday prayer (62:9).',
  'Surah Al-Fil recalls how Allah protected the Ka\u2019bah from Abraha\u2019s army with elephants.',
  'Ar-Rahman repeats \u201CWhich of the favors of your Lord will you deny?\u201D 31 times.',
  'Al-Baqarah is named after the story of the cow in ayat 67 to 73.',
  'The five pillars are the shahadah, salah, zakah, fasting Ramadan and Hajj (Sahih al-Bukhari and Muslim).',
  'Belief in Allah, His angels, His books, His messengers, the Last Day and qadar, from the hadith of Jibril (Sahih Muslim).',
  'The rites of Hajj take place in the early days of Dhul-Hijjah, the last month of the Hijri year.',
  'Zakah is due on savings above the nisab once they have been held for a full lunar year (the hawl).',
  'Zakah on money and trade goods is one-fortieth, or 2.5%.',
  'The nisab is the threshold; below it, no zakah is due.',
  'Fajr is two rak\'ahs.',
  'Maghrib is the only obligatory prayer with three rak\'ahs.',
  'Dhuhr, Asr and Isha are four rak\'ahs each; a traveler shortens them to two.',
  'Fajr 2, Dhuhr 4, Asr 4, Maghrib 3 and Isha 4 add up to 17.',
  'Maghrib begins when the sun has set.',
  'Duha is a voluntary morning prayer; the five obligatory ones are Fajr, Dhuhr, Asr, Maghrib and Isha.',
  'The adhan announces the prayer time; the iqamah is the second call when the prayer is about to start.',
  'The Prophet \uFDFA chose Bilal, known for his strong, beautiful voice, to call the adhan in Madinah.',
  'Wudu, the ablution, washes the hands, mouth, nose, face, arms, head (wiped) and feet (Al-Ma\'idah 5:6).',
  'When water can\'t be used, the Quran allows tayammum with clean earth (An-Nisa\' 4:43, Al-Ma\'idah 5:6).',
  'The Friday prayer, with its khutbah, is prayed at Dhuhr time in congregation.',
  'Tarawih are the extra night prayers many masjids pray in congregation during Ramadan.',
  'The Prophet \uFDFA said, \u201CEat suhur, for in suhur there is blessing\u201D (Sahih al-Bukhari).',
  'Iftar is at sunset; the Prophet \uFDFA liked to break his fast with dates or water.',
  'Eid al-Fitr is on the 1st of Shawwal, right after Ramadan.',
  'Eid al-Adha is the 10th of Dhul-Hijjah, the day after \'Arafah.',
  'Pilgrims stand at \'Arafah on the 9th of Dhul-Hijjah, the heart of Hajj.',
  'Zakat al-Fitr is paid before the Eid prayer so everyone can celebrate Eid.',
  'The Prophet \uFDFA used to do i\'tikaf in the last ten days of Ramadan (Sahih al-Bukhari).',
  'The Prophet \uFDFA said to seek it in the odd nights of the last ten of Ramadan (Sahih al-Bukhari).',
  'Hijri months follow the moon, so Ramadan lasts 29 or 30 days.',
  'The Hijri year begins with Muharram.',
  'The Quran says the number of months with Allah is twelve (At-Tawbah 9:36).',
  'Ramadan is the ninth month, between Sha\'ban and Shawwal.',
  'Shawwal follows Ramadan, and Eid al-Fitr is its first day.',
  'At-Tawbah 9:36 mentions four sacred months: Dhul-Qa\'dah, Dhul-Hijjah, Muharram and Rajab.',
  '\'Ashura is the 10th of Muharram; the Prophet \uFDFA fasted it and encouraged fasting it.',
  'Abu Bakr led the Muslims after the Prophet \uFDFA passed away in 11 AH.',
  'Under Uthman, standardized copies of the Mushaf were made and sent out to the Muslim cities.',
  'Abu Bakr hid with him in the cave, \u201Cthe second of the two\u201D (At-Tawbah 9:40).',
  'Young Ali stayed behind in his bed, then returned the trusts people had left with the Prophet \uFDFA.',
  'Khadijah bint Khuwaylid was his first wife and the first to believe in his message.',
  'Umar was called al-Faruq, the one who distinguishes truth from falsehood.',
  'The Prophet \uFDFA gave Khalid ibn al-Walid the title Sword of Allah.',
  'Hamzah ibn Abd al-Muttalib, the Lion of Allah, was martyred at Uhud.',
  'Abu Talib took him in at about age eight and protected him for years.',
  'Abd al-Muttalib cared for him after his mother died.',
  'His mother was Aminah bint Wahb; she passed away when he was about six.',
  'Halimah of the Banu Sa\'d nursed him in the desert.',
  'Sumayyah, the mother of Ammar ibn Yasir, was killed in Makkah for refusing to give up her faith.',
  'After the first Pledge of \'Aqabah, Mus\'ab ibn Umayr went to teach the Quran in Yathrib.',
  'Salman al-Farisi suggested the trench, a Persian defense the Arabs had not used before.',
  'Abu Hurayrah narrated more hadith than any other companion.',
  'Fatimah married Ali ibn Abi Talib; their sons were al-Hasan and al-Husayn.',
  'The people of Makkah called him al-Amin. Amanah, trust, comes from the same root as our masjid\'s name.',
  'The Battle of Uhud took place in 3 AH beside Mount Uhud.',
  'Makkah was opened in Ramadan of 8 AH, with a general amnesty.',
  'Hunayn was fought in 8 AH, just after the opening of Makkah.',
  'The expedition to Tabuk was in 9 AH.',
  'The Farewell Hajj was in 10 AH, a few months before he passed away.',
  'About 13 years in Makkah, then about 10 in Madinah.',
  'He lived in Madinah for about ten years, from 1 AH to 11 AH.',
  'He passed away in Madinah in 11 AH at the age of 63.',
  'He is buried in Madinah, in what was \'Aishah\'s room, now within Masjid an-Nabawi.',
  'In about the fifth year of prophethood, a group migrated to Abyssinia (Habashah).',
  'An-Najashi (the Negus) gave the Muslim refugees his protection.',
  'Ja\'far explained Islam and recited from Surah Maryam, and the king refused to hand them over.',
  'In Ta\'if he was rejected and stoned, yet he made du\'a for their descendants to believe.',
  'People of Yathrib pledged at \'Aqabah, which opened the way to the Hijrah.',
  'Al-Ansar means the helpers.',
  'Al-Muhajirun means the emigrants.',
  'He paired emigrants and helpers as brothers, and many Ansar shared their homes and wealth.',
  'The five daily prayers were made obligatory on the night of the Mi\'raj (Sahih al-Bukhari).',
  'Al-Isra\' is the night journey to Jerusalem; al-Mi\'raj is the ascension that followed.',
  'Masjid an-Nabawi, the Prophet\'s Masjid, was built soon after the Hijrah.',
  'Al-Qiblatayn means the two qiblahs.',
  'After Masjid al-Haram and Masjid an-Nabawi, Masjid al-Aqsa in Jerusalem is the third.',
  'The khatib stands on the minbar. A carved minbar is one of our masjid projects.',
  'The mihrab marks the qiblah wall; the imam leads the prayer in front of it.',
  'The minaret lets the adhan carry across the neighborhood.',
  'The well of Zamzam sprang up for Hajar and baby Isma\'il.',
  'Ibrahim and Isma\'il raised its foundations (Al-Baqarah 2:127).',
  'Pilgrims walk between Safa and Marwah seven times in the sa\'y.',
  'Tawaf is circling the Ka\'bah.',
  'One tawaf is seven circuits.',
  'Pilgrims enter ihram before reaching Makkah.',
  'The black kiswah, embroidered in gold, is replaced every year.',
  'Yunus called on Allah from the belly of the fish and was saved (As-Saffat 37:139-148).',
  'Nuh built the Ark by Allah\'s command (Hud 11:37).',
  '\u201CO fire, be coolness and safety upon Ibrahim\u201D (Al-Anbiya\' 21:69).',
  'Ayyub stayed patient and Allah restored him (Sad 38:41-44).',
  'Sulayman heard the ant warn the others and smiled (An-Naml 27:16-19).',
  '\u201CAnd to Dawud We gave the Zabur\u201D (An-Nisa\' 4:163).',
  'The Tawrah was revealed to Musa.',
  'The Injil was given to \'Isa (Al-Ma\'idah 5:46).',
  'Hud was sent to \'Ad (Al-A\'raf 7:65).',
  'Salih was sent to Thamud, and the she-camel was their sign (Al-A\'raf 7:73).',
  'Shu\'ayb told Madyan to give full measure and weight (Al-A\'raf 7:85).',
  'Adam, the first human, was also the first prophet.',
  'Twenty-five prophets are named in the Quran.',
  '\u201CAnd Allah took Ibrahim as a close friend\u201D (An-Nisa\' 4:125).',
  '\u201CAnd Allah spoke to Musa directly\u201D (An-Nisa\' 4:164).',
  'Musa asked for his brother Harun to support him (Ta-Ha 20:29-32). A good teammate.',
  'Yusuf explained the dream, and Egypt prepared for the famine (Yusuf 12:43-49).',
  'Musa\'s staff became a snake before Pharaoh (Ta-Ha 20:19-21).',
  '\u201CAnd We made iron soft for him\u201D (Saba\' 34:10).',
  '\'Isa was born to Maryam without a father (Aal-\'Imran 3:47).',
  'Allah gave Zakariyya the good news of a son named Yahya in his old age (Maryam 19:7).',
  'He is the Messenger of Allah and the seal of the prophets (Al-Ahzab 33:40).',
  '\u201CAnd We have not sent you except as a mercy to the worlds\u201D (Al-Anbiya\' 21:107).',
  '\u201CAnd indeed, you are of a great moral character\u201D (Al-Qalam 68:4).',
  'Al-Baqarah is the second surah.',
  'The Prophet \uFDFA called Al-Baqarah and Aal-\'Imran the two bright ones (Sahih Muslim).',
  'The two surahs of seeking refuge, often recited for protection.',
  'Surah Al-Mulk (67) begins \u201CTabaraka alladhi biyadihil-mulk.\u201D',
  'It is named after the table sent down, asked for by the disciples of \'Isa (5:112-115).',
  'It compares false protectors to a spider\'s house, the weakest of houses (29:41).',
  'It tells of the ant who warned the others as Sulayman\'s army came (27:18).',
  'Al-Hadid means iron, which the surah mentions as having great strength (57:25).',
  'It opens: \u201CNun. By the pen and what they write\u201D (68:1).',
  '\u201CBy time, indeed mankind is in loss\u201D, except those who believe, do good and advise each other to truth and patience (103).',
  'Surah Quraysh (106) reminds them of the trade journeys Allah made safe for them.',
  'Luqman advises his son on tawhid, salah, patience and humility (31:13-19).',
  'Dhul-Qarnayn\'s journeys and the wall he built are in Al-Kahf (18:83-98).',
  '\u201CAllah is the Light of the heavens and the earth\u201D (An-Nur 24:35).',
  'At-Tin (95) begins \u201CBy the fig and the olive.\u201D',
  'Al-\'Adiyat means the charging (horses) that run panting (100:1).',
  'Al-Ma\'un (107) connects faith with caring for the orphan and the poor.',
  'Surah 111 is known as both Al-Masad and Al-Lahab.',
  'Al-Baqarah 2:282, about writing down debts, is the longest ayah.',
  'We say bismillah before we start something, even a game.',
  'Subhanallah declares Allah free of every imperfection.',
  'Alhamdulillah, the first words after the basmalah in Al-Fatihah.',
  'The Quran teaches us to say in sha Allah about the future (Al-Kahf 18:23-24).',
  'Masha\'Allah praises Allah for the good you see (Al-Kahf 18:39).',
  'The Prophet \uFDFA sought Allah\'s forgiveness more than seventy times a day (Sahih al-Bukhari).',
  'The Quran says to return a greeting with a better one or at least the same (An-Nisa\' 4:86).',
  'The Prophet \uFDFA taught this as an excellent way to thank someone (Sunan at-Tirmidhi).',
  'Islam means submitting to Allah, and it shares a root with salam, peace.',
  'Quran comes from qara\'a, to read or recite.',
  'The Sunnah is what he said, did and approved.',
  'Tafsir explains the meanings of the Quran.',
  'Tajwid covers pronunciation, lengthening and pauses.',
  'A hafiz (or hafizah) carries the whole Quran in memory. That\'s where Noor comes from on the court.',
  'Sadaqah can be anything good, even a smile (Sunan at-Tirmidhi).'
];
function shelfOpen() {
  const of = Game.office;
  if (!C.gamesPlayed || C.shelfAt >= C.gamesPlayed) { of.panel = 'shelf'; of.card = { msg: C.gamesPlayed ? 'Come back after your next game.' : 'The bookshelf opens after your first career game.' }; return; }
  const pool = TRIVIA.map((_, i) => i).filter(i => !C.learned.includes(i));
  if (!pool.length) { of.panel = 'shelf'; of.card = { msg: 'You have studied every book on the shelf, masha\u2019Allah.' }; return; }
  const qi = pick(pool);
  C.learned.push(qi); C.shelfAt = C.gamesPlayed; saveCareer(); Ach.set('books_10', C.learned.length);
  of.panel = 'shelf'; of.card = { qi }; SFX.good();
}
// Sheikh Saleem's advice: context first (last result, streak, rival, stage, habits), then general.
// v5.0: pool expanded (~120 lines), plus situational pools and branching talks (SHEIKH_TALKS).
const SHEIKH_LINES = {
  first: ['Welcome to my office. Come see the bookshelf after your first game, and ask me anything.',
    'Sit, sit. My door is open after every game. Bring questions, not only complaints.'],
  win: ['Good win, alhamdulillah. The real test is how you carry it.', 'Remember the brothers who rebounded and set screens. Nobody scores alone.',
    'A win is a blessing to be thankful for, not a reason to feel bigger than anyone.', 'You played with composure today. That’s worth more than the points.',
    'Say alhamdulillah, then go thank whoever set your screens.', 'Winning with good manners is winning twice.'],
  loss: ['A loss isn’t the end of the story. Sabr, then back to the gym.', 'We learn more from losses than wins, if we’re honest with ourselves.',
    'Allah doesn’t burden a soul beyond what it can bear (2:286). You can carry this one.', 'Losses show us what to practice. That’s a gift, even if it doesn’t feel like one.',
    'Did you give your best effort? Then the result is with Allah. The effort is what you control.', 'Shake it off, pray, sleep. Tomorrow we fix the details.'],
  champ: ['A trophy, alhamdulillah. Share the credit and keep the intention you started with.',
    'Champions. Put the trophy on the shelf, and put the humility in your heart.',
    'The Quran says if you are grateful, Allah will give you more (14:7). So let’s be grateful.',
    'Enjoy this. Then remember that the next stage starts at zero, for everyone.'],
  hot: ['Three wins in a row, masha’Allah. Stay humble. Streaks end, character stays.',
    'You’re rolling. Keep praying on time and keep passing the ball. Don’t change what works.',
    'Winning streaks test the heart more than losing ones. Watch your intention.'],
  cold: ['Two hard games. Lean on your brothers. The Quran promises that with hardship comes ease (94:5-6).',
    'When things go badly, go back to the basics: defense, the extra pass, and your salah.',
    'Seek help through patience and prayer (2:45). That works on the court too.'],
  rival: ['Al-Burhan is next. Respect Jalal. Rivals push us to be better, and they’re still our brothers.', 'Against Al-Burhan, don’t play angry. Play smart and let your work speak.',
    'Jalal plays hard and plays fair. So will we.', 'Whatever happens against Al-Burhan, we pray Maghrib together afterward. That’s who we are.',
    'A rival is a mirror. He shows you what you still need to work on.'],
  stage: [['The Metro League is where we build habits. Good habits now carry us far.', 'Small gyms, small crowds, big lessons. Take every game seriously.'],
    ['State is a bigger stage. Same fundamentals, same intention.', 'New gyms, new faces. Be a good guest wherever we play.'],
    ['Nationals. You represent a whole community now, not only yourself.', 'Big arenas, bright lights. The rim is still ten feet high.'],
    ['The World Ummah Cup. Brothers from everywhere. Make friends, not only baskets.', 'Different languages, one qiblah. Remember that when the game gets heated.']],
  // v5.0 habit pools
  salahGood: ['You’ve been answering the adhan. I can see it in how calm you are on the court.', 'Salah on time, game after game. Keep that. It’s worth more than any stat.'],
  noSalah: ['When the adhan comes, the court can wait fifteen minutes. Trust me.', 'Salah keeps us away from shameful and wrong deeds (29:45). It keeps a hothead calm, too.'],
  drills: ['Tariq says you’ve been in the gym a lot. Good. Consistency is a form of worship too, when the intention is right.', 'Your free throws look smoother. That’s the practice paying off.'],
  noDrills: ['The gym misses you. Even a few free throws between games keeps the touch.', 'Games are the exam. Practice is the studying.'],
  undefeated: ['Undefeated, masha’Allah. Guard your heart from pride. It’s the one opponent that beats every champion.', 'Keep winning like you’re still the underdog.'],
  general: [
    'Release at the top of your jump. A calm shooter is a better shooter.',
    'The extra pass is a gift. Give it freely and the open shot comes back to you.',
    'On defense, stay between your man and the rim. Make him take the hard shot.',
    'Box out first, then go get the ball. Position beats height.',
    'When a defender is in your face, move the ball. When you’re open, shoot with confidence.',
    'Free throws are won in practice, not in the game.',
    'Don’t reach for steals all night. Good defense is mostly your feet.',
    'Sprinting is a tool, not a habit. Save your legs for the moments that matter.',
    'Renew your intention before every game. The Prophet ﷺ taught that actions are judged by intentions.',
    'Sabr isn’t only for hard days. It’s also staying steady when things go well.',
    'Allah is with the patient. That’s in Surah Al-Baqarah (2:153).',
    'Humility after a win protects the heart. Thank Allah first, then your teammates.',
    'The believers are like one building, each part holding up the other. That’s a team.',
    'Smile at your brother. The Prophet ﷺ taught that a smile is charity.',
    'Whatever happens on the court, don’t let it make you late for salah.',
    'Be gentle with referees and opponents. Good character is heavy on the scale.',
    'The strong one isn’t the one who overpowers others, but the one who controls himself when angry.',
    'Say bismillah before you start and alhamdulillah when you finish, win or lose.',
    'Talk on defense. A quiet team gets beat by screens.',
    'If you miss, sprint back. The next play is the only one you can change.',
    'Rest, eat well, and sleep. Your body is an amanah, a trust.',
    // v5.0: basketball
    'A crossover works best when the defender is leaning. Read his hips, not his hands.',
    'Pump fake once. If he flies by, take one dribble and shoot. Twice is showing off.',
    'Close out with short, choppy steps. Run at a shooter and he’ll drive right past you.',
    'The best shot is the one your teammate is open for.',
    'When you’re tired, your shot gets short. Legs first, then arms.',
    'A shove might feel good for a second. The foul costs the team for the rest of the game.',
    'Take the charge. Standing still in the right spot is a skill.',
    'Watch the game when you’re not in the play. The next pass is already telling you where it’s going.',
    'A dunk counts two, the same as a layup. Pick the one that goes in.',
    'Good teams make the easy play over and over. Great teams do it when they’re tired.',
    'Protect the ball like it’s an amanah. Because right now, it is.',
    'Late in close games, slow down. Rushing is how good teams lose.',
    'Find your rhythm in the first minutes with an easy shot. Confidence is built, not found.',
    'Don’t watch your shot. Follow it. Rebounds come to the brother who expects a miss.',
    'Stamina is built in the off days. The last minute belongs to whoever trained for it.',
    'Know your teammate’s favorite spot and get him the ball there.',
    'A good screen is an act of service. You get hit so your brother can get free.',
    'When the defense collapses on you, the open man is behind them. Look for him.',
    'Hot hand? Keep shooting good shots, not just any shots.',
    'The shot clock is a friend. Use it, don’t panic because of it.',
    'Defense starts with your eyes. See your man and the ball at the same time.',
    'After a timeout, the first possession matters. Make it a clean one.',
    'Talk to your teammate after a mistake. One word: “next.”',
    'Fundamentals don’t go out of style. Neither does footwork.',
    // v5.0: short reminders
    'The Prophet ﷺ said none of you truly believes until he loves for his brother what he loves for himself.',
    'The deeds most beloved to Allah are the consistent ones, even if they are small. Like ten free throws every day.',
    'Tie your camel, then trust in Allah. Practice hard, then make du’a.',
    'Whoever doesn’t thank people hasn’t thanked Allah. Thank the uncles who stack the chairs.',
    'Allah doesn’t change the condition of a people until they change what is in themselves (13:11).',
    'A person gets nothing but what he strives for (53:39). So strive.',
    'Hold firmly to the rope of Allah together, and don’t split apart (3:103). A team is the same.',
    'Help one another in goodness and taqwa (5:2). Rebounding counts.',
    'Allah loves those who put their trust in Him (3:159). Do your part, then let go of the worry.',
    'The Prophet ﷺ taught that whoever humbles himself for Allah, Allah raises him.',
    'The best of you are those with the best character. Not the best jump shot.',
    'The strong believer is better and more beloved to Allah than the weak one, and there is good in both. Train your body and your heart.',
    'Someone asked the Prophet ﷺ for advice and he said: don’t get angry. He repeated it. So should we.',
    'The first thing we’ll be asked about on the Day of Judgment is our salah. Guard it.',
    'The believers are brothers (49:10). That includes the other team.',
    'Don’t walk the earth with arrogance (17:37). Or the court.',
    'Those who show mercy are shown mercy by the Most Merciful. Help the other team up when they fall.',
    'Make things easy for people, not hard. That goes for teammates too.',
    'A good word is charity. Say one to someone who had a bad game.',
    'Speak good or stay quiet. That rule would fix half the arguments in pickup basketball.',
    'Intention turns ordinary things into worship. Even practice, if you do it to be strong for good things.',
    'Du’a is the weapon of the believer. Make it before games, and for your opponents too.',
    'Gratitude in good times, patience in hard times. The believer wins either way.',
    'Knowledge is light. Keep visiting the bookshelf.',
    'The masjid isn’t the building. It’s the people who fill it five times a day.',
    'Honor your parents. Call them after the game, win or lose.',
    'Keep your promises, even small ones. Showing up to practice on time is a promise.',
    'Envy eats good deeds. If a brother plays well, make du’a for him.',
    'Reflect on the Quran, even one ayah a day. Small and steady.',
    'Take care of your health before sickness and your free time before you get busy. The Prophet ﷺ taught us to value both.',
    'If you slip, turn back to Allah. He loves those who return to Him.',
    'Visit the sick, feed the hungry, greet everyone with salam. Those are the real highlights.'
  ]
};
function sheikhLine() {
  const pools = [];
  if (!C.gamesPlayed) pools.push(SHEIKH_LINES.first);
  if (C.lastResult === 'champ') pools.push(SHEIKH_LINES.champ);
  else if (C.lastResult === 'win') pools.push(SHEIKH_LINES.win);
  else if (C.lastResult === 'loss') pools.push(SHEIKH_LINES.loss);
  if (C.streak >= 5) pools.push(SHEIKH_LINES.undefeated);
  else if (C.streak >= 3) pools.push(SHEIKH_LINES.hot);
  if (C.streak <= -2) pools.push(SHEIKH_LINES.cold);
  if ((C.salahGames || 0) >= 3) pools.push(SHEIKH_LINES.salahGood);
  else if ((C.noSalahGames || 0) >= 3 || (C.adhanSkips || 0) >= 2) pools.push(SHEIKH_LINES.noSalah);
  if ((C.noDrillGames || 0) >= 2) pools.push(SHEIKH_LINES.noDrills); else if ((C.drillsSince || 0) >= 4) pools.push(SHEIKH_LINES.drills);
  const nx = C.bracket && !C.bracket.out && !C.bracket.champ ? ourMatch() : null;
  if (nx && (nx.a === 1 || nx.b === 1)) pools.push(SHEIKH_LINES.rival);
  pools.push(SHEIKH_LINES.stage[C.stage] || []);
  const recent = Game.sheikhRecent || (Game.sheikhRecent = []);                // no repeats among the last few lines
  const ctx = pools.flat().filter(l => !recent.includes(l));
  const gen = SHEIKH_LINES.general.filter(l => !recent.includes(l));
  const all = chance(0.5) && ctx.length ? ctx : gen.concat(ctx);
  const line = pick(all.length ? all : SHEIKH_LINES.general);
  recent.push(line); if (recent.length > 12) recent.shift();
  Game.lastSheikh = line; return line;
}
// Branching talks: when a situation is active (and hasn't been talked through for this
// episode), talking to the sheikh opens a short conversation with two replies.
const SHEIKH_TALKS = [
  { key: 'noSalah', when: () => (C.adhanSkips || 0) >= 2 || (C.noSalahGames || 0) >= 3, ep: () => 'e' + (C.salahEp || 0),
    open: () => ['Sit with me a minute. I noticed the adhan came during practice and you kept on shooting.', 'I’m not here to scold you. I want to ask: how is your salah going lately?'],
    choices: [
      ['Honestly? I get caught up in the drills.', ['That’s honest, and honesty is where change starts. The drills will still be there in fifteen minutes.', 'Salah is the first thing we’ll be asked about. Next adhan, put the ball down first and think second. Walk in with me.']],
      ['I’ll just pray later, after practice.', ['Praying on time is best, and “later” has a way of becoming a habit.', 'Try it once: answer the adhan right away. You’ll come back calmer, your legs will feel it in the next game, and your heart will feel it longer.']]] },
  { key: 'losing', when: () => (C.streak || 0) <= -2, ep: () => 'g' + ((C.gamesPlayed || 0) + (C.streak || 0)),
    open: () => [-C.streak + ' losses in a row. Close the door, sit down. How are you feeling about it?'],
    choices: [
      ['Frustrated. We practice hard and still lose.', ['That frustration means you care. Good. Don’t let it turn into blame.', 'With hardship comes ease (94:5-6). Allah said it twice in a row, so we don’t forget it. Let’s look at the details: free throws, box-outs, turnovers.']],
      ['Maybe I’m just not good enough.', ['Stop there. You’re a brother who shows up, works and plays with adab. That’s already a lot.', 'Skill grows with patience. Ask Tariq for your numbers, pick one thing, and fix only that this week. Small and consistent.']]] },
  { key: 'undefeated', when: () => (C.streak || 0) >= 4, ep: () => 'g' + ((C.gamesPlayed || 0) - (C.streak || 0)),
    open: () => [C.streak + ' straight wins, masha’Allah. Uncle Siddiq has run out of chalk.', 'So tell me. How’s your heart handling all this winning?'],
    choices: [
      ['Honestly, it feels great. I think we’re unstoppable.', ['Enjoy it, and be careful with that word. Only Allah is unstoppable.', 'Pride is the one opponent that beats every champion. Keep thanking Allah, keep passing the ball, and keep stacking chairs after games.']],
      ['I’m worried the streak will end.', ['It will end one day. Every streak does. That’s not a reason to fear, it’s a reason to enjoy each game.', 'Focus on the next possession, not the streak. Tie your camel, then trust Allah.']]] },
  { key: 'noDrills', when: () => (C.noDrillGames || 0) >= 2, ep: () => 'g' + ((C.gamesPlayed || 0) - (C.noDrillGames || 0)),
    open: () => ['Tariq tells me you haven’t been in the gym between games. His stat sheet has a very empty column.', 'Is everything alright?'],
    choices: [
      ['I figured the games were enough practice.', ['Games show you what you need. Practice is where you fix it.', 'The deeds most beloved to Allah are the consistent ones, even if small. Ten free throws a day. That’s all I ask. And the drills pay Barakah Points.']],
      ['Life has been busy, to be honest.', ['That’s understandable. Take care of your family and your duties first.', 'When you have fifteen minutes, come shoot. Consistency beats cramming, on the court and with the Quran.']]] }
];
function sheikhSituation() {
  if (!C || !C.gamesPlayed) return null;
  const seen = C.sheikhSeen || (C.sheikhSeen = {});
  return SHEIKH_TALKS.find(t => t.when() && seen[t.key] !== t.ep()) || null;
}
function startSheikhTalk(t) {
  C.sheikhSeen[t.key] = t.ep(); saveCareer();
  Game.office.panel = 'convo'; Game.office.convo = { key: t.key, lines: t.open(), li: 0, mode: 'lines', choices: t.choices, sel: 0 };
}
function convoAdvance() {
  const cv = Game.office.convo;
  if (cv.li < cv.lines.length - 1) { cv.li++; SFX.blip(); return; }
  if (cv.mode === 'lines') { cv.mode = 'choose'; SFX.blip(); return; }
  if (cv.mode === 'reply') { Game.office.panel = 'talk'; Game.office.line = sheikhLine(); }
}
function convoChoose(i) { const cv = Game.office.convo; cv.mode = 'reply'; cv.lines = cv.choices[i][1]; cv.li = 0; cv.sel = i; SFX.blip(); }
function officeUpdate(rdt) {
  const of = Game.office; if (of.fadeIn > 0) of.fadeIn -= rdt;
  if (of.panel === 'convo') {
    const cv = of.convo;
    if (cv.mode === 'choose') {
      if (menuHit('up') || menuHit('down')) { cv.sel ^= 1; SFX.blip(); }
      if (menuHit('ok')) convoChoose(cv.sel); else if (menuHit('back')) of.panel = null;
    } else if (menuHit('ok')) convoAdvance(); else if (menuHit('back')) of.panel = null;
    return;
  }
  if (of.panel) {
    if (of.panel === 'talk' && menuHit('ok')) { of.line = sheikhLine(); SFX.blip(); }
    else if (menuHit('ok') || menuHit('back')) of.panel = null;
    return;
  }
  if (menuHit('left') || menuHit('right')) { of.sel ^= 1; SFX.blip(); }
  if (menuHit('ok')) officeAct(of.sel);
  else if (menuHit('back')) leaveOffice();
}
function officeAct(i) { const of = Game.office; of.sel = i; if (i === 0) shelfOpen(); else { const t = sheikhSituation(); if (t) startSheikhTalk(t); else { of.panel = 'talk'; of.line = sheikhLine(); } } SFX.blip(); }
function drawOffice(g) {
  const of = Game.office;
  // room: warm walls, wood floor, rug, window, framed plaque
  g.fillStyle = '#e9dcc0'; g.fillRect(0, 0, W, H);
  g.fillStyle = '#d8c7a4'; g.fillRect(0, 300, W, 8);
  const fl = g.createLinearGradient(0, 308, 0, H); fl.addColorStop(0, '#8a6038'); fl.addColorStop(1, '#6b4526');
  g.fillStyle = fl; g.fillRect(0, 308, W, H - 308);
  g.strokeStyle = 'rgba(40,20,5,0.25)'; g.lineWidth = 1; for (let y = 320; y < H; y += 18) { g.beginPath(); g.moveTo(0, y); g.lineTo(W, y); g.stroke(); }
  const wx = W - 250; g.fillStyle = '#9ec9e6'; g.fillRect(wx, 70, 150, 110); g.fillStyle = '#cfe6f3'; g.fillRect(wx, 70, 150, 40);
  g.strokeStyle = '#f7f1e3'; g.lineWidth = 8; g.strokeRect(wx, 70, 150, 110); g.lineWidth = 4; g.beginPath(); g.moveTo(wx + 75, 70); g.lineTo(wx + 75, 180); g.moveTo(wx, 125); g.lineTo(wx + 150, 125); g.stroke();
  g.fillStyle = '#1e5a4a'; g.fillRect(W / 2 - 60, 60, 120, 56); g.strokeStyle = '#c9a24a'; g.lineWidth = 3; g.strokeRect(W / 2 - 60, 60, 120, 56);
  g.fillStyle = '#f2cf6b'; g.font = `20px ${AR_FONT}`; g.textAlign = 'center'; g.fillText('\u0628\u0650\u0633\u0652\u0645\u0650 \u0671\u0644\u0644\u0651\u064e\u0647\u0650', W / 2, 96);
  g.fillStyle = '#7a1f2b'; g.beginPath(); g.moveTo(W / 2 - 250, 470); g.lineTo(W / 2 + 250, 470); g.lineTo(W / 2 + 190, 380); g.lineTo(W / 2 - 190, 380); g.closePath(); g.fill();
  g.strokeStyle = '#f2cf6b'; g.lineWidth = 2; g.beginPath(); g.moveTo(W / 2 - 230, 462); g.lineTo(W / 2 + 230, 462); g.lineTo(W / 2 + 178, 388); g.lineTo(W / 2 - 178, 388); g.closePath(); g.stroke();
  g.fillStyle = 'rgba(242,207,107,0.4)'; star8(g, W / 2, 425, 22, 1, 0.45); g.fill();
  // bookshelf
  const bx = 60, by = 110, on0 = of.sel === 0 && !of.panel;
  g.fillStyle = '#5e3c1f'; g.fillRect(bx, by, 200, 250); g.fillStyle = '#4a2e16'; g.fillRect(bx + 8, by + 8, 184, 234);
  const cols = ['#7a1f2b', '#1e5a4a', '#2b3a55', '#c9a24a', '#5a2d6b', '#8a5a2b', '#2e7d5b', '#9c3b2b'];
  for (let s = 0; s < 4; s++) {
    const sy = by + 14 + s * 58; g.fillStyle = '#6b4526'; g.fillRect(bx + 8, sy + 46, 184, 6);
    let x = bx + 14; const R = seededRng(5 + s);
    while (x < bx + 182) { const w = 10 + R() * 8, h = 30 + R() * 14; g.fillStyle = cols[Math.floor(R() * cols.length)]; g.fillRect(x, sy + 46 - h, w, h); g.fillStyle = 'rgba(242,207,107,0.6)'; g.fillRect(x + 2, sy + 46 - h + 6, w - 4, 2); x += w + 2; if (R() < 0.12) x += 10; }
  }
  if (on0) { g.strokeStyle = GOLD; g.lineWidth = 3; g.strokeRect(bx - 4, by - 4, 208, 258); }
  // desk with Sh. Saleem sitting behind it
  const T = amanahTeam(), dx = W / 2 + 40;
  g.fillStyle = '#4a2e16'; roundRect(g, dx - 42, 196, 84, 110, 10); g.fill();            // chair back
  g.fillStyle = '#5e3c1f'; roundRect(g, dx - 34, 204, 68, 94, 8); g.fill();
  drawPortrait(g, dx, 394, castDef('saleem'), T, 2.0, 'thobe', 'idle');                 // seated: lower body hidden by the desk
  g.fillStyle = '#6b4526'; g.fillRect(dx - 150, 300, 300, 100); g.fillStyle = '#7d5230'; g.fillRect(dx - 160, 290, 320, 14);
  g.fillStyle = '#5e3c1f'; g.fillRect(dx - 140, 312, 120, 56); g.fillRect(dx + 20, 312, 120, 56);
  g.fillStyle = '#c9a24a'; g.beginPath(); g.arc(dx - 80, 340, 3, 0, Math.PI * 2); g.arc(dx + 80, 340, 3, 0, Math.PI * 2); g.fill();
  g.fillStyle = '#fbf8f2'; g.save(); g.translate(dx - 100, 284); g.rotate(-0.08); g.fillRect(0, 0, 44, 8); g.restore(); g.fillStyle = '#f0ead8'; g.fillRect(dx - 40, 282, 40, 8);
  g.fillStyle = '#1e5a4a'; g.fillRect(dx + 30, 278, 36, 12); g.fillStyle = '#7a1f2b'; g.fillRect(dx + 34, 270, 30, 8);
  g.fillStyle = '#c9a24a'; g.fillRect(dx + 110, 250, 4, 40); g.beginPath(); g.moveTo(dx + 96, 252); g.lineTo(dx + 128, 252); g.lineTo(dx + 120, 236); g.lineTo(dx + 104, 236); g.fill();
  const on1 = of.sel === 1 && !of.panel;
  if (on1) { g.strokeStyle = GOLD; g.lineWidth = 3; g.beginPath(); g.ellipse(dx, 386, 70, 14, 0, 0, Math.PI * 2); g.stroke(); }
  // labels (tap targets)
  [[160, 380, 'Bookshelf', 0], [dx, 400, 'Sh. Saleem', 1]].forEach(([x, y, label, i]) => {
    const on = of.sel === i && !of.panel;
    g.fillStyle = on ? 'rgba(232,195,90,0.95)' : 'rgba(8,16,24,0.8)'; roundRect(g, x - 70, y, 140, 26, 13); g.fill();
    g.fillStyle = on ? NIGHT : '#fff'; g.font = `13px ${FONT}`; g.textAlign = 'center'; g.fillText(label, x, y + 18);
    if (!of.panel) addRect(x - 110, i === 0 ? 100 : 180, 220, i === 0 ? 330 : 250, () => officeAct(i));
  });
  g.fillStyle = 'rgba(8,16,24,0.8)'; roundRect(g, 96, 8, 360, 32, 16); g.fill();
  g.fillStyle = '#fff'; g.font = `14px ${FONT}`; g.textAlign = 'left'; g.fillText('Sheikh\u2019s office', 112, 29);
  g.fillStyle = '#9fb3c8'; g.font = `12px ${BODY}`; g.fillText('\u2190 \u2192 choose, Enter to select', 250, 29);
  if (of.panel === 'shelf') {
    panel(g, 60, 150, W - 120, 240, true);
    g.textAlign = 'left';
    if (of.card.msg) { g.fillStyle = '#fff'; g.font = `18px ${BODY}`; g.fillText(of.card.msg, 90, 200); }
    else {
      const [q, a] = TRIVIA[of.card.qi];
      drawBook(g, 90, 180); g.fillStyle = GOLD; g.font = `13px ${FONT}`; g.fillText('FROM THE BOOKSHELF', 124, 192);
      g.fillStyle = '#fff'; g.font = `17px ${BODY}`; wrapTextLeft(g, q, 90, 228, W - 190, 22);
      g.fillStyle = '#9dffb0'; g.font = `18px ${FONT}`; g.fillText(a[0], 90, 280);
      g.fillStyle = IVORY; g.font = `14px ${BODY}`; wrapTextLeft(g, TRIVIA_WHY[of.card.qi] || '', 90, 312, W - 190, 20);
      g.fillStyle = '#9fb3c8'; g.font = `12px ${BODY}`; g.fillText('Learned. It will be marked with a book if it comes up in a game.', 90, 366);
    }
    addRect(0, 0, W, H, () => { of.panel = null; });
  } else if (of.panel === 'talk') {
    panel(g, 40, 410, W - 80, 118, true);
    g.textAlign = 'left'; g.fillStyle = GOLD; g.font = `15px ${FONT}`; g.fillText('Sh. Saleem', 62, 436);
    g.fillStyle = '#fff'; g.font = `16px ${BODY}`; wrapTextLeft(g, of.line, 62, 464, W - 140, 22);
    g.fillStyle = '#9fb3c8'; g.font = `12px ${BODY}`; g.textAlign = 'right'; g.fillText('Enter: ask something else   Esc: close', W - 60, 516);
    addRect(0, 60, W, H - 60, () => { of.line = sheikhLine(); SFX.blip(); });
  } else if (of.panel === 'convo') drawConvo(g, of.convo);
  if (!of.panel && sheikhSituation()) {          // something to talk about: a small gold marker over the sheikh
    const mx = W / 2 + 40, my = 176 + Math.sin(Game.t * 3) * 3;
    g.fillStyle = GOLD; g.beginPath(); g.arc(mx, my, 11, 0, Math.PI * 2); g.fill();
    g.fillStyle = NIGHT; g.font = `15px ${FONT}`; g.textAlign = 'center'; g.fillText('…', mx, my + 3);
  }
  if (of.fadeIn > 0) { g.fillStyle = `rgba(4,10,14,${of.fadeIn / 0.5})`; g.fillRect(0, 0, W, H); }
}
function drawBook(g, x, y) {
  g.fillStyle = '#1e5a4a'; g.beginPath(); g.moveTo(x, y); g.lineTo(x + 12, y + 4); g.lineTo(x + 24, y); g.lineTo(x + 24, y + 18); g.lineTo(x + 12, y + 22); g.lineTo(x, y + 18); g.closePath(); g.fill();
  g.strokeStyle = '#f2cf6b'; g.lineWidth = 1.5; g.beginPath(); g.moveTo(x + 12, y + 4); g.lineTo(x + 12, y + 22); g.stroke();
}

