# Créditos y licencias — assets city3d

Todos los recursos listados aquí son **CC0 1.0 Universal** (dominio público).
No requieren atribución; se documentan por trazabilidad del proyecto.

Verificado: 2026-11-27.

## Modelos

| Asset | Autor | Fuente | Licencia | Resolución incluida |
| --- | --- | --- | --- | --- |
| Modular Urban Apartments Facade | James Ray Cock | https://polyhaven.com/a/modular_urban_apartments_facade | CC0 1.0 | glTF 1k + mapas JPG |
| Potted Plant 02 | Poly Haven / autores del asset | https://polyhaven.com/a/potted_plant_02 | CC0 1.0 | glTF 1k + mapas JPG |
| Shrub 04 | Poly Haven | https://polyhaven.com/a/shrub_04 | CC0 1.0 | glTF 1k + mapas JPG |
| Fern 02 | Poly Haven | https://polyhaven.com/a/fern_02 | CC0 1.0 | glTF 1k + mapas JPG |
| Potted Plant 04 | Poly Haven | https://polyhaven.com/a/potted_plant_04 | CC0 1.0 | glTF 1k + mapas JPG |

## HDRI

| Asset | Fuente | Licencia | Resolución |
| --- | --- | --- | --- |
| Kloppenheim 06 Pure Sky | https://polyhaven.com/a/kloppenheim_06_puresky | CC0 1.0 | 1k HDR |

## Texturas de trama (R1)

| Asset | Uso | Fuente | Licencia | Mapas 1K |
| --- | --- | --- | --- | --- |
| Asphalt033 | Calzadas | https://ambientcg.com/a/Asphalt033 | CC0 1.0 | Color, NormalGL, Roughness, AO |
| PavingStones055 | Veredas | https://ambientcg.com/a/PavingStones055 | CC0 1.0 | Color, NormalGL, Roughness, AO |
| Grass001 | Áreas verdes / relleno | https://ambientcg.com/a/Grass001 | CC0 1.0 | Color, NormalGL, Roughness, AO |
| Concrete034 | Lotes construibles | https://ambientcg.com/a/Concrete034 | CC0 1.0 | Color, NormalGL, Roughness |

## Texturas de paisaje (R3)

| Asset | Uso | Fuente | Licencia | Mapas 1K |
| --- | --- | --- | --- | --- |
| Bark012 | Troncos / ramas | https://ambientcg.com/a/Bark012 | CC0 1.0 | Color, NormalGL, Roughness, AO |
| ScatteredLeaves008 | Follaje de copas | https://ambientcg.com/a/ScatteredLeaves008 | CC0 1.0 | Color, NormalGL, Roughness, AO |
| Metal032 | Mobiliario / estructuras | https://ambientcg.com/a/Metal032 | CC0 1.0 | Color, NormalGL, Roughness |

## Licencia CC0

https://creativecommons.org/publicdomain/zero/1.0/

## Uso en R2 (arquitectura)

El kit **Modular Urban Apartments Facade** se ensambla en tiempo de ejecución
(`js/city3d/architecture/`) para tipologías:

- Residencial moderno
- Residencial con terraza verde
- Torre comercial
- Institucional
- Mixto con energía solar

Las cubiertas verdes/solares y la masa interior son geometría propia del proyecto
sobre materiales del kit / paleta EcoShift.

## Notas de selección

- **Kenney City Kit**: CC0 y excelente para web, pero estética low-poly plana sin PBR; descartado para la dirección de visualización arquitectónica.
- **Quaternius Ultimate Buildings**: pack histórico CC0 / QAL ambigua en packs nuevos; estilo atlas game-like. No incorporado.
- **Árboles Poly Haven** (p. ej. `tree_small_02`): calidad fotoreal, pero binario ~95 MB / millones de polígonos — inviables en web sin retopología.
- **Modular Factory Facade**: calidad adecuada (~17 MB @1k) pero se optó por no duplicar peso en R2; industrial usa tipologías eco/institucional + campo solar.

## Uso en R3 (paisaje urbano)

Vegetación urbana híbrida:

- **Árboles**: geometría procedural (tronco + ramas + copas icosaédricas) con texturas PBR Bark012 / ScatteredLeaves008; instanciados.
- **Arbustos / helechos / macetas**: modelos Poly Haven livianos (`shrub_04`, `fern_02`, `potted_plant_04`) como acentos.
- **Movilidad y mobiliario**: geometría procedural con materiales PBR Metal032 y paleta EcoShift (vehículos, bicicleteros, bancos, luminarias, papeleras, paradas).
- **Parque central**: senderos, lago, arboleda diseñada, canteros, bancos e iluminación; sin edificios.
