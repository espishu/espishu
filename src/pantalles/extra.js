/*
 * Extra nova (#extra; PLA.md, secció 7.1): una sessió fora del pla, que no es desa al pla.
 * Com a Editar: activitat, nom i durada o, si és de casa, només els exercicis (amb els valors per
 * defecte; les sèries i els descansos es canvien a la sessió). "Comença" la posa en marxa com a extra:
 * no compta per a l'objectiu setmanal ni per al bosc.
 */
import { obte, actualitza } from '../store.js';
import { ACTIVITATS, OPCIONS_ACTIVITAT, RUTINA_PER_DEFECTE, MAX_NOM_CITA, formatDuracio } from '../cites.js';
import { exercici, textObjectiu } from '../biblioteca.js';
import { miniatura, exerciciNou, obreCercador } from '../cercador.js';
import { creaSessio, iniciaAuto } from '../rutina.js';
import { creaActivitat } from '../activitat.js';
import { activaSo } from '../so.js';
import { tancaFull } from '../full.js';
import { icona } from '../icones.js';
import { esc } from '../dom.js';

const DURACIO = { min: 15, max: 180, pas: 15 };

/* L'esborrany es manté mentre l'app és oberta (per si es surt i es torna); en començar, es buida. */
let esborrany = null;
const nouEsborrany = () => ({ activitat: 'casa', nom: '', duracioMin: 60, exercicis: [] });

const nomPerDefecte = e => (e.activitat === 'casa' ? RUTINA_PER_DEFECTE : ACTIVITATS[e.activitat]);
const nomDe = e => e.nom.trim() || nomPerDefecte(e);

export function munta(contenidor) {
  if (obte().sessioEnCurs) {
    location.replace('#avui');
    return;
  }
  esborrany ??= nouEsborrany();
  const e = esborrany;

  function htmlExercicis() {
    return e.exercicis.map((ex, i) => {
      const info = exercici(ex.id);
      return `
        <li class="ex-editor">
          <div class="ex-fila">
            <span class="miniatura">${miniatura(info)}</span>
            <span class="ex-text">
              <span class="nom-item">${i + 1}. ${esc(info?.nom ?? ex.id)}</span>
              <span class="secundari">${esc(`${ex.series.length} × ${textObjectiu(ex.series[0], ex.unitat, ex.perCostat)}`)}</span>
            </span>
            <button type="button" class="boto-icona" data-accio="treu" data-i="${i}" aria-label="Treure">${icona('paperera')}</button>
          </div>
        </li>`;
    }).join('');
  }

  function pinta() {
    const casa = e.activitat === 'casa';
    contenidor.innerHTML = `
      <header class="capcalera amb-enrere">
        <a class="boto-icona" href="#avui" aria-label="Tornar">${icona('enrere')}</a>
        <div>
          <p class="data">Extra</p>
          <h1>${esc(nomDe(e))}</h1>
        </div>
      </header>

      <section class="targeta camp-edicio">
        <h2 class="titol-targeta" id="t-activitat">Activitat</h2>
        <div class="activitats" role="radiogroup" aria-labelledby="t-activitat">
          ${OPCIONS_ACTIVITAT.map(a => `
            <button type="button" role="radio" class="opcio-activitat" data-accio="activitat" data-valor="${a}" aria-checked="${a === e.activitat}">
              ${icona(a)}<span>${ACTIVITATS[a]}</span>
            </button>`).join('')}
        </div>
        <label class="titol-targeta" for="nom-extra">Nom</label>
        <input id="nom-extra" class="camp-text" type="text" data-camp="nom" maxlength="${MAX_NOM_CITA}" autocomplete="off"
          placeholder="${esc(nomPerDefecte(e))}" value="${esc(e.nom)}">
      </section>

      ${casa ? `
        <section class="targeta camp-edicio">
          <h2 class="titol-targeta">Exercicis</h2>
          ${e.exercicis.length ? `<ol class="llista-editor">${htmlExercicis()}</ol>` : ''}
          <button type="button" class="boto contorn" data-accio="afegeix-ex">${icona('mes')} Afegir exercici</button>
        </section>` : `
        <section class="targeta camp-edicio">
          <div class="fila-pas">
            <span>Duració</span>
            <div class="pas-a-pas compacte">
              <button type="button" class="pas" data-accio="duracio" data-signe="-1" aria-label="Duració: menys"${e.duracioMin > DURACIO.min ? '' : ' disabled'}>${icona('menys')}</button>
              <output>${esc(formatDuracio(e.duracioMin))}</output>
              <button type="button" class="pas" data-accio="duracio" data-signe="1" aria-label="Duració: més"${e.duracioMin < DURACIO.max ? '' : ' disabled'}>${icona('mes')}</button>
            </div>
          </div>
        </section>`}

      <div class="pila-botons">
        <button type="button" class="boto principal" data-accio="comenca"${casa && !e.exercicis.length ? ' disabled' : ''}>Comença</button>
      </div>`;
  }

  function comenca() {
    activaSo();
    const nom = nomDe(e);
    const sessio = e.activitat === 'casa'
      ? iniciaAuto(creaSessio({ nom, exercicis: e.exercicis }, null))
      : creaActivitat({ activitat: e.activitat, duracioMin: e.duracioMin }, nom);
    sessio.extra = true;
    actualitza(d => { d.sessioEnCurs = sessio; });
    esborrany = null;
    location.hash = '#sessio';
  }

  const ACCIONS = {
    activitat: ({ valor }) => { e.activitat = valor; pinta(); },
    duracio: ({ signe }) => {
      e.duracioMin = Math.min(DURACIO.max, Math.max(DURACIO.min, e.duracioMin + Number(signe) * DURACIO.pas));
      pinta();
      contenidor.querySelector(`[data-accio="duracio"][data-signe="${signe}"]:not([disabled])`)?.focus();
    },
    'afegeix-ex': () => obreCercador({
      titol: 'Afegir exercici',
      enTriar: id => { e.exercicis.push(exerciciNou(exercici(id))); pinta(); }
    }),
    treu: ({ i }) => { e.exercicis.splice(Number(i), 1); pinta(); },
    comenca
  };

  const clic = ev => {
    const boto = ev.target.closest('[data-accio]');
    if (boto && contenidor.contains(boto) && !boto.disabled) ACCIONS[boto.dataset.accio]?.(boto.dataset);
  };
  // El nom es desa a cada lletra sense tornar a dibuixar (no es perd el focus).
  const escriu = ev => {
    if (ev.target.dataset.camp !== 'nom') return;
    e.nom = ev.target.value.slice(0, MAX_NOM_CITA);
    contenidor.querySelector('h1').textContent = nomDe(e);
  };
  contenidor.addEventListener('click', clic);
  contenidor.addEventListener('input', escriu);
  pinta();

  return () => {
    tancaFull();
    contenidor.removeEventListener('click', clic);
    contenidor.removeEventListener('input', escriu);
  };
}
