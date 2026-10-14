/*
 * activitat.js — lògica d'una sessió d'activitat sola (natació, caminar, bici, córrer o una altra).
 * El temps surt sempre de marques desades (inici, pauses, aturada), mai d'un comptador,
 * perquè l'iPhone atura el JavaScript amb la pantalla bloquejada.
 *
 * Forma de la sessió en curs:
 *  { id, tipus: 'activitat', citaId, activitat, nom, inici (ISO), minutsPrevistos, extraMin,
 *    pauses: [ { inici, fi } ]   // marques en ms; fi = null mentre dura la pausa
 *    aturada: ms | null }        // quan s'ha aturat (compte a zero o "Acabar ara")
 */

import { nouId } from './store.js';
import { marques } from './rutina.js';

/* Animació de cada activitat (src/animacions.js). */
export const ANIMACIO_ACTIVITAT = {
  caminar: 'caminar',
  correr: 'correr',
  bici: 'bici',
  natacio: 'natacio-crol'
};

export function creaActivitat(cita, nom, ara = Date.now()) {
  return {
    id: nouId(),
    tipus: 'activitat',
    citaId: cita?.id ?? null,
    activitat: cita.activitat,
    nom,
    inici: new Date(ara).toISOString(),
    minutsPrevistos: cita.duracioMin ?? 60,
    extraMin: 0,
    pauses: [],
    aturada: null
  };
}

export const totalMs = a => (a.minutsPrevistos + a.extraMin) * 60000;
export const enPausa = a => a.pauses.at(-1)?.fi === null;

function pausaMs(a, fins) {
  return a.pauses.reduce((t, p) => t + (Math.min(p.fi ?? fins, fins) - p.inici), 0);
}

/* Temps actiu (sense pauses) fins ara o fins a l'aturada. */
export function actiuMs(a, ara = Date.now()) {
  const fins = a.aturada ?? ara;
  return Math.max(0, fins - Date.parse(a.inici) - pausaMs(a, fins));
}

export function restantMs(a, ara = Date.now()) {
  return Math.max(0, totalMs(a) - actiuMs(a, ara));
}

/* Si el compte ha arribat a zero, l'atura en el moment exacte en què hi ha arribat. */
export function comprovaFinal(a, ara = Date.now()) {
  if (a.aturada || enPausa(a)) return false;
  const sobra = actiuMs(a, ara) - totalMs(a);
  if (sobra < 0) return false;
  a.aturada = ara - sobra;
  return true;
}

export function pausa(a, ara = Date.now()) {
  if (!enPausa(a) && !a.aturada) a.pauses.push({ inici: ara, fi: null });
}

export function repren(a, ara = Date.now()) {
  if (enPausa(a)) a.pauses.at(-1).fi = ara;
}

/* "Acabar ara": atura el rellotge (tanca la pausa si n'hi havia una). */
export function atura(a, ara = Date.now()) {
  if (a.aturada) return;
  repren(a, ara);
  a.aturada = ara;
}

/* Torna a posar en marxa una activitat aturada; el temps aturat compta com a pausa. */
export function continua(a, ara = Date.now()) {
  if (!a.aturada) return;
  a.pauses.push({ inici: a.aturada, fi: ara });
  a.aturada = null;
}

/* +5 min. Si ja s'havia acabat el compte, el torna a engegar. */
export function afegeixCinc(a, ara = Date.now()) {
  a.extraMin += 5;
  if (a.aturada && actiuMs(a, ara) < totalMs(a)) continua(a, ara);
}

/*
 * El registre que es desa en acabar. `completa` ("Completar": acabada abans d'hora però feta sencera):
 * compta i surt com si s'hagués fet tot el temps (minutsFets = el total previst, amb els +5).
 */
export function registreActivitat(a, estat, ara = Date.now(), { completa = false } = {}) {
  const fi = a.aturada ?? ara;
  const fets = completa ? totalMs(a) : Math.min(actiuMs(a, fi), totalMs(a));
  return {
    id: a.id,
    inici: a.inici,
    fi: new Date(fi).toISOString(),
    citaId: a.citaId,
    tipus: 'activitat',
    activitat: a.activitat,
    nom: a.nom,
    estat,
    minutsPrevistos: a.minutsPrevistos,
    minutsFets: estat === 'no-feta' ? 0 : Math.round(fets / 60000),
    minutsPausa: Math.round(pausaMs(a, fi) / 60000),
    ...marques(a)
  };
}
