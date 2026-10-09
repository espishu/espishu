/*
 * arbre.js — l'arbre de l'app (SVG generat per codi). No el redibuixis: fes servir l'API.
 *   renderArbre({ sessions, data, mida, fosc }) -> string SVG
 *   etapaArbre(sessions) -> { index 1..5, nom, min, seguent, progres 0..1 }
 *   estacio(data) -> 'primavera' | 'estiu' | 'tardor' | 'hivern'
 * L'arbre sempre és el mateix (llavor fixa): només canvia d'etapa i d'estació.
 */
export const ETAPES = [
  { index: 1, nom: 'Brot',       min: 0 },
  { index: 2, nom: 'Planter',    min: 5 },
  { index: 3, nom: 'Arbret',     min: 15 },
  { index: 4, nom: 'Arbre',      min: 30 },
  { index: 5, nom: 'Arbre gran', min: 60 },
];
export const ESTACIONS = {
  primavera: { leaves: ['#8CC56B', '#A9D68A', '#B5DC93'], flowers: '#F3B6C8', ground: '#CFE3B8', fallen: null, snow: false },
  estiu:     { leaves: ['#3F8F4E', '#55A463', '#2F7A43'], flowers: null, ground: '#B9D59E', fallen: null, snow: false },
  tardor:    { leaves: ['#D9822B', '#E8A33A', '#C5602E', '#B9932F'], flowers: null, ground: '#D8D2B8', fallen: ['#D9822B', '#C5602E', '#E8A33A'], snow: false },
  hivern:    { leaves: [], flowers: null, ground: '#E9EEF2', fallen: null, snow: true },
};
export function estacio(d = new Date()) {
  const m = d.getMonth() + 1;
  if (m >= 3 && m <= 5) return 'primavera';
  if (m >= 6 && m <= 8) return 'estiu';
  if (m >= 9 && m <= 11) return 'tardor';
  return 'hivern';
}
export function etapaArbre(sessions = 0) {
  let e = ETAPES[0];
  for (const x of ETAPES) if (sessions >= x.min) e = x;
  const seg = ETAPES.find(x => x.index === e.index + 1) || null;
  const progres = seg ? (sessions - e.min) / (seg.min - e.min) : 1;
  return { ...e, seguent: seg, progres: Math.max(0, Math.min(1, progres)) };
}
function rng(seed) { // mulberry32: mateix arbre cada vegada
  return function () { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
}
const f = n => n.toFixed(1);
export function renderArbre({ sessions = 0, data = new Date(), mida = 300, fosc = false, etapa = null, est = null, seed = 7 } = {}) {
  const stage = etapa || etapaArbre(sessions).index;
  const S = ESTACIONS[est || estacio(data)];
  const LINE = fosc ? '#0B100D' : '#2B3A30', TRUNK = '#8A6A4F';
  const w = mida, h = mida, r = rng(seed), U = (a, b) => a + (b - a) * r();
  const out = [], tips = [];
  const baseX = w / 2, baseY = h - 34;
  const scale = [0, 0.42, 0.58, 0.72, 0.86, 1.0][stage];
  const depth = [0, 2, 3, 4, 5, 5][stage];
  const L0 = h * 0.235 * scale;
  function br(x, y, ang, L, d, wd) {
    const x2 = x + L * Math.cos(ang * Math.PI / 180), y2 = y - L * Math.sin(ang * Math.PI / 180);
    const mx = (x + x2) / 2 + U(-4, 4), my = (y + y2) / 2 + U(-3, 3);
    const p = `M${f(x)} ${f(y)} Q${f(mx)} ${f(my)} ${f(x2)} ${f(y2)}`;
    out.push(`<path d="${p}" stroke="${LINE}" stroke-width="${f(wd + 3)}" stroke-linecap="round" fill="none"/>`);
    out.push(`<path d="${p}" stroke="${TRUNK}" stroke-width="${f(wd)}" stroke-linecap="round" fill="none"/>`);
    if (d === 0 || L < 6) { tips.push([x2, y2]); return; }
    const n = d > 1 ? 2 : 3, spread = 22 + U(-5, 6);
    for (let i = 0; i < n; i++) {
      const a = ang + (-spread + i * 2 * spread / (n - 1)) + U(-7, 7);
      br(x2, y2, a, L * U(0.66, 0.78), d - 1, Math.max(wd * 0.66, 1.6));
    }
    if (d <= 2) tips.push([x2, y2]);
  }
  out.push(`<ellipse cx="${baseX}" cy="${baseY + 8}" rx="${f(w * 0.40)}" ry="14" fill="${S.ground}" stroke="${LINE}" stroke-width="2"/>`);
  br(baseX, baseY, 90, L0, depth, Math.max(5, 14 * scale));
  if (S.leaves.length) {
    const R = [0, 13, 17, 20, 22, 23][stage], lv = [];
    for (const [x, y] of tips) for (let k = 0; k < 2; k++) {
      const rr = R * U(0.8, 1.1); lv.push([x + U(-rr * 0.5, rr * 0.5), y + U(-rr * 0.6, rr * 0.2), rr]);
    }
    out.push('<g>' + lv.map(([cx, cy, rr]) => `<circle cx="${f(cx)}" cy="${f(cy)}" r="${f(rr)}" fill="${LINE}" stroke="${LINE}" stroke-width="4"/>`).join('') + '</g>');
    out.push('<g>' + lv.map(([cx, cy, rr]) => `<circle cx="${f(cx)}" cy="${f(cy)}" r="${f(rr)}" fill="${S.leaves[0]}"/>`).join('') + '</g>');
    lv.forEach(([cx, cy, rr], i) => { if (i % 2) return;
      const c = S.leaves[1 + Math.floor(r() * (S.leaves.length - 1))];
      out.push(`<circle cx="${f(cx + rr * 0.25)}" cy="${f(cy - rr * 0.25)}" r="${f(rr * 0.45)}" fill="${c}" opacity="0.9"/>`); });
    if (S.flowers) lv.forEach(([cx, cy, rr], i) => { if (i % 2) return;
      out.push(`<circle cx="${f(cx - rr * 0.35)}" cy="${f(cy + rr * 0.1)}" r="3.2" fill="${S.flowers}" stroke="${LINE}" stroke-width="1"/>`); });
  }
  if (S.snow) for (const [x, y] of tips) out.push(`<ellipse cx="${f(x)}" cy="${f(y - 2)}" rx="5" ry="2.6" fill="#FFFFFF" stroke="${LINE}" stroke-width="1.2"/>`);
  if (S.fallen) for (let i = 0; i < 5 + stage * 2; i++) {
    const x = baseX + U(-w * 0.33, w * 0.33), y = baseY + 8 + U(-6, 6), rot = U(-40, 40);
    out.push(`<ellipse cx="${f(x)}" cy="${f(y)}" rx="5" ry="3" transform="rotate(${rot.toFixed(0)} ${f(x)} ${f(y)})" fill="${S.fallen[Math.floor(r() * S.fallen.length)]}" stroke="${LINE}" stroke-width="1.1"/>`);
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="100%" role="img" aria-label="El teu arbre">${out.join('')}</svg>`;
}
