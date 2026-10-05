// ------------------------------------------------------------------ TEAMS
function PL(name, num, sheikh, huffath, skin, hat, hair, spd, sht, dnk, def, stl) {
  const stats = { spd, sht, dnk, def, stl };
  stats.hus = hustleOf(stats); stats.clu = clutchOf(stats, { sheikh });
  return { name, num, sheikh, huffath, mufti: MUFTIS.has(name), skin, hat, hair, stats, arch: archetypeOf(stats) };
}
const MUFTIS = new Set(['Sh. Rashid', 'Sh. Jamal', 'Sh. Adnan', 'Sh. Mansour']);   // title shown on team cards
const TEAMS = [
  { name: 'Masjid Al-Noor', short: 'NOOR', c1: '#1e7a4c', c2: '#f0c75e', crest: 'dome', players: [
    PL('Sh. Kareem', 1, true, true, '#c68a5a', 'kufi', '#2b1d14', 6, 8, 5, 8, 6),
    PL('Tariq', 23, false, false, '#8d5a3b', 'hair', '#161616', 8, 6, 9, 5, 7)] },
  { name: 'Masjid At-Taqwa', short: 'TAQWA', c1: '#1f3b73', c2: '#f4f4f4', crest: 'crescent', players: [
    PL('Sh. Rashid', 7, true, false, '#e0b48a', 'imama', '#6b6b6b', 5, 7, 6, 9, 7),
    PL('Samir', 11, false, true, '#b07850', 'hair', '#2a1a10', 8, 8, 6, 5, 6)] },
  { name: 'Masjid Ar-Rahmah', short: 'RAHMAH', c1: '#0f7c80', c2: '#f3e6c4', crest: 'star', players: [
    PL('Sh. Nabil', 4, true, true, '#a86b45', 'kufi', '#1c1c1c', 6, 9, 4, 7, 7),
    PL('Faisal', 33, false, false, '#d9a57a', 'hair', '#3b2412', 7, 5, 9, 7, 5)] },
  { name: 'Masjid As-Salam', short: 'SALAM', c1: '#7a1f2b', c2: '#e8c35a', crest: 'arch', players: [
    PL('Sh. Jamal', 9, true, false, '#6f4630', 'imama', '#111111', 6, 6, 8, 8, 6),
    PL('Hakeem', 2, false, true, '#caa07a', 'kufi', '#222222', 9, 7, 6, 5, 8)] },
  { name: 'Masjid Al-Huda', short: 'HUDA', c1: '#5b2a86', c2: '#cfd6de', crest: 'minaret', players: [
    PL('Sh. Mansour', 10, true, true, '#e6bf96', 'kufi', '#8a8a8a', 5, 8, 5, 8, 7),
    PL('Omar', 14, false, false, '#9a6440', 'hair', '#101010', 8, 6, 8, 6, 7)] },
  { name: 'Masjid Al-Falah', short: 'FALAH', c1: '#d8661c', c2: '#1d1d1d', crest: 'dome', players: [
    PL('Sh. Waleed', 5, true, false, '#b98059', 'imama', '#2c2016', 7, 7, 7, 7, 6),
    PL('Amir', 21, false, true, '#7b4a2e', 'hair', '#0e0e0e', 8, 7, 7, 6, 6)] },
  { name: 'Masjid Al-Ihsan', short: 'IHSAN', c1: '#3a8fd6', c2: '#0f2a4a', crest: 'star', players: [
    PL('Sh. Hassan', 3, true, true, '#d4a174', 'kufi', '#3a2a1a', 6, 7, 6, 7, 8),
    PL('Bassam', 32, false, false, '#a8704a', 'hair', '#1d140c', 7, 6, 9, 7, 5)] },
  { name: 'Masjid Al-Furqan', short: 'FURQAN', c1: '#2a2a2a', c2: '#d64545', crest: 'crescent', players: [
    PL('Sh. Adnan', 8, true, false, '#8a5638', 'imama', '#222222', 5, 6, 8, 9, 7),
    PL('Rami', 12, false, true, '#e2b894', 'hair', '#4a2c16', 9, 8, 5, 5, 7)] }
];

