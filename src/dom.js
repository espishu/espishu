/* dom.js — ajudes petites per construir les pantalles. */

const ENTITATS = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };

/* Escapa un text per posar-lo dins d'HTML. */
export function esc(text) {
  return String(text ?? '').replace(/[&<>"']/g, c => ENTITATS[c]);
}

/* Primera lletra en majúscula. */
export function majuscula(text) {
  return text.charAt(0).toUpperCase() + text.slice(1);
}
