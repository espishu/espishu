/*
 * rutina.js — lògica d'una sessió de rutina (sense pantalla).
 * La sessió en curs es desa tal qual a store (sessioEnCurs) a cada canvi.
 *
 * Forma de la sessió en curs:
 *  { id (uuid), tipus: 'rutina', citaId, nom, curta, inici (ISO), actual (índex d'exercici),
 *    descans: { fins, total } | null,           // compte enrere del descans, en marques de temps (ms)
 *    compte: { exercici, serie, fins, total, perCostat, unitat, avisat } | null,  // compte enrere d'una sèrie
 *    auto: { pausa: { actual, serie, descans, compte } | null } | undefined,     // mode automàtic
 *    exercicis: [ { id, substitueix?, tipus, unitat, perCostat, descans, nota, saltat,
 *                   series: [ { objectiu, fet, feta } ] } ] }
 */
import { descansEntreExercicis, duracioRutina, SEGONS_PER_REP } from './cites.js';
import { nouId } from './store.js';

/* Versió curta: descansos més curts perquè quedi en uns 12-13 minuts. */
const DESCANS_CURTA = 30;

/* Mode automàtic: preparació abans del primer exercici i abans de reprendre sense res en marxa. */
const PREPARACIO = 60;
const PREPARACIO_CURTA = 10;

/* Mateix ordre, força a 2 sèries i, d'estiraments, només l'últim (la postura del nen). */
export function versioCurta(exercicis) {
  const ultimEstirament = exercicis.filter(e => e.tipus === 'estirament').at(-1);
  return exercicis
    .filter(e => e.tipus !== 'estirament' || e === ultimEstirament)
    .map(e => e.tipus === 'força'
      ? { ...e, series: e.series.slice(0, 2), descans: Math.min(e.descans, DESCANS_CURTA) }
      : e);
}

/* Minuts que dura la versió curta d'una rutina (botó petit d'Avui). */
export function duracioCurta(rutina) {
  return duracioRutina({ exercicis: versioCurta(rutina.exercicis) });
}

export function creaSessio(rutina, cita, curta = false, ara = new Date()) {
  const exercicis = curta ? versioCurta(rutina.exercicis) : rutina.exercicis;
  return {
    id: nouId(),
    tipus: 'rutina',
    citaId: cita?.id ?? null,
    nom: rutina.nom,
    curta: !!curta,
    inici: ara.toISOString(),
    actual: 0,
    descans: null,
    compte: null,
    exercicis: exercicis.map(ex => ({
      id: ex.id,
      tipus: ex.tipus,
      unitat: ex.unitat,
      perCostat: !!ex.perCostat,
      descans: ex.descans,
      nota: ex.nota ?? null,
      pujada: ex.pujada ?? null,
      saltat: false,
      series: ex.series.map(objectiu => ({ objectiu, fet: objectiu, feta: false }))
    }))
  };
}

/* Un exercici està acabat quan totes les sèries que queden tenen el ✓ (o s'ha saltat). */
export function exerciciAcabat(ex) {
  return ex.saltat || ex.series.every(s => s.feta);
}

export function exerciciAMitges(ex) {
  return !exerciciAcabat(ex) && ex.series.some(s => s.feta);
}

/* Índex de la primera sèrie sense ✓, o -1. */
export function serieActiva(ex) {
  return ex.saltat ? -1 : ex.series.findIndex(s => !s.feta);
}

/* El primer exercici (des del principi) que encara no està acabat, o -1. */
export function primerPendent(sessio) {
  return sessio.exercicis.findIndex(ex => !exerciciAcabat(ex));
}

export function totAcabat(sessio) {
  return primerPendent(sessio) === -1;
}

/* Descans abans de començar l'exercici `ex` (entre exercicis). */
export function descansAbansDe(sessio, ex) {
  if (sessio.curta) return ex.tipus === 'estirament' ? 15 : DESCANS_CURTA;
  return descansEntreExercicis(ex);
}

function iniciaDescans(sessio, segons, ara) {
  sessio.descans = segons > 0 ? { fins: ara + segons * 1000, total: segons } : null;
}

/*
 * Marca la sèrie `i` de l'exercici actual com a feta i decideix què ve després:
 *  'serie'    → descans i la sèrie següent del mateix exercici
 *  'exercici' → l'exercici s'ha acabat: passa al primer pendent amb el descans entre exercicis
 *  'fi'       → tots els exercicis estan acabats
 */
export function confirmaSerie(sessio, i, fet, ara = Date.now()) {
  const ex = sessio.exercicis[sessio.actual];
  ex.series[i].fet = fet;
  ex.series[i].feta = true;
  sessio.compte = null;
  if (!exerciciAcabat(ex)) {
    iniciaDescans(sessio, ex.descans, ara);
    return 'serie';
  }
  const seguent = primerPendent(sessio);
  if (seguent === -1) {
    sessio.descans = null;
    return 'fi';
  }
  sessio.actual = seguent;
  iniciaDescans(sessio, descansAbansDe(sessio, sessio.exercicis[seguent]), ara);
  return 'exercici';
}

/* Segons que dura una sèrie: els de l'objectiu o 3 s per repetició, el doble si és per costat. */
export function segonsSerie(ex, serie) {
  const treball = ex.unitat === 'segons' ? serie.objectiu : serie.objectiu * SEGONS_PER_REP;
  return treball * (ex.perCostat ? 2 : 1);
}

/* Posa en marxa el compte enrere de la sèrie `i` de l'exercici actual. */
export function iniciaCompte(sessio, i, ara = Date.now()) {
  const ex = sessio.exercicis[sessio.actual];
  const total = segonsSerie(ex, ex.series[i]);
  sessio.descans = null;
  sessio.compte = { exercici: sessio.actual, serie: i, fins: ara + total * 1000, total, perCostat: ex.perCostat, unitat: ex.unitat };
}

/* ---------- Mode automàtic ---------- */

/* Activa el mode automàtic en una sessió nova: comença amb un minut de preparació. */
export function iniciaAuto(sessio, ara = Date.now()) {
  sessio.auto = { pausa: null };
  iniciaDescans(sessio, PREPARACIO, ara);
  return sessio;
}

export function autoEnMarxa(sessio) {
  return !!sessio.auto && !sessio.auto.pausa;
}

/* En mode automàtic, no hi ha res en marxa però l'exercici actual té sèries per fer. */
export function esperaPasAuto(sessio) {
  return autoEnMarxa(sessio) && !sessio.descans && !sessio.compte
    && serieActiva(sessio.exercicis[sessio.actual]) !== -1;
}

/*
 * Si el mode automàtic està en marxa i no hi ha res en marxa, posa en marxa el pas següent:
 * la sèrie directament (`directe`, just després d'un descans o d'una sèrie) o 10 s de preparació.
 */
export function avancaAuto(sessio, ara = Date.now(), { directe = false } = {}) {
  if (!esperaPasAuto(sessio)) return false;
  if (directe) iniciaCompte(sessio, serieActiva(sessio.exercicis[sessio.actual]), ara);
  else iniciaDescans(sessio, PREPARACIO_CURTA, ara);
  return true;
}

/* Atura el mode automàtic i desa el temps que quedava del descans o de la sèrie. */
export function pausaAuto(sessio, ara = Date.now()) {
  if (!sessio.auto) return;
  const { descans, compte } = sessio;
  sessio.auto.pausa = {
    actual: sessio.actual,
    serie: serieActiva(sessio.exercicis[sessio.actual]),
    descans: descans ? { total: descans.total, quedaven: Math.max(0, descans.fins - ara) } : null,
    compte: compte ? { ...compte, quedaven: Math.max(0, compte.fins - ara) } : null
  };
  sessio.descans = null;
  sessio.compte = null;
}

/* El temps aturat, si encara serveix (no s'ha canviat res a mà durant la pausa), o null. */
export function pausaVigent(sessio) {
  const p = sessio.auto?.pausa;
  if (!p || sessio.descans || sessio.compte) return null;
  if (p.actual !== sessio.actual || p.serie !== serieActiva(sessio.exercicis[sessio.actual])) return null;
  return p.compte ?? p.descans ?? null;
}

/* Torna a posar en marxa el mode automàtic per on anava. */
export function reprenAuto(sessio, ara = Date.now()) {
  if (!sessio.auto) return;
  const vigent = pausaVigent(sessio);
  const p = sessio.auto.pausa;
  sessio.auto.pausa = null;
  if (vigent && p.compte) {
    const { quedaven, ...compte } = p.compte;
    sessio.compte = { ...compte, fins: ara + quedaven };
  } else if (vigent) {
    sessio.descans = { total: p.descans.total, fins: ara + p.descans.quedaven };
  }
  avancaAuto(sessio, ara);
}

/* ---------- Panell "Acabar": atura el temps mentre és obert ---------- */

/* Atura els comptes enrere (descans o sèrie) des d'ara. El rellotge total continua. */
export function aturaTemps(sessio, ara = Date.now()) {
  sessio.panell ??= { des: ara };
}

/* Continua on era: els comptes enrere s'allarguen el temps que han estat aturats. */
export function reprenTemps(sessio, ara = Date.now()) {
  if (!sessio.panell) return;
  const aturat = Math.max(0, ara - sessio.panell.des);
  if (sessio.descans) sessio.descans.fins += aturat;
  if (sessio.compte) sessio.compte.fins += aturat;
  delete sessio.panell;
}

/* Hi ha alguna sèrie feta (si no, "Desar" no té res a desar). */
export function algunaSerieFeta(sessio) {
  return sessio.exercicis.some(ex => ex.series.some(sr => sr.feta));
}

/* Canvia d'exercici des de la llista. Atura qualsevol compte enrere. */
export function vesA(sessio, index) {
  sessio.actual = index;
  sessio.descans = null;
  sessio.compte = null;
}

/* Salta l'exercici `index` sense substituir-lo. */
export function saltaExercici(sessio, index) {
  sessio.exercicis[index].saltat = true;
  if (index === sessio.actual) {
    sessio.descans = null;
    sessio.compte = null;
    const seguent = primerPendent(sessio);
    if (seguent !== -1) sessio.actual = seguent;
  }
}

/* Substitueix l'exercici `index` per una alternativa de la biblioteca, amb el mateix nombre de sèries. */
export function substitueix(sessio, index, alternativa) {
  const original = sessio.exercicis[index];
  sessio.exercicis[index] = {
    id: alternativa.id,
    substitueix: original.substitueix ?? original.id,
    tipus: alternativa.tipus,
    unitat: alternativa.unitat,
    perCostat: !!alternativa.perCostat,
    descans: original.descans,
    nota: null,
    saltat: false,
    series: Array.from({ length: Math.max(1, original.series.length) },
      () => ({ objectiu: alternativa.objectiu, fet: alternativa.objectiu, feta: false }))
  };
  if (index === sessio.actual) {
    sessio.descans = null;
    sessio.compte = null;
  }
}

/* Afegeix una sèrie al final amb el mateix objectiu que l'última. */
export function afegeixSerie(ex, objectiuPerDefecte) {
  const objectiu = ex.series.at(-1)?.objectiu ?? objectiuPerDefecte;
  ex.series.push({ objectiu, fet: objectiu, feta: false });
}

/* El registre que es desa a `sessions` en acabar. */
export function registre(sessio, fi = new Date()) {
  const exercicis = sessio.exercicis.map(ex => {
    const r = { id: ex.id, unitat: ex.unitat };
    if (ex.substitueix) r.substitueix = ex.substitueix;
    if (ex.saltat) r.saltat = true;
    r.series = ex.series.filter(s => s.feta).map(s => ({ objectiu: s.objectiu, fet: s.fet }));
    return r;
  });
  const algunaFeta = exercicis.some(ex => ex.series.length);
  return {
    id: sessio.id,
    inici: sessio.inici,
    fi: fi.toISOString(),
    citaId: sessio.citaId,
    tipus: 'rutina',
    nom: sessio.nom,
    curta: sessio.curta,
    estat: totAcabat(sessio) && algunaFeta ? 'feta' : algunaFeta ? 'no-acabada' : 'no-feta',
    exercicis
  };
}
