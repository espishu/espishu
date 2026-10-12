/*
 * Resum de la sessió (PLA.md, seccions 7.4 i 13.7): títol, nom de la sessió, els pins de la setmana i el detall.
 */
import { obte } from '../store.js';
import { htmlDetall, nomSessio } from '../resum.js';
import { htmlPins } from '../tema.js';
import { esc } from '../dom.js';

const TITOLS = {
  feta: 'Sessió feta',
  'no-acabada': 'Sessió desada',
  'no-feta': 'Cap problema'
};

export function munta(contenidor, [id]) {
  const estat = obte();
  const sessio = estat.sessions.find(s => s.id === id);
  if (!sessio) {
    location.replace('#avui');
    return;
  }
  contenidor.innerHTML = `
    <section class="resum-cap" aria-label="Resum">
      <h1>${TITOLS[sessio.estat]}</h1>
      <p class="secundari">${esc(nomSessio(sessio))}</p>
      ${sessio.estat === 'no-feta' ? '' : htmlPins(estat)}
    </section>
    ${sessio.estat === 'no-feta' ? '' : htmlDetall(sessio, { plegat: true })}
    <a class="boto principal" href="#avui">Fet</a>`;
}
