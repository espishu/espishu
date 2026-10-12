/*
 * animacio.js — l'única porta de les pantalles a les animacions (PLA.md, secció 12).
 * Els 10 exercicis de la rutina general fan servir la figura nova (src/figura.js): un bucle continu,
 * amb les pauses d'uns 2 s al punt màxim que ja porta cada exercici. La resta (activitats i
 * rem-una-ma) continuen amb src/animacions.js, que no es toca.
 */
import * as vella from './animacions.js';
import { skeleton, sample, renderFigure, renderFront, EX } from './figura.js';

/* Camp `animacio` de la biblioteca → exercici de figura.js */
const FIGURA = {
  'cercles-bracos': 'cercles',
  'gat-camell': 'gat',
  'esquat-cadira': 'esquat',
  'pont-glutis': 'pont',
  'flexions-genolls': 'flexions',
  superman: 'superman',
  'dead-bug': 'deadbug',
  'isquios-tovallola': 'isquios',
  'flexor-maluc': 'flexor',
  'postura-nen': 'nen'
};
const FPS = 30;

const exDe = id => EX[FIGURA[id]];

/* Un fotograma a l'instant `t` (segons), com a referencia/laboratori-animacions.html. */
function fotograma(ex, t) {
  let figura;
  if (ex.front) figura = renderFront(t);
  else {
    const s = skeleton(sample(ex, t));
    const respiracio = 1.1 * Math.sin(t * 2 * Math.PI / 4);
    figura = renderFigure(s, ex.muscles, respiracio) + (ex.after ? ex.after(s) : '');
  }
  return `<svg viewBox="${ex.vb}" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">${ex.props()}${figura}</svg>`;
}

export function teAnimacio(id) {
  return !!exDe(id) || vella.teAnimacio(id);
}

/* SVG com a text a l'instant `t` (miniatures: t = 0). */
export function renderAnimacio(id, t = 0) {
  const ex = exDe(id);
  return ex ? fotograma(ex, t) : vella.renderAnimacio(id, t);
}

/*
 * Munta l'animació dins `el` (un <button>). Figura nova: es mou en bucle des del principi i tocar-la
 * l'atura o la reprèn; amb prefers-reduced-motion comença aturada. `onEstat('moviment' | 'repos')`
 * avisa de cada canvi (per a la icona de pausa / play). Retorna la funció per desmuntar.
 */
export function muntaAnimacio(el, id, { onEstat } = {}) {
  const ex = exDe(id);
  if (!ex) return vella.muntaAnimacio(el, id, { onEstat });

  const menysMoviment = matchMedia('(prefers-reduced-motion: reduce)').matches;
  let enMarxa = !menysMoviment;
  let desDe = performance.now();   // marca de temps de quan s'ha engegat
  let acumulat = 0;                // segons d'animació abans de l'última pausa
  let raf = 0, ultim = -Infinity, visible = true;

  const temps = ara => acumulat + (enMarxa ? (ara - desDe) / 1000 : 0);
  const pinta = ara => { el.innerHTML = fotograma(ex, temps(ara)); };

  function bucle(ara) {
    raf = 0;
    if (!enMarxa) return;
    // No cal dibuixar-la si no es veu; uns 30 fotogrames per segon n'hi ha prou.
    if (visible && !document.hidden && ara - ultim >= 1000 / FPS - 2) {
      ultim = ara;
      pinta(ara);
    }
    raf = requestAnimationFrame(bucle);
  }

  function commuta() {
    const ara = performance.now();
    if (enMarxa) {
      acumulat = temps(ara);
      enMarxa = false;
      cancelAnimationFrame(raf);
      raf = 0;
      pinta(ara);
    } else {
      desDe = ara;
      enMarxa = true;
      raf = requestAnimationFrame(bucle);
    }
    onEstat?.(enMarxa ? 'moviment' : 'repos');
  }

  const observador = 'IntersectionObserver' in window
    ? new IntersectionObserver(([e]) => { visible = e.isIntersecting; })
    : null;
  observador?.observe(el);

  pinta(performance.now());
  onEstat?.(enMarxa ? 'moviment' : 'repos');
  if (enMarxa) raf = requestAnimationFrame(bucle);
  el.addEventListener('click', commuta);

  return () => {
    enMarxa = false;
    cancelAnimationFrame(raf);
    observador?.disconnect();
    el.removeEventListener('click', commuta);
  };
}

/* Si l'animació és un bucle continu (la figura nova i alguna de les velles). */
export function esBucle(id) {
  return !!exDe(id) || vella.esBucle(id);
}

/* Si l'exercici fa servir la figura nova (bucle continu que es pot aturar). */
export function esFigura(id) {
  return !!exDe(id);
}
