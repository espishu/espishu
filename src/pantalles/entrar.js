/*
 * Entrar i Crear compte (PLA.md, secció 21.4). Rutes: #entrar i #entrar/nou.
 * Sense sessió iniciada, l'app només mostra aquesta pantalla.
 */
import { actualitza } from '../store.js';
import { entra, creaCompte, normalitza, usuariValid, MIN_CONTRASENYA } from '../compte.js';
import { benvinguda } from '../benvinguda.js';
import { htmlCampUsuari, htmlCampContrasenya, htmlError, commutaUll, mostraError, ocupat } from '../formulari.js';
import { obreFull, tancaFull, botoTanca } from '../full.js';
import { icona } from '../icones.js';

export function munta(contenidor, [mode]) {
  const nou = mode === 'nou';

  contenidor.innerHTML = nou ? `
    <header class="capcalera amb-enrere">
      <a class="boto-icona" href="#entrar" aria-label="Tornar">${icona('enrere')}</a>
      <h1>Crear compte</h1>
    </header>
    <form class="targeta formulari" novalidate>
      ${htmlCampUsuari()}
      ${htmlCampContrasenya({ nom: 'contrasenya', etiqueta: 'Contrasenya', autocomplete: 'new-password', ull: true })}
      ${htmlCampContrasenya({ nom: 'repeteix', etiqueta: 'Repetir', autocomplete: 'new-password' })}
      ${htmlError()}
      <button type="submit" class="boto principal">Crear compte</button>
    </form>` : `
    <header class="entrar-cap">
      <img src="icons/favicon.svg" alt="" width="72" height="72">
      <h1>Espishu</h1>
    </header>
    <form class="targeta formulari" novalidate>
      ${htmlCampUsuari()}
      ${htmlCampContrasenya({ nom: 'contrasenya', etiqueta: 'Contrasenya', autocomplete: 'current-password', ull: true })}
      ${htmlError()}
      <button type="submit" class="boto principal">Entrar</button>
    </form>
    <a class="boto-text" href="#entrar/nou">Crear compte</a>
    <button type="button" class="boto-text discret" data-accio="oblidat">He oblidat la contrasenya</button>`;

  const formulari = contenidor.querySelector('form');

  function comprova() {
    const usuari = normalitza(formulari.elements.usuari.value);
    const contrasenya = formulari.elements.contrasenya.value;
    if (!nou) {
      if (!usuari) return ['Escriu l\'usuari', 'usuari'];
      if (!contrasenya) return ['Escriu la contrasenya', 'contrasenya'];
      return null;
    }
    if (!usuariValid(usuari)) return ['De 3 a 20: lletres, números, . - _', 'usuari'];
    if (contrasenya.length < MIN_CONTRASENYA) return [`Mínim ${MIN_CONTRASENYA} caràcters`, 'contrasenya'];
    if (contrasenya !== formulari.elements.repeteix.value) return ['No coincideixen', 'repeteix'];
    return null;
  }

  async function envia(e) {
    e.preventDefault();
    const problema = comprova();
    if (problema) return mostraError(formulari, ...problema);
    if (!navigator.onLine) return mostraError(formulari, 'Sense connexió');
    mostraError(formulari, '');
    ocupat(formulari, true);
    try {
      const { usuari, contrasenya } = formulari.elements;
      const compte = nou
        ? await creaCompte(usuari.value, contrasenya.value)
        : await entra(usuari.value, contrasenya.value);
      entrat(compte);
    } catch (error) {
      ocupat(formulari, false);
      mostraError(formulari, error.message, error.motiu === 'existeix' ? 'usuari' : null);
    }
  }

  const clic = e => {
    const accio = e.target.closest('[data-accio]')?.dataset.accio;
    if (accio === 'ull') commutaUll(formulari);
    if (accio === 'oblidat') {
      obreFull(`
        <div class="full-cap"><h2>Contrasenya</h2>${botoTanca}</div>
        <p>Demana-la a qui et va donar l'app.</p>
        <button type="button" class="boto contorn" data-accio="tanca">D'acord</button>`);
    }
  };

  formulari.addEventListener('submit', envia);
  contenidor.addEventListener('click', clic);
  return () => {
    tancaFull();
    contenidor.removeEventListener('click', clic);
  };
}

/* Ja hi ha sessió: es desa el compte i s'obre l'app. */
function entrat(compte) {
  actualitza(d => { d.compte = compte; });
  location.hash = '#avui';
  benvinguda();
}
