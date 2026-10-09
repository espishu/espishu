/*
 * temps.js — rellotges i comptes enrere.
 * Tot es calcula a partir de marques de temps desades (mai sumant segons amb setInterval),
 * perquè l'iPhone atura el JavaScript quan es bloqueja la pantalla.
 */

const dos = n => String(n).padStart(2, '0');

/* Temps transcorregut: "04:09" o "1:04:09". */
export function formatRellotge(ms) {
  const s = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(s / 3600), m = Math.floor(s / 60) % 60;
  return h ? `${h}:${dos(m)}:${dos(s % 60)}` : `${dos(m)}:${dos(s % 60)}`;
}

/* Compte enrere: "0:45", "12:00". Arrodoneix cap amunt perquè arribi a 0:00 just al final. */
export function formatCompte(ms) {
  const s = Math.max(0, Math.ceil(ms / 1000));
  const h = Math.floor(s / 3600), m = Math.floor(s / 60) % 60;
  return h ? `${h}:${dos(m)}:${dos(s % 60)}` : `${m}:${dos(s % 60)}`;
}

/* Mil·lisegons que falten fins a `fins` (marca de temps en ms). */
export function restant(fins, ara = Date.now()) {
  return Math.max(0, fins - ara);
}
