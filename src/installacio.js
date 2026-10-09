/*
 * installacio.js — com posar l'app a la pantalla d'inici o a l'ordinador (PLA.md, secció 21.2).
 * Les instruccions depenen del navegador. Chrome, Edge i Samsung Internet deixen obrir el seu
 * diàleg d'instal·lació (beforeinstallprompt): llavors n'hi ha prou amb un botó.
 */
import { obte, actualitza } from './store.js';
import { obreFull, tancaFull } from './full.js';
import { icona } from './icones.js';

let peticio = null;   // l'esdeveniment beforeinstallprompt, si el navegador l'ha enviat

/* Es crida en obrir l'app, abans que el navegador enviï els esdeveniments. */
export function escoltaInstallacio() {
  window.addEventListener('beforeinstallprompt', e => {
    e.preventDefault();   // sense la barra del navegador: ja hi ha el recordatori d'Avui
    peticio = e;
  });
  window.addEventListener('appinstalled', () => {
    peticio = null;
    marcaInstallada();
  });
}

function marcaInstallada() {
  if (!obte().perfil.installada) actualitza(d => { d.perfil.installada = true; });
}

/* S'obre com a app (des de la icona) o el navegador ha avisat que s'ha instal·lat. */
export function esInstallada() {
  return matchMedia('(display-mode: standalone)').matches || navigator.standalone === true || !!obte().perfil.installada;
}

function plataforma() {
  const ua = navigator.userAgent;
  if (/iPhone|iPad|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)) return 'ios';
  if (/Android/.test(ua)) {
    if (/SamsungBrowser/.test(ua)) return 'android-samsung';
    if (/Firefox/.test(ua)) return 'android-firefox';
    if (/EdgA/.test(ua)) return 'android-edge';
    return 'android-chrome';
  }
  if (/Firefox/.test(ua)) return 'pc-firefox';
  if (/Edg\//.test(ua)) return 'pc-edge';
  if (/Chrome|Chromium/.test(ua)) return 'pc-chrome';
  if (/Macintosh/.test(ua) && /Safari/.test(ua)) return 'mac-safari';
  return 'altre';
}

const b = text => `<strong>${text}</strong>`;
const OBRE = 'Obre-la des de la icona nova.';

/* Passos de cada navegador (null: no es pot instal·lar). */
const PASSOS = {
  ios: [`Toca ${b('Comparteix')} ${icona('compartir')}.`, `Tria ${b('Afegeix a la pantalla d\'inici')} ${icona('afegir')}.`, OBRE],
  'android-chrome': [`Toca el menú ${b('⋮')}.`, `Tria ${b('Instal·la l\'aplicació')} o ${b('Afegeix a la pantalla d\'inici')}.`, OBRE],
  'android-edge': [`Toca el menú ${b('…')}.`, `Tria ${b('Afegeix al telèfon')}.`, OBRE],
  'android-samsung': [`Toca el menú ${b('☰')}.`, `Tria ${b('Afegeix la pàgina a')} → ${b('Pantalla d\'inici')}.`, OBRE],
  'android-firefox': [`Toca el menú ${b('⋮')}.`, `Tria ${b('Instal·la')}.`, OBRE],
  'pc-chrome': [`Fes clic a la icona ${b('Instal·la')} de la barra d'adreces.`, `O menú ${b('⋮')} → ${b('Desa i comparteix')} → ${b('Instal·la la pàgina com a aplicació')}.`],
  'pc-edge': [`Menú ${b('…')} → ${b('Aplicacions')} → ${b('Instal·la aquest lloc com una aplicació')}.`],
  'mac-safari': [`Menú ${b('Fitxer')} → ${b('Afegeix al Dock')}.`],
  'pc-firefox': null,
  altre: [`Al menú del navegador, busca ${b('Instal·la')} o ${b('Afegeix a la pantalla d\'inici')}.`]
};

/* Què cal fer en aquest navegador: "Instal·lada", el botó "Instal·lar", els passos o "no es pot". */
export function htmlInstruccions() {
  if (esInstallada()) return `<p class="installada">${icona('check')} Instal·lada</p>`;
  if (peticio) return `<button type="button" class="boto principal" data-accio="installa">${icona('afegir')} Instal·lar</button>`;
  const passos = PASSOS[plataforma()];
  if (!passos) return '<p class="secundari">Aquest navegador no ho permet. Obre-la amb Chrome o Edge.</p>';
  if (passos.length === 1) return `<p>${passos[0]}</p>`;
  return `<ol class="passos">${passos.map((pas, i) => `<li><span class="num">${i + 1}</span><span>${pas}</span></li>`).join('')}</ol>`;
}

/* Obre el diàleg del navegador. Retorna true si s'ha instal·lat. */
export async function installa() {
  if (!peticio) return false;
  const p = peticio;
  peticio = null;   // només es pot fer servir una vegada
  p.prompt();
  const { outcome } = await p.userChoice;
  if (outcome === 'accepted') marcaInstallada();
  return outcome === 'accepted';
}

/* Full amb les instruccions (la primera obertura i el recordatori d'Avui). Es resol en tancar-lo. */
export function mostraInstallacio() {
  return new Promise(resol => {
    const full = obreFull(`
      <div class="benvinguda-cap">
        <span class="icona-activitat">${icona('mobil')}</span>
        <h2>Accés directe</h2>
      </div>
      <p>S'obre com una app i funciona sense connexió.</p>
      ${htmlInstruccions()}
      <button type="button" class="boto ${peticio ? 'contorn' : 'principal'}" data-accio="tanca">${peticio ? 'Ara no' : 'Entesos'}</button>`, {
      installa: async () => {
        await installa();
        tancaFull();
      }
    }, { classe: 'benvinguda' });
    full.addEventListener('close', () => {
      if (!obte().perfil.installacioVista) actualitza(d => { d.perfil.installacioVista = true; });
      resol();
    }, { once: true });
  });
}
