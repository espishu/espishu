/* Pestanya Bosc (PLA.md, seccions 7.5 i 13.3): l'escena del bosc i, a sota, plegats, l'historial i els gràfics. */
import { obte } from '../store.js';
import { sessionsDeLaSetmana, dilluns } from '../ratxa.js';
import { exercici } from '../biblioteca.js';
import { ACTIVITATS } from '../cites.js';
import { htmlDetall, nomSessio, iconaSessio, dataCurta, minutsDe } from '../resum.js';
import { muntaLinia, muntaColumnes } from '../grafics.js';
import { icona } from '../icones.js';
import { esc, majuscula } from '../dom.js';
import { htmlPendents } from '../sincronitza.js';

/* Ordre i color fixos per activitat (to i lluminositat diferents sobre fons fosc). */
const SERIES_ACTIVITAT = [
  { clau: 'natacio', nom: ACTIVITATS.natacio, color: 'var(--a-natacio)' },
  { clau: 'caminar', nom: ACTIVITATS.caminar, color: 'var(--a-caminar)' },
  { clau: 'correr', nom: ACTIVITATS.correr, color: 'var(--a-correr)' },
  { clau: 'bici', nom: ACTIVITATS.bici, color: 'var(--a-bici)' }
];
const ESTATS = { feta: 'Feta', 'no-acabada': 'No acabada', 'no-feta': 'No feta' };

const diaMes = d => new Intl.DateTimeFormat('ca', { day: 'numeric', month: 'short' }).format(d);
const diaMesNum = d => `${d.getDate()}/${d.getMonth() + 1}`;

export function munta(contenidor, [id]) {
  return id ? muntaDetall(contenidor, id) : muntaResum(contenidor);
}

function muntaDetall(contenidor, id) {
  const sessio = obte().sessions.find(s => s.id === id);
  if (!sessio) { location.replace('#progres'); return; }
  contenidor.innerHTML = `
    <header class="capcalera amb-enrere">
      <a class="boto-icona" href="#progres" aria-label="Tornar al bosc">${icona('enrere')}</a>
      <div>
        <p class="data">${esc(dataCurta(new Date(sessio.inici)))}</p>
        <h1>${esc(nomSessio(sessio))}</h1>
      </div>
    </header>
    ${htmlDetall(sessio)}`;
}

/* Exercicis amb historial, per triar-ne un al gràfic de repeticions. */
function exercicisAmbHistorial(sessions) {
  const vegades = new Map();
  for (const s of sessions) {
    if (s.tipus !== 'rutina') continue;
    for (const ex of s.exercicis ?? []) {
      if (ex.series.length) vegades.set(ex.id, (vegades.get(ex.id) ?? 0) + 1);
    }
  }
  return [...vegades.keys()];
}

function puntsExercici(sessions, id) {
  return sessions
    .filter(s => s.tipus === 'rutina')
    .map(s => {
      const ex = s.exercicis?.find(e => e.id === id && e.series.length);
      return ex && { data: new Date(s.inici), valor: ex.series.reduce((t, sr) => t + sr.fet, 0), unitat: ex.unitat };
    })
    .filter(Boolean)
    .sort((a, b) => a.data - b.data);
}

function minutsPerSetmana(estat, ara, quantes = 8) {
  const actual = dilluns(ara);
  return Array.from({ length: quantes }, (_, i) => {
    const inici = new Date(actual.getFullYear(), actual.getMonth(), actual.getDate() - 7 * (quantes - 1 - i));
    const valors = {};
    for (const s of sessionsDeLaSetmana(estat, inici)) {
      if (s.tipus === 'activitat') valors[s.activitat] = (valors[s.activitat] ?? 0) + s.minutsFets;
    }
    return { etiqueta: diaMesNum(inici), etiquetaLlarga: `setmana del ${diaMes(inici)}`, valors };
  });
}

function muntaResum(contenidor) {
  const estat = obte();
  const ara = new Date();
  const sessions = [...estat.sessions].sort((a, b) => Date.parse(b.inici) - Date.parse(a.inici));

  const historial = sessions.length ? sessions.map(s => `
    <li>
      <a class="item-historial" href="#progres/${esc(s.id)}">
        <span class="icona-activitat petita">${icona(iconaSessio(s))}</span>
        <span class="text-historial">
          <span class="nom-item">${esc(nomSessio(s))}</span>
          <span class="secundari">${esc(dataCurta(new Date(s.inici)))} · ${minutsDe(s)} min</span>
        </span>
        <span class="estat-historial ${s.estat}">${ESTATS[s.estat]}</span>
      </a>
    </li>`).join('') : '';

  const exercicis = exercicisAmbHistorial(sessions);
  const activitats = minutsPerSetmana(estat, ara);
  const seriesAmbDades = SERIES_ACTIVITAT.filter(sr => activitats.some(s => s.valors[sr.clau] > 0));


  contenidor.innerHTML = `
    <header class="capcalera amb-accio">
      <h1>El bosc</h1>
      <span class="capcalera-accions">
        ${htmlPendents()}
        <a class="boto-icona" href="#ajustos/progres" aria-label="Ajustos">${icona('ajustos')}</a>
      </span>
    </header>

    <section class="targeta plegats">
    <details class="plegat">
      <summary><h2 class="titol-targeta">Historial</h2>${icona('endavant', 'icona plec')}</summary>
      ${historial ? `<ul class="historial">${historial}</ul>` : '<p class="secundari">Encara no hi ha cap sessió.</p>'}
    </details>

    <details class="plegat">
      <summary><h2 class="titol-targeta">Gràfics</h2>${icona('endavant', 'icona plec')}</summary>
      <h3 class="subtitol">Repeticions</h3>
      ${exercicis.length ? `
        <label class="selector">
          <span class="visually-hidden">Exercici</span>
          <select data-exercici>${exercicis.map(id => `<option value="${esc(id)}">${esc(exercici(id)?.nom ?? id)}</option>`).join('')}</select>
        </label>
        <div class="grafic" data-grafic="linia"></div>
        <details class="dades"><summary>Veure les dades ${icona('endavant', 'icona plec')}</summary><div data-taula="linia"></div></details>`
      : '<p class="secundari">Encara no hi ha dades.</p>'}
      <h3 class="subtitol">Minuts</h3>
      ${seriesAmbDades.length ? `
        <ul class="llegenda">${seriesAmbDades.map(sr => `<li><span class="mostra" style="background:${sr.color}"></span>${esc(sr.nom)}</li>`).join('')}</ul>
        <div class="grafic" data-grafic="columnes"></div>
        <details class="dades"><summary>Veure les dades ${icona('endavant', 'icona plec')}</summary>
          <table class="taula-resum">
            <thead><tr><th scope="col">Setmana</th>${seriesAmbDades.map(sr => `<th scope="col">${esc(sr.nom)}</th>`).join('')}</tr></thead>
            <tbody>${activitats.map(s => `<tr><th scope="row">${esc(s.etiquetaLlarga)}</th>${seriesAmbDades.map(sr => `<td>${s.valors[sr.clau] ?? 0} min</td>`).join('')}</tr>`).join('')}</tbody>
          </table>
        </details>`
      : '<p class="secundari">Encara no hi ha dades.</p>'}
    </details>
    </section>`;

  const select = contenidor.querySelector('[data-exercici]');
  function pintaLinia() {
    const id = select.value, nom = exercici(id)?.nom ?? id;
    const punts = puntsExercici(sessions, id);
    const unitat = punts[0]?.unitat === 'segons' ? 's' : 'reps';
    muntaLinia(contenidor.querySelector('[data-grafic="linia"]'), punts, {
      unitat,
      format: diaMes,
      descripcio: `${nom}: ${punts.length} sessions, l'última amb ${punts.at(-1).valor} ${unitat}`
    });
    contenidor.querySelector('[data-taula="linia"]').innerHTML = `
      <table class="taula-resum">
        <thead><tr><th scope="col">Dia</th><th scope="col">Total</th></tr></thead>
        <tbody>${punts.map(p => `<tr><th scope="row">${esc(majuscula(diaMes(p.data)))}</th><td>${p.valor} ${unitat}</td></tr>`).join('')}</tbody>
      </table>`;
  }
  if (select) {
    // Per defecte, el primer exercici de força (el que té més sentit veure pujar).
    select.value = exercicis.find(id => exercici(id)?.tipus === 'força') ?? exercicis[0];
    select.addEventListener('change', pintaLinia);
    pintaLinia();
  }
  if (seriesAmbDades.length) {
    muntaColumnes(contenidor.querySelector('[data-grafic="columnes"]'), activitats, seriesAmbDades, {
      unitat: 'min',
      descripcio: `Minuts d'activitat de les últimes ${activitats.length} setmanes`
    });
  }
}
