# Informe R5 — Auditoría final | VS EcoShift

Fecha: 2026-11-27  
Entorno de verificación: export estático `.vercel-out` servido en `http://localhost:3055`  
Restricciones respetadas: sin cambios de fórmulas/persistencia/identidad; sin backend; **sin commits ni deploy**.

---

## 1. Estado general del proyecto

VS EcoShift está **estable para presentación de portfolio** tras R0–R4. Las cinco páginas de producto funcionan, la ciudad 3D carga e integra las siete variables, el export estático valida assets críticos y **117/117 tests pasan**.

Se corrigieron defectos concretos de UX/estabilidad detectados en la auditoría (carga 3D, anclas de desafíos, defensas en UI). No se rediseñó ni se agregaron funcionalidades nuevas.

---

## 2. Auditoría funcional por página

| Página | Resultado | Notas |
|--------|-----------|--------|
| **index** | OK | Nav, CTAs, ancla `#como-funciona`, enlaces a desafíos con hash. |
| **simulador** | OK | Sliders, presets, borrador, indicadores, charts, ciudad 3D, persistencia. |
| **escenarios** | OK | Presets inmutables, vacío de propios, comparación protegida. |
| **desafíos** | OK + fix | Evaluación contra Ciudad actual; **scroll a `#emisiones` etc. corregido**. |
| **resultado** | OK | Consulta sin mutar borrador; comparación y metas coherentes. |

Comprobado además: recarga conserva borrador (`localStorage` `vs-ecoshift:v1`), mensaje de escenarios propios vacíos, presets no eliminables.

---

## 3. Auditoría de ciudad 3D

Inspección en simulador + PoC de rendimiento (vistas Elevada / Oblicua / Calle):

- Arquitectura tipológica, trama, parque, vegetación, mobiliario y movilidad visibles.
- Con variables altas (~85): paneles solares en cubiertas perceptibles; flota/EV, bicis, residuos y reciclaje usan pools separados.
- Diferenciación residuos ↔ reciclaje: pools `waste` / `recycling` independientes.
- Eficiencia: nodos `efficiency` + cubiertas verdes (mezcla eficiencia/vegetación — **coherente, no es bug**).
- LOD y OrbitControls disponibles (elevada / oblicua / calle en PoC).

Capturas: `_audit-r5/02-*.png`, `09-perf-elevada.png`, `10-perf-calle.png`, `11-ciudad-oblicua.png`.

---

## 4. Resultados de rendimiento

### Mediciones (entorno local, automatizado)

**PoC `city3d-perf-poc` — perfil desktop (optimized)**  
- Carga escena: **~629 ms**  
- Meshes: 610 · Instanced: 42 · Instancias: 700  
- Triángulos en escena: ~2 640 383  
- Draw calls (info.render): **~387** (elevada) / **~476** (oblicua) / **~427** (calle)  
- FPS reportado por el harness PoC: **~30 avg** en las tres vistas  

**PoC — perfil mobile (optimized)**  
- Carga: **~482 ms**  
- Meshes: 539 · shadowCasters: 122 · draw calls: **~227–270**  
- FPS harness: **~30 avg**

**Simulador (página completa)**  
- Tiempo hasta “Vista 3D de la ciudad”: **~2–3 s** en frío local (assets cacheables).  
- rAF del documento tras montar: **~60 avg** (p5 ~56) — **limitado por VSync/monitor**, no es benchmark desbloqueado.

### Interpretación

- No se declara un objetivo de FPS “alcanzado” por encima del refresh: las cifras ~30 del PoC y ~60 del simulador están **acotadas por VSync / contención del harness**.  
- Draw calls ~388 desktop alinean con la estabilización R3.1.  
- Memoria: solo aproximación `textureBytesApprox` (~191 MB desktop / ~153 MB mobile); **sin heap Chrome DevTools Memory completo**.

---

## 5. Auditoría responsive

| Viewport | Resultado |
|----------|-----------|
| 1440×900 | OK — nav completa, ciudad y paneles legibles |
| 1366×768 | OK (mismo layout desktop) |
| 768×1024 | No capturado como archivo aparte; breakpoints SCSS activos |
| 390×844 | OK — menú hamburguesa, ciudad usable, chips apilados |

Captura móvil: `08-mobile-simulador.png`.

---

## 6. Auditoría visual / identidad

Paleta y tipografías (Sora / Source Sans 3) consistentes en las cinco páginas. Sin cambios de dirección visual.  
Observación menor: algunos paneles usan “cards” ya existentes del sistema; no se alteró el design system.

---

## 7. Accesibilidad y calidad técnica

**OK / presente:** skip-link, `aria-live` en zona/resumen, labels en ranges, `aria-pressed` en chips, charts con texto alternativo, SEO (og, canonical, favicon, robots, sitemap), dispose de renderer/controls/ResizeObserver en path 3D.

**Corregido:** estado de carga 3D (`aria-busy` + mensaje), caption según modo, null-checks en indicadores/comparar escenarios, deep links de desafíos.

**Observaciones (sin cambio):** menú móvil sin focus trap; `#contenido:focus-visible` sin anillo; dispose GPU de kits GLTF fuente incompleto (mitigado por `forceContextLoss` al salir); PoCs exportadas con `noindex` pero listadas en export (añadidas a `serve.json` unlisted).

**Transiciones R4:** siguen instantáneas. No se implementaron tweens: el beneficio UX no justificaba el riesgo de jank al mover sliders rápido (restricción §7).

---

## 8. Tests ejecutados

```
npm test → 117 pass / 0 fail
node scripts/export-static.mjs → OK (validación de assets requeridos)
npm run sass:build → OK (tras cambios SCSS)
```

No se eliminaron tests. No se agregaron tests nuevos (cobertura existente ya cubre motor, zonas, R0–R4 y export).

---

## 9. Archivos modificados

| Archivo | Motivo |
|---------|--------|
| `js/ui/city.js` | Mensaje de carga 3D, `aria-busy`, caption según modo |
| `scss/_city3d.scss` | Altura mínima del viewport + estilo loading |
| `styles/style.css` | CSS compilado |
| `js/pages/challenges.js` | Scroll/focus a `location.hash` tras render |
| `js/ui/indicators.js` | Null-checks en `updateIndicators` |
| `js/pages/scenarios.js` | Listeners de comparación null-safe |
| `serve.json` | PoCs city3d en `unlisted` |
| `_audit-r5/*` | Capturas + este informe |

---

## 10. Problemas detectados y correcciones

### Corregidos
1. Viewport 3D sin altura / vacío percibido durante la carga → placeholder + min-height.  
2. Caption que hablaba de “mapa SVG” en modo 3D.  
3. Deep links `desafios.html#emisiones|…` no scrolleaban tras render JS.  
4. Posible `TypeError` en `updateIndicators` si faltaba un nodo.  
5. Listeners de comparar escenarios sin guardas.  
6. PoCs visibles en listing local de `serve`.

### Observaciones (no bloqueantes)
- Actualización visual R4 instantánea (aceptable).  
- Dispose profundo de GLTF compartido incompleto.  
- Focus trap del menú móvil ausente.  
- En local, `serve` a veces reescribe URLs sin `.html` (prod Vercel usa `cleanUrls: false`).

---

## 11. Limitaciones que permanecen

- FPS no medido en GPU desbloqueada ni en dispositivo móvil físico.  
- Perfil Memory/heap de Chrome DevTools no ejecutado de punta a punta.  
- Tablet 768×1024 no archivó captura dedicada (sí se validó lógica responsive).  
- Sin commit/deploy: **producción Vercel aún no incluye estos fixes de R5** hasta aprobación.  
- Conexión Git↔Vercel del proyecto sigue siendo deploy manual CLI (hallazgo operativo previo, fuera de alcance de código R5).

---

## 12. Recomendaciones finales

1. Tras aprobación: commit como Valentina + deploy prod (`npx vercel@latest deploy --prod --yes` o conectar Git).  
2. Opcional post-portfolio: focus trap del menú; apple-touch-icon; excluir PoCs del export de producción.  
3. No priorizar tweens de densidad salvo feedback de usuarios.  
4. Mantener PoC de rendimiento como evidencia reproducible en demos.

---

## Capturas incluidas

| Archivo | Contenido |
|---------|-----------|
| `01-index-desktop.png` | Página principal |
| `02-simulador-ciudad-oblicua.png` | Simulador + ciudad 3D |
| `03-ciudad-vista-elevada.png` | Vista amplia |
| `04-ciudad-detalle-calle.png` | Detalle urbano / paneles |
| `05-escenarios.png` | Escenarios |
| `06-desafios.png` | Desafíos |
| `07-resultado.png` | Resultado |
| `08-mobile-simulador.png` | Móvil 390×844 |
| `09-perf-elevada.png` | PoC vista elevada |
| `10-perf-calle.png` | PoC vista calle |
| `11-ciudad-oblicua.png` | Copia oblicua simulador |

**Esperando revisión y aprobación antes de commit/deploy.**
