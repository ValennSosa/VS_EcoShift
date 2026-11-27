/**
 * Anclas deterministas de la ciudad integrada.
 * Coordenadas en el plano XZ; Y=0 es el suelo.
 */

export const CITY_SEED = 0xe00517f7;
export const PLATFORM_SIZE = 24;

/** Rectángulos de zona: centro + semianchos (para agrupación futura / raycast). */
export const ZONE_LAYOUT = {
  green: { id: "green", cx: -0.5, cz: -0.8, halfX: 3.6, halfZ: 3.4 },
  residential: { id: "residential", cx: -7.2, cz: 2.2, halfX: 3.8, halfZ: 3.6 },
  commercial: { id: "commercial", cx: 5.4, cz: -5.8, halfX: 3.6, halfZ: 3.4 },
  industrial: { id: "industrial", cx: 7.0, cz: 3.0, halfX: 3.8, halfZ: 3.5 },
  transport: { id: "transport", cx: 0, cz: 8.2, halfX: 10.5, halfZ: 1.6 },
  energy: { id: "energy", cx: -7.0, cz: -6.6, halfX: 3.5, halfZ: 3.2 },
};

/** Tramos de avenida (asfalto continuo entre zonas). */
export const ROAD_SEGMENTS = [
  { x: 0, z: 8.2, w: 21, d: 1.5, ry: 0 }, // cinturón sur (transporte)
  { x: -3.2, z: 2.4, w: 1.35, d: 12.5, ry: 0 }, // norte–sur oeste
  { x: 3.4, z: 0.5, w: 1.35, d: 14.5, ry: 0 }, // norte–sur este
  { x: 0.2, z: -2.8, w: 14.5, d: 1.25, ry: 0 }, // este–oeste norte
  { x: 0.5, z: 3.6, w: 12.5, d: 1.2, ry: 0 }, // este–oeste centro
];

export function getCityLayout() {
  return {
    seed: CITY_SEED,
    platformSize: PLATFORM_SIZE,
    zones: { ...ZONE_LAYOUT },
    roads: ROAD_SEGMENTS.map((segment) => ({ ...segment })),
  };
}
