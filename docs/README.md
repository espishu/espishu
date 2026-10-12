# Espishu

Web app per a iPhone (HTML, CSS i JavaScript sense compilació). Es pot servir la carpeta tal qual, per exemple amb GitHub Pages.

Contingut de la carpeta (rutes des de l'arrel del projecte):

- `docs/`: aquest fitxer i, només a l'ordinador (no es publiquen), les instruccions per a Claude Code, l'especificació i les notes de cada versió.
- `index.html`, `manifest.webmanifest`, `sw.js`: l'app, la instal·lació i el funcionament sense connexió.
- `css/estils.css`: la temàtica "El bosc" (fosc).
- `src/`: el codi. Totes les dades passen per `src/store.js`; les pantalles són a `src/pantalles/`.
- `src/animacions.js`: les animacions de les activitats (no s'ha de modificar).
- `src/bosc.js`: el bosc que creix amb les setmanes complertes, amb una vall nova cada any.
- `src/figura.js`: la figura i les animacions dels exercicis de la rutina.
- `dades/biblioteca.json` i `dades/imatges/`: els 56 exercicis revisats i les seves fotos (Free Exercise DB).
- `fonts/`: les lletres Gloock i Public Sans (llicència OFL).
- `icons/`: les icones de l'app. `icon.svg` és el dibuix mestre i `favicon.svg` la versió per a mides petites; els PNG i `favicon.ico` es generen amb `eines/icones.ps1` (fa servir `eines/icona.html`).
- `referencia/animacions-demo.html`: obre-la al navegador per veure totes les animacions.
- `eines/verificar_exercicis.py`: la selecció original d'exercicis de Free Exercise DB.

`.nojekyll` fa que GitHub Pages serveixi els fitxers tal qual.

**Important:** cada vegada que canviïs un fitxer de l'app, puja el número de `VERSIO` a `sw.js` perquè el mòbil descarregui la versió nova.
