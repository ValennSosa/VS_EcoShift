# VS EcoShift

Simulador educativo de sostenibilidad urbana. Una ciudad ficticia responde a siete decisiones y muestra consecuencias favorables y desfavorables a la vez: indicadores, gráficos, zonas interactivas, escenarios propios, desafíos y una pantalla de resultado.

**Autora:** Valentina Sosa · Identificador técnico: `vs-ecoshift`

> Proyecto frontend. Las lecturas son índices educativos, no mediciones ambientales reales.

## Objetivo

Explorar, con fines formativos, cómo cambios en espacio verde, energía, movilidad y materiales alteran un conjunto de indicadores. La referencia fija de comparación es el preset inmutable **Ciudad actual**.

## Stack

- HTML5 semántico (multi-página)
- Bootstrap 5.3
- Sass modular (`scss/` → `styles/style.css`)
- JavaScript ES Modules
- AOS (animaciones en la portada)
- Chart.js (perfil y comparación de indicadores)
- Datos locales en JSON (`data/presets.json`)
- Persistencia en `localStorage` (clave `vs-ecoshift:v1`)
- Pruebas con `node --test`

## Páginas

| Página | Archivo | Rol |
|--------|---------|-----|
| Inicio | `index.html` | Presentación del producto y acceso al recorrido |
| Simulador | `simulador.html` | Controles, ciudad SVG, indicadores, gráficos, panel de desafíos y borrador |
| Escenarios | `escenarios.html` | Presets inmutables, escenarios propios (hasta 8) y comparación de a dos |
| Desafíos | `desafios.html` | Evaluación de las cuatro metas sobre el borrador actual |
| Resultado | `resultado.html` | Puntaje, indicadores, desafíos, comparación y gráfico; consulta de escenarios |

## Arquitectura

```text
js/
  sim/        # Motor puro: engine, fórmulas de indicadores, zonas, desafíos
  state/      # Borrador, persistencia localStorage, CRUD de escenarios
  ui/         # Controles, indicadores, ciudad, charts, challenges, chrome
  pages/      # Lógica de cada página (simulador, escenarios, desafíos, resultado)
  main.js     # Header/footer y arranque por data-page
  config.js   # Nombre del sitio y navegación
```

- **Motor** (`simulate()`): normaliza variables, calcula siete indicadores y un puntaje educativo. No usa el DOM.
- **Estado / persistencia**: el borrador y hasta ocho escenarios propios viven en `localStorage`. Los presets de `data/presets.json` no se sobrescriben.
- **UI**: presenta resultados del motor; el redondeo a un decimal es solo visual.
- **Desafíos**: evaluación centralizada en `js/sim/challenges.js` con precisión completa.

## Escenarios y persistencia

- Presets: Ciudad actual, sostenible, tecnológica y verde (solo lectura).
- Escenarios propios: crear (“Guardar como nuevo”), actualizar, renombrar, eliminar; máximo **8**.
- Origen del borrador: `new` | `preset` | `custom`.
- Editar controles no muta la lista guardada hasta usar Guardar.
- Si el JSON guardado es inválido o de otra versión, no se sobrescribe en silencio (bloqueo de escritura + aviso).

## Desafíos

Se evalúan siempre contra **Ciudad actual**, con valores completos del motor:

1. Reducir emisiones al menos un **20%**.
2. Energía renovable **≥ 40**.
3. Superficie verde al menos **+15 puntos** respecto del baseline.
4. Movilidad sostenible **≥ 55**.

Si las emisiones iniciales son ≤ 0, el desafío de emisiones queda pendiente (sin división inválida).

## Resultado y `?scenario=`

- `resultado.html` usa el **borrador actual** (solo lectura: no lo modifica).
- `resultado.html?scenario=<id>` consulta un escenario propio guardado sin alterar el borrador ni la persistencia.
- Si el `id` no existe, se muestra un mensaje y enlaces para volver a Escenarios o al resultado del borrador.

## Estructura del repositorio

```text
├── index.html / simulador.html / escenarios.html / desafios.html / resultado.html
├── data/presets.json
├── assets/brand/favicon.svg
├── assets/city/city.svg
├── scss/                 # partials + main.scss
├── styles/style.css      # CSS compilado
├── js/                   # sim, state, ui, pages
├── tests/                # simulation, zones, comparison, scenarios, challenges
├── scripts/export-static.mjs
├── serve.json            # servidor local (npm start)
├── vercel.json           # build estático para Vercel
└── package.json
```

## Requisitos

- Node.js **18+** (`engines` en `package.json`)
- npm

## Comandos

```bash
npm install
npm run sass:build    # compilar Sass una vez
npm run sass          # vigilar cambios de Sass
npm start             # http://localhost:3010
npm test              # pruebas automatizadas
```

Abrí el sitio con `npm start`. Los ES Modules y las rutas a `node_modules` no funcionan bien abriendo el HTML como `file://`.

## Pruebas

`npm test` ejecuta suites en `tests/`:

- Motor y presets (`simulation.test.mjs`)
- Zonas visuales (`zones.test.mjs`)
- Comparación de indicadores (`comparison.test.mjs`)
- Escenarios y persistencia (`scenarios.test.mjs`)
- Desafíos y umbrales (`challenges.test.mjs`)

## Despliegue (Vercel)

El proyecto incluye `vercel.json` y `scripts/export-static.mjs`, que generan un directorio estático `.vercel-out` con HTML, `js/`, `styles/`, `data/`, `assets/` y las dependencias de front necesarias (Bootstrap, AOS, Chart.js).

La configuración usa `cleanUrls: false` para conservar rutas `.html` y query strings como `?scenario=`.

> El estado publicado en Vercel puede no coincidir con esta copia local hasta que se vuelva a exportar y desplegar de forma explícita.

## Licencia y uso

Proyecto educativo de portfolio. © 2026 VS EcoShift · Valentina Sosa.
