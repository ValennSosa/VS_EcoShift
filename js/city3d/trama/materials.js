import * as THREE from "three";

/**
 * Materiales PBR compartidos de la trama.
 * @param {Record<string, Record<string, THREE.Texture>> | null} maps
 */
export function createTramaMaterials(maps = null) {
  const mk = (key, fallbackColor, extras = {}) => {
    const set = maps?.[key];
    if (!set?.map) {
      return new THREE.MeshStandardMaterial({
        color: fallbackColor,
        roughness: extras.roughness ?? 0.85,
        metalness: extras.metalness ?? 0.02,
        ...extras.flat,
      });
    }
    const mat = new THREE.MeshStandardMaterial({
      map: set.map,
      normalMap: set.normalMap || null,
      roughnessMap: set.roughnessMap || null,
      aoMap: set.aoMap || null,
      color: extras.tint ?? 0xffffff,
      roughness: extras.roughness ?? 1,
      metalness: extras.metalness ?? 0.02,
      envMapIntensity: extras.envMapIntensity ?? 0.55,
      normalScale: new THREE.Vector2(extras.normalScale ?? 0.85, extras.normalScale ?? 0.85),
    });
    if (set.aoMap) mat.aoMapIntensity = extras.aoMapIntensity ?? 0.85;
    return mat;
  };

  const mats = {
    asphalt: mk("asphalt", 0x2a3330, { roughness: 0.92, normalScale: 0.7, envMapIntensity: 0.35 }),
    sidewalk: mk("sidewalk", 0x9aa398, { roughness: 0.88, normalScale: 1.0, envMapIntensity: 0.45 }),
    grass: mk("grass", 0x1faa6e, { roughness: 0.95, normalScale: 0.9, tint: 0xd8f0e0, envMapIntensity: 0.4 }),
    park: mk("grass", 0x2fbf71, { roughness: 0.95, normalScale: 0.95, tint: 0xe8ffe8, envMapIntensity: 0.42 }),
    lot: mk("lot", 0xb7bdb6, { roughness: 0.9, normalScale: 0.75, envMapIntensity: 0.5 }),
    curb: new THREE.MeshStandardMaterial({
      color: 0x6e7870,
      roughness: 0.78,
      metalness: 0.04,
    }),
    marking: new THREE.MeshStandardMaterial({
      color: 0xf2f4c8,
      roughness: 0.65,
      metalness: 0.05,
      emissive: 0x222410,
      emissiveIntensity: 0.15,
    }),
    crosswalk: new THREE.MeshStandardMaterial({
      color: 0xf7f7f2,
      roughness: 0.7,
      metalness: 0.04,
    }),
    water: new THREE.MeshStandardMaterial({
      color: 0x4aa3c7,
      roughness: 0.22,
      metalness: 0.15,
      envMapIntensity: 1.1,
    }),
    path: mk("lot", 0xd9e2d4, { roughness: 0.86, tint: 0xe8efe4, normalScale: 0.5 }),
  };

  return {
    mats,
    dispose() {
      for (const material of Object.values(mats)) {
        material.dispose?.();
      }
    },
  };
}
