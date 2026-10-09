/* Pantalla Avui (PLA.md, seccions 7.1 i 13.3): la propera cita i, a sota, les gotes de la setmana. L'arbre i l'estació només surten a la pestanya Arbre. */
import { obte, actualitza } from '../store.js';
import { properaCita, nomCita, duracioCita, formatDuracio, formatHora, rutinaDe, DIES, diaSetmana } from '../cites.js';
import { creaSessio, iniciaAuto, exerciciAcabat } from '../rutina.js';
import { creaActivitat, restantMs, enPausa } from '../activitat.js';
import { htmlGotes } from '../tema.js';
import { activaSo } from '../so.js';
import { esInstallada, mostraInstallacio } from '../installacio.js';
import { htmlPendents } from '../sincronitza.js';
import { confirma } from '../full.js';
import { esc, majuscula } from '../dom.js';
import { icona } from '../icones.js';

function salutacio(ara) {
  const h = ara.getHours();
  if (h >= 6 && h < 14) return 'Bon dia';
  if (h >= 14 && h < 21) return 'Bona tarda';
  return 'Bona nit';
}

/* "Dijous, 9 d'octubre" */
function dataLlarga(ara) {
  return majuscula(new Intl.DateTimeFormat('ca', { weekday: 'long', day: 'numeric', month: 'long' }).format(ara));
}

/* Dies de calendari entre avui i `data` (0 = avui). */
function diesFins(data, ara) {
  const dia = d => new Date(d.getFullYear(), d.getMonth(), d.getDate());
  return Math.round((dia(data) - dia(ara)) / 86400000);
}

/* Una sola targeta: icona, nom, quan i, a sota, el botó (13.3). `falta`: quant falta, si no és avui. */
function targetaCita({ icon, etiqueta = null, nom, quan, falta = null, botons }) {
  return `
    <section class="targeta cita${falta ? ' no-toca' : ''}" aria-labelledby="nom-cita">
      <div class="cita-cap">
        <span class="icona-activitat">${icona(icon)}</span>
        <div>
          ${etiqueta ? `<p class="etiqueta">${esc(etiqueta)}</p>` : ''}
          <h2 id="nom-cita">${esc(nom)}</h2>
          <p class="quan">${esc(quan)}</p>
          ${falta ? `<p class="falta">${icona('calendari')}${esc(falta)}</p>` : ''}
        </div>
      </div>
      ${botons}
    </section>`;
}

function textEnCurs(s) {
  if (s.tipus === 'rutina') {
    return `${s.exercicis.filter(exerciciAcabat).length}/${s.exercicis.length} exercicis`;
  }
  if (s.aturada) return 'Falta dir com ha anat';
  const queden = formatDuracio(Math.ceil(restantMs(s) / 60000));
  return enPausa(s) ? `En pausa · ${queden}` : `Queden ${queden}`;
}

export function munta(contenidor) {
  const estat = obte();
  const ara = new Date();
  const enCurs = estat.sessioEnCurs;
  const propera = properaCita(estat, ara);

  let cos;
  if (enCurs) {
    cos = targetaCita({
      icon: enCurs.tipus === 'rutina' ? 'casa' : enCurs.activitat,
      etiqueta: 'A mitges',
      nom: enCurs.nom,
      quan: textEnCurs(enCurs),
      botons: `<button type="button" class="boto principal" data-accio="continua">${icona('play')} Continua</button>`
    });
  } else if (propera) {
    const { cita, data } = propera;
    const dies = diesFins(data, ara);
    const minuts = duracioCita(estat, cita);
    const esRutina = !!rutinaDe(estat, cita);
    // Si avui no toca, el dia surt a "quan" i el que falta a sota ("Demà", "D'aquí 2 dies"); el botó es veu apagat.
    cos = targetaCita({
      icon: cita.activitat,
      nom: nomCita(estat, cita),
      quan: `${dies ? `${DIES[diaSetmana(data)]} ` : ''}${formatHora(cita.hora)}` + (minuts ? `, ${formatDuracio(minuts)}` : ''),
      falta: dies === 0 ? null : dies === 1 ? 'Demà' : `D'aquí ${dies} dies`,
      botons: `
        <button type="button" class="boto principal" data-accio="comenca">${icona('gota')} Comença</button>
        ${esRutina ? '<button type="button" class="boto-text" data-accio="curta">Versió curta</button>' : ''}`
    });
  } else {
    cos = `
      <section class="targeta"><p>Cap cita</p></section>
      <a class="boto contorn" href="#pla">Pla</a>`;
  }

  contenidor.innerHTML = `
    <header class="capcalera amb-accio">
      <div>
        <h1>${salutacio(ara)}</h1>
        <p class="subtitol">${esc(dataLlarga(ara))}</p>
      </div>
      <span class="capcalera-accions">
        ${htmlPendents()}
        <a class="boto-icona" href="#ajustos/avui" aria-label="Ajustos">${icona('ajustos')}</a>
      </span>
    </header>
    ${cos}
    <section class="setmana-avui" aria-label="Aquesta setmana">${htmlGotes(estat, ara)}</section>
    ${esInstallada() ? '' : `
      <button type="button" class="boto-text discret recordatori" data-accio="installa">${icona('mobil')} Instal·lar accés directe</button>`}`;

  /* Si avui no toca, primer es confirma. */
  function demanaComencar(curta) {
    const { data } = propera;
    const dies = diesFins(data, ara);
    if (dies === 0) return comenca(curta);
    confirma({
      titol: 'Segur que vols començar?',
      text: `Toca ${dies === 1 ? 'demà' : DIES[diaSetmana(data)].toLowerCase()}.`,
      boto: `${icona('gota')} Comença`,
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
