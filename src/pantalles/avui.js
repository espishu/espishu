/* Pantalla Avui (PLA.md, seccions 7.1 i 13.3): la propera cita i, a sota, les gotes de la setmana. L'arbre només surt a la pestanya Arbre. */
import { obte, actualitza } from '../store.js';
import { properaCita, nomCita, duracioCita, formatDuracio, formatHora, nomDia, rutinaDe } from '../cites.js';
import { creaSessio, iniciaAuto, exerciciAcabat } from '../rutina.js';
import { creaActivitat, restantMs, enPausa } from '../activitat.js';
import { htmlEstacio, htmlGotes } from '../tema.js';
import { activaSo } from '../so.js';
import { ferCopia, calRecordarCopia } from '../copia.js';
import { esInstallada, mostraInstallacio } from '../installacio.js';
import { mostraAvis } from '../full.js';
import { esc } from '../dom.js';
import { icona } from '../icones.js';

function salutacio(ara) {
  const h = ara.getHours();
  if (h >= 6 && h < 14) return 'Bon dia';
  if (h >= 14 && h < 21) return 'Bona tarda';
  return 'Bona nit';
}

/* Una sola targeta: icona, nom, quan i, a sota, el botó (13.3). */
function targetaCita({ icon, etiqueta = null, nom, quan, botons }) {
  return `
    <section class="targeta cita" aria-labelledby="nom-cita">
      <div class="cita-cap">
        <span class="icona-activitat">${icona(icon)}</span>
        <div>
          ${etiqueta ? `<p class="etiqueta">${esc(etiqueta)}</p>` : ''}
          <h2 id="nom-cita">${esc(nom)}</h2>
          <p class="quan">${esc(quan)}</p>
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
    const dia = nomDia(data, ara);
    const minuts = duracioCita(estat, cita);
    const esRutina = !!rutinaDe(estat, cita);
    cos = targetaCita({
      icon: cita.activitat,
      nom: nomCita(estat, cita),
      quan: `${dia === 'Avui' ? '' : `${dia} `}${formatHora(cita.hora)}` + (minuts ? `, ${formatDuracio(minuts)}` : ''),
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
    <header class="capcalera amb-estacio">
      <h1>${salutacio(ara)}</h1>
      ${htmlEstacio(ara)}
    </header>
    ${cos}
    <section class="setmana-avui" aria-label="Aquesta setmana">${htmlGotes(estat, ara)}</section>
    ${calRecordarCopia(estat, ara) ? `
      <section class="targeta avis-discret">
        ${icona('desa')}
        <p>Còpia pendent</p>
        <button type="button" class="boto contorn petit" data-accio="copia">Fer-la</button>
      </section>` : ''}
    ${esInstallada() ? '' : `
      <button type="button" class="boto-text discret recordatori" data-accio="installa">${icona('mobil')} Instal·lar accés directe</button>`}`;

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
    if (accio === 'comenca') comenca(false);
    if (accio === 'curta') comenca(true);
    if (accio === 'continua') { activaSo(); location.hash = '#sessio'; }
    if (accio === 'copia') {
      ferCopia().then(fet => {
        if (!fet) return;
        boto.closest('.avis-discret')?.remove();
        mostraAvis('Còpia feta');
      });
    }
    if (accio === 'installa') mostraInstallacio().then(() => { if (esInstallada()) boto.remove(); });
  };
  contenidor.addEventListener('click', clic);
  return () => contenidor.removeEventListener('click', clic);
}
