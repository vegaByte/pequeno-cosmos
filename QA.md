# Verificación — 31 de octubre de 2026

Implementación estática verificada en Chrome con viewport móvil emulado. La maqueta
`design/mockup.html` fue revisada en Lavish y aprobada con «perfecto» antes de implementar.

| Comprobación | Resultado y evidencia |
| --- | --- |
| Inicio | Clic real en Jugar oculta la portada y desbloquea AudioContext (`running`). |
| Marcianitos | Un toque cambia el color e inicia la dispersión; recomposición completa en 1,8 s. |
| Fondo | Tocar genera partículas; desaparecen al terminar su duración. |
| Multitáctil y arrastre | Diez Pointer Events simultáneos simulados, 45 movimientos por contacto; máximo observado: 256 partículas y 5 voces. Contactos adicionales se ignoran. |
| Contactos rápidos y prolongados | Cien toques rápidos, contacto mantenido y pérdida de captura: sin acumulación de contactos; partículas y voces vuelven a cero. |
| Silencio | Botón real, persistencia tras recargar, inicio silenciado sin crear AudioContext y reactivación del audio al pulsar el botón. |
| Ciclo de vida | `pagehide`/`pageshow` simulados: contador de frames inmóvil y audio suspendido; ambos se reanudan al volver. |
| Orientación | 390 × 844 y 844 × 390; cuatro personajes visibles, sin desbordamiento horizontal. |
| Resolución | En viewport 390 × 844 con DPR 3, canvas limitado a 780 × 1688. |
| Caché | Ocho recursos precargados, caché v2 controlando la página. |
| Rutas para GitHub Pages | Prueba bajo `/docs/` en un origen local nuevo: scope y start URL permanecen en el subdirectorio; ambos iconos responden HTTP 200. |
| Sin conexión | Servidor local apagado; navegación nueva a `?qa=1&offline=2`; petición no cacheada falla, pero Jugar funciona, se generan 24 partículas y una voz, audio `running`. |
| Sintaxis y recursos | `bash validate.sh`: JavaScript, manifest, iconos PNG y archivos requeridos correctos. |

Los eventos táctiles simulados verifican los manejadores y sus límites. No sustituyen
el comportamiento de los gestos ni el audio percibido en hardware real. La prueba de
red se realizó apagando el servidor: el emulador de red de Chrome no conservó su
configuración durante la navegación y se descartó como evidencia de desconexión.

## Reproducir

```sh
python3 -m http.server 4173 --bind 127.0.0.1 --directory docs
```

En otra terminal, con Chrome disponible y la preferencia de sonido activada:

```sh
bash validate.sh
chrome-devtools-axi emulate --viewport '390x844x3,mobile,touch'
chrome-devtools-axi run < checks/browser.js
```

El script ejecuta inicio, interacción, límites y ciclo de vida. Para comprobar el
modo sin conexión: visitar una vez, esperar a que el service worker controle la
página, detener el servidor, recargar y jugar. Volver a iniciar el servidor después.

## Pendiente en un iPhone real

- Safari: tocar, arrastrar y usar varios dedos; comprobar ausencia de zoom accidental.
- Escuchar las campanitas y valorar el volumen con el altavoz del dispositivo.
- Girar el teléfono y verificar notch, isla dinámica e indicador de inicio.
- Cambiar de aplicación, bloquear/desbloquear y volver; confirmar pausa y reanudación.
- Desde un origen HTTPS, añadir a pantalla de inicio, abrir en modo independiente,
  activar modo avión, cerrar y volver a abrir el juego.

## Publicación

Repositorio público autorizado: <https://github.com/vegaByte/pequeno-cosmos>.
GitHub Pages configurado desde `main:/docs`, con HTTPS, en
<https://vegabyte.github.io/pequeno-cosmos/>.

Comprobación en la URL pública: clic real en Jugar, AudioContext `running`,
24 partículas y una voz tras tocar el fondo; service worker bajo
`https://vegabyte.github.io/pequeno-cosmos/` y contexto seguro. La publicación
inicial de GitHub Pages terminó con estado `built`, sin errores.
