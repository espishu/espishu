/*
 * Pantalla de sessió de rutina (PLA.md, secció 7.2).
 * L'estat viu a store (sessioEnCurs) i es desa a cada canvi; aquí només hi ha l'estat de la vista.
 */
import { obte, actualitza } from '../store.js';
import { exercici, alternativesDe, textObjectiu } from '../biblioteca.js';
import { muntaAnimacio, renderAnimacio } from '../animacions.js';
import {
  exerciciAcabat, exerciciAMitges, serieActiva, primerPendent, totAcabat,
  confirmaSerie, vesA, saltaExercici, substitueix, afegeixSerie, registre, iniciaCompte,
  autoEnMarxa, esperaPasAuto, avancaAuto, pausaAuto, reprenAuto, pausaVigent
} from '../rutina.js';
import { aplicaProgressio } from '../ratxa.js';
import { formatRellotge, formatCompte, restant } from '../temps.js';
import { activaSo, xiulet } from '../so.js';
import { obreFull, tancaFull, botoTanca, mostraAvis, amagaAvis } from '../full.js';
import { icona } from '../icones.js';
import { esc } from '../dom.js';
import * as activitat from './activitat.js';

const MISSATGE_DOLOR = 'Atura\'t si el dolor continua. Si es repeteix, consulta-ho amb un professional.';

const sessio = () => obte().sessioEnCurs;
const nomDe = id => exercici(id)?.nom ?? id;

export function munta(contenidor) {
  const s = sessio();
  if (!s) {
    location.replace('#avui');
    return;
  }
  if (s.tipus === 'activitat') return activitat.munta(contenidor);

  contenidor.innerHTML = `
    <header class="sessio-cap">
      <span class="rellotge">${icona('rellotge')}<span data-rellotge>00:00</span></span>
      <span class="visually-hidden" data-progres></span>
      <button type="button" class="boto-icona" data-accio="llista" aria-label="Llista d'exercicis">${icona('llista')}</button>
      <ol class="fulles" data-fulles aria-hidden="true"></ol>
    </header>
    <div data-zona="exercici"></div>
    <div data-zona="cos"></div>
    <div data-zona="peu"></div>
  `;

  const zona = nom => contenidor.querySelector(`[data-zona="${nom}"]`);

  /* Estat de la vista (no es desa). */
  let exMostrat = null;      // índex de l'exercici dibuixat a dalt
  let editant = null;        // sèrie feta que s'està corregint
  let ajustant = false;      // es veuen els botons per afegir i eliminar sèries
  let fetesAbans = null;     // sèries i exercicis fets al dibuix anterior, per animar només els nous (13.7)
  let noves = new Set();
  let desmuntaAnimacio = null;
  let bloqueig = null;

  /*
   * Aplica un canvi a la sessió desada i torna a dibuixar.
   * En mode automàtic, si després del canvi no hi ha res en marxa, posa en marxa el pas següent.
   */
  function canvia(fn, { pinta: repinta = true } = {}) {
    let resultat, avancat = false;
    actualitza(d => {
      resultat = fn(d.sessioEnCurs);
      if (d.sessioEnCurs) avancat = avancaAuto(d.sessioEnCurs);
    });
    if (repinta || avancat) pinta();
    return resultat;
  }

  /* ---------- Dibuix ---------- */

  function pinta() {
    const s = sessio();
    if (!s) return;
    contenidor.querySelector('[data-progres]').textContent = totAcabat(s) ? 'Tot fet' : `Exercici ${s.actual + 1} de ${s.exercicis.length}`;
    // Filera de fulles (13.3): verda si l'exercici està acabat, color d'estació si és l'actual, buida si és pendent.
    const fetesAra = new Set(s.exercicis.flatMap((ex, e) => [
      ...(exerciciAcabat(ex) ? [`ex${e}`] : []),
      ...ex.series.flatMap((sr, i) => sr.feta ? [`${e}:${i}`] : [])
    ]));
    noves = fetesAbans ? new Set([...fetesAra].filter(k => !fetesAbans.has(k))) : new Set();
    fetesAbans = fetesAra;
    contenidor.querySelector('[data-fulles]').innerHTML = s.exercicis.map((ex, i) =>
      `<li class="${exerciciAcabat(ex) ? 'feta' : i === s.actual ? 'actual' : 'pendent'}${noves.has(`ex${i}`) ? ' nova' : ''}">${icona('fulla')}</li>`).join('');

    const clau = `${s.actual}:${s.exercicis[s.actual].id}`;
    if (clau !== exMostrat) {
      exMostrat = clau;
      editant = null;
      ajustant = false;
      pintaExercici();
      window.scrollTo(0, 0);
    }
    pintaCos();
    pintaPeu();
    noves = new Set();   // si es torna a dibuixar només el cos, ja no s'anima
    tic();
  }

  function pintaExercici() {
    desmuntaAnimacio?.();
    desmuntaAnimacio = null;
    const s = sessio(), ex = s.exercicis[s.actual], info = exercici(ex.id);
    // Sota el títol només surt el que no diuen les sèries: "per costat" o la nota de l'exercici.
    const detall = [ex.perCostat && 'Per costat', ex.nota].filter(Boolean).join(' · ');
    // Sota l'animació, només una icona de "toca": desapareix mentre es mou.
    const imatge = info?.animacio
      ? `<button type="button" class="escenari" aria-label="${esc(info.nom)}: toca per veure el moviment"></button>
         <p class="pista" aria-hidden="true" data-pista>${icona('play')}</p>`
      : info?.imatges?.length
        ? `<div class="fotos" role="img" aria-label="Fotos de ${esc(info.nom)}">${info.imatges.map(src => `<img src="${esc(src)}" alt="">`).join('')}</div>`
        : '';
    const xips = info ? [
      ...info.muscles.principals.map(m => `<li><span class="mostra p"></span>${esc(m)}</li>`),
      ...info.muscles.secundaris.map(m => `<li><span class="mostra s"></span>${esc(m)}</li>`)
    ].join('') : '';
    zona('exercici').innerHTML = `
      <section class="targeta exercici">
        <div class="exercici-cap">
          <h1>${esc(nomDe(ex.id))}</h1>
          ${ex.pujada ? `<span class="nou" aria-label="Puja a ${ex.pujada.ara} (abans ${ex.pujada.abans})">${icona('amunt')}${ex.pujada.ara}</span>` : ''}
        </div>
        ${detall ? `<p class="dosi">${esc(detall)}</p>` : ''}
        ${ex.substitueix ? `<p class="secundari">En lloc de: ${esc(nomDe(ex.substitueix))}</p>` : ''}
        <div class="figura">${imatge}</div>
        ${info?.explicacio || xips ? `
          <details class="com-es-fa">
            <summary>${icona('info')} Com es fa</summary>
            ${info?.explicacio ? `<p class="explicacio">${esc(info.explicacio)}</p>` : ''}
            ${xips ? `<ul class="xips" aria-label="Músculs">${xips}</ul>` : ''}
          </details>` : ''}
      </section>`;
    const escenari = zona('exercici').querySelector('.escenari');
    if (escenari) {
      const pista = zona('exercici').querySelector('[data-pista]');
      desmuntaAnimacio = muntaAnimacio(escenari, info.animacio, {
        onEstat: e => { pista.classList.toggle('amagada', e === 'moviment'); }
      });
    }
  }

  function pintaCos() {
    const s = sessio();
    if (totAcabat(s)) {
      zona('cos').innerHTML = `
        <section class="targeta final">
          <span class="icona-activitat">${icona('check')}</span>
          <h2>Tot fet</h2>
          <button type="button" class="boto principal" data-accio="acaba">Acabar</button>
        </section>
        ${htmlSeries(s)}`;
      return;
    }
    const ex = s.exercicis[s.actual];
    let html = '';
    if (s.auto?.pausa) html += htmlPausa(s);
    if (s.descans) html += htmlDescans(s);
    if (s.compte) html += htmlCompte(s);
    html += htmlSeries(s);
    if (exerciciAcabat(ex) && !ex.saltat) {
      html += `<button type="button" class="boto contorn" data-accio="seguent">Següent ${icona('endavant')}</button>`;
    }
    zona('cos').innerHTML = html;
  }

  const botoPausa = `<button type="button" class="boto-franja rodo" data-accio="pausa" aria-label="Pausa">${icona('pausa')}</button>`;

  /* Franja verda (13.3): el compte enrere gran a l'esquerra i els botons a la dreta. */
  function htmlFranja({ classe, etiqueta, aria, compte, botons }) {
    return `
      <section class="franja ${classe}" aria-label="${esc(aria)}">
        <div class="franja-temps">
          <p class="franja-etiqueta"${compte === 'serie' ? ' data-etiqueta-compte' : ''}>${esc(etiqueta)}</p>
          <p class="xifra" data-compte="${compte}">0:00</p>
        </div>
        <div class="franja-botons">${botons}</div>
        <span class="barra-temps" aria-hidden="true"><span data-barra-temps="${compte}"></span></span>
      </section>`;
  }

  function htmlDescans(s) {
    const ex = s.exercicis[s.actual], i = serieActiva(ex);
    // Abans de la primera sèrie, "Prepara't" (el nom de l'exercici ja surt a dalt); després, "Descans".
    const prepara = i <= 0 && !ex.series.some(sr => sr.feta);
    return htmlFranja({
      classe: 'descans',
      etiqueta: prepara ? 'Prepara\'t' : 'Descans',
      aria: prepara ? 'Preparació' : 'Descans',
      compte: 'descans',
      botons: `
        ${autoEnMarxa(s) ? botoPausa : ''}
        <button type="button" class="boto-franja" data-accio="mes15">+15 s</button>
        <button type="button" class="boto-franja ple" data-accio="salta-descans" aria-label="Saltar el descans">Salta</button>`
    });
  }

  /* L'etiqueta del compte enrere d'una sèrie: què cal fer ara. */
  function etiquetaCompte(s, meitat) {
    const { compte } = s, ex = s.exercicis[compte.exercici] ?? s.exercicis[s.actual];
    if (compte.perCostat && meitat) return 'Canvia de costat';
    if (compte.unitat === 'segons') return compte.perCostat ? 'Primer costat' : 'Aguanta';
    return `Sèrie ${compte.serie + 1} · ${ex.series[compte.serie].fet}${compte.perCostat ? ' · primer costat' : ''}`;
  }

  function htmlCompte(s) {
    const meitat = restant(s.compte.fins) <= s.compte.total * 500;
    return htmlFranja({
      classe: 'compte',
      etiqueta: etiquetaCompte(s, meitat),
      aria: 'Compte enrere',
      compte: 'serie',
      botons: autoEnMarxa(s)
        ? `${botoPausa}
           <button type="button" class="boto-franja ple rodo" data-accio="acaba-compte" aria-label="Sèrie feta">${icona('check')}</button>`
        : `<button type="button" class="boto-franja" data-accio="atura-compte">Atura</button>
           <button type="button" class="boto-franja ple" data-accio="acaba-compte">Ja està</button>`
    });
  }

  /* Mode automàtic aturat: el temps que quedava (si encara serveix) i "Continua". */
  function htmlPausa(s) {
    const vigent = pausaVigent(s);
    return `
      <section class="franja pausa" aria-label="En pausa">
        <div class="franja-temps">
          <p class="franja-etiqueta">En pausa</p>
          ${vigent ? `<p class="xifra">${formatCompte(vigent.quedaven)}</p>` : ''}
        </div>
        <div class="franja-botons">
          <button type="button" class="boto principal" data-accio="continua">${icona('play')} Continua</button>
        </div>
      </section>`;
  }

  /*
   * Sèries (13.3): files amb el número i les repeticions (sense repetir "reps").
   * Feta: fons suau i una fulla blanca dins un cercle verd. Activa: − / número / + i ✓.
   */
  function htmlSeries(s) {
    const ex = s.exercicis[s.actual];
    if (ex.saltat) {
      return `
        <section class="targeta">
          <p>Saltat</p>
          <button type="button" class="boto-text" data-accio="refes">Fer-lo igualment</button>
        </section>`;
    }
    const activa = serieActiva(ex);
    const valor = n => ex.unitat === 'segons' ? `${n} s` : `${n}`;
    const files = ex.series.map((sr, i) => {
      const nom = `Sèrie ${i + 1}`;
      const num = `<span class="serie-num">${i + 1}</span>`;
      if (sr.feta && editant !== i) {
        return `
          <li class="serie feta${noves.has(`${s.actual}:${i}`) ? ' nova' : ''}">
            <button type="button" class="serie-fila" data-accio="obre" data-i="${i}" aria-label="${nom}: ${sr.fet} fetes. Toca per corregir">
              ${num}
              <span class="serie-valor">${valor(sr.fet)}</span>
              <span class="serie-marca">${icona('fulla')}</span>
            </button>
          </li>`;
      }
      const enMarxa = s.compte && s.compte.serie === i;
      const pucActuar = (i === activa && !s.descans && !s.compte) || (sr.feta && editant === i);
      if (!pucActuar) {
        // Eliminar una sèrie només surt després de prémer el llapis.
        const elimina = ajustant && !sr.feta && !enMarxa
          ? `<button type="button" class="boto-elimina" data-accio="elimina" data-i="${i}" aria-label="Eliminar la ${nom.toLowerCase()}">${icona('menys')}</button>` : '';
        return `
          <li class="serie ${i === activa ? 'propera' : 'pendent'}" aria-label="${nom}: ${valor(sr.objectiu)}">
            <div class="serie-fila">${num}<span class="serie-valor">${valor(sr.objectiu)}</span>${elimina}</div>
          </li>`;
      }
      const control = ex.unitat === 'segons' && !sr.feta
        ? `<button type="button" class="boto principal play" data-accio="play" data-i="${i}">${icona('play')} ${sr.objectiu} s</button>`
        : `<div class="pas-a-pas">
             <button type="button" class="pas" data-accio="menys" data-i="${i}" aria-label="Una menys">${icona('menys')}</button>
             <label class="camp">
               <input type="number" inputmode="numeric" pattern="[0-9]*" min="0" max="999" data-camp="fet" data-i="${i}"
                 value="${sr.fet}" aria-label="${ex.unitat === 'segons' ? 'Segons' : 'Repeticions'} fets a la ${nom.toLowerCase()}">
             </label>
             <button type="button" class="pas" data-accio="mes" data-i="${i}" aria-label="Una més">${icona('mes')}</button>
           </div>`;
      return `
        <li class="serie activa" aria-label="${nom}">
          <div class="serie-fila">
            ${num}
            ${control}
            <button type="button" class="confirma" data-accio="confirma" data-i="${i}" aria-label="${sr.feta ? 'Desa la correcció' : 'Sèrie feta'}">${icona('check')}</button>
          </div>
        </li>`;
    }).join('');
    return `
      <section class="series" aria-label="Sèries">
        <ol class="llista-series">${files}</ol>
        <div class="series-accions">
          <button type="button" class="boto-discontinu" data-accio="afegeix" aria-label="Afegir una sèrie">${icona('mes')}</button>
          <button type="button" class="boto-discontinu${ajustant ? ' actiu' : ''}" data-accio="ajusta" aria-label="${ajustant ? 'Deixar d\'ajustar les sèries' : 'Ajustar les sèries'}" aria-pressed="${ajustant}">${icona('llapis')}</button>
        </div>
      </section>`;
  }

  /* "Salta" i "Em fa mal" sempre a la vista (seguretat). Els músculs són a "Com es fa". */
  function pintaPeu() {
    const s = sessio(), ex = s.exercicis[s.actual];
    zona('peu').innerHTML = exerciciAcabat(ex) ? '' : `
      <div class="fila-botons petits">
        <button type="button" class="boto contorn" data-accio="salta">${icona('saltar')} Salta</button>
        <button type="button" class="boto contorn" data-accio="dolor">${icona('dolor')} Em fa mal</button>
      </div>`;
  }

  /* ---------- Rellotges (cada 250 ms; el temps surt de marques desades) ---------- */

  function tic() {
    const s = sessio();
    if (!s) return;
    const ara = Date.now();
    contenidor.querySelector('[data-rellotge]').textContent = formatRellotge(ara - Date.parse(s.inici));

    if (s.descans) {
      const r = restant(s.descans.fins, ara);
      posaCompte('descans', r, s.descans.total * 1000);
      if (r <= 0) {
        // En mode automàtic, en acabar el descans comença la sèrie. Compta des d'ara: si l'app estava
        // tancada, no es donen per fetes sèries que no s'han vist.
        canvia(s => { s.descans = null; avancaAuto(s, ara, { directe: true }); });
        xiulet();
        if (sessio()?.compte) portaALaVista('.compte');
        return;
      }
    }
    if (s.compte) {
      const total = s.compte.total * 1000, r = restant(s.compte.fins, ara);
      posaCompte('serie', r, total);
      if (s.compte.perCostat && r <= total / 2) {
        const etiqueta = contenidor.querySelector('[data-etiqueta-compte]');
        if (etiqueta) etiqueta.textContent = etiquetaCompte(s, true);
        // L'avís es desa a la sessió perquè no torni a sonar si l'app es torna a obrir.
        if (!s.compte.avisat && r > 0) {
          canvia(s => { s.compte.avisat = true; }, { pinta: false });
          xiulet(true);
        }
      }
      if (r <= 0) {
        const { serie } = s.compte;
        const fet = s.exercicis[s.actual].series[serie].fet;
        xiulet();
        canvia(s => { confirmaSerie(s, serie, fet, ara); avancaAuto(s, ara, { directe: true }); });
        return;
      }
    }
    if (esperaPasAuto(s)) canvia(() => {});
  }

  function posaCompte(nom, r, total) {
    const xifra = contenidor.querySelector(`[data-compte="${nom}"]`);
    if (xifra) xifra.textContent = formatCompte(r);
    const barra = contenidor.querySelector(`[data-barra-temps="${nom}"]`);
    if (barra) barra.style.width = `${total ? (r / total) * 100 : 0}%`;
  }

  /* ---------- Accions ---------- */

  function valorDe(i) {
    const camp = contenidor.querySelector(`[data-camp="fet"][data-i="${i}"]`);
    const n = parseInt(camp?.value, 10);
    return Number.isFinite(n) && n >= 0 ? Math.min(n, 999) : null;
  }

  function ajusta(i, signe) {
    const s = sessio(), ex = s.exercicis[s.actual];
    const pas = ex.unitat === 'segons' ? 5 : 1;
    const actual = valorDe(i) ?? ex.series[i].fet;
    const nou = Math.max(0, Math.min(999, actual + signe * pas));
    canvia(s => { s.exercicis[s.actual].series[i].fet = nou; }, { pinta: false });
    const camp = contenidor.querySelector(`[data-camp="fet"][data-i="${i}"]`);
    if (camp) camp.value = nou;
  }

  function confirma(i) {
    const s = sessio(), sr = s.exercicis[s.actual].series[i];
    const fet = valorDe(i) ?? sr.fet;
    if (sr.feta) {
      editant = null;
      canvia(s => { s.exercicis[s.actual].series[i].fet = fet; });
      return;
    }
    const resultat = canvia(s => {
      const r = confirmaSerie(s, i, fet);
      avancaAuto(s, Date.now(), { directe: true }); // si no hi ha descans, la sèrie següent comença sola
      return r;
    });
    if (resultat === 'serie') portaALaVista('.descans, .compte');
    if (resultat === 'fi') portaALaVista('.final');
  }

  function elimina(i) {
    const s = sessio();
    const index = s.actual, actualAbans = s.actual;
    const serie = s.exercicis[index].series[i];
    canvia(s => {
      const ex = s.exercicis[index];
      ex.series.splice(i, 1);
      // Si ja no en queda cap per fer, passa al següent exercici pendent.
      if (exerciciAcabat(ex)) {
        const seguent = primerPendent(s);
        if (seguent !== -1) vesA(s, seguent);
      }
    });
    mostraAvis('Sèrie eliminada', {
      accio: 'Desfer',
      enAccio: () => canvia(s => {
        s.exercicis[index].series.splice(i, 0, serie);
        vesA(s, actualAbans);
      })
    });
  }

  function comencaCompte(i) {
    canvia(s => iniciaCompte(s, i));
    portaALaVista('.compte');
  }

  /* "Ja està" o "Feta": per temps, compten els segons fets; per repeticions, el número apuntat. */
  function acabaCompteAra() {
    const s = sessio();
    if (!s.compte) return;
    const { serie, total, fins, perCostat, unitat } = s.compte;
    const segons = Math.round((total * 1000 - restant(fins)) / 1000);
    const fet = unitat === 'segons'
      ? (perCostat ? Math.round(segons / 2) : segons)
      : s.exercicis[s.actual].series[serie].fet;
    canvia(s => { confirmaSerie(s, serie, fet); avancaAuto(s, Date.now(), { directe: true }); });
    portaALaVista('.descans, .compte');
  }

  function portaALaVista(selector) {
    const el = contenidor.querySelector(selector);
    if (!el) return;
    const caixa = el.getBoundingClientRect();
    if (caixa.top < 80 || caixa.bottom > window.innerHeight) {
      el.scrollIntoView({ block: 'center', behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
    }
  }

  function acaba() {
    const reg = registre(sessio(), new Date());
    actualitza(d => {
      d.sessions.push(reg);
      reg.pujades = aplicaProgressio(d, reg);
      d.sessioEnCurs = null;
    });
    location.hash = `#fet/${reg.id}`;
  }

  /* ---------- Fulls (llista, alternatives, confirmació) ---------- */

  function obreLlista() {
    const s = sessio();
    const items = s.exercicis.map((ex, i) => {
      const acabat = exerciciAcabat(ex), mitges = exerciciAMitges(ex);
      const fetes = ex.series.filter(sr => sr.feta).length;
      const estat = ex.saltat ? 'Saltat' : acabat ? 'Fet' : mitges ? `${fetes} de ${ex.series.length}` : i === s.actual ? 'Ara' : '';
      const classes = ['item-ex', acabat && 'acabat', mitges && 'mitges', i === s.actual && 'actual'].filter(Boolean).join(' ');
      return `
        <li>
          <button type="button" class="${classes}" data-accio="ves" data-i="${i}"${i === s.actual ? ' aria-current="step"' : ''}>
            <span class="marca">${acabat ? icona('check') : i + 1}</span>
            <span class="nom-item">${esc(nomDe(ex.id))}</span>
            <span class="estat-item">${estat}</span>
          </button>
        </li>`;
    }).join('');
    obreFull(`
      <div class="full-cap"><h2>Exercicis</h2>${botoTanca}</div>
      <ol class="llista-ex">${items}</ol>
      <button type="button" class="boto-text discret" data-accio="acaba-abans">Acabar abans d'hora</button>`, {
      ves: ({ i }) => { tancaFull(); canvia(s => vesA(s, Number(i))); },
      'acaba-abans': () => confirmaAcabarAbans()
    });
  }

  function confirmaAcabarAbans() {
    obreFull(`
      <div class="full-cap"><h2>Vols acabar ara?</h2>${botoTanca}</div>
      <div class="pila-botons">
        <button type="button" class="boto principal" data-accio="si">Acabar ara</button>
        <button type="button" class="boto contorn" data-accio="tanca">Continuar la sessió</button>
      </div>`, {
      si: () => { tancaFull(); acaba(); }
    });
  }

  function obreAlternatives(motiu) {
    const s = sessio(), index = s.actual, ex = s.exercicis[index];
    const idBase = ex.substitueix ?? ex.id;
    if (motiu === 'dolor') actualitza(d => { d.ajustos.dolors.push(ex.id); });
    const opcions = alternativesDe(idBase).filter(a => a.id !== ex.id);
    const items = opcions.map(a => `
      <li>
        <button type="button" class="item-alt" data-accio="canvia" data-id="${esc(a.id)}">
          <span class="miniatura">${miniatura(a)}</span>
          <span><span class="nom-item">${esc(a.nom)}</span>
          <span class="secundari">${esc(textObjectiu(a.objectiu, a.unitat, a.perCostat))}</span></span>
        </button>
      </li>`).join('');
    obreFull(`
      <div class="full-cap"><h2>${motiu === 'dolor' ? 'Em fa mal' : 'Salta'}: ${esc(nomDe(ex.id))}</h2>${botoTanca}</div>
      ${motiu === 'dolor' ? `<p class="avis-salut">${icona('dolor')}<span>${MISSATGE_DOLOR}</span></p>` : ''}
      ${items ? `<p class="etiqueta">Canvia'l per:</p><ul class="llista-alt">${items}</ul>` : ''}
      <button type="button" class="boto contorn" data-accio="salta-sense">${icona('saltar')} Saltar</button>`, {
      canvia: ({ id }) => { tancaFull(); canvia(s => substitueix(s, index, exercici(id))); },
      'salta-sense': () => { tancaFull(); canvia(s => saltaExercici(s, index)); }
    });
  }

  function miniatura(info) {
    if (info.animacio) return renderAnimacio(info.animacio, 0);
    return info.imatges?.[0] ? `<img src="${esc(info.imatges[0])}" alt="">` : '';
  }

  /* ---------- Esdeveniments ---------- */

  const ACCIONS = {
    llista: obreLlista,
    menys: ({ i }) => ajusta(Number(i), -1),
    mes: ({ i }) => ajusta(Number(i), 1),
    confirma: ({ i }) => confirma(Number(i)),
    obre: ({ i }) => { editant = Number(i); pintaCos(); },
    elimina: ({ i }) => elimina(Number(i)),
    afegeix: () => canvia(s => afegeixSerie(s.exercicis[s.actual], exercici(s.exercicis[s.actual].id)?.objectiu ?? 10)),
    ajusta: () => { ajustant = !ajustant; pintaCos(); },
    play: ({ i }) => comencaCompte(Number(i)),
    'atura-compte': () => canvia(s => { s.compte = null; }),
    'acaba-compte': acabaCompteAra,
    mes15: () => canvia(s => { if (s.descans) { s.descans.fins += 15000; s.descans.total += 15; } }),
    'salta-descans': () => {
      canvia(s => { s.descans = null; avancaAuto(s, Date.now(), { directe: true }); });
      portaALaVista('.compte');
    },
    pausa: () => canvia(s => pausaAuto(s)),
    continua: () => { canvia(s => reprenAuto(s)); portaALaVista('.descans, .compte'); },
    salta: () => obreAlternatives('salta'),
    dolor: () => obreAlternatives('dolor'),
    seguent: () => canvia(s => { const i = primerPendent(s); if (i !== -1) vesA(s, i); }),
    refes: () => canvia(s => { s.exercicis[s.actual].saltat = false; }),
    acaba
  };

  function clic(e) {
    activaSo();
    const boto = e.target.closest('[data-accio]');
    if (boto && contenidor.contains(boto)) ACCIONS[boto.dataset.accio]?.(boto.dataset);
  }

  /* El número escrit es desa a mesura que s'escriu, sense tornar a dibuixar. */
  function escriu(e) {
    const camp = e.target.closest('[data-camp="fet"]');
    if (!camp) return;
    const n = parseInt(camp.value, 10);
    if (Number.isFinite(n) && n >= 0) {
      canvia(s => { s.exercicis[s.actual].series[Number(camp.dataset.i)].fet = Math.min(n, 999); }, { pinta: false });
    }
  }

  /* La pantalla no s'apaga durant la sessió (si el navegador ho permet). */
  async function mantePantalla() {
    try {
      if ('wakeLock' in navigator && document.visibilityState === 'visible') {
        bloqueig = await navigator.wakeLock.request('screen');
      }
    } catch { /* no és imprescindible */ }
  }

  function visibilitat() {
    if (document.visibilityState === 'visible') { mantePantalla(); tic(); }
  }

  contenidor.addEventListener('click', clic);
  contenidor.addEventListener('input', escriu);
  document.addEventListener('visibilitychange', visibilitat);
  const interval = setInterval(tic, 250);
  mantePantalla();
  pinta();

  return () => {
    clearInterval(interval);
    amagaAvis();
    desmuntaAnimacio?.();
    tancaFull();
    bloqueig?.release().catch(() => {});
    contenidor.removeEventListener('click', clic);
    contenidor.removeEventListener('input', escriu);
    document.removeEventListener('visibilitychange', visibilitat);
  };
}
