/*
 * grafics.js — gràfics senzills en SVG propi, sense llibreries.
 * Marques fines (línia de 2 px, punts de 8 px amb anella del color de la targeta, columnes de
 * com a molt 24 px amb la punta arrodonida i 2 px d'aire entre trams), graella recessiva,
 * indicació en tocar o amb el focus i taula de dades sempre disponible.
 */

const NS = 'http://www.w3.org/2000/svg';

function el(nom, atributs = {}, pare) {
  const node = document.createElementNS(NS, nom);
  for (const [k, v] of Object.entries(atributs)) node.setAttribute(k, v);
  pare?.append(node);
  return node;
}

function text(pare, x, y, contingut, atributs = {}) {
  const t = el('text', { x, y, ...atributs }, pare);
  t.textContent = contingut;
  return t;
}

/* Màxim "rodó" per a l'eix: 1, 1.5, 2, 2.5, 3, 4, 5, 6, 8, 10 × 10^n. */
function maximRodo(v) {
  if (v <= 0) return 1;
  const p = 10 ** Math.floor(Math.log10(v));
  return [1, 1.5, 2, 2.5, 3, 4, 5, 6, 8, 10].map(m => m * p).find(m => m >= v);
}

/* Indicació flotant: el valor primer i fort, l'etiqueta després. */
function creaIndicacio(contenidor) {
  const tip = document.createElement('div');
  tip.className = 'indicacio';
  tip.hidden = true;
  contenidor.append(tip);
  return {
    mostra(x, y, files) {
      tip.replaceChildren(...files.map(({ valor, etiqueta, color }) => {
        const fila = document.createElement('div');
        if (color) {
          const clau = document.createElement('span');
          clau.className = 'clau-linia';
          clau.style.background = color;
          fila.append(clau);
        }
        const v = document.createElement('strong');
        v.textContent = valor;
        const e = document.createElement('span');
        e.textContent = etiqueta;
        fila.append(v, ' ', e);
        return fila;
      }));
      tip.hidden = false;
      const amplada = contenidor.clientWidth, caixa = tip.getBoundingClientRect();
      tip.style.left = `${Math.max(0, Math.min(amplada - caixa.width, x - caixa.width / 2))}px`;
      tip.style.top = `${Math.max(0, y - caixa.height - 12)}px`;
    },
    amaga() { tip.hidden = true; }
  };
}

/* Posició d'un punt de l'SVG dins el contenidor, en píxels. */
function aPixels(svg, contenidor, x, y) {
  const r = svg.getBoundingClientRect(), c = contenidor.getBoundingClientRect();
  const vb = svg.viewBox.baseVal;
  return [r.left - c.left + (x / vb.width) * r.width, r.top - c.top + (y / vb.height) * r.height];
}

function eixY(svg, m, W, alt, yMax) {
  for (const v of [0, yMax / 2, yMax]) {
    const y = m.s + alt - (v / yMax) * alt;
    el('line', { x1: m.e, x2: W - m.d, y1: y, y2: y, class: 'graella' }, svg);
    text(svg, m.e - 6, y + 4, Math.round(v).toLocaleString('ca'), { class: 'eix', 'text-anchor': 'end' });
  }
}

/*
 * Línia d'una sola sèrie al llarg del temps.
 * punts: [{ data: Date, valor: number }], ordenats per data.
 */
export function muntaLinia(contenidor, punts, { unitat, descripcio, format }) {
  const W = 340, H = 190, m = { e: 36, d: 14, s: 22, i: 26 };
  const ample = W - m.e - m.d, alt = H - m.s - m.i;
  const yMax = maximRodo(Math.max(...punts.map(p => p.valor)));
  const t0 = punts[0].data.getTime(), t1 = punts.at(-1).data.getTime();
  const x = t => (t1 === t0 ? m.e + ample / 2 : m.e + ((t - t0) / (t1 - t0)) * ample);
  const y = v => m.s + alt - (v / yMax) * alt;
  const xy = punts.map(p => [x(p.data.getTime()), y(p.valor)]);

  contenidor.replaceChildren();
  const svg = el('svg', { viewBox: `0 0 ${W} ${H}`, class: 'svg-grafic', role: 'img', tabindex: 0, 'aria-label': descripcio });
  contenidor.append(svg);
  eixY(svg, m, W, alt, yMax);

  if (xy.length > 1) {
    const linia = xy.map(([a, b], i) => `${i ? 'L' : 'M'}${a.toFixed(1)} ${b.toFixed(1)}`).join('');
    el('path', { d: `${linia}L${xy.at(-1)[0].toFixed(1)} ${m.s + alt}L${xy[0][0].toFixed(1)} ${m.s + alt}Z`, class: 'area' }, svg);
    el('path', { d: linia, class: 'linia' }, svg);
  }
  const creu = el('line', { y1: m.s, y2: m.s + alt, class: 'creu', visibility: 'hidden' }, svg);
  const punts2 = xy.map(([a, b]) => el('circle', { cx: a, cy: b, r: 4, class: 'punt' }, svg));

  // Etiqueta només a l'últim punt; la resta, a la indicació i a la taula.
  const [ux, uy] = xy.at(-1);
  text(svg, Math.min(ux, W - m.d), uy - 10, `${punts.at(-1).valor}`, { class: 'etiqueta-valor', 'text-anchor': xy.length > 1 ? 'end' : 'middle' });
  text(svg, m.e, H - 6, format(punts[0].data), { class: 'eix', 'text-anchor': 'start' });
  if (xy.length > 1) text(svg, W - m.d, H - 6, format(punts.at(-1).data), { class: 'eix', 'text-anchor': 'end' });

  const indicacio = creaIndicacio(contenidor);
  let actiu = -1;
  function selecciona(i) {
    if (actiu >= 0) punts2[actiu].setAttribute('r', 4);
    actiu = i;
    if (i < 0) { creu.setAttribute('visibility', 'hidden'); indicacio.amaga(); return; }
    punts2[i].setAttribute('r', 6);
    creu.setAttribute('x1', xy[i][0]);
    creu.setAttribute('x2', xy[i][0]);
    creu.setAttribute('visibility', 'visible');
    const [px, py] = aPixels(svg, contenidor, xy[i][0], xy[i][1]);
    indicacio.mostra(px, py, [{ valor: `${punts[i].valor} ${unitat}`, etiqueta: format(punts[i].data) }]);
  }
  // La creu troba la X: s'enganxa al punt més proper, no cal encertar la línia.
  const mou = e => {
    const r = svg.getBoundingClientRect();
    const vx = ((e.clientX - r.left) / r.width) * W;
    let millor = 0;
    xy.forEach(([a], i) => { if (Math.abs(a - vx) < Math.abs(xy[millor][0] - vx)) millor = i; });
    selecciona(millor);
  };
  svg.addEventListener('pointermove', mou);
  svg.addEventListener('pointerdown', mou);
  svg.addEventListener('pointerleave', () => selecciona(-1));
  svg.addEventListener('focus', () => selecciona(xy.length - 1));
  svg.addEventListener('blur', () => selecciona(-1));
  svg.addEventListener('keydown', e => {
    if (e.key === 'ArrowLeft') { selecciona(Math.max(0, actiu - 1)); e.preventDefault(); }
    if (e.key === 'ArrowRight') { selecciona(Math.min(xy.length - 1, actiu + 1)); e.preventDefault(); }
  });
}

/*
 * Columnes apilades per setmana.
 * setmanes: [{ etiqueta, etiquetaLlarga, valors: { clau: número } }]
 * series: [{ clau, nom, color }] en ordre fix (el color segueix l'activitat, mai la posició).
 */
export function muntaColumnes(contenidor, setmanes, series, { unitat, descripcio }) {
  const W = 340, H = 200, m = { e: 36, d: 6, s: 14, i: 26 };
  const ample = W - m.e - m.d, alt = H - m.s - m.i;
  const total = s => series.reduce((t, sr) => t + (s.valors[sr.clau] ?? 0), 0);
  const yMax = maximRodo(Math.max(...setmanes.map(total)));
  const banda = ample / setmanes.length, gruix = Math.min(24, banda * 0.6);

  contenidor.replaceChildren();
  const svg = el('svg', { viewBox: `0 0 ${W} ${H}`, class: 'svg-grafic', role: 'img', 'aria-label': descripcio });
  contenidor.append(svg);
  eixY(svg, m, W, alt, yMax);
  const indicacio = creaIndicacio(contenidor);

  setmanes.forEach((s, i) => {
    const cx = m.e + banda * i + banda / 2, x0 = cx - gruix / 2;
    let base = m.s + alt;
    const trams = series.filter(sr => s.valors[sr.clau] > 0);
    trams.forEach((sr, k) => {
      const h = (s.valors[sr.clau] / yMax) * alt;
      const separacio = k > 0 && h > 3 ? 2 : 0;       // 2 px d'aire entre trams
      const dalt = base - h, alcada = h - separacio;
      const esUltim = k === trams.length - 1;
      const r = esUltim ? Math.min(4, alcada) : 0;      // punta arrodonida, base recta
      const d = `M${x0} ${base - separacio}V${dalt + r}Q${x0} ${dalt} ${x0 + r} ${dalt}H${x0 + gruix - r}Q${x0 + gruix} ${dalt} ${x0 + gruix} ${dalt + r}V${base - separacio}Z`;
      const tram = el('path', { d, fill: sr.color, class: 'tram', tabindex: 0, 'aria-label': `${sr.nom}, ${s.etiquetaLlarga}: ${s.valors[sr.clau]} ${unitat}` }, svg);
      const mostra = () => {
        const [px, py] = aPixels(svg, contenidor, cx, dalt);
        indicacio.mostra(px, py, [{ valor: `${s.valors[sr.clau]} ${unitat}`, etiqueta: `${sr.nom} · ${s.etiquetaLlarga}`, color: sr.color }]);
      };
      tram.addEventListener('pointerenter', mostra);
      tram.addEventListener('pointerdown', mostra);
      tram.addEventListener('focus', mostra);
      tram.addEventListener('pointerleave', () => indicacio.amaga());
      tram.addEventListener('blur', () => indicacio.amaga());
      base = dalt;
    });
    if (setmanes.length <= 8 || i % 2 === setmanes.length % 2) {
      text(svg, cx, H - 6, s.etiqueta, { class: 'eix', 'text-anchor': 'middle' });
    }
  });
}
