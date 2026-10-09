/*
 * Resum de la sessió (PLA.md, seccions 7.4 i 13.7).
 * Si la sessió compta, cauen tres gotes sobre l'arbre i hi apareix una fulla nova.
 * Si amb aquesta sessió passa d'etapa, l'arbre creix suaument fins a la mida nova.
 */
import { obte } from '../store.js';
import { setmana, compta } from '../ratxa.js';
import { etapaArbre } from '../arbre.js';
import { htmlDetall, nomSessio } from '../resum.js';
import { htmlArbre, htmlGotes, sessionsArbre } from '../tema.js';
import { icona } from '../icones.js';
import { esc } from '../dom.js';

/* Mida de l'arbre a cada etapa: la mateixa proporció que fa servir arbre.js. */
const MIDA_ETAPA = [0, 0.42, 0.58, 0.72, 0.86, 1];

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
  const rega = compta(sessio);
  const ara = sessionsArbre(estat), abans = rega ? ara - 1 : ara;
  const creix = rega && etapaArbre(abans).index !== etapaArbre(ara).index;
  const { complerta } = setmana(estat);

  // Si creix, l'arbre d'abans s'esvaeix mentre el nou creix des de la mida antiga.
  const escala = creix ? MIDA_ETAPA[etapaArbre(abans).index] / MIDA_ETAPA[etapaArbre(ara).index] : 1;
  contenidor.innerHTML = `
    <section class="panell-arbre resum${rega ? ' rega' : ''}${creix ? ' creix' : ''}" aria-label="El teu arbre">
      <div class="arbre" style="--escala-abans:${escala.toFixed(3)}">
        ${creix ? `<div class="arbre-abans">${htmlArbre(estat, { sessions: abans })}</div>` : ''}
        <div class="arbre-nou">${htmlArbre(estat, { sessions: ara })}</div>
        ${rega ? `
          <span class="gota-cau" style="--n:0">${icona('gota')}</span>
          <span class="gota-cau" style="--n:1">${icona('gota')}</span>
          <span class="gota-cau" style="--n:2">${icona('gota')}</span>
          <span class="fulla-nova">${icona('fulla')}</span>` : ''}
      </div>
      <h1>${TITOLS[sessio.estat]}</h1>
      <p class="secundari">${esc(nomSessio(sessio))}</p>
      ${sessio.estat === 'no-feta' ? '' : htmlGotes(estat)}
      ${creix ? `<p class="etapa-nova">${icona('arbre')} ${esc(etapaArbre(ara).nom)}</p>` : ''}
      ${complerta && rega ? '<p class="visually-hidden">Setmana complerta</p>' : ''}
    </section>
    ${sessio.estat === 'no-feta' ? '' : htmlDetall(sessio, { plegat: true })}
    <a class="boto principal" href="#avui">Fet</a>`;
}
