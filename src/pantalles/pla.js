/*
 * Pantalla Pla (PLA.md, seccions 7.6 i 13.3; bosc-pantalles.html): la carena amb els set dies i un pi
 * sobre els que tenen cita, i una targeta per cita. Tocar-la obre l'edició.
 */
import { obte, actualitza, nouId } from '../store.js';
import { DIES, ACTIVITATS, OPCIONS_ACTIVITAT, RUTINA_PER_DEFECTE, nomCita, formatHora, duracioCita, formatMinuts } from '../cites.js';
import { obreFull, tancaFull, botoTanca } from '../full.js';
import { htmlPendents } from '../sincronitza.js';
import { htmlPi } from '../tema.js';
import { ajustaObjectiu } from '../boscdades.js';
import { icona } from '../icones.js';
import { esc } from '../dom.js';

const ABREUJATS = ['', 'Dl', 'Dt', 'Dc', 'Dj', 'Dv', 'Ds', 'Dg'];

export function ordenaCites(cites) {
  return [...cites].sort((a, b) => a.dia - b.dia || a.hora.localeCompare(b.hora));
}

/* Carena de muntanya amb Dl…Dg i un pi petit sobre els dies amb alguna cita. */
function htmlCarena(cites) {
  const plens = new Set(cites.map(c => c.dia));
  const dies = [1, 2, 3, 4, 5, 6, 7].map(d => {
    const x = 16 + (d - 1) * 52;
    return `${plens.has(d) ? `<path d="M${x} 62l-8 12h16z" fill="var(--green)"/>` : ''}
      <text class="dia-carena${plens.has(d) ? ' ple' : ''}" x="${x}" y="86" text-anchor="middle">${ABREUJATS[d]}</text>`;
  }).join('');
  return `
    <svg class="carena" viewBox="0 0 342 90" aria-hidden="true">
      <path d="M0 70L40 40L70 56L110 22L150 50L190 18L230 46L270 28L310 52L342 36V90H0Z" fill="#26302B"/>
      ${dies}
    </svg>`;
}

export function munta(contenidor) {
  const estat = obte();
  const cites = ordenaCites(estat.pla.cites);

  const targetes = cites.map(cita => {
    const nom = nomCita(estat, cita), minuts = duracioCita(estat, cita);
    return `
      <li>
        <a class="cita-pla" href="#editar/${esc(cita.id)}" aria-label="Editar ${esc(nom)} del ${DIES[cita.dia].toLowerCase()} a les ${formatHora(cita.hora)}">
          ${htmlPi(cita.activitat)}
          <span class="cita-text">
            <span class="cita-nom">${esc(nom)}</span>
            <span class="secundari">${ABREUJATS[cita.dia]}${minuts ? ` · ${formatMinuts(minuts)}` : ''}</span>
          </span>
          <span class="cita-hora">${formatHora(cita.hora)}</span>
        </a>
      </li>`;
  }).join('');

  contenidor.innerHTML = `
    <header class="capcalera amb-accio">
      <h1>Setmana</h1>
      <span class="capcalera-accions">
        ${htmlPendents()}
        <a class="boto-icona" href="#ajustos/pla" aria-label="Ajustos">${icona('ajustos')}</a>
      </span>
    </header>
    ${htmlCarena(cites)}
    ${cites.length ? `<ul class="llista-cites">${targetes}</ul>` : ''}
    <button type="button" class="boto-afegir" data-accio="afegeix" aria-label="Afegir una cita">${icona('mes')}</button>`;

  /* Es tria l'activitat abans de crear res: un toc sense voler al "+" no deixa cap cita al pla. */
  function triaActivitat() {
    obreFull(`
      <div class="full-cap"><h2>Cita nova</h2>${botoTanca}</div>
      <div class="activitats">
        ${OPCIONS_ACTIVITAT.map(a => `
          <button type="button" class="opcio-activitat" data-accio="crea" data-activitat="${a}">
            ${icona(a)}<span>${ACTIVITATS[a]}</span>
          </button>`).join('')}
      </div>`, {
      crea: ({ activitat }) => { tancaFull(); crea(activitat); }
    });
  }

  function crea(activitat) {
    const ocupats = new Set(obte().pla.cites.map(c => c.dia));
    const dia = [6, 7, 5, 1, 2, 3, 4].find(d => !ocupats.has(d)) ?? 6;
    const cita = { id: nouId(), dia, hora: '09:00', activitat };
    if (activitat === 'casa') cita.rutina = { nom: RUTINA_PER_DEFECTE, exercicis: [] };
    else cita.duracioMin = 60;
    actualitza(d => {
      const abans = d.pla.cites.length;
      d.pla.cites.push(cita);
      ajustaObjectiu(d, abans);
    });
    location.hash = `#editar/${cita.id}/nova`;
  }

  const clic = e => {
    if (e.target.closest('[data-accio="afegeix"]')) triaActivitat();
  };
  contenidor.addEventListener('click', clic);
  return () => {
    tancaFull();
    contenidor.removeEventListener('click', clic);
  };
}
