/*
 * sw.js — desa tots els fitxers de l'app perquè funcioni sense connexió.
 *
 * Amb connexió, primer la xarxa (sempre la versió més nova) i, si no respon en 3 segons
 * o no hi ha connexió, la còpia desada. Les fotos i la lletra no canvien: primer la còpia.
 *
 * Actualitzacions: a cada publicació es puja VERSIO (un número més). En obrir l'app (o tornar-hi),
 * app.js demana al navegador que compari aquest fitxer amb el publicat; si VERSIO ha canviat,
 * s'instal·la la versió nova, passa a controlar l'app i l'app es recarrega sola, però mai enmig
 * d'una sessió. El número surt a Ajustos ("Versió 4").
 */
const VERSIO = 'espishu-7';
const ESPERA_XARXA = 3000;

const FITXERS = [
  './',
  'index.html',
  'manifest.webmanifest',
  'css/estils.css',
  'fonts/gloock-400.woff2',
  'fonts/public-sans.woff2',
  'icons/icon.svg',
  'icons/favicon.svg',
  'icons/favicon.ico',
  'icons/apple-touch-icon.png',
  'icons/icon-192.png',
  'icons/icon-512.png',
  'icons/icon-maskable-512.png',
  'dades/biblioteca.json',
  'src/app.js',
  'src/store.js',
  'src/cites.js',
  'src/rutina.js',
  'src/activitat.js',
  'src/ratxa.js',
  'src/resum.js',
  'src/grafics.js',
  'src/full.js',
  'src/copia.js',
  'src/benvinguda.js',
  'src/installacio.js',
  'src/biblioteca.js',
  'src/temps.js',
  'src/so.js',
  'src/dom.js',
  'src/icones.js',
  'src/animacions.js',
  'src/animacio.js',
  'src/figura.js',
  'src/tema.js',
  'src/bosc.js',
  'src/boscdades.js',
  'src/config.js',
  'src/compte.js',
  'src/formulari.js',
  'src/sincronitza.js',
  'src/cercador.js',
  'src/vendor/supabase.js',
  'src/pantalles/avui.js',
  'src/pantalles/sessio.js',
  'src/pantalles/activitat.js',
  'src/pantalles/fet.js',
  'src/pantalles/progres.js',
  'src/pantalles/valls.js',
  'src/pantalles/pla.js',
  'src/pantalles/editar.js',
  'src/pantalles/extra.js',
  'src/pantalles/ajustos.js',
  'src/pantalles/entrar.js',
  'src/pantalles/importar.js'
];

const fresc = url => new Request(url, { cache: 'reload' });
const esFix = url => /\/(dades\/imatges|fonts)\//.test(url);

/*
 * Desa un fitxer a la còpia nova. "reload" evita agafar còpies velles de la memòria cau HTTP.
 * Les fotos i la lletra no canvien: si ja són a la còpia de la versió anterior, es reaprofiten
 * (així cada actualització no torna a baixar els 5 MB de fotos).
 */
async function desa(cache, url) {
  if (esFix(`/${url}`)) {
    const vella = await caches.match(url);
    if (vella) return cache.put(url, vella);
  }
  return cache.add(fresc(url));
}

self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(VERSIO);
    await Promise.all(FITXERS.map(url => desa(cache, url)));
    // Les fotos dels exercicis surten de la biblioteca.
    const biblioteca = await (await cache.match('dades/biblioteca.json')).json();
    await Promise.all(biblioteca.flatMap(e => e.imatges).map(url => desa(cache, url)));
    // La versió nova passa a controlar l'app de seguida; l'app es recarrega quan pot (app.js).
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const claus = await caches.keys();
    await Promise.all(claus.filter(clau => clau !== VERSIO).map(clau => caches.delete(clau)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', event => {
  const peticio = event.request;
  const url = new URL(peticio.url);
  if (peticio.method !== 'GET' || url.origin !== self.location.origin) return;

  // Només la pàgina principal de l'app es desa com a index.html (no altres pàgines de la carpeta).
  const arrel = new URL('./', self.registration.scope).pathname;
  const esApp = peticio.mode === 'navigate' && (url.pathname === arrel || url.pathname === `${arrel}index.html`);
  if (peticio.mode === 'navigate' && !esApp) return;

  event.respondWith((async () => {
    const cache = await caches.open(VERSIO);
    const clau = esApp ? 'index.html' : peticio;
    const desat = await cache.match(clau, { ignoreSearch: true });
    if (desat && esFix(url.pathname)) return desat;

    const xarxa = fetch(peticio, { cache: 'no-cache' }).then(resposta => {
      if (resposta.ok && resposta.type === 'basic') cache.put(clau, resposta.clone());
      return resposta;
    });
    if (!desat) return xarxa;
    // Si la xarxa falla o tarda massa (piscina, cobertura dolenta), la còpia desada.
    return Promise.race([
      xarxa.catch(() => desat),
      new Promise(resol => setTimeout(() => resol(desat), ESPERA_XARXA))
    ]);
  })());
});
