/* benvinguda.js — primera obertura: com instal·lar l'app (src/installacio.js) i l'avís de salut (PLA.md, secció 14). */
import { obte, actualitza } from './store.js';
import { obreFull } from './full.js';
import { icona } from './icones.js';
import { esInstallada, mostraInstallacio } from './installacio.js';

export const TEXT_SALUT = 'Aquests exercicis són suaus i pensats per començar. Si tens alguna lesió o molèstia, consulta-ho abans amb el metge o un fisioterapeuta. Atura\'t sempre que notis dolor.';

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

/*
 * A la primera obertura: primer com instal·lar-la (si no s'obre ja com a app), encara que no s'hagi
 * entrat (a l'iPhone, Safari i l'app instal·lada no comparteixen la sessió). L'avís de salut, després d'entrar.
 */
let enCurs = null;
export function benvinguda() {
  enCurs ??= (async () => {
    if (!esInstallada() && !obte().perfil.installacioVista) await mostraInstallacio();
    if (obte().compte && !obte().perfil.avisSalutVist) await mostraAvisSalut();
  })().finally(() => { enCurs = null; });
  return enCurs;
}

