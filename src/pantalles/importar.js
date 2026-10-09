/*
 * Primer cop que s'entra amb un compte buit (PLA.md, secció 21.4). Ruta #importar.
 * "Importar les meves dades" (les d'aquest aparell, de la versió sense comptes), "Des d'un arxiu"
 * (una còpia exportada) o "Començar de zero" (el pla inicial).
 */
import { obte, llegeixAnteriors, esborraAnteriors } from '../store.js';
import { comencaCompte } from '../sincronitza.js';
import { llegeixCopia } from '../copia.js';
import { benvinguda } from '../benvinguda.js';
import { obreFull, tancaFull, botoTanca, confirma } from '../full.js';
import { icona } from '../icones.js';
import { esc } from '../dom.js';

export function munta(contenidor) {
  const anteriors = llegeixAnteriors();
  const n = anteriors?.sessions.length ?? 0;

  contenidor.innerHTML = `
    <header class="entrar-cap">
      <img src="icons/favicon.svg" alt="" width="72" height="72">
      <h1>Hola, ${esc(obte().compte?.usuari ?? '')}</h1>
    </header>
    <section class="targeta pila-botons importar">
      ${anteriors ? `
        <button type="button" class="boto principal" data-accio="importa">Importar les meves dades</button>
        <p class="secundari">${n} ${n === 1 ? 'sessió' : 'sessions'}</p>` : ''}
      <button type="button" class="boto contorn" data-accio="arxiu">${icona('restaura')} Des d'un arxiu</button>
      <button type="button" class="boto ${anteriors ? 'contorn' : 'principal'}" data-accio="zero">${icona('brot')} Començar de zero</button>
    </section>
    <input type="file" accept=".json,application/json" data-arxiu hidden>`;

  function comenca(dades) {
    comencaCompte(dades);
    esborraAnteriors();
    location.hash = '#avui';
    benvinguda();
  }

  async function arxiu(fitxer) {
    let llegida;
    try {
      llegida = await llegeixCopia(fitxer);
    } catch (e) {
      obreFull(`
        <div class="full-cap"><h2>No es pot importar</h2>${botoTanca}</div>
        <p>${esc(e.message)}</p>
        <button type="button" class="boto contorn" data-accio="tanca">D'acord</button>`);
      return;
    }
    confirma({
      titol: 'Importar aquesta còpia?',
      text: `${esc(llegida.resum)}.`,
      boto: 'Importar',
      enConfirmar: () => comenca(llegida.dades)
    });
  }

  const clic = e => {
    const accio = e.target.closest('[data-accio]')?.dataset.accio;
    if (accio === 'importa') comenca(anteriors);
    if (accio === 'arxiu') contenidor.querySelector('[data-arxiu]').click();
    if (accio === 'zero') {
      if (!anteriors) return comenca(null);
      confirma({
        titol: 'Començar de zero?',
        text: 'Les dades d\'aquest aparell no s\'importaran.',
        boto: 'Començar',
        enConfirmar: () => comenca(null)
      });
    }
  };
  const canvi = e => {
    if (!e.target.matches('[data-arxiu]')) return;
    const fitxer = e.target.files?.[0];
    e.target.value = '';
    if (fitxer) arxiu(fitxer);
  };

  contenidor.addEventListener('click', clic);
  contenidor.addEventListener('change', canvi);
  return () => {
    tancaFull();
    contenidor.removeEventListener('click', clic);
    contenidor.removeEventListener('change', canvi);
  };
}
