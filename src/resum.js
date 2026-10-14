/* resum.js — peces compartides: nom, icona, data i detall d'una sessió feta. */
import { exercici } from './biblioteca.js';
import { ACTIVITATS, formatDuracio, iconaCita, nomCita } from './cites.js';
import { icona } from './icones.js';
import { esc, majuscula } from './dom.js';

const ESTATS = { feta: 'Feta', 'no-acabada': 'No acabada', 'no-feta': 'No feta' };

export function nomSessio(s) {
  const nom = s.nom ?? (s.tipus === 'rutina' ? 'Rutina' : ACTIVITATS[s.activitat] ?? s.activitat);
  return s.curta ? `${nom} (curta)` : nom;
}

/*
 * La icona d'una sessió feta: la de la seva cita al pla d'ara (iconaCita). Una extra copiada no té cita:
 * la d'una cita del pla amb el mateix nom i tipus. Si no n'hi ha cap, la del tipus. No es desa a la sessió.
 */
export function iconaSessio(s, estat = null) {
  const cites = estat?.pla.cites ?? [];
  const tipus = c => (c.rutina ? 'rutina' : 'activitat');
  const cita = cites.find(c => c.id === s.citaId)
    ?? (s.citaId ? null : cites.find(c => tipus(c) === s.tipus && (s.tipus === 'rutina' || c.activitat === s.activitat) && nomCita(estat, c) === s.nom));
  if (cita) return iconaCita(cita);
  return s.tipus === 'rutina' ? 'casa' : s.activitat;
}

/* "Dv., 9 d'oct." */
export function dataCurta(data) {
  return majuscula(new Intl.DateTimeFormat('ca', { weekday: 'short', day: 'numeric', month: 'short' }).format(data));
}

export function minutsDe(s) {
  if (s.tipus === 'activitat') return s.minutsFets;
  return Math.max(1, Math.round((Date.parse(s.fi) - Date.parse(s.inici)) / 60000));
}

/*
 * Detall d'una sessió: temps, taula d'exercicis i pujades (rutina) o minuts (activitat).
 * `plegat`: la taula d'exercicis queda dins un desplegable (al resum en acabar).
 */
export function htmlDetall(s, { plegat = false } = {}) {
  if (s.tipus === 'activitat') {
    return `
      <section class="targeta detall-activitat">
        <p class="xifra-mitjana">${s.minutsFets} <span>de ${s.minutsPrevistos} min</span></p>
        <p class="secundari">${ESTATS[s.estat]}${s.minutsPausa ? ` · ${s.minutsPausa} min de pausa` : ''}</p>
      </section>`;
  }
  const files = (s.exercicis ?? []).map(ex => {
    const nom = exercici(ex.id)?.nom ?? ex.id;
    const unitat = ex.unitat === 'segons' ? 's' : 'reps';
    const valors = ex.saltat ? 'Saltat'
      : ex.series.length ? `${ex.series.map(sr => sr.fet).join(' · ')} ${unitat}` : '—';
    return `
      <tr>
        <th scope="row">${esc(nom)}${ex.substitueix ? `<span class="secundari">en lloc de ${esc(exercici(ex.substitueix)?.nom ?? ex.substitueix)}</span>` : ''}</th>
        <td>${esc(valors)}</td>
      </tr>`;
  }).join('');
  const series = (s.exercicis ?? []).reduce((n, ex) => n + ex.series.length, 0);
  const puja = (s.pujades ?? []).filter(p => !p.maxim).map(p => `
    <li><span>${esc(exercici(p.id)?.nom ?? p.id)}</span><strong>${p.ara} reps</strong> <span class="secundari">(abans ${p.abans})</span></li>`).join('');
  const maxims = (s.pujades ?? []).filter(p => p.maxim).map(p => exercici(p.id)?.nom ?? p.id);
  const pujades = (puja ? `
      <div class="pujades">
        <p class="pujades-titol">${icona('amunt')} Pugen</p>
        <ul>${puja}</ul>
      </div>` : '')
    + (maxims.length ? `
      <p class="pujades maxim">${icona('flama', 'icona flama')}<span>${esc(maxims.join(', '))}: ja ${maxims.length === 1 ? 'és' : 'són'} a 15. Prova una variant més difícil.</span></p>` : '');
  const taula = `
      <table class="taula-resum">
        <thead><tr><th scope="col">Exercici</th><th scope="col">Sèries</th></tr></thead>
        <tbody>${files}</tbody>
      </table>`;
  return `
    <section class="targeta">
      <div class="xifres">
        <p><span class="xifra-mitjana">${esc(formatDuracio(minutsDe(s)))}</span><span class="secundari">temps</span></p>
        <p><span class="xifra-mitjana">${series}</span><span class="secundari">${series === 1 ? 'sèrie' : 'sèries'}</span></p>
      </div>
      ${pujades}
      ${plegat ? `<details class="dades"><summary>Detall ${icona('endavant', 'icona plec')}</summary>${taula}</details>` : taula}
    </section>`;
}
