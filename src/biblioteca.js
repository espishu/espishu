/*
 * biblioteca.js — exercicis revisats (dades/biblioteca.json). Són dades fixes de l'app,
 * no de l'usuari: per això no passen per store.js.
 */

/* Material que té a casa (PLA.md, secció 1). Les peses de 2,5 kg no compten. */
const MATERIAL_DISPONIBLE = new Set(['cap', 'cadira', 'tovallola']);

let perId = null;

export async function carregaBiblioteca() {
  if (perId) return;
  const resposta = await fetch('dades/biblioteca.json');
  const llista = await resposta.json();
  perId = new Map(llista.map(e => [e.id, e]));
}

export function exercici(id) {
  return perId?.get(id) ?? null;
}

export function totsElsExercicis() {
  return perId ? [...perId.values()] : [];
}

export const GRUPS = {
  esquena: 'Esquena', core: 'Abdominals', cames: 'Cames', pit: 'Pit',
  espatlles: 'Espatlles', bracos: 'Braços', estiraments: 'Estiraments', mobilitat: 'Mobilitat'
};

const CAL_MATERIAL = { peses: 'Cal peses', banda: 'Cal una banda', banc: 'Cal un banc' };

/* "Cal peses" si l'exercici necessita material que no hi ha a casa, o null. */
export function materialQueFalta(ex) {
  return MATERIAL_DISPONIBLE.has(ex.material) ? null : CAL_MATERIAL[ex.material] ?? null;
}

/* Alternatives d'un exercici que es poden fer amb el material de casa. */
export function alternativesDe(id) {
  const totes = (exercici(id)?.alternatives ?? []).map(exercici).filter(Boolean);
  const fesibles = totes.filter(e => MATERIAL_DISPONIBLE.has(e.material));
  return fesibles.length ? fesibles : totes;
}

/* "12 reps", "8 reps per costat", "30 s" */
export function textObjectiu(objectiu, unitat, perCostat) {
  return `${objectiu} ${unitat === 'segons' ? 's' : 'reps'}${perCostat ? ' per costat' : ''}`;
}
