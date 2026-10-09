/*
 * ratxa.js — setmanes, ratxa i progressió automàtica (PLA.md, secció 9).
 * La setmana va de dilluns a diumenge, en hora local.
 */
import { diaSetmana } from './cites.js';

export const MAX_REPS = 15;

/* Una sessió compta si ha sortit a fer-la (feta o no acabada). Les versions curtes també. */
export const compta = s => s.estat === 'feta' || s.estat === 'no-acabada';

/* Dilluns a les 00:00 de la setmana de `data`. */
export function dilluns(data) {
  return new Date(data.getFullYear(), data.getMonth(), data.getDate() - (diaSetmana(data) - 1));
}

function mesDies(data, dies) {
  return new Date(data.getFullYear(), data.getMonth(), data.getDate() + dies);
}

/* Sessions que compten dins la setmana que comença a `inici`. */
export function sessionsDeLaSetmana(estat, inici) {
  const fi = mesDies(inici, 7);
  return estat.sessions.filter(s => {
    const t = new Date(s.inici);
    return compta(s) && t >= inici && t < fi;
  });
}

/* Estat de la setmana actual: { fetes, objectiu, complerta, extra } */
export function setmana(estat, ara = new Date()) {
  const fetes = sessionsDeLaSetmana(estat, dilluns(ara)).length;
  const objectiu = estat.pla.objectiuSetmanal;
  return { fetes, objectiu, complerta: fetes >= objectiu, extra: Math.max(0, fetes - objectiu) };
}

/*
 * Setmanes complertes seguides fins a la setmana anterior. La setmana actual hi suma si ja
 * està complerta; si encara no ho està, no trenca la ratxa.
 */
export function ratxa(estat, ara = new Date()) {
  const objectiu = estat.pla.objectiuSetmanal;
  const complerta = inici => sessionsDeLaSetmana(estat, inici).length >= objectiu;
  let inici = dilluns(ara);
  let n = complerta(inici) ? 1 : 0;
  inici = mesDies(inici, -7);
  while (complerta(inici)) {
    n++;
    inici = mesDies(inici, -7);
  }
  return n;
}

/* Les últimes `quantes` setmanes, de la més antiga a l'actual. */
export function ultimesSetmanes(estat, ara = new Date(), quantes = 12) {
  const actual = dilluns(ara);
  return Array.from({ length: quantes }, (_, i) => {
    const inici = mesDies(actual, -7 * (quantes - 1 - i));
    const fetes = sessionsDeLaSetmana(estat, inici).length;
    return { inici, fetes, complerta: fetes >= estat.pla.objectiuSetmanal, actual: i === quantes - 1 };
  });
}

/*
 * Progressió automàtica. Es crida en acabar una rutina, amb el registre ja afegit a `sessions`.
 * Si en les dues últimes sessions amb aquest exercici ha fet totes les sèries amb almenys
 * l'objectiu actual, la propera vegada l'objectiu puja +1 (màxim 15).
 * Retorna la llista de canvis: { id, abans, ara } o { id, maxim: true }.
 */
export function aplicaProgressio(estat, registre) {
  if (registre.tipus !== 'rutina') return [];
  const rutina = estat.rutines.find(r => r.id === registre.rutinaId);
  if (!rutina) return [];

  // L'avís "Nou: …" ja s'ha vist en aquesta sessió.
  rutina.exercicis.forEach(ex => { delete ex.pujada; });

  const historial = estat.sessions
    .filter(s => s.tipus === 'rutina' && s.rutinaId === rutina.id)
    .sort((a, b) => Date.parse(b.inici) - Date.parse(a.inici));
  const canvis = [];

  for (const ex of rutina.exercicis) {
    // Només pugen els exercicis de força per repeticions (no l'escalfament ni els estiraments).
    if (ex.unitat !== 'reps' || ex.tipus !== 'força') continue;
    const objectiu = Math.min(...ex.series);
    const fets = historial
      .map(s => s.exercicis?.find(e => e.id === ex.id && !e.substitueix && !e.saltat))
      .filter(Boolean)
      .slice(0, 2);
    const superat = e => e.series.length > 0
      && e.series.every(s => s.fet >= s.objectiu)
      && Math.min(...e.series.map(s => s.objectiu)) >= objectiu;
    const daraMateix = registre.exercicis.some(e => e === fets[0]);
    if (fets.length < 2 || !daraMateix || !fets.every(superat)) continue;

    const abans = Math.max(...ex.series);
    if (abans >= MAX_REPS) {
      canvis.push({ id: ex.id, maxim: true });
      continue;
    }
    ex.series = ex.series.map(o => Math.min(MAX_REPS, o + 1));
    ex.pujada = { abans, ara: Math.max(...ex.series) };
    canvis.push({ id: ex.id, abans, ara: ex.pujada.ara });
  }
  return canvis;
}
