/* full.js — fulls inferiors (<dialog>) i l'avís curt amb "Desfer", compartits per les pantalles. */
import { icona } from './icones.js';

let fullObert = null;

export const botoTanca = `<button type="button" class="boto-icona" data-accio="tanca" aria-label="Tanca">${icona('tancar')}</button>`;

/*
 * Obre un full inferior amb `html`. `accions` relaciona data-accio amb funcions que reben el dataset
 * del botó. "tanca" el tanca sempre. Tocar fora del full també el tanca.
 */
export function obreFull(html, accions = {}, { classe = '' } = {}) {
  tancaFull();
  const full = document.createElement('dialog');
  full.className = `full ${classe}`.trim();
  full.innerHTML = `<div class="full-dins">${html}</div>`;
  document.body.append(full);
  full.addEventListener('click', e => {
    if (e.target === full) return full.close();
    const boto = e.target.closest('[data-accio]');
    if (!boto) return;
    if (boto.dataset.accio === 'tanca') return full.close();
    accions[boto.dataset.accio]?.(boto.dataset, boto);
  });
  full.addEventListener('close', () => {
    full.remove();
    if (fullObert === full) fullObert = null;
  });
  full.showModal();
  fullObert = full;
  return full;
}

export function tancaFull() {
  fullObert?.close();
}

/* Confirmació senzilla: títol, text i un botó principal. */
export function confirma({ titol, text, boto, enConfirmar }) {
  obreFull(`
    <div class="full-cap"><h2>${titol}</h2>${botoTanca}</div>
    ${text ? `<p>${text}</p>` : ''}
    <div class="pila-botons">
      <button type="button" class="boto principal" data-accio="si">${boto}</button>
      <button type="button" class="boto contorn" data-accio="tanca">Cancel·lar</button>
    </div>`, {
    si: () => { tancaFull(); enConfirmar(); }
  });
}

/* ---------- Avís curt ("Sèrie eliminada · Desfer") ---------- */

let avis = null, temporitzador = 0;

export function mostraAvis(text, { accio, enAccio } = {}) {
  amagaAvis();
  avis = document.createElement('div');
  avis.className = 'avis';
  avis.setAttribute('role', 'status');
  avis.innerHTML = `<span></span>${accio ? '<button type="button"></button>' : ''}`;
  avis.querySelector('span').textContent = text;
  if (accio) {
    const boto = avis.querySelector('button');
    boto.textContent = accio;
    boto.addEventListener('click', () => { amagaAvis(); enAccio(); });
  }
  document.body.append(avis);
  temporitzador = setTimeout(amagaAvis, 5000);
}

export function amagaAvis() {
  clearTimeout(temporitzador);
  avis?.remove();
  avis = null;
}
