/*
 * Edició d'una cita (PLA.md, secció 8). És l'únic lloc amb controls d'edició.
 * Cada canvi es desa a l'acte; "Fet" només torna al pla.
 */
import { obte, actualitza, rutinaGeneral } from '../store.js';
import { DIES, ACTIVITATS, nomCita, rutinaDe, duracioRutina, formatDuracio } from '../cites.js';
import { exercici, alternativesDe, totsElsExercicis, textObjectiu, GRUPS, materialQueFalta } from '../biblioteca.js';
import { renderAnimacio } from '../animacions.js';
import { obreFull, tancaFull, botoTanca, confirma, mostraAvis, amagaAvis } from '../full.js';
import { icona } from '../icones.js';
import { esc } from '../dom.js';

const ABREUJATS = ['', 'Dl', 'Dt', 'Dc', 'Dj', 'Dv', 'Ds', 'Dg'];
const OPCIONS_ACTIVITAT = ['casa', 'natacio', 'caminar', 'bici', 'correr'];
const LIMITS = {
  duracio: { min: 15, max: 180, pas: 15 },
  series: { min: 1, max: 6, pas: 1 },
  reps: { min: 1, max: 30, pas: 1 },
  segons: { min: 5, max: 300, pas: 5 },
  descans: { min: 0, max: 180, pas: 5 }
};
const DESCANS_PER_DEFECTE = { força: 45, mobilitat: 30, estirament: 15 };

function miniatura(info) {
  if (info?.animacio) return renderAnimacio(info.animacio, 0);
  return info?.imatges?.[0] ? `<img src="${esc(info.imatges[0])}" alt="" loading="lazy">` : '';
}

/* Un exercici de la biblioteca preparat per a la rutina, amb els valors per defecte. */
function exerciciNou(info, base) {
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

  const cita = () => obte().pla.cites.find(c => c.id === id);

  function canviaCita(fn) {
    actualitza(d => fn(d.pla.cites.find(c => c.id === id), d));
    pinta();
  }

  function canviaRutina(fn) {
    actualitza(d => {
      const r = d.pla.cites.find(x => x.id === id)?.rutina;
      if (r) fn(r, d);
    });
    pinta();
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
                <button type="button" class="boto contorn" data-accio="treu" data-i="${i}" aria-label="Treure"${rutina.exercicis.length === 1 ? ' disabled' : ''}>${icona('paperera')}</button>
              </div>
            </div>` : ''}
        </li>`;
    }).join('');
  }

  function pinta() {
    const estat = obte(), c = cita();
    if (!c) return;
    const rutina = rutinaDe(estat, c);
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
        <h2 class="titol-targeta" id="t-dia">Dia</h2>
        <div class="dies" role="radiogroup" aria-labelledby="t-dia">
          ${[1, 2, 3, 4, 5, 6, 7].map(d => `
            <button type="button" role="radio" class="dia" data-accio="dia" data-valor="${d}"
              aria-checked="${d === c.dia}" aria-label="${DIES[d]}">${ABREUJATS[d]}</button>`).join('')}
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
      </section>

      ${rutina ? `
        <section class="targeta camp-edicio">
          <h2 class="titol-targeta">${esc(rutina.nom)} <span class="secundari">${duracioRutina(rutina)} min</span></h2>
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
      enAccio: () => { canviaRutina(r => { r.exercicis.splice(i, 0, ex); }); }
    });
  }

  function canviaActivitat(nova) {
    canviaCita((c, d) => {
      if (c.activitat === nova) return;
      c.activitat = nova;
      if (nova === 'casa') {
        // Una còpia de la rutina d'una altra cita de casa, si n'hi ha; si no, la rutina inicial.
        const altra = d.pla.cites.find(x => x !== c && x.rutina)?.rutina;
        c.rutina ??= altra ? JSON.parse(JSON.stringify(altra)) : rutinaGeneral();
        c.rutina.exercicis.forEach(ex => { delete ex.pujada; });
        delete c.duracioMin;
      } else {
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
      cerca: () => obreCercador({ substitueix: i })
    });
  }

  function substitueix(i, idNou) {
    canviaRutina(r => { r.exercicis[i] = exerciciNou(exercici(idNou), r.exercicis[i]); });
  }

  function htmlOpcio(info) {
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

  /* Cercador amb filtre per grup muscular. Serveix per afegir o per substituir. */
  function obreCercador({ substitueix: index } = {}) {
    let grup = 'tots', text = '';
    const totes = totsElsExercicis();
    const full = obreFull(`
      <div class="full-cap"><h2>${index === undefined ? 'Afegir exercici' : 'Buscar un exercici'}</h2>${botoTanca}</div>
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
      tria: ({ id: triat }) => {
        tancaFull();
        if (index !== undefined) return substitueix(index, triat);
        canviaRutina(r => { r.exercicis.push(exerciciNou(exercici(triat))); });
        obert = rutinaDe(obte(), cita()).exercicis.length - 1;
        pinta();
        contenidor.querySelector(`[data-accio="obre"][data-i="${obert}"]`)?.scrollIntoView({ block: 'center' });
      }
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

  const ACCIONS = {
    dia: ({ valor }) => canviaCita(c => { c.dia = Number(valor); }),
    activitat: ({ valor }) => canviaActivitat(valor),
    pas,
    obre: ({ i }) => { obert = obert === Number(i) ? null : Number(i); pinta(); },
    puja: ({ i }) => mou(Number(i), -1),
    baixa: ({ i }) => mou(Number(i), 1),
    treu: ({ i }) => treu(Number(i)),
    substitueix: ({ i }) => obreSubstitucio(Number(i)),
    'afegeix-ex': () => obreCercador(),
    esborra: () => confirma({
      titol: 'Vols esborrar aquesta cita?',
      text: 'L\'historial de sessions no s\'esborra.',
      boto: 'Esborrar la cita',
      enConfirmar: () => {
        actualitza(d => { d.pla.cites = d.pla.cites.filter(c => c.id !== id); });
        location.hash = '#pla';
      }
    })
  };

  const clic = e => {
    const boto = e.target.closest('[data-accio]');
    if (boto && contenidor.contains(boto) && !boto.disabled) ACCIONS[boto.dataset.accio]?.(boto.dataset);
  };
  const canvi = e => {
    if (e.target.dataset.camp === 'hora' && /^\d{2}:\d{2}$/.test(e.target.value)) {
      const hora = e.target.value;
      actualitza(d => { d.pla.cites.find(c => c.id === id).hora = hora; });
    }
  };

  contenidor.addEventListener('click', clic);
  contenidor.addEventListener('change', canvi);
  pinta();

  return () => {
    amagaAvis();
    tancaFull();
    contenidor.removeEventListener('click', clic);
    contenidor.removeEventListener('change', canvi);
  };
}
