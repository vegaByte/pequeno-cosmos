# Pequeño Cosmos

Juguete táctil de un escenario: cuatro personajes de píxeles, flores de estrellas,
estelas y campanitas pentatónicas. HTML, CSS, Canvas 2D y Web Audio; sin dependencias,
cuentas, analítica ni llamadas a servicios externos. Solo se conserva la preferencia
de silencio en `localStorage` (`cosmos-muted`).

## Abrir localmente

Desde `~/Developer/vegabyte/pequeno-cosmos`:

```sh
python3 -m http.server 4173 --bind 127.0.0.1 --directory docs
```

Abrir <http://127.0.0.1:4173>. No hace falta compilar. `Jugar` desbloquea el audio
desde una interacción. El botón de altavoz silencia o activa el sonido.

La carpeta `docs/` completa es el sitio portable. Para publicarlo más adelante,
activar GitHub Pages desde la rama predeterminada y la carpeta `/docs`. No hay servidor de aplicación.
El servidor de Python solo sirve los archivos durante la vista local.

## Jugar desde GitHub

GitHub Pages sirve `docs/` directamente: sin compilación, credenciales adicionales
ni servicios de alojamiento externos. En Settings → Pages, seleccionar
Deploy from a branch → rama predeterminada → `/docs`. El sitio quedará en
`https://vegabyte.github.io/pequeno-cosmos/`. GitHub procesa la publicación
automáticamente cuando cambia esa rama.

Esa dirección es la prevista; todavía no está publicada.

## iPhone y uso sin conexión

La caché necesita HTTPS o localhost. Una dirección HTTP de la red local del Mac
permite probar los gráficos en el iPhone, pero **no** verifica el service worker.
Para las pruebas completas en un teléfono se necesita un origen HTTPS confiable
accesible desde ese dispositivo; GitHub Pages proporciona ese origen HTTPS.

En Safari: abrir el sitio, esperar la primera carga completa y usar Compartir →
Añadir a pantalla de inicio. Abrir el icono y tocar Jugar. Después de instalarse
la caché, el juego puede recargarse sin conexión. El sistema puede eliminar la
caché del navegador; en ese caso será necesaria otra visita con conexión.

No se fuerza orientación ni pantalla completa: se utiliza el área disponible y
las zonas seguras. Safari conserva sus propios controles al jugar en una pestaña.

## Límites y ciclo de vida

- Pool reutilizable de 256 partículas, hasta 10 contactos y 6 voces simultáneas.
- Notas separadas por al menos 65 ms globales y 140 ms durante una estela.
- Resolución máxima de 2× y 2,5 millones de píxeles en el canvas.
- Se detienen animación y audio al ocultarse la página; se borran los contactos
  al perder foco, rotar, cancelar un gesto o pasar a segundo plano.
- El siguiente toque también intenta reactivar el audio si Safari lo interrumpe.
- `prefers-reduced-motion` elimina la flotación y reduce las dispersiones.
- Sin vibración, música continua, puntuaciones ni condiciones de derrota.

Los archivos del sitio se precargan juntos. Al modificar el sitio, incrementar
la versión de caché en `docs/sw.js`. Las actualizaciones esperan a que se cierren
las pestañas anteriores; no reemplazan código mientras se está jugando.

## Verificar

```sh
node --check docs/game.js
node --check docs/sw.js
bash validate.sh
```

Con el servidor local activo y Chrome disponible, las pruebas de interacción se
pueden reproducir con `chrome-devtools-axi run < checks/browser.js` (sonido activado).

`?qa=1` habilita `window.cosmosQA`, una instantánea de solo lectura para observar
contactos, partículas, voces, estado de audio y animaciones. No guarda datos ni
aparece durante el juego normal. Los iconos PNG se regeneran con
`python3 generate-icons.py`.

La maqueta aprobada está en `design/mockup.html`. La evidencia de
verificación y las comprobaciones pendientes en hardware están en `QA.md`.
