/*
 * Les teves valls (#valls; bosc-valls.html, opció B): una targeta per any, de la més nova a la més
 * antiga, amb la miniatura del bosc, el nom de la vall (es pot canviar) i les sessions.
 */
import { obte, actualitza } from '../store.js';
import { valls, htmlEscena, nomPerDefecte, RETALL_MINIATURA } from '../boscdades.js';
import { obreFull, tancaFull, botoTanca } from '../full.js';
import { icona } from '../icones.js';
import { esc } from '../dom.js';

const MAX_NOM = 30;

/* Full per canviar el nom d'una vall. Si es deixa buit, torna el nom per defecte. */
export function obreNomVall(any, enDesar) {
  const actual = obte().perfil.bosc?.noms?.[any] ?? '';
  const full = obreFull(`
    <div class="full-cap"><h2>Nom de la vall</h2>${botoTanca}</div>
    <form class="formulari" data-form-nom>
      <label class="camp-form">
        <span class="visually-hidden">Nom</span>
        <input class="camp-text" name="nom" maxlength="${MAX_NOM}" autocomplete="off" placeholder="${esc(nomPerDefecte(any))}" value="${esc(actual)}">
      </label>
      <button type="submit" class="boto principal">Desar</button>
    </form>`);
  full.querySelector('[data-form-nom]').addEventListener('submit', e => {
    e.preventDefault();
    const nom = e.target.nom.value.trim().slice(0, MAX_NOM);
    actualitza(d => {
      const bosc = d.perfil.bosc ??= {};
      const noms = bosc.noms ??= {};
      if (nom) noms[any] = nom;
      else delete noms[any];
    });
    tancaFull();
    enDesar?.(nom || nomPerDefecte(any));
  });
}

export function munta(contenidor) {
  function pinta() {
    const llista = valls(obte()).reverse();
    const targetes = llista.map(v => `
      <li class="targeta-vall">
        <div class="miniatura-vall" aria-hidden="true">${htmlEscena(v, { retall: RETALL_MINIATURA, alinea: 'xMidYMid slice' })}</div>
        <div class="peu-vall">
          <button type="button" class="nom-vall-boto" data-accio="nom" data-any="${v.any}" aria-label="Canviar el nom: ${esc(v.nom)}">
            <span class="nom-vall-text">${esc(v.nom)}</span>
            <span class="secundari">${v.any} · ${v.actual ? 'en curs' : `${v.arbres} ${v.arbres === 1 ? 'arbre' : 'arbres'}`}</span>
          </button>
          <p class="sessions-vall"><span class="xifra-vall">${v.sessions}</span><span class="visually-hidden"> sessions</span></p>
        </div>
      </li>`).join('');
    contenidor.innerHTML = `
      <header class="capcalera amb-enrere">
        <a class="boto-icona" href="#progres" aria-label="Tornar al bosc">${icona('enrere')}</a>
        <h1>Les teves valls</h1>
      </header>
      <ul class="llista-valls">${targetes}</ul>`;
  }

  const clic = e => {
    const boto = e.target.closest('[data-accio="nom"]');
    if (boto) obreNomVall(Number(boto.dataset.any), pinta);
  };
  pinta();
  contenidor.addEventListener('click', clic);
  return () => contenidor.removeEventListener('click', clic);
}
