# Pruebas colaborativas - Dashboard

Objetivo

- Producir una prueba rápida que renderice la plantilla `dashboard` y detecte si aparece la cadena "[object Promise]" en el HTML final.

Ejecutar (solo colaboradores)

- Para evitar ejecuciones accidentales, este script solo se ejecuta si la variable de entorno `COLLAB_TEST` está establecida en `1`.

Ejemplo:

```bash
COLLAB_TEST=1 ./scripts/collab-tests/dashboard/run.sh
```

Salida

- El script imprimirá un JSON con la forma:

  - ok: true|false
  - length: longitud del HTML renderizado
  - foundIndex: índice de "[object Promise]" o -1

Notas

- Este test está pensado para replicar exactamente el pipeline de EJS con `{ async: true }` y los locals mínimos necesarios. Si el test falla en tu entorno de desarrollo, revisa las modificaciones temporales en locales u otras plantillas.

Uso de la fuente BoldPixels.ttf

- Copia de la fuente del repo: `src/server/public/assets/fonts/BoldPixels.ttf`.

- Añade la regla CSS siguiente (por ejemplo en `src/server/public/assets/css/_fonts.css`) y luego importa ese archivo en tu layout o en `styles.css`:

```css
@font-face {
  font-family: 'BoldPixels';
  src: url('/assets/fonts/BoldPixels.ttf') format('truetype');
  font-weight: 700;
  font-style: normal;
}

.bold-pixels {
  font-family: 'BoldPixels', system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial;
}
```

Ejemplo de uso en EJS:

```html
<h1 class="bold-pixels">Título con fuente BoldPixels</h1>
```
