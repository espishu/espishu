/*
 * app.js — punt d'entrada: enrutament per hash, barra de navegació i indicador de canvis pendents.
 * Cada pantalla exporta munta(contenidor, parametres) i pot retornar una funció per desmuntar-se.
 */
import { obte, demanaPersistencia } from './store.js';
import { carregaBiblioteca } from './biblioteca.js';
import { benvinguda } from './benvinguda.js';
import { escoltaInstallacio } from './installacio.js';
import * as avui from './pantalles/avui.js';
import * as sessio from './pantalles/sessio.js';
import * as fet from './pantalles/fet.js';
import * as progres from './pantalles/progres.js';
import * as pla from './pantalles/pla.js';
import * as editar from './pantalles/editar.js';
import * as extra from './pantalles/extra.js';
import * as ajustos from './pantalles/ajustos.js';
import * as entrar from './pantalles/entrar.js';
import * as importar from './pantalles/importar.js';
import * as valls from './pantalles/valls.js';
import { iniciaSincronitzacio, escoltaSincronitzacio, sincronitza, calTornarAEntrar } from './sincronitza.js';
import { mostraAvis } from './full.js';

const PANTALLES = { avui, sessio, fet, progres, valls, pla, editar, extra, ajustos, entrar, importar };
const { obreTornaAEntrar } = entrar;
const AMB_BARRA = new Set(['avui', 'progres', 'valls', 'pla', 'ajustos']);
/* Pestanya que queda marcada a cada pantalla. Ajustos marca la pestanya des d'on s'ha obert (#ajustos/<pestanya>). */
const PESTANYA = { ajustos: 'pla', valls: 'progres' };
const PESTANYES = new Set(['avui', 'progres', 'pla']);

const contenidor = document.getElementById('pantalla');
const barra = document.querySelector('.barra');
let actual = null;
let hashActual = null;
let desmunta = null;
let costat = null; // 'dreta' o 'esquerra': d'on entra la pantalla nova en lliscar el dit

/* Hi ha una versió nova de l'app esperant: es recarrega en arribar a una pantalla on es pot (a sota). */
let recarregaPendent = false;
const ON_ES_POT_RECARREGAR = new Set([...AMB_BARRA, 'entrar']);

function recarregaSiEsPot() {
  if (recarregaPendent && ON_ES_POT_RECARREGAR.has(actual) && !document.querySelector('dialog[open]')) location.reload();
}

/* Sense sessió iniciada, només la pantalla d'entrar; amb un compte buit, només la d'importar. */
function rutaPermesa(nom) {
  const { compte } = obte();
  if (!compte) return nom === 'entrar' ? null : '#entrar';
  if (compte.nou) return nom === 'importar' ? null : '#importar';
  if (!PANTALLES[nom] || nom === 'entrar' || nom === 'importar') return '#avui';
  return null;
}

function mostra() {
  const [nom, ...parametres] = location.hash.slice(1).split('/');
  const desvia = rutaPermesa(nom);
  if (desvia) {
    location.replace(desvia);
    return;
  }
  const canvia = location.hash !== hashActual;
  desmunta?.();
  contenidor.replaceChildren();
  // Avui i Bosc van de vora a vora (l'escena del bosc): el CSS ho mira aquí.
  contenidor.dataset.pantalla = nom;
  if (parametres[0]) contenidor.dataset.detall = '';
  else delete contenidor.dataset.detall;
  desmunta = PANTALLES[nom].munta(contenidor, parametres) || null;
  // Transició curta en canviar de pantalla (13.7); no en tornar a dibuixar la mateixa.
  if (canvia && hashActual !== null) {
    contenidor.classList.remove('entra', 'des-dreta', 'des-esquerra');
    void contenidor.offsetWidth;
    contenidor.classList.add('entra');
    // Si s'hi ha arribat lliscant el dit, la pantalla entra pel costat d'on ve.
    if (costat) contenidor.classList.add(`des-${costat}`);
  }
  costat = null;
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
  recarregaSiEsPot();
}

/* En tornar a l'app (potser l'endemà), les pantalles amb barra es tornen a dibuixar. */
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState !== 'visible') return;
  if (AMB_BARRA.has(actual)) mostra();
});

window.addEventListener('hashchange', mostra);
escoltaInstallacio();

/*
 * iPhone (app instal·lada): quan el teclat es tanca, de vegades la pàgina no recupera l'alçada i,
 * en deixar de lliscar, torna amunt sense deixar arribar als botons de baix (Editar amb molts
 * exercicis). Un desplaçament d'un píxel, anada i tornada, li fa tornar a calcular.
 */
let reajust = 0;
function reajustaPantalla() {
  clearTimeout(reajust);
  reajust = setTimeout(() => {
    const y = window.scrollY;
    window.scrollTo(window.scrollX, y + 1);
    window.scrollTo(window.scrollX, y);
  }, 300);
}
document.addEventListener('focusout', e => {
  if (e.target.matches?.('input, textarea, select')) reajustaPantalla();
});
window.visualViewport?.addEventListener('resize', () => {
  if (window.innerHeight - window.visualViewport.height < 2) reajustaPantalla();
});

/*
 * Lliscar el dit entre Avui, Bosc i Pla (com tocar la barra): cap a l'esquerra, la pestanya de la
 * dreta, i al revés; no dona la volta. Només a les tres pantalles (no al detall d'una sessió) i sense
 * cap full obert. Ha de ser clarament horitzontal (desplaçar amunt i avall no canvia de pestanya), i
 * no compta si comença a la vora de la pantalla, en un camp, als gràfics o en una fila que es desplaça.
 */
const ORDRE_PESTANYES = ['avui', 'progres', 'pla'];
let toc = null;

function esLliscable(element) {
  if (element.closest('input, textarea, select, .svg-grafic')) return false;
  for (let e = element; e && e !== document.body; e = e.parentElement) {
    if (e.scrollWidth > e.clientWidth && /auto|scroll/.test(getComputedStyle(e).overflowX)) return false;
  }
  return true;
}

document.addEventListener('touchstart', e => {
  toc = null;
  if (e.touches.length !== 1 || !ORDRE_PESTANYES.includes(actual) || 'detall' in contenidor.dataset) return;
  if (document.querySelector('dialog[open]')) return;
  const { clientX: x, clientY: y } = e.touches[0];
  if (x < 20 || x > window.innerWidth - 20 || !esLliscable(e.target)) return;
  toc = { x, y, temps: e.timeStamp };
}, { passive: true });

document.addEventListener('touchend', e => {
  if (!toc || e.touches.length) return;
  const { x, y, temps } = toc;
  toc = null;
  const dx = e.changedTouches[0].clientX - x, dy = e.changedTouches[0].clientY - y;
  if (Math.abs(dx) < 60 || Math.abs(dx) < 1.5 * Math.abs(dy) || e.timeStamp - temps > 800) return;
  if (document.querySelector('dialog[open]')) return;
  const seguent = ORDRE_PESTANYES[ORDRE_PESTANYES.indexOf(actual) + (dx < 0 ? 1 : -1)];
  if (!seguent) return;
  costat = dx < 0 ? 'dreta' : 'esquerra';
  location.hash = `#${seguent}`;
}, { passive: true });

document.addEventListener('touchcancel', () => { toc = null; });

/*
 * Indicador de canvis pendents (a la capçalera d'Avui, Bosc i Pla). En tocar-lo, es puja tot
 * ara mateix; si cal tornar a entrar, demana la contrasenya. Si arriben dades noves, es torna a dibuixar.
 */
escoltaSincronitzacio(({ pendents, calEntrar, canviat }) => {
  document.querySelectorAll('[data-pendents]').forEach(boto => { boto.hidden = !pendents && !calEntrar; });
  if (canviat && AMB_BARRA.has(actual) && !document.querySelector('dialog[open]')) mostra();
});
document.addEventListener('click', e => {
  if (!e.target.closest('[data-pendents]')) return;
  if (calTornarAEntrar()) return obreTornaAEntrar();
  sincronitza()
    .then(() => mostraAvis('Desat'))
    .catch(error => mostraAvis(error.message));
});

obte();
demanaPersistencia();
try {
  await carregaBiblioteca();
} catch (e) {
  console.error('No s\'ha pogut carregar la biblioteca', e);
}
mostra();
iniciaSincronitzacio();
benvinguda().then(() => { if (actual === 'avui') mostra(); });

/*
 * Actualitzacions (sw.js): en obrir l'app, en tornar-hi i en recuperar la connexió es mira si
 * hi ha una versió nova publicada. Quan la versió nova ja controla l'app, es recarrega,
 * però només en una pestanya (Avui, Bosc, Pla, Ajustos) o a Entrar, sense cap full obert:
 * enmig d'una sessió s'espera que s'acabi.
 */
if ('serviceWorker' in navigator) {
  let controlador = navigator.serviceWorker.controller;
  let registre = null;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    const abans = controlador;
    controlador = navigator.serviceWorker.controller;
    if (!abans) return;   // primera instal·lació: el codi ja és el que hi ha publicat
    recarregaPendent = true;
    recarregaSiEsPot();
  });
  const comprovaVersio = () => registre?.update().catch(() => { /* sense connexió: ja es tornarà a mirar */ });
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') comprovaVersio(); });
  window.addEventListener('online', comprovaVersio);
  // Aquest codi va després de l'await de la biblioteca: potser "load" ja ha passat.
  const registra = () => navigator.serviceWorker.register('./sw.js', { updateViaCache: 'none' })
    .then(r => { registre = r; comprovaVersio(); })
    .catch(e => console.warn('Service worker no registrat', e));
  if (document.readyState === 'complete') registra();
  else window.addEventListener('load', registra);
}
