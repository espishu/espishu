/*
 * store.js — l'única porta a les dades de l'app.
 * Tot es desa en un sol objecte JSON a localStorage (clau "espishu:v1"), que és la còpia
 * local de les dades del compte. src/sincronitza.js les puja a Supabase i les baixa
 * (PLA.md, secció 21.4). Cap altre mòdul no toca localStorage.
 */

export const VERSIO = 2;
const CLAU = 'espishu:v1';
const CLAU_ANTERIORS = `${CLAU}:anteriors`;

/* Identificador únic (uuid), també per a les cites i les sessions creades sense connexió. */
export function nouId() {
  if (crypto.randomUUID) return crypto.randomUUID();
  // Sense context segur (http des d'una altra màquina), randomUUID no hi és.
  const b = crypto.getRandomValues(new Uint8Array(16));
  b[6] = (b[6] & 0x0f) | 0x40;
  b[8] = (b[8] & 0x3f) | 0x80;
  const h = [...b].map(x => x.toString(16).padStart(2, '0')).join('');
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
}

/* ================= Dades de partida (PLA.md, secció 6) ================= */

/*
 * Cada exercici de la rutina guarda:
 *  - id: el de la biblioteca (coincideix amb l'id de l'animació)
 *  - tipus: 'força', 'mobilitat' o 'estirament' (decideix descansos i versió curta)
 *  - series: llista d'objectius (repeticions o segons) de cada sèrie
 *  - unitat: 'reps' o 'segons'
 *  - perCostat: l'objectiu és per a cada costat
 *  - descans: segons de descans després de cada sèrie
 *  - nota: aclariment curt opcional
 */
export function rutinaGeneral() {
  return {
    nom: 'Rutina general',
    exercicis: [
      { id: 'cercles-bracos',    tipus: 'mobilitat',  series: [30],         unitat: 'segons', perCostat: false, descans: 15 },
      { id: 'gat-camell',        tipus: 'mobilitat',  series: [8],          unitat: 'reps',   perCostat: false, descans: 30 },
      { id: 'esquat-cadira',     tipus: 'força',      series: [10, 10, 10], unitat: 'reps',   perCostat: false, descans: 45 },
      { id: 'pont-glutis',       tipus: 'força',      series: [12, 12, 12], unitat: 'reps',   perCostat: false, descans: 45 },
      { id: 'flexions-genolls',  tipus: 'força',      series: [8, 8, 8],    unitat: 'reps',   perCostat: false, descans: 45 },
      { id: 'superman',          tipus: 'força',      series: [10, 10, 10], unitat: 'reps',   perCostat: false, descans: 45, nota: 'aguanta 2 s a dalt' },
      { id: 'dead-bug',          tipus: 'força',      series: [8, 8, 8],    unitat: 'reps',   perCostat: true,  descans: 45 },
      { id: 'isquios-tovallola', tipus: 'estirament', series: [30, 30],     unitat: 'segons', perCostat: false, descans: 10, nota: 'una sèrie per cama' },
      { id: 'flexor-maluc',      tipus: 'estirament', series: [30, 30],     unitat: 'segons', perCostat: false, descans: 10, nota: 'una sèrie per costat' },
      { id: 'postura-nen',       tipus: 'estirament', series: [40],         unitat: 'segons', perCostat: false, descans: 0 }
    ]
  };
}

/*
 * Des de la versió 2, cada cita de casa (o de gimnàs) porta la seva rutina (`rutina: { nom, exercicis }`).
 * `compte`: { id, usuari } del compte amb què s'ha entrat (null si no s'ha entrat).
 * `pendents`: la cua de canvis per pujar a Supabase (src/sincronitza.js).
 */
export function dadesInicials() {
  return {
    versio: VERSIO,
    perfil: { nom: '', avisSalutVist: false, installacioVista: false, ultimaCopia: null },
    pla: {
      objectiuSetmanal: 2,
      cites: [
        { id: nouId(), dia: 5, hora: '18:00', activitat: 'casa', rutina: rutinaGeneral() },
        { id: nouId(), dia: 6, hora: '09:00', activitat: 'natacio', duracioMin: 90 },
        { id: nouId(), dia: 7, hora: '09:00', activitat: 'caminar', duracioMin: 90 }
      ]
    },
    sessioEnCurs: null,
    sessions: [],
    ajustos: { dolors: [] },
    compte: null,
    pendents: []
  };
}

/* ================= Migracions ================= */

/*
 * MIGRACIONS[n] passa un objecte de la versió n a la n + 1. S'apliquen en obrir una versió nova de
 * l'app, sobre les dades que hi ha al mòbil. Han de conservar-ho tot: les sessions, la sessió a mitges,
 * el compte i la cua de canvis per pujar (`pendents`, que una versió nova ha de poder pujar).
 */
const MIGRACIONS = {
  /*
   * 1 → 2 (comptes, 21.4): la rutina compartida (`rutines` + `rutinaId`) passa a ser dins de
   * cada cita, i els ids de les cites i de les sessions passen a ser uuid (per a Supabase).
   */
  1(d) {
    const ids = new Map();
    const id = antic => {
      if (!ids.has(antic)) ids.set(antic, nouId());
      return ids.get(antic);
    };
    const rutines = new Map((d.rutines ?? []).map(r => [r.id, r]));
    d.pla.cites = d.pla.cites.map(({ rutinaId, ...cita }) => {
      const nova = { ...cita, id: id(cita.id) };
      if (rutinaId || cita.activitat === 'casa' || cita.activitat === 'gimnas') {
        const r = rutines.get(rutinaId) ?? rutinaGeneral();
        nova.rutina = { nom: r.nom, exercicis: JSON.parse(JSON.stringify(r.exercicis)) };
        delete nova.duracioMin;
      }
      return nova;
    });
    const sessio = ({ rutinaId, ...s }) => ({ ...s, id: id(s.id), citaId: ids.get(s.citaId) ?? null });
    d.sessions = (d.sessions ?? []).map(sessio);
    d.sessioEnCurs = d.sessioEnCurs ? sessio(d.sessioEnCurs) : null;
    delete d.rutines;
    d.compte ??= null;
    d.pendents ??= [];
    // Dades de la versió sense comptes: en entrar, es podran importar al compte.
    d.anterior = true;
    d.versio = 2;
    return d;
  }
};

export function migra(dades) {
  while (dades.versio < VERSIO) {
    const pas = MIGRACIONS[dades.versio];
    if (!pas) throw new Error(`No hi ha migració des de la versió ${dades.versio}`);
    dades = pas(dades);
  }
  return dades;
}

/* ================= Lectura i escriptura ================= */

let dades = null;
const oients = new Set();
let enCanviar = null;

function escriu(objecte) {
  try {
    localStorage.setItem(CLAU, JSON.stringify(objecte));
    return true;
  } catch (e) {
    console.warn('No s\'han pogut desar les dades', e);
    return false;
  }
}

function carrega() {
  let text = null;
  try { text = localStorage.getItem(CLAU); } catch { /* sense accés: treballem en memòria */ }
  if (text) {
    try {
      const llegides = JSON.parse(text);
      const versio = llegides.versio;
      const migrades = migra(llegides);
      if (versio !== migrades.versio) escriu(migrades);
      return migrades;
    } catch (e) {
      // No sobreescrivim mai unes dades que no entenem: les apartem abans.
      console.error('Dades desades il·legibles', e);
      try { localStorage.setItem(`${CLAU}:malmeses:${Date.now()}`, text); } catch { /* res a fer */ }
    }
  }
  const inicials = dadesInicials();
  escriu(inicials);
  return inicials;
}

/* Retorna l'objecte de dades. No el modifiquis directament: fes servir actualitza(). */
export function obte() {
  if (!dades) dades = carrega();
  return dades;
}

/*
 * `fn(dades)` es crida a cada canvi, abans de desar-lo: així la cua de canvis per pujar es
 * desa alhora que el canvi (src/sincronitza.js). Els canvis que arriben de Supabase (`remot`) no hi passen.
 */
export function enCadaCanvi(fn) {
  enCanviar = fn;
}

/* Aplica un canvi a les dades, les desa i avisa els oients. */
export function actualitza(canvi, { remot = false } = {}) {
  canvi(obte());
  if (!remot) enCanviar?.(dades);
  escriu(dades);
  oients.forEach(oient => oient(dades));
}

/*
 * Substitueix totes les dades (restaurar una còpia). L'objecte ja ha d'estar validat.
 * Es queden el compte i la cua de canvis; amb `remot`, l'objecte ja els porta.
 */
export function substitueix(noves, { remot = false } = {}) {
  const abans = obte();
  dades = migra(noves);
  if (!remot) {
    dades.compte = abans.compte ?? null;
    dades.pendents = abans.pendents ?? [];
    enCanviar?.(dades);
  }
  escriu(dades);
  oients.forEach(oient => oient(dades));
}

/* Crida `oient` cada vegada que canvien les dades. Retorna la funció per deixar d'escoltar. */
export function escolta(oient) {
  oients.add(oient);
  return () => oients.delete(oient);
}

/*
 * Dades de la versió anterior (sense compte), apartades en entrar per primer cop
 * perquè es puguin importar al compte ("Importar les meves dades").
 */
export function desaAnteriors(objecte) {
  try { localStorage.setItem(CLAU_ANTERIORS, JSON.stringify(objecte)); } catch (e) { console.warn('No s\'han pogut apartar les dades', e); }
}

export function llegeixAnteriors() {
  try {
    const text = localStorage.getItem(CLAU_ANTERIORS);
    return text ? migra(JSON.parse(text)) : null;
  } catch {
    return null;
  }
}

export function esborraAnteriors() {
  try { localStorage.removeItem(CLAU_ANTERIORS); } catch { /* res a fer */ }
}

/*
 * Emmagatzematge per a la sessió de Supabase (src/compte.js), perquè cap altre mòdul
 * no toqui localStorage. Fa servir claus pròpies, que comencen per "espishu:sessio".
 */
export const emmagatzematge = {
  getItem(clau) {
    try { return localStorage.getItem(clau); } catch { return null; }
  },
  setItem(clau, valor) {
    try { localStorage.setItem(clau, valor); } catch (e) { console.warn('No s\'ha pogut desar la sessió', e); }
  },
  removeItem(clau) {
    try { localStorage.removeItem(clau); } catch { /* res a fer */ }
  }
};

/* Demana al navegador que no esborri les dades si li falta espai. */
export async function demanaPersistencia() {
  try {
    if (navigator.storage?.persist && !(await navigator.storage.persisted())) {
      await navigator.storage.persist();
    }
  } catch { /* no és imprescindible */ }
}
