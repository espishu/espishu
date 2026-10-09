/* formulari.js — camps d'usuari i contrasenya (Entrar, Crear compte i Contrasenya a Ajustos). */
import { icona } from './icones.js';
import { esc } from './dom.js';

let comptador = 0;

export function htmlCampUsuari() {
  const id = `camp-${++comptador}`;
  return `
    <div class="camp-form">
      <label class="camp-nom" for="${id}">Usuari</label>
      <input id="${id}" class="camp-text" type="text" name="usuari" autocomplete="username"
        autocapitalize="none" autocorrect="off" spellcheck="false" maxlength="20">
    </div>`;
}

/* `ull`: amb el botó per mostrar la contrasenya (mostra o amaga totes les del formulari). */
export function htmlCampContrasenya({ nom, etiqueta, autocomplete, ull = false }) {
  const id = `camp-${++comptador}`;
  const input = `<input id="${id}" class="camp-text" type="password" name="${esc(nom)}" autocomplete="${esc(autocomplete)}"
    autocapitalize="none" autocorrect="off" spellcheck="false" data-contrasenya>`;
  return `
    <div class="camp-form">
      <label class="camp-nom" for="${id}">${esc(etiqueta)}</label>
      ${ull ? `
        <div class="camp-amb-boto">
          ${input}
          <button type="button" class="boto-ull" data-accio="ull" aria-label="Mostrar la contrasenya" aria-pressed="false">${icona('ull')}</button>
        </div>` : input}
    </div>`;
}

export function htmlError() {
  return '<p class="error-form" role="alert" data-error></p>';
}

/* Mostra o amaga totes les contrasenyes del formulari. */
export function commutaUll(formulari) {
  const boto = formulari.querySelector('[data-accio="ull"]');
  const mostra = boto.getAttribute('aria-pressed') !== 'true';
  formulari.querySelectorAll('[data-contrasenya]').forEach(input => { input.type = mostra ? 'text' : 'password'; });
  boto.setAttribute('aria-pressed', String(mostra));
  boto.setAttribute('aria-label', mostra ? 'Amagar la contrasenya' : 'Mostrar la contrasenya');
  boto.innerHTML = icona(mostra ? 'ull-tancat' : 'ull');
}

/* Escriu l'error (o l'esborra amb ''). `camp`: el nom del camp que cal revisar, que rep el focus. */
export function mostraError(formulari, text, camp = null) {
  formulari.querySelector('[data-error]').textContent = text;
  formulari.querySelectorAll('.camp-text').forEach(input => input.removeAttribute('aria-invalid'));
  if (camp) {
    const input = formulari.elements[camp];
    input.setAttribute('aria-invalid', 'true');
    input.focus();
  }
}

/* Mentre s'espera Supabase, el botó no es pot tornar a prémer. */
export function ocupat(formulari, si) {
  const boto = formulari.querySelector('[type="submit"]');
  boto.disabled = si;
  boto.setAttribute('aria-busy', String(si));
}
