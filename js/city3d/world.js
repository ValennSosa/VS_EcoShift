import { buildProceduralCity } from "./buildCity.js";

/**
 * Mundo de la ciudad 3D (R1 trama + R2 arquitectura + R3 paisaje).
 * @param {import("three").Scene} scene
 * @param {{
 *   tramaMaterials?: object,
 *   textureKit?: object,
 *   facadeKit?: object,
 *   landscapeMats?: object,
 *   plantKit?: object | null,
 *   quality?: object | null,
 * }} [options]
 */
export function createCityWorld(scene, options = {}) {
  return buildProceduralCity(scene, options);
}
