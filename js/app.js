const NS = 'http://www.w3.org/2000/svg';
const svg = document.getElementById('scene');
const $ = id => document.getElementById(id);
const mk = (t, a, p) => { const e = document.createElementNS(NS, t); for (const k in a) e.setAttribute(k, a[k]); if (p) p.appendChild(e); return e; };
const gBeam = mk('g', {}, svg), gItems = mk('g', {}, svg), gWire = mk('g', {}, svg);
let items = [], edges = [], pending = null, drag = null;
const D_LENS = 56;      // диаметр линзы, px
const SHARP = 0.06;     // порог чёткости (диаметр пятна, см)
const onRail = i => !i.inCase && i.ty === RAIL;
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

/* ---------- предметы ---------- */
function build(it, pop) {
  const T = it.inCase ? {} : (TERM[it.type] || {});
  const spr = it.inCase && CASE[it.type] ? CASE[it.type](it) : SPR[it.type](it);
  it.g.innerHTML = `<title>${it.name}</title><g class="spr${pop ? ' pop' : ''}">${spr}</g>` +
    Object.keys(T).map(k => `<circle class="term" data-t="${it.id}.${k}" cx="${T[k][0]}" cy="${T[k][1]}" r="7" fill="${T[k][2]}"/>`).join('');
}
const paint = it => { it.g.style.transform = `translate(${it.x}px,${it.y}px) scale(${it.k})`; };

function init() {
  const slots = $('slots');
  START.forEach(s => mk('rect', { x: s.sx - s.fw / 2, y: s.sy - s.fh / 2, width: s.fw, height: s.fh, rx: s.type === 'prot' ? s.fh / 2 : 7, fill: '#0b0c0d', stroke: '#000', 'stroke-opacity': .6 }, slots));
  items = START.map(s => ({ ...s, x: s.sx, y: s.sy, k: s.kc, tx: s.sx, ty: s.sy, tk: s.kc, inCase: true, on: false }));
  items.forEach(it => { it.g = mk('g', { 'data-id': it.id, class: 'item ' + it.type }, gItems); build(it); paint(it); });
  update();
  requestAnimationFrame(tick);
}

// плавное движение: все предметы «догоняют» целевое положение
function tick() {
  let moved = false;
  for (const it of items) {
    let c = false;
    for (const [a, t] of [['x', 'tx'], ['y', 'ty'], ['k', 'tk']]) {
      const d = it[t] - it[a];
      if (d) { c = true; it[a] = Math.abs(d) < .05 ? it[t] : it[a] + d * .22; }
    }
    if (c) { paint(it); moved = true; }
  }
  if (moved) update();
  requestAnimationFrame(tick);
}

/* ---------- электрическая цепь ---------- */
function litFor(lampId, keyClosed) {
  const p = {};
  const f = a => { if (p[a] === undefined) p[a] = a; return p[a] === a ? a : (p[a] = f(p[a])); };
  const u = (a, b) => { p[f(a)] = f(b); };
  edges.forEach(e => u(e.a, e.b));
  if (keyClosed) u('key.a', 'key.b');
  const P = f('psu.p'), M = f('psu.m');
  if (P === M) return false;
  const r = f(lampId + '.r'), k = f(lampId + '.k');
  return (r === P && k === M) || (r === M && k === P);
}

const tpos = id => {
  const [n, k] = id.split('.'), it = items.find(i => i.id === n), t = TERM[it.type][k];
  return [it.x + t[0] * it.k, it.y + t[1] * it.k, t[2], it];
};

function addEdge(a, b) {
  const [, , c1, i1] = tpos(a), [, , c2, i2] = tpos(b);
  const col = i1.type === 'lamp' ? c1 : i2.type === 'lamp' ? c2 : '#2f55e0';
  const e = { a, b };
  e.el = mk('path', { class: 'cable draw', stroke: col === '#1a1a1a' ? '#26262a' : col, pathLength: 1 }, gWire);
  e.el.addEventListener('animationend', () => e.el.classList.remove('draw'));
  e.hit = mk('path', { class: 'wire' }, gWire); e.hit._e = e;
  edges.push(e);
}
function removeEdge(e) { e.el.remove(); e.hit.remove(); edges = edges.filter(x => x !== e); }
const dropEdges = it => edges.filter(e => e.a.split('.')[0] === it.id || e.b.split('.')[0] === it.id).forEach(removeEdge);

function drawWires() {
  edges.forEach(e => {
    const [x1, y1] = tpos(e.a), [x2, y2] = tpos(e.b), cx = (x1 + x2) / 2, cy = (y1 + y2) / 2 + Math.min(70, 30 + Math.hypot(x2 - x1, y2 - y1) * .15);
    e.el.setAttribute('d', `M${x1} ${y1}Q${cx} ${cy} ${x2} ${y2}`);
    let d = '';   // зона щелчка без концов, чтобы не перекрывать гнёзда
    for (let t = .15; t <= .86; t += .1) d += (d ? 'L' : 'M') + ((1 - t) ** 2 * x1 + 2 * t * (1 - t) * cx + t * t * x2) + ' ' + ((1 - t) ** 2 * y1 + 2 * t * (1 - t) * cy + t * t * y2);
    e.hit.setAttribute('d', d);
  });
}

/* ---------- оптика (тонкие линзы, цепочка) ---------- */
function model() {
  const rail = items.filter(onRail);
  const lamp = rail.find(i => i.type === 'lamp' && i.on);
  const scr = rail.find(i => i.type === 'screen');
  if (!lamp || !scr || scr.x <= lamp.x) return { lamp, scr };
  const lenses = rail.filter(i => i.type === 'lens' && i.x > lamp.x && i.x < scr.x).sort((a, b) => a.x - b.x);
  let xo = lamp.x, M = 1, v = 0, last = null;
  for (const l of lenses) {
    const u = l.x - xo, F = l.f / 10 * S, d = 1 / F - 1 / u;
    v = Math.abs(d) < 1e-9 ? 1e6 : 1 / d;
    M *= -v / u; xo = l.x + v; last = l;
  }
  const blur = last ? D_LENS * Math.abs(scr.x - xo) / Math.abs(v) / S : null;
  return { lamp, scr, lenses, M, xo, v, last, blur };
}

function drawBeams(m) {
  gBeam.innerHTML = '';
  if (!$('rays').checked || !m.lenses || !m.lenses.length) return;
  const ay = RAIL - AX, A = D_LENS / 2, l1 = m.lenses[0];
  const poly = p => mk('polygon', { points: p, fill: 'rgba(255,226,120,.32)', 'pointer-events': 'none' }, gBeam);
  poly(`${m.lamp.x},${ay} ${l1.x},${ay - A} ${l1.x},${ay + A}`);
  const t = (m.scr.x - m.last.x) / (m.xo - m.last.x), h = A * (1 - t);
  poly(`${m.last.x},${ay - A} ${m.scr.x},${ay - h} ${m.scr.x},${ay + h} ${m.last.x},${ay + A}`);
}

/* ---------- вид экрана ---------- */
(function () { let d = ''; for (let k = 0; k <= 6; k++) { const p = k * 32; d += `M${p} 0V200M0 ${p}H200`; } $('grid').setAttribute('d', d); })();
const BULB = `<circle cy="-8" r="17" fill="#fff6b0" stroke="#ffc928" stroke-width="2"/><rect x="-7" y="8" width="14" height="22" rx="2" fill="#b5b5b5"/><path d="M-6 -4q6-12 12 0" stroke="#e07000" stroke-width="2" fill="none"/>`;

function drawImage(m) {
  const g = $('img'), msg = $('imsg'); g.innerHTML = ''; msg.textContent = '';
  if (!m.scr) { msg.textContent = 'Экран не стоит на скамье'; return; }
  if (!m.lamp) { msg.textContent = 'Лампа не горит'; return; }
  if (!m.lenses) { msg.textContent = 'Экран слева от лампы'; return; }
  if (!m.lenses.length) { g.innerHTML = '<circle r="85" fill="url(#glow)" opacity=".5"/>'; $('gb').setAttribute('stdDeviation', 0); return; }
  const s = Math.min(Math.abs(m.M), 8);
  $('gb').setAttribute('stdDeviation', Math.max(0, m.blur * 32 * .25));
  const op = Math.max(.15, Math.min(1, 1 / (1 + (m.blur / .7) ** 2)) * Math.min(1, 3 / (s * s)));
  g.innerHTML = `<g filter="url(#bl)" opacity="${op.toFixed(2)}"><g transform="rotate(${m.M < 0 ? 180 : 0}) scale(${s})">${BULB}</g></g>`;
}

/* ---------- обновление ---------- */
function update() {
  const kc = items.find(i => i.id === 'key').closed;
  items.filter(i => i.type === 'lamp').forEach(l => {
    const v = !l.inCase && litFor(l.id, kc);
    if (v !== l.on) { l.on = v; l.g.classList.toggle('on', v); }
  });
  drawWires();
  const m = model();
  drawBeams(m); drawImage(m);
  svg.querySelectorAll('.term').forEach(c => c.classList.toggle('sel', c.dataset.t === pending));
}

/* ---------- ввод ---------- */
const pt = e => { const p = svg.createSVGPoint(); p.x = e.clientX; p.y = e.clientY; return p.matrixTransform(svg.getScreenCTM().inverse()); };

svg.addEventListener('pointerdown', e => {
  const t = e.target;
  if (t.classList.contains('term')) {
    const id = t.dataset.t;
    if (!pending) pending = id;
    else if (pending === id) pending = null;
    else { if (!edges.some(x => (x.a === pending && x.b === id) || (x.a === id && x.b === pending))) addEdge(pending, id); pending = null; }
    update(); e.preventDefault(); return;
  }
  if (t.classList.contains('wire')) { removeEdge(t._e); update(); return; }
  const g = t.closest('.item'); if (!g) return;
  const it = items.find(i => i.id === g.dataset.id), p = pt(e);
  gItems.appendChild(g); g.classList.add('drag');
  drag = {
    it, moved: false, sx: e.clientX, sy: e.clientY, lever: !!t.closest('.lever'),
    dx: it.inCase ? 0 : p.x - it.x, dy: it.inCase ? (BENCH.includes(it.type) ? -40 : 0) : p.y - it.y   // из кейса предмет «прыгает» под курсор
  };
  e.preventDefault();
});

addEventListener('pointermove', e => {
  const p = pt(e);
  if (!drag) {
    const g = e.target.closest && e.target.closest('.item.ruler');
    const it = g && items.find(i => i.id === g.dataset.id);
    if (it && !it.inCase) $('hint').textContent = `Линейка: отметка под курсором — ${((p.x - it.x + it.len * S / 20) / S).toFixed(1)} см`;
    return;
  }
  if (Math.hypot(e.clientX - drag.sx, e.clientY - drag.sy) > 4) drag.moved = true;
  if (!drag.moved) return;
  const it = drag.it, inC = p.x < CASE_R;
  let nx = p.x - drag.dx, ny = p.y - drag.dy;
  if (inC !== it.inCase) { it.inCase = inC; build(it, true); if (inC) dropEdges(it); }
  it.tk = inC ? it.kc : 1;
  if (!inC) {
    nx = Math.max(nx, CASE_R + 40);
    if (BENCH.includes(it.type) && ny > RAIL - 60) { ny = RAIL; nx = clamp(nx, BX0, BX1); }
  }
  it.tx = clamp(nx, 20, 1290); it.ty = clamp(ny, 20, 630);
});

addEventListener('pointerup', () => {
  if (!drag) return;
  const it = drag.it;
  it.g.classList.remove('drag');
  if (!drag.moved && drag.lever && !it.inCase) { it.closed = !it.closed; it.g.querySelector('.lever').classList.toggle('open', !it.closed); }
  if (it.inCase) { it.tx = it.sx; it.ty = it.sy; it.tk = it.kc; }   // вернуть в свою выемку
  drag = null; update();
});

$('rays').addEventListener('change', update);
$('reset').addEventListener('click', () => { resetKit(); $('res').innerHTML = ''; });

/* ---------- выбор работы ---------- */
let lab = LABS[0];

function resetKit() {
  edges.slice().forEach(removeEdge); pending = null;
  items.forEach(it => { if (!it.inCase) { it.inCase = true; build(it, true); } it.tx = it.sx; it.ty = it.sy; it.tk = it.kc; });
  const k = items.find(i => i.id === 'key'); k.closed = false; k.g.querySelector('.lever').classList.add('open');
  update();
}

function setLab(id) {
  lab = LABS.find(l => l.id === id && !l.disabled) || LABS[0];
  $('labTitle').textContent = `Лабораторная работа № ${lab.id}`;
  $('labName').textContent = lab.name;
  $('labTask').textContent = lab.task;
  $('labSteps').innerHTML = `<b>В бланке ответов № 2:</b><ol><li>${lab.steps.join('</li><li>')}</li></ol>`;
  $('fields').innerHTML = lab.fields;
  $('res').innerHTML = '';
  document.querySelectorAll('#labList .lab').forEach(b => b.classList.toggle('on', +b.dataset.id === lab.id));
  history.replaceState(null, '', '#lab' + lab.id);
  resetKit();
}

$('labList').innerHTML = LABS.map(l =>
  `<button type="button" class="lab${l.disabled ? ' dis' : ''}" data-id="${l.id}"${l.disabled ? ' disabled' : ''}><b>${l.id || '…'}</b><span>${l.short}<small>${l.sub}</small></span></button>`).join('');
$('labList').addEventListener('click', e => { const b = e.target.closest('.lab'); if (b && !b.disabled && +b.dataset.id !== lab.id) setLab(+b.dataset.id); });

/* ---------- проверка ---------- */
$('check').addEventListener('click', () => {
  const m = model(), R = [];
  const add = (c, t) => { R.push(`<li class="${c ? 'y' : 'n'}" style="animation-delay:${R.length * 60}ms">${t}</li>`); };
  const railLamp = items.find(i => onRail(i) && i.type === 'lamp' && (i.on || litFor(i.id, true)));
  const series = !!railLamp && litFor(railLamp.id, true) && !litFor(railLamp.id, false);
  const lensObj = m.lenses && m.lenses.length === 1 && m.lenses[0].n === lab.lens ? m.lenses[0] : null;
  const aSet = lensObj ? (lensObj.x - m.lamp.x) / S : null;
  const sharp = !!lensObj && m.blur <= SHARP;

  const s1 = $('schema').checked, sCirc = !!m.lamp && series, aOk = aSet !== null && Math.abs(aSet - lab.a0) <= 0.5;
  add(s1, 'Схематический рисунок выполнен');
  add(sCirc, 'Лампа горит, ключ включён в цепь последовательно');
  add(!!lensObj, `Между лампой и экраном стоит только линза ${lab.lens}`);
  add(aOk, `Лампа стоит в ${lab.a0} см от центра линзы`);
  add(sharp, 'На экране чёткое изображение лампы');
  const p1 = s1 && sCirc && !!lensObj && aOk && sharp;

  // ожидаемые свойства изображения считаются по настоящему фокусу линзы
  const F = items.find(i => i.type === 'lens' && i.n === lab.lens).f / 10, a0 = aSet ?? lab.a0;
  const exp = { c1: a0 > F ? 'real' : 'virt', c2: a0 >= 2 * F ? 'small' : 'big', c3: a0 > F ? 'inv' : 'dir' };
  const propsOk = () => ['c1', 'c2', 'c3'].every(k => $(k).value === exp[k]);
  const [p2, p3] = lab.verify({ F, a0, propsOk }, add);

  $('res').innerHTML = `<ul>${R.join('')}</ul><div class="score">Баллы: ${+p1 + +p2 + +p3} из 3</div>`;
});

init();
setLab(+(location.hash.match(/lab(\d+)/) || [])[1] || LABS[0].id);
