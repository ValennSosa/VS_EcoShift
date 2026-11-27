import * as THREE from "three";

const TEX_BASE = new URL("../../../assets/city3d/textures/", import.meta.url);

const PATHS = {
  bark: {
    map: "bark/Bark012_1K-JPG_Color.jpg",
    normalMap: "bark/Bark012_1K-JPG_NormalGL.jpg",
    roughnessMap: "bark/Bark012_1K-JPG_Roughness.jpg",
    aoMap: "bark/Bark012_1K-JPG_AmbientOcclusion.jpg",
  },
  foliage: {
    map: "foliage/ScatteredLeaves008_1K-JPG_Color.jpg",
    normalMap: "foliage/ScatteredLeaves008_1K-JPG_NormalGL.jpg",
    roughnessMap: "foliage/ScatteredLeaves008_1K-JPG_Roughness.jpg",
    aoMap: "foliage/ScatteredLeaves008_1K-JPG_AmbientOcclusion.jpg",
  },
  metal: {
    map: "metal/Metal032_1K-JPG_Color.jpg",
    normalMap: "metal/Metal032_1K-JPG_NormalGL.jpg",
    roughnessMap: "metal/Metal032_1K-JPG_Roughness.jpg",
  },
};

function loadTexture(loader, rel, { srgb = false } = {}) {
  return new Promise((resolve, reject) => {
    loader.load(
      new URL(rel, TEX_BASE).href,
      (tex) => {
        tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
        tex.anisotropy = 4;
        if (srgb) tex.colorSpace = THREE.SRGBColorSpace;
        tex.needsUpdate = true;
        resolve(tex);
      },
      undefined,
      (err) => reject(err instanceof Error ? err : new Error(String(err)))
    );
  });
}

/**
 * Materiales PBR del paisaje urbano (R3).
 * @returns {Promise<{ mats: Record<string, THREE.Material>, dispose: () => void }>}
 */
export async function loadLandscapeMaterials() {
  const loader = new THREE.TextureLoader();
  /** @type {THREE.Texture[]} */
  const textures = [];
  /** @type {Record<string, Record<string, THREE.Texture>>} */
  const maps = {};

  for (const [key, paths] of Object.entries(PATHS)) {
    maps[key] = {};
    for (const [slot, rel] of Object.entries(paths)) {
      try {
        const tex = await loadTexture(loader, rel, { srgb: slot === "map" });
        maps[key][slot] = tex;
        textures.push(tex);
      } catch (error) {
        console.warn(`Paisaje: no se pudo cargar ${rel}`, error);
      }
    }
  }

  const mk = (key, color, extras = {}) => {
    const set = maps[key];
    if (!set?.map) {
      return new THREE.MeshStandardMaterial({
        color,
        roughness: extras.roughness ?? 0.85,
        metalness: extras.metalness ?? 0.05,
      });
    }
    const mat = new THREE.MeshStandardMaterial({
      map: set.map,
      normalMap: set.normalMap || null,
      roughnessMap: set.roughnessMap || null,
      aoMap: set.aoMap || null,
      color: extras.tint ?? 0xffffff,
      roughness: extras.roughness ?? 1,
      metalness: extras.metalness ?? 0.05,
      envMapIntensity: extras.envMapIntensity ?? 0.45,
      normalScale: new THREE.Vector2(extras.normalScale ?? 0.9, extras.normalScale ?? 0.9),
    });
    if (set.aoMap) mat.aoMapIntensity = 0.8;
    return mat;
  };

  const mats = {
    bark: mk("bark", 0x6b4f3a, { roughness: 0.95, normalScale: 1.1, envMapIntensity: 0.25 }),
    foliageDeep: mk("foliage", 0x1a6b3c, { tint: 0xb8e0c0, roughness: 0.92, normalScale: 1.2 }),
    foliageLight: mk("foliage", 0x3d9a4a, { tint: 0xd8f0c8, roughness: 0.9, normalScale: 1.0 }),
    foliageAccent: mk("foliage", 0x6aaa2e, { tint: 0xe8f5a0, roughness: 0.88, normalScale: 0.95 }),
    metalUrban: mk("metal", 0x8a938c, { roughness: 0.55, metalness: 0.65, envMapIntensity: 0.8 }),
    asphaltDark: new THREE.MeshStandardMaterial({ color: 0x2a3330, roughness: 0.92, metalness: 0.04 }),
    concreteLite: new THREE.MeshStandardMaterial({ color: 0xc5cbc2, roughness: 0.88, metalness: 0.03 }),
    woodBench: new THREE.MeshStandardMaterial({ color: 0x8b5a2b, roughness: 0.82, metalness: 0.04 }),
    glassTint: new THREE.MeshStandardMaterial({
      color: 0x7eb8c9,
      roughness: 0.22,
      metalness: 0.35,
      envMapIntensity: 0.9,
    }),
    vehicleBody: new THREE.MeshStandardMaterial({ color: 0xf2f5f0, roughness: 0.42, metalness: 0.35 }),
    vehicleEv: new THREE.MeshStandardMaterial({
      color: 0xc6ef4a,
      roughness: 0.4,
      metalness: 0.35,
      emissive: 0x2a3a08,
      emissiveIntensity: 0.15,
    }),
    vehicleAccent: new THREE.MeshStandardMaterial({ color: 0x2f4a3c, roughness: 0.45, metalness: 0.3 }),
    rubber: new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.95, metalness: 0.05 }),
    lampPost: new THREE.MeshStandardMaterial({ color: 0x3e5148, roughness: 0.7, metalness: 0.25 }),
    lampGlow: new THREE.MeshStandardMaterial({
      color: 0xf8fbf6,
      emissive: 0xf0f4c0,
      emissiveIntensity: 0.65,
      roughness: 0.35,
      metalness: 0.1,
    }),
    binBody: new THREE.MeshStandardMaterial({ color: 0x3a4a40, roughness: 0.75, metalness: 0.2 }),
    pathStone: new THREE.MeshStandardMaterial({ color: 0xd5ddd0, roughness: 0.9, metalness: 0.03 }),
    water: new THREE.MeshStandardMaterial({
      color: 0x4aa3c7,
      roughness: 0.18,
      metalness: 0.2,
      envMapIntensity: 1.15,
    }),
  };

  return {
    mats,
    dispose() {
      for (const mat of Object.values(mats)) mat.dispose?.();
      for (const tex of textures) tex.dispose();
    },
  };
}
