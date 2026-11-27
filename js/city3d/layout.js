/**
 * Trama urbana determinista (R1).
 * Coordenadas en el plano XZ; Y=0 es el suelo.
 */

export const CITY_SEED = 0xe00517f7;

/** Extensión total de la plataforma urbana. */
export const PLATFORM_SIZE = 28;

/** Ancho de calzada (asfalto). */
export const ROAD_WIDTH = 2.05;

/** Ancho de vereda a cada lado de la calzada. */
export const SIDEWALK_WIDTH = 0.72;

/** Cordón entre vereda y calle. */
export const CURB_WIDTH = 0.1;
export const CURB_HEIGHT = 0.09;

/**
 * Ejes de calles (centros).
 * 3×3 manzanas con avenidas continuas e intersecciones.
 */
export const STREET_XS = Object.freeze([-11.25, -3.75, 3.75, 11.25]);
export const STREET_ZS = Object.freeze([-11.25, -3.75, 3.75, 11.25]);

/**
 * Manzanas derivadas del grid.
 * @typedef {{ id: string, i: number, j: number, cx: number, cz: number, halfX: number, halfZ: number, minX: number, maxX: number, minZ: number, maxZ: number, lotHalfX: number, lotHalfZ: number }} CityBlock
 */

/**
 * @returns {CityBlock[]}
 */
export function computeBlocks() {
  const inset = ROAD_WIDTH / 2 + SIDEWALK_WIDTH;
  const blocks = [];
  for (let i = 0; i < STREET_XS.length - 1; i += 1) {
    for (let j = 0; j < STREET_ZS.length - 1; j += 1) {
      const minX = STREET_XS[i] + inset;
      const maxX = STREET_XS[i + 1] - inset;
      const minZ = STREET_ZS[j] + inset;
      const maxZ = STREET_ZS[j + 1] - inset;
      const cx = (minX + maxX) / 2;
      const cz = (minZ + maxZ) / 2;
      const halfX = (maxX - minX) / 2;
      const halfZ = (maxZ - minZ) / 2;
      // lote construible = manzana menos margen interno de patio/setback
      const setback = 0.28;
      blocks.push({
        id: `block-${i}-${j}`,
        i,
        j,
        cx,
        cz,
        halfX,
        halfZ,
        minX,
        maxX,
        minZ,
        maxZ,
        lotHalfX: Math.max(0.6, halfX - setback),
        lotHalfZ: Math.max(0.6, halfZ - setback),
      });
    }
  }
  return blocks;
}

/** Asignación zona del simulador → manzana del grid. */
export const ZONE_BLOCK_MAP = Object.freeze({
  energy: "block-0-0",
  commercial: "block-1-0",
  residential: "block-0-1",
  green: "block-1-1",
  industrial: "block-2-1",
  transport: "block-1-2",
});

/**
 * Superficie de lote por zona (el resto de manzanas quedan preparadas).
 * @type {Record<string, { id: string, cx: number, cz: number, halfX: number, halfZ: number, surface: string }>}
 */
export const ZONE_LAYOUT = (() => {
  const blocks = Object.fromEntries(computeBlocks().map((b) => [b.id, b]));
  const surfaces = {
    energy: "lot",
    commercial: "lot",
    residential: "lot",
    green: "park",
    industrial: "lot",
    transport: "lot",
  };
  /** @type {Record<string, object>} */
  const layout = {};
  for (const [zoneId, blockId] of Object.entries(ZONE_BLOCK_MAP)) {
    const block = blocks[blockId];
    layout[zoneId] = {
      id: zoneId,
      blockId,
      cx: block.cx,
      cz: block.cz,
      halfX: block.lotHalfX,
      halfZ: block.lotHalfZ,
      surface: surfaces[zoneId],
    };
  }
  return layout;
})();

/**
 * Segmentos de calle para marcas / mobiliario (no son la geometría principal).
 */
export function buildRoadSegments() {
  const span = STREET_XS[STREET_XS.length - 1] - STREET_XS[0];
  const segments = [];
  for (const x of STREET_XS) {
    segments.push({
      axis: "z",
      x,
      z: 0,
      w: ROAD_WIDTH,
      d: span + ROAD_WIDTH,
      ry: 0,
    });
  }
  for (const z of STREET_ZS) {
    segments.push({
      axis: "x",
      x: 0,
      z,
      w: span + ROAD_WIDTH,
      d: ROAD_WIDTH,
      ry: 0,
    });
  }
  return segments;
}

/** @deprecated alias de compatibilidad con tests previos */
export const ROAD_SEGMENTS = buildRoadSegments();

export function getCityLayout() {
  const blocks = computeBlocks();
  return {
    seed: CITY_SEED,
    platformSize: PLATFORM_SIZE,
    roadWidth: ROAD_WIDTH,
    sidewalkWidth: SIDEWALK_WIDTH,
    streets: {
      xs: [...STREET_XS],
      zs: [...STREET_ZS],
    },
    blocks,
    zones: { ...ZONE_LAYOUT },
    roads: buildRoadSegments(),
    preparedLots: blocks.map((block) => ({
      id: block.id,
      cx: block.cx,
      cz: block.cz,
      halfX: block.lotHalfX,
      halfZ: block.lotHalfZ,
      zoneId:
        Object.entries(ZONE_BLOCK_MAP).find(([, bid]) => bid === block.id)?.[0] || null,
    })),
  };
}
