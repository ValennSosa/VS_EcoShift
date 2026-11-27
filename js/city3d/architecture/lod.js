import * as THREE from "three";
import { assembleBuilding } from "./assemble.js";
import { mergeBuildingMeshes } from "./mergeBuilding.js";

/**
 * Construye variantes LOD de una tipología.
 * high: ensamblado completo fusionado
 * mid: sin cornisas/dados/marcos de ventana sueltos, fusionado
 * low: masa + fachadas de muro simplificadas, fusionado
 *
 * @param {object} kit
 * @param {string} typologyId
 * @param {{ mats?: object, merge?: boolean }} [options]
 */
export function buildBuildingLodSet(kit, typologyId, options = {}) {
  const merge = options.merge !== false;
  const mats = options.mats;
  const castShadow = options.castShadow !== false;

  const high = assembleBuilding(kit, typologyId, { mats, detail: "high" });
  const mid = assembleBuilding(kit, typologyId, { mats, detail: "mid" });
  const low = assembleBuilding(kit, typologyId, { mats, detail: "low" });

  if (merge) {
    mergeBuildingMeshes(high, { castShadow });
    mergeBuildingMeshes(mid, { castShadow });
    mergeBuildingMeshes(low, { castShadow: false });
  }

  high.userData.lodLevel = "high";
  mid.userData.lodLevel = "mid";
  low.userData.lodLevel = "low";

  return { high, mid, low };
}

/**
 * Envuelve variantes en THREE.LOD.
 * @param {{ high: THREE.Object3D, mid: THREE.Object3D, low: THREE.Object3D }} variants
 * @param {{ near?: number, far?: number }} distances
 */
export function createBuildingLod(variants, distances = {}) {
  const near = distances.near ?? 14;
  const far = distances.far ?? 26;
  const lod = new THREE.LOD();
  lod.name = "building-lod";
  lod.addLevel(variants.high, 0);
  lod.addLevel(variants.mid, near);
  lod.addLevel(variants.low, far);
  lod.userData.typologyId = variants.high.userData.typologyId;
  lod.userData.category = variants.high.userData.category;
  return lod;
}
