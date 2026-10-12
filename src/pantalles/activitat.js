/* Sessió d'activitat sola (PLA.md, secció 7.3): compte enrere, pausa, +5 min i com ha anat. */
import { obte, actualitza } from '../store.js';
import {
  ANIMACIO_ACTIVITAT, totalMs, actiuMs, restantMs, enPausa,
  comprovaFinal, pausa, repren, atura, continua, afegeixCinc, registreActivitat
} from '../activitat.js';
import { muntaAnimacio } from '../animacio.js';
import { formatCompte } from '../temps.js';
import { xiulet } from '../so.js';
import { icona } from '../icones.js';
import { esc } from '../dom.js';

const activitat = () => obte().sessioEnCurs;

export function munta(contenidor) {
  const a = activitat();
  const anim = ANIMACIO_ACTIVITAT[a.activitat];

  contenidor.innerHTML = `
    <header class="capcalera">
      <h1>${esc(a.nom)}</h1>
    </header>
    ${anim ? `
      <section class="targeta">
        <button type="button" class="escenari" aria-label="${esc(a.nom)}: toca per veure el moviment"></button>
        <p class="pista" aria-hidden="true" data-pista>${icona('play')}</p>
      </section>` : ''}
    <div data-zona="control"></div>`;

  let desmuntaAnimacio = null;
  const escenari = contenidor.querySelector('.escenari');
  if (escenari) {
    const pista = contenidor.querySelector('[data-pista]');
    desmuntaAnimacio = muntaAnimacio(escenari, anim, {
      onEstat: e => { pista.classList.toggle('amagada', e === 'moviment'); }
    });
    escenari.click(); // es mou una vegada en obrir la pantalla
  }

  const control = contenidor.querySelector('[data-zona="control"]');
  let estatPintat = null;

  function canvia(fn) {
    actualitza(d => fn(d.sessioEnCurs));
    pinta();
  }

  function pinta() {
    const a = activitat();
    if (!a) return;
    const estat = a.aturada ? 'aturada' : enPausa(a) ? 'pausa' : 'marxa';
    estatPintat = estat;
    if (estat === 'aturada') {
      const fets = Math.round(Math.min(actiuMs(a), totalMs(a)) / 60000);
      const aZero = restantMs(a) === 0;
      control.innerHTML = `
        <section class="targeta registre">
          <h2>Com ha anat?</h2>
          <p class="secundari">${fets} de ${a.minutsPrevistos + a.extraMin} min</p>
          <div class="pila-botons">
            <button type="button" class="boto principal gran" data-accio="desa" data-estat="feta">${icona('check')} Feta</button>
            <button type="button" class="boto contorn gran" data-accio="desa" data-estat="no-acabada">No acabada</button>
            <button type="button" class="boto contorn gran" data-accio="desa" data-estat="no-feta">No feta</button>
          </div>
          <button type="button" class="boto-text" data-accio="${aZero ? 'mes5' : 'continua'}">${aZero ? '+5 min' : 'Continua'}</button>
        </section>`;
      return;
    }
    control.innerHTML = `
      <section class="targeta compte-activitat">
        <p class="etiqueta" data-etiqueta>${estat === 'pausa' ? 'En pausa' : 'Queden'}</p>
        <p class="xifra" data-compte>0:00</p>
        <span class="barra-temps" aria-hidden="true"><span data-barra-temps></span></span>
      </section>
      <div class="pila-botons">
        <button type="button" class="boto principal" data-accio="${estat === 'pausa' ? 'repren' : 'pausa'}">
          ${icona(estat === 'pausa' ? 'play' : 'pausa')} ${estat === 'pausa' ? 'Reprèn' : 'Pausa'}
        </button>
        <button type="button" class="boto contorn" data-accio="mes5">+5 min</button>
      </div>
      <button type="button" class="boto-text" data-accio="acaba-ara">Acabar ara</button>`;
    tic();
  }

  function tic() {
    const a = activitat();
    if (!a) return;
    if (!a.aturada && !enPausa(a) && restantMs(a) === 0) {
      actualitza(d => comprovaFinal(d.sessioEnCurs));
      xiulet();
      return pinta();
    }
    const estat = a.aturada ? 'aturada' : enPausa(a) ? 'pausa' : 'marxa';
    if (estat !== estatPintat) return pinta();
    const r = restantMs(a);
    const xifra = control.querySelector('[data-compte]');
    if (xifra) xifra.textContent = formatCompte(r);
    const barra = control.querySelector('[data-barra-temps]');
    if (barra) barra.style.width = `${(r / totalMs(a)) * 100}%`;
  }

  function desa(estat) {
    const reg = registreActivitat(activitat(), estat);
    actualitza(d => {
      d.sessions.push(reg);
      d.sessioEnCurs = null;
    });
    location.hash = `#fet/${reg.id}`;
  }

  const ACCIONS = {
    pausa: () => canvia(a => pausa(a)),
    repren: () => canvia(a => repren(a)),
    mes5: () => canvia(a => afegeixCinc(a)),
    'acaba-ara': () => canvia(a => atura(a)),
    continua: () => canvia(a => continua(a)),
    desa: ({ estat }) => desa(estat)
  };

  const clic = e => {
    const boto = e.target.closest('[data-accio]');
    if (boto && control.contains(boto)) ACCIONS[boto.dataset.accio]?.(boto.dataset);
  };
  const visibilitat = () => { if (document.visibilityState === 'visible') tic(); };

  control.addEventListener('click', clic);
  document.addEventListener('visibilitychange', visibilitat);
  const interval = setInterval(tic, 500);
  pinta();

  return () => {
    clearInterval(interval);
    desmuntaAnimacio?.();
    control.removeEventListener('click', clic);
    document.removeEventListener('visibilitychange', visibilitat);
  };
}
