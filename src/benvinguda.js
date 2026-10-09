/* benvinguda.js — avís de salut (PLA.md, secció 14) i com afegir l'app a la pantalla d'inici (secció 3). */
import { obte, actualitza } from './store.js';
import { obreFull } from './full.js';
import { icona } from './icones.js';

export const TEXT_SALUT = 'Aquests exercicis són suaus i pensats per començar. Si tens alguna lesió o molèstia, consulta-ho abans amb el metge o un fisioterapeuta. Atura\'t sempre que notis dolor.';

/* És un iPhone/iPad obrint l'app des de Safari, no des de la icona de la pantalla d'inici. */
export function esSafariSenseInstallar() {
  const ios = /iPhone|iPad|iPod/.test(navigator.userAgent)
    || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  return ios && navigator.standalone === false;
}

function obreIEspera(html, accions = {}) {
  return new Promise(resol => {
    const full = obreFull(html, accions, { classe: 'benvinguda' });
    full.addEventListener('close', resol, { once: true });
  });
}

export function mostraAvisSalut() {
  return obreIEspera(`
    <div class="benvinguda-cap">
      <span class="icona-activitat">${icona('salut')}</span>
      <h2>Abans de començar</h2>
    </div>
    <p>${TEXT_SALUT}</p>
    <button type="button" class="boto principal" data-accio="tanca">Entesos</button>`)
    .then(() => {
      if (!obte().perfil.avisSalutVist) actualitza(d => { d.perfil.avisSalutVist = true; });
    });
}

export function mostraInstallacio() {
  return obreIEspera(`
    <div class="benvinguda-cap">
      <span class="icona-activitat">${icona('mobil')}</span>
      <h2>Posa l'app a la pantalla d'inici</h2>
    </div>
    <p>Així s'obre com una app, funciona sense connexió i les dades queden sempre al mateix lloc.</p>
    <ol class="passos">
      <li><span class="num">1</span><span>Toca el botó <strong>Comparteix</strong> ${icona('compartir')} de Safari.</span></li>
      <li><span class="num">2</span><span>Tria <strong>Afegeix a la pantalla d'inici</strong> ${icona('afegir')}.</span></li>
      <li><span class="num">3</span><span>Obre l'app des de la icona nova.</span></li>
    </ol>
    <button type="button" class="boto principal" data-accio="tanca">Entesos</button>`)
    .then(() => {
      if (!obte().perfil.installacioVista) actualitza(d => { d.perfil.installacioVista = true; });
    });
}

/* A la primera obertura: primer com instal·lar-la (només a Safari) i després l'avís de salut. */
export async function benvinguda() {
  const { perfil } = obte();
  if (esSafariSenseInstallar() && !perfil.installacioVista) await mostraInstallacio();
  if (!obte().perfil.avisSalutVist) await mostraAvisSalut();
}

