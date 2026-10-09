/*
 * app.js — punt d'entrada: enrutament per hash i barra de navegació.
 * Cada pantalla exporta munta(contenidor, parametres) i pot retornar una funció per desmuntar-se.
 */
import { obte, demanaPersistencia } from './store.js';
import { carregaBiblioteca } from './biblioteca.js';
import { benvinguda } from './benvinguda.js';
import { aplicaEstacio } from './tema.js';
import { escoltaInstallacio } from './installacio.js';
import * as avui from './pantalles/avui.js';
import * as sessio from './pantalles/sessio.js';
import * as fet from './pantalles/fet.js';
import * as progres from './pantalles/progres.js';
import * as pla from './pantalles/pla.js';
import * as editar from './pantalles/editar.js';
import * as ajustos from './pantalles/ajustos.js';
import * as entrar from './pantalles/entrar.js';

const PANTALLES = { avui, sessio, fet, progres, pla, editar, ajustos, entrar };
const AMB_BARRA = new Set(['avui', 'progres', 'pla', 'ajustos']);
/* Pestanya que queda marcada a cada pantalla. Ajustos marca la pestanya des d'on s'ha obert (#ajustos/<pestanya>). */
const PESTANYA = { ajustos: 'pla' };
const PESTANYES = new Set(['avui', 'progres', 'pla']);

const contenidor = document.getElementById('pantalla');
const barra = document.querySelector('.barra');
let actual = null;
let hashActual = null;
let desmunta = null;

function mostra() {
  const [nom, ...parametres] = location.hash.slice(1).split('/');
  // Sense sessió iniciada, només la pantalla d'entrar; amb sessió, mai.
  const ambCompte = !!obte().compte;
  if (!ambCompte && nom !== 'entrar') {
    location.replace('#entrar');
    return;
  }
  if (!PANTALLES[nom] || (ambCompte && nom === 'entrar')) {
    location.replace('#avui');
    return;
  }
  const canvia = location.hash !== hashActual;
  desmunta?.();
  contenidor.replaceChildren();
  desmunta = PANTALLES[nom].munta(contenidor, parametres) || null;
  // Transició curta en canviar de pantalla (13.7); no en tornar a dibuixar la mateixa.
  if (canvia && hashActual !== null) {
    contenidor.classList.remove('entra');
    void contenidor.offsetWidth;
    contenidor.classList.add('entra');
  }
  actual = nom;

  barra.hidden = !AMB_BARRA.has(nom);
  document.body.classList.toggle('amb-barra', !barra.hidden);
  const marcada = nom === 'ajustos' && PESTANYES.has(parametres[0]) ? parametres[0] : (PESTANYA[nom] ?? nom);
  barra.querySelectorAll('a').forEach(a => {
    if (a.dataset.pantalla === marcada) a.setAttribute('aria-current', 'page');
    else a.removeAttribute('aria-current');
  });

  if (canvia) {
    window.scrollTo(0, 0);
    if (hashActual !== null) contenidor.focus({ preventScroll: true });
    hashActual = location.hash;
  }
}

/* En tornar a l'app (potser l'endemà), les pantalles amb barra es tornen a dibuixar. */
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState !== 'visible') return;
  aplicaEstacio();
  if (AMB_BARRA.has(actual)) mostra();
});

window.addEventListener('hashchange', mostra);
escoltaInstallacio();

aplicaEstacio();
obte();
demanaPersistencia();
try {
  await carregaBiblioteca();
} catch (e) {
  console.error('No s\'ha pogut carregar la biblioteca', e);
}
mostra();
benvinguda().then(() => { if (actual === 'avui') mostra(); });

if ('serviceWorker' in navigator) {
  // Si arriba una versió nova de l'app, es recarrega sola (mai enmig d'una sessió).
  const teniaVersio = !!navigator.serviceWorker.controller;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (teniaVersio && actual !== 'sessio') location.reload();
  });
  // Aquest codi va després de l'await de la biblioteca: potser "load" ja ha passat.
  const registra = () => navigator.serviceWorker.register('./sw.js').catch(e => console.warn('Service worker no registrat', e));
  if (document.readyState === 'complete') registra();
  else window.addEventListener('load', registra);
}
