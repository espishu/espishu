/* Ajustos (PLA.md, secció 7.7). */
import { obte, actualitza, dadesInicials, substitueix } from '../store.js';
import { ferCopia, llegeixCopia } from '../copia.js';
import { mostraAvisSalut } from '../benvinguda.js';
import { htmlInstruccions, installa } from '../installacio.js';
import { obreFull, tancaFull, botoTanca, confirma, mostraAvis, amagaAvis } from '../full.js';
import { icona } from '../icones.js';
import { esc } from '../dom.js';

function textUltimaCopia(data) {
  if (!data) return 'Cap còpia encara';
  const d = new Date(`${data}T12:00:00`);
  return `Última: ${new Intl.DateTimeFormat('ca', { day: 'numeric', month: 'short', year: 'numeric' }).format(d)}`;
}

export function munta(contenidor) {
  function pinta() {
    const { pla, perfil } = obte();
    const objectiu = pla.objectiuSetmanal;
    contenidor.innerHTML = `
      <header class="capcalera amb-enrere">
        <a class="boto-icona" href="#pla" aria-label="Tornar al pla">${icona('enrere')}</a>
        <h1>Ajustos</h1>
      </header>

      <section class="targeta">
        <h2 class="titol-targeta">Còpia de seguretat</h2>
        <p class="secundari">${esc(textUltimaCopia(perfil.ultimaCopia))}</p>
        <div class="pila-botons">
          <button type="button" class="boto principal" data-accio="copia">${icona('desa')} Fer còpia</button>
          <button type="button" class="boto contorn" data-accio="restaura">${icona('restaura')} Restaurar còpia</button>
        </div>
        <input type="file" accept=".json,application/json" data-arxiu hidden>
      </section>

      <section class="targeta">
        <h2 class="titol-targeta">Objectiu setmanal</h2>
        <div class="fila-pas gran">
          <span><strong>${objectiu}</strong> ${objectiu === 1 ? 'sessió' : 'sessions'} per setmana</span>
          <div class="pas-a-pas compacte">
            <button type="button" class="pas" data-accio="objectiu" data-signe="-1" aria-label="Una sessió menys"${objectiu <= 1 ? ' disabled' : ''}>${icona('menys')}</button>
            <button type="button" class="pas" data-accio="objectiu" data-signe="1" aria-label="Una sessió més"${objectiu >= 4 ? ' disabled' : ''}>${icona('mes')}</button>
          </div>
        </div>
      </section>

      <section class="targeta">
        <h2 class="titol-targeta">Accés directe</h2>
        ${htmlInstruccions()}
      </section>

      <section class="targeta">
        <ul class="opcions-aviat">
          <li>
            <span class="icona-activitat petita">${icona('campana')}</span>
            <span class="text-opcio"><span class="nom-item">Avisos al mòbil</span><span class="aviat">Pròximament</span></span>
            <span class="interruptor" role="switch" aria-checked="false" aria-disabled="true" aria-label="Avisos al mòbil (pròximament)"></span>
          </li>
          <li>
            <span class="icona-activitat petita">${icona('calendari')}</span>
            <span class="text-opcio"><span class="nom-item">Calendari de Google</span><span class="aviat">Pròximament</span></span>
            <span class="interruptor" role="switch" aria-checked="false" aria-disabled="true" aria-label="Calendari de Google (pròximament)"></span>
          </li>
        </ul>
      </section>

      <details class="targeta mes-opcions">
        <summary>Més ${icona('endavant', 'icona plec')}</summary>
        <div class="pila-botons">
          <button type="button" class="boto contorn" data-accio="salut">${icona('salut')} Avís de salut</button>
          <button type="button" class="boto contorn" data-accio="restableix">${icona('restaura')} Restablir el pla inicial</button>
          <button type="button" class="boto contorn" data-accio="reinicia">${icona('paperera')} Reiniciar</button>
        </div>
        <div class="sobre">
          <p>Espishu, versió 1.</p>
          <p class="secundari">Exercicis i fotos: Free Exercise DB (domini públic). Lletra: Lexend (llicència OFL).</p>
        </div>
      </details>`;
  }

  async function copia() {
    const fet = await ferCopia();
    if (fet) {
      pinta();
      mostraAvis('Còpia feta');
    }
  }

  async function restaura(arxiu) {
    let llegida;
    try {
      llegida = await llegeixCopia(arxiu);
    } catch (e) {
      obreFull(`
        <div class="full-cap"><h2>No es pot restaurar</h2>${botoTanca}</div>
        <p>${esc(e.message)}</p>
        <button type="button" class="boto contorn" data-accio="tanca">D'acord</button>`);
      return;
    }
    confirma({
      titol: 'Restaurar aquesta còpia?',
      text: `${esc(llegida.resum)}.<br>Les dades d'ara se substituiran per les de la còpia.`,
      boto: 'Substituir les dades',
      enConfirmar: () => {
        substitueix(llegida.dades);
        pinta();
        mostraAvis('Còpia restaurada');
      }
    });
  }

  /*
   * Reiniciar el progrés, en dos passos: primer ofereix fer una còpia; després avisa que no es pot desfer.
   * Esborra l'historial (i la sessió a mitges): l'arbre i la ratxa surten de les sessions.
   * Es queden la rutina, les cites, l'objectiu i els ajustos.
   */
  function reinicia() {
    obreFull(`
      <div class="full-cap"><h2>Reiniciar?</h2>${botoTanca}</div>
      <p>Historial, arbre i ratxa a zero.</p>
      <div class="pila-botons">
        <button type="button" class="boto principal" data-accio="copia">${icona('desa')} Fer còpia</button>
        <button type="button" class="boto contorn" data-accio="seguir">Seguir</button>
      </div>`, {
      copia: async () => {
        if (await ferCopia()) confirmaReinici();
      },
      seguir: () => confirmaReinici()
    });
  }

  function confirmaReinici() {
    confirma({
      titol: 'Segur?',
      text: 'No es pot desfer.',
      boto: 'Reiniciar',
      enConfirmar: () => {
        actualitza(d => {
          d.sessions = [];
          d.sessioEnCurs = null;
          // Les fletxes "↑" de pujada parlen de l'historial que s'esborra (les repeticions es queden).
          d.rutines.forEach(r => r.exercicis.forEach(ex => { delete ex.pujada; }));
        });
        pinta();
        mostraAvis('Progrés reiniciat');
      }
    });
  }

  const clic = e => {
    const boto = e.target.closest('[data-accio]');
    if (!boto || boto.disabled) return;
    const accio = boto.dataset.accio;
    if (accio === 'copia') copia();
    if (accio === 'restaura') contenidor.querySelector('[data-arxiu]').click();
    if (accio === 'salut') mostraAvisSalut();
    if (accio === 'reinicia') reinicia();
    if (accio === 'installa') installa().then(pinta);
    if (accio === 'objectiu') {
      actualitza(d => { d.pla.objectiuSetmanal = Math.min(4, Math.max(1, d.pla.objectiuSetmanal + Number(boto.dataset.signe))); });
      pinta();
      contenidor.querySelector(`[data-signe="${boto.dataset.signe}"]:not([disabled])`)?.focus();
    }
    if (accio === 'restableix') {
      confirma({
        titol: 'Restablir el pla inicial?',
        text: 'Es perdran els canvis de les cites i dels exercicis. L\'historial es manté.',
        boto: 'Restablir',
        enConfirmar: () => {
          const inicials = dadesInicials();
          actualitza(d => {
            d.pla.cites = inicials.pla.cites;
            d.rutines = inicials.rutines;
          });
          mostraAvis('Pla inicial restablert');
        }
      });
    }
  };
  const canvi = e => {
    if (!e.target.matches('[data-arxiu]')) return;
    const arxiu = e.target.files?.[0];
    e.target.value = '';
    if (arxiu) restaura(arxiu);
  };

  contenidor.addEventListener('click', clic);
  contenidor.addEventListener('change', canvi);
  pinta();
  return () => {
    amagaAvis();
    tancaFull();
    contenidor.removeEventListener('click', clic);
    contenidor.removeEventListener('change', canvi);
  };
}
