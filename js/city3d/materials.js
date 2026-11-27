import * as THREE from "three";

/**
 * Paleta VS EcoShift + superficies urbanas.
 * Materiales compartidos (un set por ciudad).
 */
export function createCityMaterials() {
  const mats = {
    grass: new THREE.MeshLambertMaterial({ color: 0x1faa6e }),
    park: new THREE.MeshLambertMaterial({ color: 0x2fbf71 }),
    path: new THREE.MeshLambertMaterial({ color: 0xd9e2d4 }),
    asphalt: new THREE.MeshLambertMaterial({ color: 0x2a3330 }),
    sidewalk: new THREE.MeshLambertMaterial({ color: 0x8a968c }),
    curb: new THREE.MeshLambertMaterial({ color: 0x5c6760 }),
    water: new THREE.MeshLambertMaterial({ color: 0x4aa3c7 }),
    facadeWarm: new THREE.MeshLambertMaterial({ color: 0xe8efe4 }),
    facadeCool: new THREE.MeshLambertMaterial({ color: 0xd5e0d8 }),
    facadeAccent: new THREE.MeshLambertMaterial({ color: 0x0e7a58 }),
    facadeDark: new THREE.MeshLambertMaterial({ color: 0x3e5148 }),
    roof: new THREE.MeshLambertMaterial({ color: 0x4a3f38 }),
    roofTile: new THREE.MeshLambertMaterial({ color: 0x6b5344 }),
    glass: new THREE.MeshLambertMaterial({ color: 0x9ad0e6 }),
    windowLit: new THREE.MeshLambertMaterial({ color: 0xc6ef4a, emissive: 0x3a4a10, emissiveIntensity: 0.35 }),
    solar: new THREE.MeshLambertMaterial({ color: 0x1b3a5a, emissive: 0x0a2030, emissiveIntensity: 0.2 }),
    solarFrame: new THREE.MeshLambertMaterial({ color: 0xb8c4b6 }),
    trunk: new THREE.MeshLambertMaterial({ color: 0x6b4f3a }),
    foliage: new THREE.MeshLambertMaterial({ color: 0x0e7a58 }),
    foliageLight: new THREE.MeshLambertMaterial({ color: 0xc6ef4a }),
    foliageDark: new THREE.MeshLambertMaterial({ color: 0x0c342b }),
    metal: new THREE.MeshLambertMaterial({ color: 0x7d8a82 }),
    chimney: new THREE.MeshLambertMaterial({ color: 0x5a5048 }),
    vehicle: new THREE.MeshLambertMaterial({ color: 0xf8fbf6 }),
    vehicleEv: new THREE.MeshLambertMaterial({ color: 0xc6ef4a }),
    bike: new THREE.MeshLambertMaterial({ color: 0x10241c }),
    lamp: new THREE.MeshLambertMaterial({ color: 0x3e5148 }),
    lampGlow: new THREE.MeshLambertMaterial({ color: 0xf8fbf6, emissive: 0xf0f4c0, emissiveIntensity: 0.55 }),
    marker: new THREE.MeshLambertMaterial({ color: 0xc6ef4a }),
    parking: new THREE.MeshLambertMaterial({ color: 0x3a4440 }),
  };

  return {
    mats,
    dispose() {
      for (const material of Object.values(mats)) material.dispose();
    },
  };
}
