/*
 * Pantalla Avui (PLA.md, seccions 7.1 i 13.3; bosc-pantalles.html): a dalt l'escena del bosc amb la
 * salutació; a sota, un panell amb la propera cita, "Comença", la versió curta i els pins de la setmana.
 */
import { obte, actualitza } from '../store.js';
import { properaCita, nomCita, duracioCita, formatMinuts, formatHora, rutinaDe, rutinaBuida, DIES, diaSetmana } from '../cites.js';
import { creaSessio, iniciaAuto, exerciciAcabat, duracioCurta } from '../rutina.js';
import { creaActivitat, restantMs, enPausa } from '../activitat.js';
import { htmlPins } from '../tema.js';
import { valls, htmlEscena, RETALL_AVUI } from '../boscdades.js';
import { activaSo } from '../so.js';
import { esInstallada, mostraInstallacio } from '../installacio.js';
import { htmlPendents } from '../sincronitza.js';
import { confirma } from '../full.js';
import { esc } from '../dom.js';
import { icona } from '../icones.js';

const ABREUJATS = ['', 'Dl', 'Dt', 'Dc', 'Dj', 'Dv', 'Ds', 'Dg'];

function salutacio(ara) {
  const h = ara.getHours();
  if (h >= 6 && h < 14) return 'Bon dia';
  if (h >= 14 && h < 21) return 'Bona tarda';
  return 'Bona nit';
}

/* Dies de calendari entre avui i `data` (0 = avui). */
function diesFins(data, ara) {
  const dia = d => new Date(d.getFullYear(), d.getMonth(), d.getDate());
  return Math.round((dia(data) - dia(ara)) / 86400000);
}

/* "Avui", "Demà", "En 4 dies" (es mostra en majúscules). */
function textQuan(dies) {
  if (dies === 0) return 'Avui';
  if (dies === 1) return 'Demà';
  return `En ${dies} dies`;
}

function textEnCurs(s) {
  if (s.tipus === 'rutina') return `${s.exercicis.filter(exerciciAcabat).length}/${s.exercicis.length}`;
  if (s.aturada) return '';
  const queden = formatMinuts(Math.ceil(restantMs(s) / 60000));
  return enPausa(s) ? `Pausa · ${queden}` : queden;
}

function panell({ etiqueta, dada = '', nom, botons, pins }) {
  return `
    <section class="panell-avui" aria-labelledby="nom-cita">
      <div class="panell-cap">
        <span class="quan-etiqueta">${esc(etiqueta)}</span>
        ${dada ? `<span class="quan-dada">${esc(dada)}</span>` : ''}
      </div>
      <h2 class="nom-gran" id="nom-cita">${esc(nom)}</h2>
      ${botons}
      ${pins}
      ${esInstallada() ? '' : `
        <button type="button" class="boto-text discret recordatori" data-accio="installa">${icona('mobil')} Instal·lar accés directe</button>`}
    </section>`;
}

export function munta(contenidor) {
  const estat = obte();
  const ara = new Date();
  const enCurs = estat.sessioEnCurs;
  const propera = properaCita(estat, ara);
  const pins = htmlPins(estat, ara);

  let cos;
  if (enCurs) {
    cos = panell({
      etiqueta: 'A mitges',
      dada: textEnCurs(enCurs),
      nom: enCurs.nom,
      botons: `<div class="botons-avui sol"><button type="button" class="boto principal" data-accio="continua">Continua</button></div>`,
      pins
    });
  } else if (propera) {
    const { cita, data } = propera;
    const minuts = duracioCita(estat, cita);
    const rutina = rutinaDe(estat, cita);
    const buida = rutinaBuida(rutina);
    const curta = rutina && !buida ? duracioCurta(rutina) : null;
    cos = panell({
      etiqueta: textQuan(diesFins(data, ara)),
      dada: `${ABREUJATS[cita.dia]} ${formatHora(cita.hora)}${minuts ? ` · ${formatMinuts(minuts)}` : ''}`,
      nom: nomCita(estat, cita),
      // Una rutina sense exercicis no es pot començar: porta a l'edició per afegir-ne.
      botons: buida ? `
        <div class="botons-avui sol"><a class="boto principal" href="#editar/${esc(cita.id)}">Afegeix exercicis</a></div>` : `
        <div class="botons-avui${rutina ? '' : ' sol'}">
          <button type="button" class="boto principal" data-accio="comenca">Comença</button>
          ${rutina ? `<button type="button" class="boto contorn curta" data-accio="curta" aria-label="Versió curta de ${curta} minuts">${formatMinuts(curta)}</button>` : ''}
        </div>`,
      pins
    });
  } else {
    cos = panell({
      etiqueta: 'Setmana',
      nom: 'Cap activitat programada',
      botons: '<div class="botons-avui sol"><a class="boto contorn" href="#pla">Pla</a></div>',
      pins
    });
  }

  contenidor.innerHTML = `
    <div class="avui">
      <div class="escena escena-avui" aria-hidden="true">${htmlEscena(valls(estat, ara).at(-1), { retall: RETALL_AVUI })}</div>
      <header class="capcalera-escena">
        <h1>${salutacio(ara)}</h1>
        <span class="capcalera-accions">
          ${htmlPendents('sobre-escena')}
          <a class="boto-icona sobre-escena" href="#ajustos/avui" aria-label="Ajustos">${icona('ajustos')}</a>
        </span>
      </header>
      ${cos}
    </div>`;

  /* Si avui no toca, primer es confirma. */
  function demanaComencar(curta) {
    const { data } = propera;
    const dies = diesFins(data, ara);
    if (dies === 0) return comenca(curta);
    confirma({
      titol: 'Segur que vols començar?',
      text: `Toca ${dies === 1 ? 'demà' : DIES[diaSetmana(data)].toLowerCase()}.`,
      boto: 'Comença',
      enConfirmar: () => comenca(curta)
    });
  }

  function comenca(curta) {
    activaSo();
    const { cita } = propera;
    const estat = obte();
    const rutina = rutinaDe(estat, cita);
    const sessio = rutina ? iniciaAuto(creaSessio(rutina, cita, curta)) : creaActivitat(cita, nomCita(estat, cita));
    actualitza(d => { d.sessioEnCurs = sessio; });
    location.hash = '#sessio';
  }

  const clic = e => {
    const boto = e.target.closest('[data-accio]');
    const accio = boto?.dataset.accio;
    if (accio === 'comenca') demanaComencar(false);
    if (accio === 'curta') demanaComencar(true);
    if (accio === 'continua') { activaSo(); location.hash = '#sessio'; }
    if (accio === 'installa') mostraInstallacio().then(() => { if (esInstallada()) boto.remove(); });
  };
  contenidor.addEventListener('click', clic);
  return () => contenidor.removeEventListener('click', clic);
}
