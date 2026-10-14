/*
 * Pantalla Avui (PLA.md, seccions 7.1 i 13.3; bosc-pantalles.html): a dalt l'escena del bosc amb la
 * salutació; a sota, un panell amb la propera cita, els pins de la setmana, "Comença", la versió curta i,
 * a sota, "Recuperar" (cites dels últims 7 dies sense fer) i "Extra +" (una sessió fora del pla).
 */
import { obte, actualitza } from '../store.js';
import {
  properaCita, perRecuperar, grups, nomCita, duracioCita, formatMinuts, formatHora, rutinaDe, rutinaBuida, DIES, diaSetmana, dataISO
} from '../cites.js';
import { creaSessio, iniciaAuto, exerciciAcabat, duracioCurta } from '../rutina.js';
import { creaActivitat, restantMs, enPausa } from '../activitat.js';
import { htmlPins } from '../tema.js';
import { valls, htmlEscena, RETALL_AVUI } from '../boscdades.js';
import { activaSo } from '../so.js';
import { esInstallada, mostraInstallacio } from '../installacio.js';
import { htmlPendents } from '../sincronitza.js';
import { confirma, obreFull, tancaFull, botoTanca, mostraAvis, amagaAvis } from '../full.js';
import { dataCurta } from '../resum.js';
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

/* Recuperar (esquerra) i Extra + (dreta): la meitat de l'amplada, més baixos i d'un groc més apagat. */
const SECUNDARIS = `
  <div class="botons-secundaris">
    <button type="button" class="boto recupera" data-accio="recupera">${icona('recupera')} Recuperar</button>
    <button type="button" class="boto extra" data-accio="extra">Extra ${icona('mes')}</button>
  </div>`;

function panell({ etiqueta, dada = '', nom, botons, pins, secundaris = SECUNDARIS }) {
  return `
    <section class="panell-avui" aria-labelledby="nom-cita">
      <div class="panell-cap">
        <span class="quan-etiqueta">${esc(etiqueta)}</span>
        ${dada ? `<span class="quan-dada">${esc(dada)}</span>` : ''}
      </div>
      <div class="nom-fila">
        <h2 class="nom-gran" id="nom-cita">${esc(nom)}</h2>
        ${pins}
      </div>
      ${botons}
      ${secundaris}
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
      pins,
      secundaris: ''
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
    inicia(propera.cita, { curta });
  }

  /*
   * Comença una sessió d'una cita del pla. `extra`: una còpia fora del pla (citaId null, no compta per a
   * l'objectiu ni el bosc, el pla no canvia). `recupera`: el dia que tocava ("2026-10-12"), on compta.
   */
  function inicia(cita, { curta = false, extra = false, recupera = null } = {}) {
    activaSo();
    const estat = obte();
    const rutina = rutinaDe(estat, cita);
    const sessio = rutina ? iniciaAuto(creaSessio(rutina, cita, curta)) : creaActivitat(cita, nomCita(estat, cita));
    if (extra) {
      sessio.extra = true;
      sessio.citaId = null;
      sessio.exercicis?.forEach(ex => { ex.pujada = null; }); // les fletxes de pujada són de la cita
    }
    if (recupera) sessio.recupera = recupera;
    actualitza(d => { d.sessioEnCurs = sessio; });
    location.hash = '#sessio';
  }

  const iconaCita = cita => icona(cita.rutina ? 'casa' : cita.activitat);
  const htmlCita = (cita, accio, i, secundari) => `
    <li>
      <button type="button" class="item-alt" data-accio="${accio}" data-i="${i}">
        <span class="icona-activitat petita">${iconaCita(cita)}</span>
        <span><span class="nom-item">${esc(nomCita(obte(), cita))}</span><span class="secundari">${esc(secundari)}</span></span>
      </button>
    </li>`;
  const textDuracio = cita => {
    const minuts = duracioCita(obte(), cita);
    return minuts ? ` · ${formatMinuts(minuts)}` : '';
  };

  /* Les cites dels últims 7 dies que no s'han fet: es fan ara i compten el dia que tocava. */
  function recupera() {
    const llista = perRecuperar(obte(), new Date());
    if (!llista.length) return mostraAvis('No tens cap activitat per recuperar');
    obreFull(`
      <div class="full-cap"><h2>Recuperar</h2>${botoTanca}</div>
      <ul class="llista-alt">${llista.map(({ cita, data }, i) => htmlCita(cita, 'tria', i, `${dataCurta(data)}${textDuracio(cita)}`)).join('')}</ul>`, {
      tria: ({ i }) => {
        const { cita, data } = llista[Number(i)];
        tancaFull();
        inicia(cita, { recupera: dataISO(data) });
      }
    });
  }

  /* Una sessió fora del pla: una còpia d'una cita (el pla no canvia) o una de nova (#extra). */
  function extra() {
    // Una fila per activitat (la de diversos dies, un sol cop: "Dl · Dc · Dv").
    const llista = grups(obte().pla.cites).filter(g => !rutinaBuida(g[0].rutina));
    const cites = llista.map(g => g[0]);
    if (!cites.length) return void (location.hash = '#extra');
    obreFull(`
      <div class="full-cap"><h2>Extra</h2>${botoTanca}</div>
      <ul class="llista-alt">${llista.map((g, i) => htmlCita(g[0], 'copia', i, `${g.map(c => ABREUJATS[c.dia]).join(' · ')}${textDuracio(g[0])}`)).join('')}</ul>
      <a class="boto contorn" href="#extra" data-accio="tanca">${icona('mes')} Nova</a>`, {
      copia: ({ i }) => {
        tancaFull();
        inicia(cites[Number(i)], { extra: true });
      }
    });
  }

  const clic = e => {
    const boto = e.target.closest('[data-accio]');
    const accio = boto?.dataset.accio;
    if (accio === 'comenca') demanaComencar(false);
    if (accio === 'curta') demanaComencar(true);
    if (accio === 'continua') { activaSo(); location.hash = '#sessio'; }
    if (accio === 'recupera') recupera();
    if (accio === 'extra') extra();
    if (accio === 'installa') mostraInstallacio().then(() => { if (esInstallada()) boto.remove(); });
  };
  contenidor.addEventListener('click', clic);
  return () => {
    amagaAvis();
    tancaFull();
    contenidor.removeEventListener('click', clic);
  };
}
