// Масштаб: 1 см = S px. Предметы на скамье рисуются от центра основания (на верхней грани рельса).
const S = 14, RAIL = 560, AX = 72, BX0 = 450, BX1 = 1260, CASE_R = 400;
const YD = '#a97a00', Y = 'url(#yel)';
const BENCH = ['lens', 'lamp', 'screen', 'slide'];

// Гнёзда: [x, y, цвет]
const TERM = {
  psu:  { p: [-62, 22, '#e03131'], m: [-62, -14, '#1a1a1a'] },
  key:  { a: [-34, 10, '#1a1a1a'], b: [34, 10, '#1a1a1a'] },
  lamp: { r: [-19, -8, '#e03131'], k: [19, -8, '#1a1a1a'] }
};

// sx, sy — место в кейсе; kc — масштаб в кейсе; fw, fh — размер выемки в поролоне
// f — истинное фокусное расстояние (мм), скрыто от ученика, лежит в допуске спецификации
const START = [
  { id: 'red',   type: 'ruler', cls: 'red',   len: 300, sx: 200, sy: 52,  kc: .5,  fw: 214, fh: 26,  name: 'Линейка 30 см' },
  { id: 'steel', type: 'ruler', cls: 'steel', len: 100, sx: 318, sy: 262, kc: .5,  fw: 76,  fh: 14,  name: 'Линейка 10 см' },
  { id: 'lens1', type: 'lens', n: 1, f: 98,  sx: 52,  sy: 150, kc: .5, fw: 26, fh: 108, name: 'Собирающая линза 1' },
  { id: 'lens2', type: 'lens', n: 2, f: 52,  sx: 84,  sy: 150, kc: .5, fw: 26, fh: 108, name: 'Собирающая линза 2' },
  { id: 'lens3', type: 'lens', n: 3, f: -74, sx: 116, sy: 150, kc: .5, fw: 26, fh: 108, name: 'Линза 3' },
  { id: 'lamp1', type: 'lamp', sx: 160, sy: 126, kc: .5, fw: 50, fh: 50, name: 'Лампа на подставке' },
  { id: 'lamp2', type: 'lamp', sx: 160, sy: 182, kc: .5, fw: 50, fh: 50, name: 'Лампа на подставке' },
  { id: 'screen', type: 'screen', sx: 222, sy: 196, kc: .5, fw: 58, fh: 54, name: 'Экран' },
  { id: 'slide',  type: 'slide',  sx: 276, sy: 196, kc: .5, fw: 50, fh: 46, name: 'Слайд «Модель предмета»' },
  { id: 'psu', type: 'psu', sx: 300, sy: 112, kc: .5, fw: 86, fh: 62, name: 'Выпрямитель ВС 4,5-М1' },
  { id: 'key', type: 'key', sx: 224, sy: 106, kc: .5, fw: 56, fh: 30, name: 'Ключ', closed: false },
  { id: 'illum', type: 'illum', sx: 80, sy: 242, kc: .5, fw: 90, fh: 60, name: 'Осветитель' },
  { id: 'semi', type: 'semi', sx: 190, sy: 252, kc: .5, fw: 46, fh: 24, name: 'Полуцилиндр' },
  { id: 'prot', type: 'prot', sx: 340, sy: 172, kc: .36, fw: 68, fh: 68, name: 'Планшет с круговым транспортиром' },
  { id: 'bulbs', type: 'bulbs', sx: 352, sy: 232, kc: .6, fw: 36, fh: 18, name: 'Запасные лампы' }
];

function ticks(len, H) {
  const w = len * S / 10, y0 = -H;
  let d = '', t = '';
  for (let i = 0; i <= len; i++) {
    const x = -w / 2 + i * S / 10;
    d += `M${x} ${y0}v${i % 10 ? (i % 5 ? 5 : 8) : 12}`;
    if (i % 10 === 0) t += `<text x="${x}" y="${y0 + 23}" text-anchor="middle" font-size="9" fill="#222">${i / 10}</text>`;
  }
  return { d, t };
}

const shine = (x, y, w, h) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${Math.min(w, h) / 2}" fill="#fff" opacity=".35"/>`;
const hold = (w = 70) =>
  `<ellipse cy="3" rx="${w / 2 + 12}" ry="6" fill="#0007"/><rect x="${-w / 2}" y="-26" width="${w}" height="26" rx="6" fill="${Y}" stroke="${YD}"/>` + shine(-w / 2 + 6, -23, w - 12, 5);
const post = () => `<rect x="-14" y="-122" width="11" height="96" rx="3" fill="${Y}" stroke="${YD}"/>` + shine(-12, -118, 3, 86);

// Предметы на скамье и на столе
const SPR = {
  lens: i => hold() +
    `<rect x="-13" y="-120" width="26" height="96" rx="8" fill="${Y}" stroke="${YD}"/>` + shine(-9, -116, 5, 86) +
    `<path d="${i.f > 0 ? 'M0-114C15-95 15-49 0-30C-15-49-15-95 0-114Z' : 'M-9-114H9C3-95 3-49 9-30H-9C-3-49-3-95-9-114Z'}" fill="url(#glass)" fill-opacity=".85" stroke="#4b7a99"/>` +
    `<text y="-8" text-anchor="middle" font-size="16" font-weight="700" fill="#4a3600">${i.n}</text>`,

  lamp: () =>
    `<ellipse cy="3" rx="40" ry="6" fill="#0007"/><rect x="-30" y="-16" width="60" height="16" rx="8" fill="${Y}" stroke="${YD}"/>` + shine(-22, -13, 44, 4) +
    `<rect x="-3.5" y="-60" width="7" height="46" rx="3" fill="url(#steel)" stroke="#6b7278"/>` +
    `<circle class="glow" cy="-72" r="60" fill="url(#glow)"/>` +
    `<circle class="gl" cy="-72" r="13" fill="url(#glass)" stroke="#777"/><path d="M-5-70q5-9 10 0" stroke="#555" fill="none"/>`,

  screen: () => hold() + post() + `<rect x="-3" y="-122" width="6" height="100" fill="#fff" stroke="#999"/>`,
  slide: () => hold() + post() + `<rect x="-3" y="-122" width="6" height="100" fill="#fff" stroke="#999"/><rect x="-3" y="-96" width="6" height="48" fill="#111"/>`,

  psu: () =>
    `<rect x="-80" y="-56" width="160" height="112" rx="12" fill="#1b1b1d" stroke="#4a4a4e"/><rect x="-72" y="-52" width="144" height="6" rx="3" fill="#fff" opacity=".1"/>` +
    `<circle cx="-68" cy="-44" r="3" fill="#ff4a4a"/>` +
    `<text x="-34" y="-12" font-size="14" font-weight="700" fill="#eee">ВС 4,5-М1</text><text x="-34" y="4" font-size="10" fill="#ccc">Выпрямитель</text><text x="-10" y="38" font-size="11" font-weight="700" fill="#ccc">KALËF</text>` +
    `<text x="-48" y="-10" font-size="16" fill="#ccc">−</text><text x="-50" y="27" font-size="16" fill="#ccc">+</text>` +
    `<circle cx="64" cy="-22" r="8" fill="#2b6fd6" stroke="#9bb"/><circle cx="64" cy="22" r="8" fill="#2b6fd6" stroke="#9bb"/>`,

  key: i =>
    `<rect x="-52" y="-26" width="104" height="52" rx="8" fill="${Y}" stroke="${YD}"/>` + shine(-44, -22, 88, 5) +
    `<circle cx="-34" cy="10" r="9" fill="#222"/><circle cx="34" cy="10" r="9" fill="#222"/>` +
    `<g class="lever${i.closed ? '' : ' open'}"><line x1="-34" y1="10" x2="34" y2="10" stroke="#111" stroke-width="6" stroke-linecap="round"/><circle cx="34" cy="10" r="6" fill="#333"/></g>`,

  illum: () =>
    `<rect x="-85" y="-55" width="170" height="110" rx="8" fill="#232326" stroke="#4a4a4e"/><rect x="-70" y="-36" width="70" height="26" rx="13" fill="#0a0a0a"/>` +
    `<path d="M20-36H50A32 32 0 0 1 50 28H20Z" fill="#e6e6e6"/>`,

  semi: () => `<path d="M-40 18A40 40 0 0 1 40 18Z" fill="url(#steel)" stroke="#667"/>`,

  prot: () => {
    let d = '';
    for (let a = 0; a < 360; a += 10) {
      const r = Math.PI * a / 180, c = Math.cos(r), s = Math.sin(r), r2 = a % 90 ? 80 : 86;
      d += `M${c * 72} ${s * 72}L${c * r2} ${s * r2}`;
    }
    return `<circle r="92" fill="#f5f5f2" stroke="#bbb"/><circle r="72" fill="none" stroke="#666"/><path d="${d}" stroke="#444"/>` +
      `<path d="M0-30A30 30 0 0 1 0 30Z" fill="none" stroke="#333"/>` +
      `<text y="-60" text-anchor="middle" font-size="11">90</text><text y="68" text-anchor="middle" font-size="11">90</text><text x="-62" y="4" font-size="11">0</text><text x="56" y="4" font-size="11">0</text>`;
  },

  bulbs: () => [-14, 14].map(x => `<circle cx="${x}" cy="-6" r="7" fill="url(#glass)" stroke="#777"/><rect x="${x - 4}" y="0" width="8" height="9" fill="#999"/>`).join(''),

  ruler: i => {
    const w = i.len * S / 10, red = i.cls === 'red', H = red ? 18 : 10, tk = ticks(i.len, H);
    return `<rect x="${-w / 2 - 4}" y="${-H}" width="${w + 8}" height="${2 * H}" rx="2" fill="${red ? '#ef5a63' : 'url(#steel)'}" stroke="#0005"/>` +
      `<path d="${tk.d}" stroke="#222" stroke-width=".8"/>${tk.t}`;
  }
};

// Как предметы лежат в кейсе (вид сверху, как на фото); остальные — те же, что на столе
const CASE = {
  lens: i => `<rect x="-20" y="-100" width="40" height="200" rx="14" fill="${Y}" stroke="${YD}"/>` + shine(-14, -92, 7, 150) +
    `<circle cy="68" r="21" fill="#2a2a2e"/><circle cy="68" r="15" fill="url(#glass)"/><text y="-56" text-anchor="middle" font-size="26" font-weight="700" fill="#4a3600">${i.n}</text>`,
  lamp: () => `<circle r="44" fill="${Y}" stroke="${YD}"/><circle r="22" fill="#2a2a2e"/><circle r="14" fill="url(#glass)"/>` +
    `<path d="M26 30Q70 50 40 80" stroke="#e03131" stroke-width="5" fill="none"/><path d="M34 22Q80 30 62 70" stroke="#111" stroke-width="5" fill="none"/>`,
  screen: () => `<rect x="-55" y="-50" width="110" height="100" rx="5" fill="#f8f8f6" stroke="#cfcfca"/><circle cx="-44" cy="-39" r="3" fill="#222"/>`,
  slide: () => `<rect x="-45" y="-42" width="90" height="84" rx="5" fill="#151515" stroke="#333"/><rect x="-3" y="-30" width="6" height="60" fill="#454545"/>`
};
