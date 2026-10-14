/*
 * Edició d'una cita (PLA.md, secció 8). És l'únic lloc amb controls d'edició.
 * Cada canvi es desa a l'acte; "Fet" només torna al pla.
 */
import { obte, actualitza, nouId } from '../store.js';
import {
  DIES, ACTIVITATS, OPCIONS_ACTIVITAT, RUTINA_PER_DEFECTE, MAX_NOM_CITA, nomCita, nomPropi, posaNom,
  rutinaDe, clauGrup, duracioRutina, formatDuracio
} from '../cites.js';
import { exercici, alternativesDe, textObjectiu } from '../biblioteca.js';
import { miniatura, exerciciNou, htmlOpcio, obreCercador } from '../cercador.js';
import { obreFull, tancaFull, botoTanca, confirma, mostraAvis, amagaAvis } from '../full.js';
import { icona } from '../icones.js';
import { esc } from '../dom.js';
import { ajustaObjectiu } from '../boscdades.js';

const ABREUJATS = ['', 'Dl', 'Dt', 'Dc', 'Dj', 'Dv', 'Ds', 'Dg'];
const LIMITS = {
  duracio: { min: 15, max: 180, pas: 15 },
  series: { min: 1, max: 6, pas: 1 },
  reps: { min: 1, max: 30, pas: 1 },
  segons: { min: 5, max: 300, pas: 5 },
  descans: { min: 0, max: 180, pas: 5 }
};
function htmlPas({ etiqueta, valor, camp, i, pot }) {
  const dades = `data-camp="${camp}"${i !== undefined ? ` data-i="${i}"` : ''}`;
  return `
    <div class="fila-pas">
      <span>${etiqueta}</span>
      <div class="pas-a-pas compacte">
        <button type="button" class="pas" data-accio="pas" data-signe="-1" ${dades} aria-label="${etiqueta}: menys"${pot.menys ? '' : ' disabled'}>${icona('menys')}</button>
        <output>${esc(valor)}</output>
        <button type="button" class="pas" data-accio="pas" data-signe="1" ${dades} aria-label="${etiqueta}: més"${pot.mes ? '' : ' disabled'}>${icona('mes')}</button>
      </div>
    </div>`;
}

export function munta(contenidor, [id, nova]) {
  if (!obte().pla.cites.some(c => c.id === id)) {
    location.replace('#pla');
    return;
  }
  let obert = null; // exercici desplegat

  /*
   * Una activitat de diversos dies són diverses cites iguals excepte el dia (cites.js, clauGrup).
   * `ids`: les d'aquesta activitat, fixades en obrir. Cada canvi s'aplica a totes.
   */
  const clau = clauGrup(obte().pla.cites.find(c => c.id === id));
  let ids = obte().pla.cites.filter(c => clauGrup(c) === clau).map(c => c.id);
  const membres = d => d.pla.cites.filter(c => ids.includes(c.id));
  const cita = () => obte().pla.cites.find(c => c.id === id);

  function canviaCita(fn) {
    actualitza(d => membres(d).forEach(c => fn(c, d)));
    pinta();
  }

  function canviaRutina(fn) {
    actualitza(d => membres(d).forEach(c => { if (c.rutina) fn(c.rutina, d); }));
    pinta();
  }

  /* Marcar un dia hi afegeix l'activitat (una cita igual); desmarcar-lo la treu d'aquell dia (amb "Desfer"). */
  function commutaDia(dia) {
    const delDia = membres(obte()).find(c => c.dia === dia);
    if (!delDia) {
      const copia = structuredClone(cita());
      copia.id = nouId();
      copia.dia = dia;
      copia.rutina?.exercicis.forEach(ex => { delete ex.pujada; });
      actualitza(d => {
        const abans = d.pla.cites.length;
        d.pla.cites.push(copia);
        ajustaObjectiu(d, abans);
      });
      ids.push(copia.id);
      return pinta();
    }
    if (ids.length === 1) return; // almenys un dia
    const treta = structuredClone(delDia);
    actualitza(d => {
      const abans = d.pla.cites.length;
      d.pla.cites = d.pla.cites.filter(c => c.id !== treta.id);
      ajustaObjectiu(d, abans);
    });
    ids = ids.filter(x => x !== treta.id);
    if (id === treta.id) {
      id = ids[0];
      history.replaceState(null, '', `#editar/${id}${nova ? '/nova' : ''}`);
    }
    pinta();
    mostraAvis(`${DIES[dia]} tret`, {
      accio: 'Desfer',
      enAccio: () => {
        actualitza(d => {
          const abans = d.pla.cites.length;
          d.pla.cites.push(treta);
          ajustaObjectiu(d, abans);
        });
        ids.push(treta.id);
        pinta();
      }
    });
  }

  /* ---------- Dibuix ---------- */

  function htmlExercicis(rutina) {
    return rutina.exercicis.map((ex, i) => {
      const info = exercici(ex.id);
      const obj = ex.series[0];
      const resum = `${ex.series.length} × ${textObjectiu(obj, ex.unitat, ex.perCostat)}`;
      const esObert = obert === i;
      const lim = LIMITS[ex.unitat === 'segons' ? 'segons' : 'reps'];
      return `
        <li class="ex-editor${esObert ? ' obert' : ''}">
          <button type="button" class="ex-fila" data-accio="obre" data-i="${i}" aria-expanded="${esObert}">
            <span class="miniatura">${miniatura(info)}</span>
            <span class="ex-text">
              <span class="nom-item">${i + 1}. ${esc(info?.nom ?? ex.id)}</span>
              <span class="secundari">${esc(resum)}</span>
            </span>
            ${icona('endavant', 'icona plec')}
          </button>
          ${esObert ? `
            <div class="ex-ajustos">
              ${htmlPas({ etiqueta: 'Sèries', valor: ex.series.length, camp: 'series', i,
                pot: { menys: ex.series.length > LIMITS.series.min, mes: ex.series.length < LIMITS.series.max } })}
              ${htmlPas({ etiqueta: ex.unitat === 'segons' ? 'Segons' : 'Reps', valor: obj, camp: 'objectiu', i,
                pot: { menys: obj > lim.min, mes: obj < lim.max } })}
              ${htmlPas({ etiqueta: 'Descans', valor: `${ex.descans} s`, camp: 'descans', i,
                pot: { menys: ex.descans > LIMITS.descans.min, mes: ex.descans < LIMITS.descans.max } })}
              <div class="fila-botons icones">
                <button type="button" class="boto contorn" data-accio="puja" data-i="${i}" aria-label="Amunt"${i === 0 ? ' disabled' : ''}>${icona('amunt')}</button>
                <button type="button" class="boto contorn" data-accio="baixa" data-i="${i}" aria-label="Avall"${i === rutina.exercicis.length - 1 ? ' disabled' : ''}>${icona('avall')}</button>
                <button type="button" class="boto contorn" data-accio="substitueix" data-i="${i}" aria-label="Canviar">${icona('canvia')}</button>
                <button type="button" class="boto contorn" data-accio="treu" data-i="${i}" aria-label="Treure">${icona('paperera')}</button>
              </div>
            </div>` : ''}
        </li>`;
    }).join('');
  }

  function pinta() {
    const estat = obte(), c = cita();
    if (!c) return;
    const rutina = rutinaDe(estat, c);
    const dies = new Set(membres(estat).map(x => x.dia));
    const focus = document.activeElement?.closest?.('[data-accio]');
    const clauFocus = focus && contenidor.contains(focus)
      ? `[data-accio="${focus.dataset.accio}"]${focus.dataset.i ? `[data-i="${focus.dataset.i}"]` : ''}${focus.dataset.camp ? `[data-camp="${focus.dataset.camp}"]` : ''}${focus.dataset.signe ? `[data-signe="${focus.dataset.signe}"]` : ''}${focus.dataset.valor ? `[data-valor="${focus.dataset.valor}"]` : ''}`
      : null;

    contenidor.innerHTML = `
      <header class="capcalera amb-enrere">
        <a class="boto-icona" href="#pla" aria-label="Tornar al pla">${icona('enrere')}</a>
        <div>
          ${nova ? '<p class="data">Cita nova</p>' : ''}
          <h1>${esc(nomCita(estat, c))}</h1>
        </div>
      </header>

      <section class="targeta camp-edicio">
        <h2 class="titol-targeta" id="t-dia">Dies</h2>
        <div class="dies" role="group" aria-labelledby="t-dia">
          ${[1, 2, 3, 4, 5, 6, 7].map(d => `
            <button type="button" role="checkbox" class="dia" data-accio="dia" data-valor="${d}"
              aria-checked="${dies.has(d)}" aria-label="${DIES[d]}">${ABREUJATS[d]}</button>`).join('')}
        </div>
        <label class="titol-targeta" for="hora">Hora</label>
        <input id="hora" class="camp-hora" type="time" value="${esc(c.hora)}" data-camp="hora">
      </section>

      <section class="targeta camp-edicio">
        <h2 class="titol-targeta" id="t-activitat">Activitat</h2>
        <div class="activitats" role="radiogroup" aria-labelledby="t-activitat">
          ${OPCIONS_ACTIVITAT.map(a => `
            <button type="button" role="radio" class="opcio-activitat" data-accio="activitat" data-valor="${a}" aria-checked="${a === c.activitat}">
              ${icona(a)}<span>${ACTIVITATS[a]}</span>
            </button>`).join('')}
        </div>
        <label class="titol-targeta" for="nom-cita">Nom</label>
        <input id="nom-cita" class="camp-text" type="text" data-camp="nom" maxlength="${MAX_NOM_CITA}" autocomplete="off"
          placeholder="${esc(c.rutina ? RUTINA_PER_DEFECTE : ACTIVITATS[c.activitat] ?? '')}" value="${esc(nomPropi(c))}">
      </section>

      ${rutina ? `
        <section class="targeta camp-edicio">
          <h2 class="titol-targeta">Exercicis${rutina.exercicis.length ? ` <span class="secundari">${duracioRutina(rutina)} min</span>` : ''}</h2>
          <ol class="llista-editor">${htmlExercicis(rutina)}</ol>
          <button type="button" class="boto contorn" data-accio="afegeix-ex">${icona('mes')} Afegir exercici</button>
        </section>` : `
        <section class="targeta camp-edicio">
          ${htmlPas({ etiqueta: 'Duració', valor: formatDuracio(c.duracioMin), camp: 'duracio',
            pot: { menys: c.duracioMin > LIMITS.duracio.min, mes: c.duracioMin < LIMITS.duracio.max } })}
        </section>`}

      <div class="pila-botons">
        <a class="boto principal" href="#pla">Fet</a>
        <button type="button" class="boto-text discret" data-accio="esborra">${icona('paperera')} Esborrar la cita</button>
      </div>`;

    if (clauFocus) contenidor.querySelector(clauFocus)?.focus({ preventScroll: true });
  }

  /* ---------- Accions ---------- */

  function pas({ camp, signe, i }) {
    const s = Number(signe), idx = Number(i);
    if (camp === 'duracio') {
      const { min, max, pas } = LIMITS.duracio;
      return canviaCita(c => { c.duracioMin = Math.min(max, Math.max(min, c.duracioMin + s * pas)); });
    }
    canviaRutina(r => {
      const ex = r.exercicis[idx];
      delete ex.pujada; // un canvi a mà substitueix l'avís de pujada automàtica
      if (camp === 'series') {
        if (s > 0 && ex.series.length < LIMITS.series.max) ex.series.push(ex.series.at(-1));
        if (s < 0 && ex.series.length > LIMITS.series.min) ex.series.pop();
      }
      if (camp === 'objectiu') {
        const { min, max, pas } = LIMITS[ex.unitat === 'segons' ? 'segons' : 'reps'];
        const nou = Math.min(max, Math.max(min, ex.series[0] + s * pas));
        ex.series = ex.series.map(() => nou);
      }
      if (camp === 'descans') {
        const { min, max, pas } = LIMITS.descans;
        ex.descans = Math.min(max, Math.max(min, ex.descans + s * pas));
      }
    });
  }

  function mou(i, cap) {
    canviaRutina(r => {
      const [ex] = r.exercicis.splice(i, 1);
      r.exercicis.splice(i + cap, 0, ex);
    });
    obert = i + cap;
    pinta();
    const boto = contenidor.querySelector(`[data-accio="${cap < 0 ? 'puja' : 'baixa'}"][data-i="${obert}"]:not([disabled])`)
      ?? contenidor.querySelector(`[data-accio="obre"][data-i="${obert}"]`);
    boto?.focus({ preventScroll: true });
  }

  function treu(i) {
    const r = rutinaDe(obte(), cita());
    const ex = r.exercicis[i];
    obert = null;
    canviaRutina(r => { r.exercicis.splice(i, 1); });
    mostraAvis(`${exercici(ex.id)?.nom ?? 'Exercici'} tret`, {
      accio: 'Desfer',
      enAccio: () => { canviaRutina(r => { r.exercicis.splice(i, 0, structuredClone(ex)); }); }
    });
  }

  function canviaActivitat(nova) {
    canviaCita((c, d) => {
      if (c.activitat === nova) return;
      c.activitat = nova;
      // El nom que hi ha posat l'usuari es queda; el per defecte canvia amb l'activitat.
      if (nova === 'casa') {
        // Comença buida: els exercicis s'afegeixen amb "Afegir exercici".
        c.rutina ??= { nom: c.nom || RUTINA_PER_DEFECTE, exercicis: [] };
        delete c.nom;
        delete c.duracioMin;
      } else {
        const nom = c.rutina?.nom;
        if (nom && nom !== RUTINA_PER_DEFECTE && nom !== 'Rutina general') c.nom = nom;
        delete c.rutina;
        c.duracioMin ??= 60;
      }
    });
  }

  function obreSubstitucio(i) {
    const ex = rutinaDe(obte(), cita()).exercicis[i];
    const opcions = alternativesDe(ex.id);
    obreFull(`
      <div class="full-cap"><h2>Canviar ${esc(exercici(ex.id)?.nom ?? ex.id)}</h2>${botoTanca}</div>
      ${opcions.length ? `<p class="etiqueta">Alternatives semblants:</p>
        <ul class="llista-alt">${opcions.map(a => htmlOpcio(a)).join('')}</ul>` : ''}
      <button type="button" class="boto contorn" data-accio="cerca">${icona('cerca')} Buscar-ne un altre</button>`, {
      tria: ({ id: nou }) => { tancaFull(); substitueix(i, nou); },
      cerca: () => cerca({ substitueix: i })
    });
  }

  function substitueix(i, idNou) {
    canviaRutina(r => { r.exercicis[i] = exerciciNou(exercici(idNou), r.exercicis[i]); });
  }

  /* El cercador (cercador.js), per afegir un exercici o per substituir el número `index`. */
  function cerca({ substitueix: index } = {}) {
    obreCercador({
      titol: index === undefined ? 'Afegir exercici' : 'Buscar un exercici',
      enTriar: triat => {
        if (index !== undefined) return substitueix(index, triat);
        canviaRutina(r => { r.exercicis.push(exerciciNou(exercici(triat))); });
        obert = rutinaDe(obte(), cita()).exercicis.length - 1;
        pinta();
        contenidor.querySelector(`[data-accio="obre"][data-i="${obert}"]`)?.scrollIntoView({ block: 'center' });
      }
    });
  }

  const ACCIONS = {
    dia: ({ valor }) => commutaDia(Number(valor)),
    activitat: ({ valor }) => canviaActivitat(valor),
    pas,
    obre: ({ i }) => { obert = obert === Number(i) ? null : Number(i); pinta(); },
    puja: ({ i }) => mou(Number(i), -1),
    baixa: ({ i }) => mou(Number(i), 1),
    treu: ({ i }) => treu(Number(i)),
    substitueix: ({ i }) => obreSubstitucio(Number(i)),
    'afegeix-ex': () => cerca(),
    esborra: () => confirma({
      titol: 'Vols esborrar aquesta cita?',
      text: `${ids.length > 1 ? 'S\'esborra de tots els dies. ' : ''}L'historial de sessions no s'esborra.`,
      boto: 'Esborrar la cita',
      enConfirmar: () => {
        actualitza(d => {
          const abans = d.pla.cites.length;
          d.pla.cites = d.pla.cites.filter(c => !ids.includes(c.id));
          ajustaObjectiu(d, abans);
        });
        location.hash = '#pla';
      }
    })
  };

  const clic = e => {
    const boto = e.target.closest('[data-accio]');
    if (boto && contenidor.contains(boto) && !boto.disabled) ACCIONS[boto.dataset.accio]?.(boto.dataset);
  };
  // El nom es desa a cada lletra sense tornar a dibuixar la pantalla (no es perd el focus ni el que s'escriu).
  const escriu = e => {
    if (e.target.dataset.camp !== 'nom') return;
    const text = e.target.value;
    actualitza(d => { membres(d).forEach(c => posaNom(c, text)); });
    contenidor.querySelector('h1').textContent = nomCita(obte(), cita());
  };
  const canvi = e => {
    if (e.target.dataset.camp === 'hora' && /^\d{2}:\d{2}$/.test(e.target.value)) {
      const hora = e.target.value;
      actualitza(d => { membres(d).forEach(c => { c.hora = hora; }); });
    }
  };

  contenidor.addEventListener('click', clic);
  contenidor.addEventListener('change', canvi);
  contenidor.addEventListener('input', escriu);
  pinta();

  return () => {
    amagaAvis();
    tancaFull();
    contenidor.removeEventListener('click', clic);
    contenidor.removeEventListener('change', canvi);
    contenidor.removeEventListener('input', escriu);
  };
}
