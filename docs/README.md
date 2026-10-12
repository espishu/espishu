# Espishu

Web app per a iPhone (HTML, CSS i JavaScript sense compilació). Es pot servir la carpeta tal qual, per exemple amb GitHub Pages.

Contingut de la carpeta (rutes des de l'arrel del projecte):

- `docs/`: aquest fitxer i, només a l'ordinador (no es publiquen), les instruccions per a Claude Code, l'especificació i les notes de cada versió.
- `index.html`, `manifest.webmanifest`, `sw.js`: l'app, la instal·lació i el funcionament sense connexió.
- `css/estils.css`: la temàtica "L'arbre" (clar i fosc).
- `src/`: el codi. Totes les dades passen per `src/store.js`; les pantalles són a `src/pantalles/`.
- `src/animacions.js`: les 16 animacions (no s'ha de modificar).
- `src/arbre.js`: l'arbre que creix amb les sessions, amb 5 etapes i 4 estacions (no s'ha de modificar).
- `dades/biblioteca.json` i `dades/imatges/`: els 56 exercicis revisats i les seves fotos (Free Exercise DB).
- `fonts/`: les lletres Lexend i Fraunces (llicència OFL).
- `icons/`: les icones de l'app. `icon.svg` és el dibuix mestre i `favicon.svg` la versió per a mides petites; els PNG i `favicon.ico` es generen amb `eines/icones.ps1` (fa servir `eines/icona.html`).
- `referencia/animacions-demo.html`: obre-la al navegador per veure totes les animacions.
- `referencia/disseny-pantalles.png` i `referencia/disseny-arbre-etapes-estacions.png`: el disseny de la temàtica de l'arbre.
- `eines/verificar_exercicis.py`: la selecció original d'exercicis de Free Exercise DB.

`.nojekyll` fa que GitHub Pages serveixi els fitxers tal qual.

**Important:** cada vegada que canviïs un fitxer de l'app, puja el número de `VERSIO` a `sw.js` perquè el mòbil descarregui la versió nova.
