/* Ajustos (PLA.md, secció 7.7). */
import { obte, actualitza, substitueix } from '../store.js';
import { ferCopia, llegeixCopia } from '../copia.js';
import { mostraAvisSalut } from '../benvinguda.js';
import { htmlInstruccions, installa } from '../installacio.js';
import { obreFull, tancaFull, botoTanca, confirma, mostraAvis, amagaAvis } from '../full.js';
import { canviaContrasenya, MIN_CONTRASENYA } from '../compte.js';
import { tancaCompte } from '../sincronitza.js';
import { htmlCampContrasenya, htmlError, commutaUll, mostraError, ocupat } from '../formulari.js';
import { icona } from '../icones.js';
import { esc } from '../dom.js';
import { registraObjectiu, maxObjectiu } from '../boscdades.js';
import { sonsActius, activaSo, xiulet } from '../so.js';

function textUltimaCopia(data) {
  if (!data) return 'Cap còpia encara';
  const d = new Date(`${data}T12:00:00`);
  return `Última: ${new Intl.DateTimeFormat('ca', { day: 'numeric', month: 'short', year: 'numeric' }).format(d)}`;
}

/* `origen`: la pestanya des d'on s'ha obert (#ajustos/avui, #ajustos/progres o #ajustos/pla). */
const PESTANYES = ['avui', 'progres', 'pla'];

export function munta(contenidor, [origen]) {
  const enrere = PESTANYES.includes(origen) ? origen : 'pla';
  function pinta() {
    const { pla, perfil, compte } = obte();
    const objectiu = pla.objectiuSetmanal, max = maxObjectiu(obte());
    contenidor.innerHTML = `
      <header class="capcalera amb-enrere">
        <a class="boto-icona" href="#${enrere}" aria-label="Tornar">${icona('enrere')}</a>
        <h1>Ajustos</h1>
      </header>

      <section class="targeta">
        <h2 class="titol-targeta">Compte</h2>
        <p class="usuari-compte">${icona('usuari')}<span>${esc(compte?.usuari ?? '')}</span></p>
        <div class="pila-botons">
          <button type="button" class="boto contorn" data-accio="contrasenya">${icona('clau')} Contrasenya</button>
          <button type="button" class="boto contorn" data-accio="surt">${icona('sortir')} Tancar sessió</button>
        </div>
      </section>

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
          <span class="objectiu-xifra" aria-label="${objectiu} de ${pla.cites.length} cites per setmana"><strong>${objectiu}</strong>/${pla.cites.length}</span>
          <div class="pas-a-pas compacte">
            <button type="button" class="pas" data-accio="objectiu" data-signe="-1" aria-label="Una sessió menys"${objectiu <= 1 ? ' disabled' : ''}>${icona('menys')}</button>
            <button type="button" class="pas" data-accio="objectiu" data-signe="1" aria-label="Una sessió més"${objectiu >= max ? ' disabled' : ''}>${icona('mes')}</button>
          </div>
        </div>
      </section>

      <section class="targeta">
        <button type="button" class="opcio-interruptor" role="switch" aria-checked="${sonsActius()}" data-accio="sons">
          <span class="icona-activitat petita">${icona('so')}</span>
          <span class="text-opcio"><span class="nom-item">Sons</span><span class="secundari">En mode silenci no sonen</span></span>
          <span class="interruptor" aria-hidden="true"></span>
        </button>
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
          <button type="button" class="boto contorn" data-accio="reinicia">${icona('paperera')} Reiniciar</button>
        </div>
        <div class="sobre">
          <p>Espishu</p>
          <p class="secundari">Exercicis i fotos: Free Exercise DB (domini públic). Lletres: Gloock i Public Sans (llicència OFL).</p>
        </div>
      </details>
      <p class="versio-app" data-versio></p>`;
    mostraVersio();
  }

  /*
   * La versió instal·lada en aquest aparell: el número de la còpia del service worker (sw.js, "espishu-7",
   * o "espishu-7.1" per a una edició petita de la 7).
   */
  async function mostraVersio() {
    let numero = null;
    try {
      const parts = text => text.split('.').map(Number);
      const mesNova = (a, b) => { const [x, y] = [parts(a), parts(b)]; return x[0] - y[0] || (x[1] ?? 0) - (y[1] ?? 0); };
      const numeros = (await caches.keys()).map(nom => /^espishu-(\d+(?:\.\d+)?)$/.exec(nom)?.[1]).filter(Boolean);
      if (numeros.length) numero = numeros.sort(mesNova).at(-1);
    } catch { /* sense memòria cau (navegador antic o mode privat) */ }
    const lloc = contenidor.querySelector('[data-versio]');
    if (lloc) lloc.textContent = numero ? `Versió ${numero}` : '';
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
   * Esborra l'historial (i la sessió a mitges): el bosc surt de les sessions.
   * Es queden la rutina, les cites, l'objectiu i els ajustos.
   */
  function reinicia() {
    obreFull(`
      <div class="full-cap"><h2>Reiniciar?</h2>${botoTanca}</div>
      <p>Historial i bosc a zero.</p>
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
          d.pla.cites.forEach(c => c.rutina?.exercicis.forEach(ex => { delete ex.pujada; }));
          // El bosc torna a començar: les etiquetes "Nou: …" tornaran a sortir.
          if (d.perfil.bosc) d.perfil.bosc.vist = {};
        });
        pinta();
        mostraAvis('Progrés reiniciat');
      }
    });
  }

  /* Canviar la contrasenya: l'actual i la nova dues vegades. */
  function contrasenya() {
    const full = obreFull(`
      <div class="full-cap"><h2>Contrasenya</h2>${botoTanca}</div>
      <form class="formulari" novalidate>
        ${htmlCampContrasenya({ nom: 'actual', etiqueta: 'Actual', autocomplete: 'current-password', ull: true })}
        ${htmlCampContrasenya({ nom: 'nova', etiqueta: 'Nova', autocomplete: 'new-password' })}
        ${htmlCampContrasenya({ nom: 'repeteix', etiqueta: 'Repetir', autocomplete: 'new-password' })}
        ${htmlError()}
        <button type="submit" class="boto principal">Canviar</button>
      </form>`, {
      ull: () => commutaUll(formulari)
    });
    const formulari = full.querySelector('form');
    formulari.addEventListener('submit', async e => {
      e.preventDefault();
      const { actual, nova, repeteix } = formulari.elements;
      if (!actual.value) return mostraError(formulari, 'Escriu l\'actual', 'actual');
      if (nova.value.length < MIN_CONTRASENYA) return mostraError(formulari, `Mínim ${MIN_CONTRASENYA} caràcters`, 'nova');
      if (nova.value !== repeteix.value) return mostraError(formulari, 'No coincideixen', 'repeteix');
      if (!navigator.onLine) return mostraError(formulari, 'Sense connexió');
      mostraError(formulari, '');
      ocupat(formulari, true);
      try {
        await canviaContrasenya(obte().compte.usuari, actual.value, nova.value);
        tancaFull();
        mostraAvis('Contrasenya canviada');
      } catch (error) {
        ocupat(formulari, false);
        mostraError(formulari, error.message, error.motiu === 'actual' ? 'actual' : error.motiu === 'igual' ? 'nova' : null);
      }
    });
  }

  function surt() {
    confirma({
      titol: 'Tancar sessió?',
      boto: `${icona('sortir')} Tancar sessió`,
      enConfirmar: async () => {
        if (await tancaCompte()) {
          location.hash = '#entrar';
          return;
        }
        obreFull(`
          <div class="full-cap"><h2>Canvis pendents</h2>${botoTanca}</div>
          <p>Cal connexió per desar-los.</p>
          <button type="button" class="boto contorn" data-accio="tanca">D'acord</button>`);
      }
    });
  }

  const clic = e => {
    const boto = e.target.closest('[data-accio]');
    if (!boto || boto.disabled) return;
    const accio = boto.dataset.accio;
    if (accio === 'contrasenya') contrasenya();
    if (accio === 'surt') surt();
    if (accio === 'copia') copia();
    if (accio === 'restaura') contenidor.querySelector('[data-arxiu]').click();
    if (accio === 'salut') mostraAvisSalut();
    if (accio === 'reinicia') reinicia();
    if (accio === 'installa') installa().then(pinta);
    if (accio === 'sons') {
      // D'aquest aparell: perfil.sons no es puja a Supabase (sincronitza.js només puja perfil.bosc).
      const actius = !sonsActius();
      actualitza(d => { d.perfil.sons = actius; });
      if (actius) { activaSo(); xiulet(true); } // dins el toc: es pot sentir com sona
      pinta();
      contenidor.querySelector('[data-accio="sons"]')?.focus();
    }
    if (accio === 'objectiu') {
      // Les setmanes passades es queden amb l'objectiu que tenien (boscdades.js).
      actualitza(d => {
        const nou = Math.min(maxObjectiu(d), Math.max(1, d.pla.objectiuSetmanal + Number(boto.dataset.signe)));
        if (nou !== d.pla.objectiuSetmanal) registraObjectiu(d, nou);
        d.pla.objectiuSetmanal = nou;
      });
      pinta();
      contenidor.querySelector(`[data-signe="${boto.dataset.signe}"]:not([disabled])`)?.focus();
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
