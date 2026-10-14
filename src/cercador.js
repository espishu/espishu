/*
 * cercador.js — triar exercicis de la biblioteca: el cercador amb filtre per grup i les peces que
 * comparteixen Editar (rutina d'una cita) i la pantalla d'extra nova (PLA.md, seccions 8 i 7.1).
 */
import { totsElsExercicis, textObjectiu, GRUPS, materialQueFalta } from './biblioteca.js';
import { renderAnimacio } from './animacio.js';
import { obreFull, tancaFull, botoTanca } from './full.js';
import { icona } from './icones.js';
import { esc } from './dom.js';

const DESCANS_PER_DEFECTE = { força: 45, mobilitat: 30, estirament: 15 };

export function miniatura(info) {
  if (info?.animacio) return renderAnimacio(info.animacio, 0);
  return info?.imatges?.[0] ? `<img src="${esc(info.imatges[0])}" alt="" loading="lazy">` : '';
}

/*
 * Un exercici de la biblioteca preparat per a una rutina, amb els valors per defecte
 * (força 3 sèries / 45 s; mobilitat 1 / 30 s; estirament 1 / 15 s). Amb `base`, en manté sèries i descans.
 */
export function exerciciNou(info, base) {
  const series = base ? Math.max(1, base.series.length) : info.tipus === 'força' ? 3 : 1;
  return {
    id: info.id,
    tipus: info.tipus,
    series: Array(series).fill(info.objectiu),
    unitat: info.unitat,
    perCostat: !!info.perCostat,
    descans: base?.descans ?? DESCANS_PER_DEFECTE[info.tipus] ?? 30
  };
}

/* Una opció de les llistes d'exercicis (alternatives i cercador): data-accio="tria". */
export function htmlOpcio(info) {
  const falta = materialQueFalta(info);
  return `
    <li>
      <button type="button" class="item-alt" data-accio="tria" data-id="${esc(info.id)}">
        <span class="miniatura">${miniatura(info)}</span>
        <span><span class="nom-item">${esc(info.nom)}</span>
        <span class="secundari">${esc(GRUPS[info.grup])} · ${esc(textObjectiu(info.objectiu, info.unitat, info.perCostat))}${falta ? ` · <strong>${falta}</strong>` : ''}</span></span>
      </button>
    </li>`;
}

/* Cercador amb filtre per grup muscular. En triar-ne un, es tanca i crida `enTriar(id)`. */
export function obreCercador({ titol, enTriar }) {
  let grup = 'tots', text = '';
  const totes = totsElsExercicis();
  const full = obreFull(`
    <div class="full-cap"><h2>${esc(titol)}</h2>${botoTanca}</div>
    <label class="cerca">${icona('cerca')}<span class="visually-hidden">Cerca</span>
      <input type="search" placeholder="Cerca per nom" data-cerca autocomplete="off"></label>
    <div class="xips-filtre" role="group" aria-label="Grup muscular">
      ${['tots', ...Object.keys(GRUPS)].map(g => `
        <button type="button" class="xip" data-accio="grup" data-grup="${g}" aria-pressed="${g === 'tots'}">${g === 'tots' ? 'Tots' : GRUPS[g]}</button>`).join('')}
    </div>
    <ul class="llista-alt resultats" data-resultats></ul>`, {
    grup: ({ grup: g }) => {
      grup = g;
      full.querySelectorAll('[data-accio="grup"]').forEach(b => b.setAttribute('aria-pressed', b.dataset.grup === g));
      pintaResultats();
    },
    tria: ({ id }) => { tancaFull(); enTriar(id); }
  }, { classe: 'alt' });

  function pintaResultats() {
    const cerca = text.trim().toLocaleLowerCase('ca');
    const llista = totes
      .filter(e => grup === 'tots' || e.grup === grup)
      .filter(e => !cerca || e.nom.toLocaleLowerCase('ca').includes(cerca))
      .sort((a, b) => (materialQueFalta(a) ? 1 : 0) - (materialQueFalta(b) ? 1 : 0) || a.nom.localeCompare(b.nom, 'ca'));
    full.querySelector('[data-resultats]').innerHTML = llista.length
      ? llista.map(htmlOpcio).join('')
      : '<li class="secundari">Cap exercici amb aquest nom.</li>';
  }
  full.querySelector('[data-cerca]').addEventListener('input', e => { text = e.target.value; pintaResultats(); });
  pintaResultats();
}
