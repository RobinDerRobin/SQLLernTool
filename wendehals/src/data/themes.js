// Gebiete: Farben für Hintergrund und Karte, Gegner-Pool und Musik.

export const THEMES = {
  fruehstueck: {
    name: 'Frühstückstisch',
    bg: ['#f4e3c1', '#e9cfa0'],
    terrain: { solid: '#c98a4b', edge: '#7a4a1e', light: '#e8b97a', brk: '#f0d48a', brkEdge: '#a8823a', metal: '#9aa3ad', slow: 'rgba(200,60,90,0.45)' },
    pattern: 'tischdecke',
    accent: '#d0453a',
    pool: ['toast', 'brezel', 'ei', 'bohne'],
    music: 'fruehstueck',
  },
  bad: {
    name: 'Badewannen-Ozean',
    bg: ['#bfe8f4', '#8fd0e8'],
    terrain: { solid: '#f2f6f8', edge: '#6a8aa0', light: '#ffffff', brk: '#d8f4ff', brkEdge: '#7ab0c8', metal: '#a0b4c4', slow: 'rgba(60,150,230,0.45)' },
    pattern: 'fliesen',
    accent: '#ffe14d',
    pool: ['ente', 'seife', 'nilpferd', 'socke'],
    music: 'bad',
  },
  keller: {
    name: 'Omas Keller',
    bg: ['#3b3346', '#2a2433'],
    terrain: { solid: '#6a4a36', edge: '#2e1e14', light: '#8a6a4e', brk: '#a8d088', brkEdge: '#4f7a2a', metal: '#7d8794', slow: 'rgba(230,230,240,0.35)' },
    pattern: 'ziegel',
    accent: '#9fd36a',
    pool: ['zwerg', 'socke', 'gebiss', 'glas'],
    music: 'keller',
  },
  disco: {
    name: 'Disco-Vulkan',
    bg: ['#2c1238', '#1a0b24'],
    terrain: { solid: '#5e3f80', edge: '#ff4fb0', light: '#8a6ab0', brk: '#ff9ad8', brkEdge: '#a03070', metal: '#7d8794', slow: 'rgba(255,120,40,0.45)' },
    pattern: 'tanzboden',
    accent: '#ff4fb0',
    pool: ['discokugel', 'wurst', 'gebiss', 'vinyl'],
    music: 'disco',
  },
  uhrwerk: {
    name: 'Uhrwerk-Himmel',
    bg: ['#2a3c66', '#16223f'],
    terrain: { solid: '#b8945a', edge: '#5a4420', light: '#e8c87a', brk: '#d8c08a', brkEdge: '#7a6030', metal: '#c9b27a', slow: 'rgba(200,200,255,0.35)' },
    pattern: 'zahnraeder',
    accent: '#ffd36b',
    pool: ['zahnrad', 'wecker', 'kuckuck', 'ei'],
    music: 'uhrwerk',
  },
};
