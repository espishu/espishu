/*
 * store.js — l'única porta a les dades de l'app.
 * Tot es desa en un sol objecte JSON a localStorage (clau "espishu:v1").
 * Cap altre mòdul no toca localStorage: si més endavant es canvia per un
 * servidor, només cal tocar aquest fitxer.
 */

export const VERSIO = 1;
const CLAU = 'espishu:v1';

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
function rutinaGeneral() {
  return {
    id: 'rutina-general',
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

export function dadesInicials() {
  return {
    versio: VERSIO,
    perfil: { nom: '', avisSalutVist: false, installacioVista: false, ultimaCopia: null },
    pla: {
      objectiuSetmanal: 2,
      cites: [
        { id: 'c1', dia: 5, hora: '18:00', activitat: 'casa', rutinaId: 'rutina-general' },
        { id: 'c2', dia: 6, hora: '09:00', activitat: 'natacio', duracioMin: 90 },
        { id: 'c3', dia: 7, hora: '09:00', activitat: 'caminar', duracioMin: 90 }
      ]
    },
    rutines: [rutinaGeneral()],
    sessioEnCurs: null,
    sessions: [],
    ajustos: { dolors: [] }
  };
}

/* ================= Migracions ================= */

/* MIGRACIONS[n] passa un objecte de la versió n a la n + 1. */
const MIGRACIONS = {};

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
      return migra(JSON.parse(text));
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

/* Aplica un canvi a les dades, les desa i avisa els oients. */
export function actualitza(canvi) {
  canvi(obte());
  escriu(dades);
  oients.forEach(oient => oient(dades));
}

/* Substitueix totes les dades (restaurar una còpia). L'objecte ja ha d'estar validat. */
export function substitueix(noves) {
  dades = migra(noves);
  escriu(dades);
  oients.forEach(oient => oient(dades));
}

/* Crida `oient` cada vegada que canvien les dades. Retorna la funció per deixar d'escoltar. */
export function escolta(oient) {
  oients.add(oient);
  return () => oients.delete(oient);
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
