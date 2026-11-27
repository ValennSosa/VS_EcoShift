/** Unidades del kit Poly Haven (metros reales del asset). */
export const BAY = 3;
export const FLOOR_HEIGHT = 3;
export const FLOOR_PITCH = 4;
export const BASE_OFFSET_Y = -2;

/**
 * Tipologías reutilizables (R2).
 * footprintBays: tamaño en bahías del kit.
 * cityScale: escala hacia unidades de la trama R1.
 */
export const TYPOLOGIES = Object.freeze({
  "res-midrise": {
    id: "res-midrise",
    label: "Residencial moderno",
    category: "residential",
    baysX: 1,
    baysZ: 1,
    floors: 3,
    front: "door-small",
    window: "small",
    roof: "flat",
    // Escala anisotrópica: XZ encaja en lote R1; Y comprime metros del kit a skyline legible.
    cityScale: 0.86,
    cityScaleY: 0.34,
  },
  "res-green": {
    id: "res-green",
    label: "Residencial con terraza verde",
    category: "residential",
    baysX: 1,
    baysZ: 1,
    floors: 2,
    front: "door-small",
    window: "small",
    roof: "green",
    cityScale: 0.84,
    cityScaleY: 0.36,
  },
  "com-tower": {
    id: "com-tower",
    label: "Torre comercial",
    category: "commercial",
    baysX: 1,
    baysZ: 1,
    floors: 5,
    front: "door-large",
    window: "double",
    roof: "hvac",
    cityScale: 0.82,
    cityScaleY: 0.3,
  },
  "inst-civic": {
    id: "inst-civic",
    label: "Edificio institucional",
    category: "institutional",
    baysX: 1,
    baysZ: 1,
    floors: 3,
    front: "door-large",
    window: "large",
    roof: "flat",
    cityScale: 0.9,
    cityScaleY: 0.33,
  },
  "eco-solar": {
    id: "eco-solar",
    label: "Mixto con energía solar",
    category: "energy",
    baysX: 1,
    baysZ: 1,
    floors: 4,
    front: "door-small",
    window: "offset",
    roof: "solar",
    cityScale: 0.84,
    cityScaleY: 0.32,
  },
});

/**
 * Colocaciones por zona / lote vacío.
 * Coordenadas locales al centro del lote (antes de rotación de manzana).
 */
export const CITY_PLACEMENTS = Object.freeze([
  // Residencial
  { typology: "res-midrise", zoneId: "residential", x: -0.55, z: -0.35, ry: 0 },
  { typology: "res-green", zoneId: "residential", x: 0.55, z: 0.4, ry: Math.PI * 0.5 },
  // Comercial
  { typology: "com-tower", zoneId: "commercial", x: -0.35, z: -0.2, ry: 0 },
  { typology: "inst-civic", zoneId: "commercial", x: 0.55, z: 0.45, ry: -Math.PI * 0.25 },
  // Industrial / institucional técnico
  { typology: "eco-solar", zoneId: "industrial", x: -0.4, z: 0.15, ry: Math.PI * 0.15 },
  { typology: "inst-civic", zoneId: "industrial", x: 0.55, z: -0.35, ry: Math.PI },
  // Energía
  { typology: "eco-solar", zoneId: "energy", x: 0.35, z: 0.45, ry: -0.2 },
  // Transporte (edificio de estación / servicios)
  { typology: "inst-civic", zoneId: "transport", x: 0.15, z: 0.2, ry: 0 },
  // Lotes vacíos previstos en R1
  { typology: "res-midrise", blockId: "block-0-2", x: -0.2, z: -0.25, ry: Math.PI * 0.5 },
  { typology: "res-green", blockId: "block-0-2", x: 0.45, z: 0.4, ry: 0 },
  { typology: "com-tower", blockId: "block-2-0", x: -0.25, z: 0.1, ry: Math.PI },
  { typology: "eco-solar", blockId: "block-2-0", x: 0.5, z: -0.4, ry: 0.3 },
  { typology: "eco-solar", blockId: "block-2-2", x: 0.1, z: 0.15, ry: -Math.PI * 0.5 },
]);
