/* Pantalla Pla (PLA.md, seccions 7.6 i 13.3): les cites de la setmana. L'edició només s'obre amb el llapis. */
import { obte, actualitza, nouId } from '../store.js';
import { DIES, nomCita, formatHora } from '../cites.js';
import { htmlPendents } from '../sincronitza.js';
import { icona } from '../icones.js';
import { esc } from '../dom.js';

const ABREUJATS = ['', 'Dl', 'Dt', 'Dc', 'Dj', 'Dv', 'Ds', 'Dg'];

export function ordenaCites(cites) {
  return [...cites].sort((a, b) => a.dia - b.dia || a.hora.localeCompare(b.hora));
}

export function munta(contenidor) {
  const estat = obte();
  const cites = ordenaCites(estat.pla.cites);

  const targetes = cites.map(cita => {
    return `
      <li class="targeta cita-pla">
        <span class="icona-activitat">${icona(cita.activitat)}</span>
        <div class="cita-text">
          <h2>${esc(nomCita(estat, cita))}</h2>
          <p class="secundari">${ABREUJATS[cita.dia]} ${formatHora(cita.hora)}</p>
        </div>
        <a class="boto-icona editar" href="#editar/${esc(cita.id)}" aria-label="Editar ${esc(nomCita(estat, cita))} del ${DIES[cita.dia].toLowerCase()}">${icona('llapis')}</a>
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
    ${cites.length ? `<ul class="llista-cites">${targetes}</ul>` : '<section class="targeta"><p>Cap cita</p></section>'}
    <button type="button" class="boto-afegir" data-accio="afegeix" aria-label="Afegir una cita">${icona('mes')}</button>`;

  const clic = e => {
    if (!e.target.closest('[data-accio="afegeix"]')) return;
    const ocupats = new Set(obte().pla.cites.map(c => c.dia));
    const dia = [6, 7, 5, 1, 2, 3, 4].find(d => !ocupats.has(d)) ?? 6;
    const cita = { id: nouId(), dia, hora: '09:00', activitat: 'caminar', duracioMin: 60 };
    actualitza(d => { d.pla.cites.push(cita); });
    location.hash = `#editar/${cita.id}/nova`;
  };
  contenidor.addEventListener('click', clic);
  return () => contenidor.removeEventListener('click', clic);
}
