/*
 * boscdades.js — de les sessions desades al bosc de cada any (PLA.md, secció 9).
 * El bosc no es desa enlloc: es torna a calcular cada vegada a partir de `sessions`.
 *
 * - Setmana de dilluns a diumenge (hora local). Compten les sessions fetes i no acabades (compta()).
 * - Una setmana és complerta si arriba a l'objectiu que hi havia aquella setmana (`perfil.bosc.objectius`).
 * - Es comença a la setmana de la primera sessió que compta; abans no hi ha setmanes fallades.
 * - La setmana en curs no és mai fallada: és el plançó (o l'arbre sec que es cura).
 * - Cada setmana va a l'any del seu dijous, i cada any és una vall (Bosc.vallDeLAny).
 *
 * `perfil.bosc` (opcional, només en aquest aparell): { objectius: [{ des, objectiu }], noms: { any: nom }, vist: { any: [elements] } }.
 */
import Bosc from './bosc.js';
import { compta, dilluns } from './ratxa.js';

const mesDies = (data, dies) => new Date(data.getFullYear(), data.getMonth(), data.getDate() + dies);
const dataISO = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
/* L'any d'una setmana és el del seu dijous. */
const anyDe = dl => mesDies(dl, 3).getFullYear();

/* Noms per defecte: els de bosc.js el primer cop i, quan la vall torna a sortir (cada 4 anys), uns altres. */
const NOMS = {
  riu: ['Vall del riu', 'Ribera dels pins', 'Vall de les dues aigües'],
  estany: ["Vall de l'estany", 'Prat de la llacuna', "Vall de l'estanyol"],
  costa: ['Vall de la costa', 'Cala dels pins', 'Vall del far'],
  cims: ['Vall dels cims', 'Coll de les estrelles', 'Vall de la carena']
};
const clauVall = any => Bosc.ORDRE[((any - 2026) % 4 + 4) % 4];

export function nomPerDefecte(any) {
  const llista = NOMS[clauVall(any)];
  return llista[((Math.floor((any - 2026) / 4) % llista.length) + llista.length) % llista.length];
}

export function nomVall(estat, any) {
  return estat.perfil.bosc?.noms?.[any] || nomPerDefecte(any);
}

/* Els elements que es desbloquegen, en l'ordre en què surten, amb el nom de l'etiqueta "Nou: …". */
const AIGUA = { riu: 'el riu', estany: "l'estany", mar: 'la platja', rierol: 'el rierol' };
const ELEMENTS = ['ocells', 'aigua', 'cervol', 'cami', 'cabana', 'cuques'];
const NOM_ELEMENT = { ocells: 'els ocells', cervol: 'el cérvol', cami: 'el camí', cabana: 'la cabana', cuques: 'les cuques de llum' };

export function nomElement(element, any) {
  return element === 'aigua' ? AIGUA[Bosc.vallDeLAny(any).aigua] : NOM_ELEMENT[element];
}

/*
 * Objectiu de la setmana que comença a `dl`. Si mai no s'ha canviat, el d'ara.
 * Així, canviar l'objectiu no toca els arbres que ja hi havia.
 */
function objectiuDe(estat, dl) {
  const historial = estat.perfil.bosc?.objectius;
  if (!historial?.length) return estat.pla.objectiuSetmanal;
  const clau = dataISO(dl);
  let objectiu = historial[0].objectiu;
  for (const h of historial) if (h.des <= clau) objectiu = h.objectiu;
  return objectiu;
}

/*
 * Apunta un canvi d'objectiu (dins actualitza, abans de canviar-lo). La primera vegada també
 * apunta el d'abans per a totes les setmanes passades. Compta des del dilluns d'aquesta setmana.
 */
export function registraObjectiu(d, nou, ara = new Date()) {
  const bosc = d.perfil.bosc ??= {};
  const historial = bosc.objectius ??= [];
  if (!historial.length) historial.push({ des: '0000-01-01', objectiu: d.pla.objectiuSetmanal });
  const des = dataISO(dilluns(ara));
  bosc.objectius = historial.filter(h => h.des < des);
  bosc.objectius.push({ des, objectiu: nou });
}

/*
 * Totes les valls, de la més antiga a la d'ara:
 * [{ any, vall, nom, estat (Bosc.state), sessions, arbres, actual }]
 */
export function valls(estat, ara = new Date()) {
  const actual = dilluns(ara);
  const anyActual = anyDe(actual);
  const sessions = estat.sessions.filter(compta).map(s => new Date(s.inici)).filter(t => t < mesDies(actual, 7)).sort((a, b) => a - b);
  const perAny = new Map();
  const vall = any => {
    if (!perAny.has(any)) perAny.set(any, { setmanes: [], sessions: 0 });
    return perAny.get(any);
  };
  vall(anyActual);

  // Sessions de cada setmana, des de la de la primera sessió fins a la d'ara.
  const compte = new Map();
  for (const t of sessions) {
    const clau = dataISO(dilluns(t));
    compte.set(clau, (compte.get(clau) ?? 0) + 1);
  }
  if (sessions.length) {
    for (let dl = dilluns(sessions[0]); dl < actual; dl = mesDies(dl, 7)) {
      const n = compte.get(dataISO(dl)) ?? 0;
      const v = vall(anyDe(dl));
      v.setmanes.push(n >= objectiuDe(estat, dl));
      v.sessions += n;
    }
  }
  const fetes = compte.get(dataISO(actual)) ?? 0;
  vall(anyActual).sessions += fetes;

  return [...perAny.keys()].sort((a, b) => a - b).map(any => {
    const v = perAny.get(any), esActual = any === anyActual;
    const st = Bosc.state(v.setmanes, esActual ? { done: fetes, goal: estat.pla.objectiuSetmanal } : null, { seed: any });
    // Una vall passada ja no té plançó.
    if (!esActual) st.pending = { type: 'cap', progress: 0 };
    return { any, vall: Bosc.vallDeLAny(any), nom: nomVall(estat, any), estat: st, sessions: v.sessions, arbres: st.alive, actual: esActual };
  });
}

/* Elements de la vall d'ara que encara no s'han vist ("Nou: …"). */
export function elementsNous(estat, v) {
  const vist = new Set(estat.perfil.bosc?.vist?.[v.any] ?? []);
  return ELEMENTS.filter(e => v.estat.ms.has(e) && !vist.has(e));
}

/* Apunta com a vistos els elements que es veuen ara (dins actualitza). */
export function marcaVistos(d, v) {
  const bosc = d.perfil.bosc ??= {};
  const vist = bosc.vist ??= {};
  vist[v.any] = [...new Set([...(vist[v.any] ?? []), ...v.estat.ms])];
}

/*
 * SVG de l'escena. `retall`: la part que es veu ("x y amplada alçada" dins l'escena de 390 × 844)
 * i `alinea` el preserveAspectRatio. L'escena sencera s'alinea a baix perquè els arbres sempre es vegin.
 */
export function htmlEscena(v, { retall = '0 0 390 844', alinea = 'xMidYMax slice' } = {}) {
  return Bosc.render(v.estat, v.vall, { seed: 4 })
    .replace('viewBox="0 0 390 844"', `viewBox="${retall}"`)
    .replace('preserveAspectRatio="xMidYMid slice"', `preserveAspectRatio="${alinea}"`);
}

export const RETALL_AVUI = '0 190 390 520';
export const RETALL_MINIATURA = '0 380 390 300';
export const RETALL_RESUM = '0 360 390 350';
