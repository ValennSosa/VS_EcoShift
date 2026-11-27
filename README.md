# VS EcoShift

Simulador educativo de sostenibilidad urbana. Una ciudad ficticia responde a siete decisiones y muestra consecuencias favorables y desfavorables a la vez.

**Autora:** Valentina Sosa · Identificador técnico: `vs-ecoshift`

> Proyecto frontend. Las lecturas son índices educativos, no mediciones ambientales reales.

## Qué hace

- Ajustar variables de la ciudad (espacios verdes, transporte eléctrico, solar, eficiencia, residuos, bicicletas y reciclaje).
- Recalcular siete indicadores con un motor puro y determinista.
- Comparar siempre contra el preset inmutable **Ciudad actual**.
- Explorar seis zonas interactivas en un SVG (residencial, comercial, industrial, espacios verdes, transporte y energía).
- Visualizar el perfil de indicadores y la comparación con Ciudad actual en gráficos Chart.js.
- Cargar presets de referencia: Ciudad actual, sostenible, tecnológica y verde.

## Estado del proyecto

| Etapa | Contenido | Estado |
|-------|-----------|--------|
| 1 | Estructura, páginas e identidad visual | Completa |
| 2 | Motor de simulación, controles e indicadores | Completa |
| 3 | Ciudad SVG interactiva y estados por zona | Completa |
| 4 | Gráficos Chart.js y comparación visual | Completa |
| 5 | Escenarios propios, desafíos y resultado | Pendiente |

## Stack

- HTML5 semántico (multi-página)
- Bootstrap 5.3
- Sass modular (`@use` → `styles/style.css`)
- JavaScript ES Modules
- AOS (animaciones al scroll)
- Chart.js (perfil de indicadores y comparación)
- Datos locales en JSON
- Pruebas con `node --test`

## Requisitos

- Node.js 18+
- npm

## Comandos

```bash
# Instalar dependencias
npm install

# Compilar Sass una vez
npm run sass:build

# Vigilar cambios de Sass
npm run sass

# Servir el sitio en http://localhost:3010
npm start

# Ejecutar pruebas del motor y de las zonas
npm test
```

Abrí el proyecto con un servidor local (`npm start`). Los ES Modules y las rutas a `node_modules` no funcionan bien abriendo el HTML como `file://`.

## Páginas

| Página | Archivo | Rol |
|--------|---------|-----|
| Inicio | `index.html` | Presentación y recorrido |
| Simulador | `simulador.html` | Ciudad, controles y lecturas |
| Escenarios | `escenarios.html` | Presets y espacio para escenarios propios |
| Desafíos | `desafios.html` | Metas educativas |
| Resultado | `resultado.html` | Comparación y valoración (Etapa 4) |

## Estructura

```text
├── index.html / simulador.html / escenarios.html
├── desafios.html / resultado.html
├── data/presets.json      # presets inmutables
├── scss/                  # partials + main.scss
├── styles/style.css       # CSS compilado
├── js/
│   ├── sim/               # motor, indicadores y zonas
│   ├── state/             # borrador de variables
│   ├── ui/                # controles, indicadores, ciudad, chrome
│   └── pages/             # lógica por página
├── assets/city/city.svg   # ciudad interactiva
└── tests/                 # pruebas del motor y de zonas
```

## Motor de simulación

Una sola función `simulate(variables)` calcula los siete indicadores. No usa el DOM. Las pruebas en `tests/simulation.test.mjs` verifican Ciudad actual, los presets y efectos cruzados (por ejemplo, más transporte eléctrico baja emisiones y puede subir el consumo).

Los niveles visuales de zona viven en `js/sim/zones.js` y no recalculan el motor: solo clasifican variables en bajo / medio / alto.

## Licencia y uso

Proyecto educativo de portfolio. © 2026 VS EcoShift · Valentina Sosa.
