/*
 * Resum de la sessió (PLA.md, seccions 7.4 i 13.7).
 * A dalt, el bosc: si la sessió compta, el plançó (o l'arbre sec que es cura) passa de com era abans
 * de la sessió a com és ara. A sota, el títol, els pins de la setmana i el detall.
 */
import { obte } from '../store.js';
import { compta } from '../ratxa.js';
import { htmlDetall, nomSessio } from '../resum.js';
import { htmlPins } from '../tema.js';
import { valls, htmlEscena, RETALL_RESUM } from '../boscdades.js';
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
  const ara = new Date();
  const rega = compta(sessio);
  const vall = d => valls(d, ara).at(-1);
  const despres = htmlEscena(vall(estat), { retall: RETALL_RESUM, alinea: 'xMidYMid slice' });
  const abans = rega ? htmlEscena(vall({ ...estat, sessions: estat.sessions.filter(s => s.id !== id) }), { retall: RETALL_RESUM, alinea: 'xMidYMid slice' }) : '';

  contenidor.innerHTML = `
    <div class="escena-resum${rega ? ' creix' : ''}" aria-hidden="true">
      ${rega ? `<div class="escena-abans">${abans}</div>` : ''}
      <div class="escena-ara">${despres}</div>
    </div>
    <section class="resum-cap" aria-label="Resum">
      <h1>${TITOLS[sessio.estat]}</h1>
      <p class="secundari">${esc(nomSessio(sessio))}</p>
      ${sessio.estat === 'no-feta' ? '' : htmlPins(estat)}
    </section>
    ${sessio.estat === 'no-feta' ? '' : htmlDetall(sessio, { plegat: true })}
    <a class="boto principal" href="#avui">Fet</a>`;
}
