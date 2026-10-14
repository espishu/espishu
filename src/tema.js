/*
 * tema.js — peces de la temàtica "El bosc" (PLA.md, secció 13) que comparteixen les pantalles.
 * El bosc es dibuixa amb src/bosc.js; aquí hi ha els pins petits (setmana, sessió i Pla).
 */
import { setmana } from './ratxa.js';

/* Un pi petit (22 × 30). `classe`: 'fet', 'actual' o el nom d'una activitat (en dona el color). */
export function htmlPi(classe = '') {
  return `<svg class="pi${classe ? ` ${classe}` : ''}" viewBox="0 0 22 30" aria-hidden="true"><path d="M11 2L3 14h4L2 22h18l-5-8h4z"/><rect x="9.5" y="22" width="3" height="6"/></svg>`;
}

/*
 * Pins de la setmana: un per sessió de l'objectiu (verd els fets), un de groc per cada sessió extra
 * (fora del pla, no compta per a l'objectiu) i "1/2". Si n'hi ha molts, es fan petits (`classe`).
 */
export function htmlPins(estat, ara = new Date(), { classe = '' } = {}) {
  const { fetes, objectiu, extra, extres } = setmana(estat, ara);
  const pins = Array.from({ length: objectiu }, (_, i) => htmlPi(i < fetes ? 'fet' : '')).join('')
    + Array.from({ length: extres }, () => htmlPi('extra')).join('');
  const mida = objectiu + extres > 6 ? ' molts' : objectiu + extres > 4 ? ' petits' : '';
  return `
    <p class="pins${mida}${classe ? ` ${classe}` : ''}">
      <span class="pins-icones" aria-hidden="true">${pins}</span>
      <span class="pins-xifra">${Math.min(fetes, objectiu)}/${objectiu}${extra ? `<span class="extra">+${extra}</span>` : ''}</span>
      <span class="visually-hidden"> sessions aquesta setmana${extres ? ` i ${extres} ${extres === 1 ? 'extra' : 'extres'}` : ''}</span>
    </p>`;
}
