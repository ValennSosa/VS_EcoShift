import * as THREE from "three";

const BASE = new URL("../../../assets/city3d/textures/", import.meta.url);

/**
 * Mapas PBR 1K (ambientCG CC0) para la trama urbana.
 */
export const TRAMA_TEXTURE_PATHS = {
  asphalt: {
    map: "asphalt/Asphalt033_1K-JPG_Color.jpg",
    normalMap: "asphalt/Asphalt033_1K-JPG_NormalGL.jpg",
    roughnessMap: "asphalt/Asphalt033_1K-JPG_Roughness.jpg",
    aoMap: "asphalt/Asphalt033_1K-JPG_AmbientOcclusion.jpg",
  },
  sidewalk: {
    map: "sidewalk/PavingStones055_1K-JPG_Color.jpg",
    normalMap: "sidewalk/PavingStones055_1K-JPG_NormalGL.jpg",
    roughnessMap: "sidewalk/PavingStones055_1K-JPG_Roughness.jpg",
    aoMap: "sidewalk/PavingStones055_1K-JPG_AmbientOcclusion.jpg",
  },
  grass: {
    map: "grass/Grass001_1K-JPG_Color.jpg",
    normalMap: "grass/Grass001_1K-JPG_NormalGL.jpg",
    roughnessMap: "grass/Grass001_1K-JPG_Roughness.jpg",
    aoMap: "grass/Grass001_1K-JPG_AmbientOcclusion.jpg",
  },
  lot: {
    map: "lot/Concrete034_1K-JPG_Color.jpg",
    normalMap: "lot/Concrete034_1K-JPG_NormalGL.jpg",
    roughnessMap: "lot/Concrete034_1K-JPG_Roughness.jpg",
  },
};

/**
 * @param {string} relativePath
 * @param {THREE.TextureLoader} loader
 * @param {{ colorSpace?: string, wrap?: boolean }} [opts]
 * @returns {Promise<THREE.Texture>}
 */
function loadOne(relativePath, loader, opts = {}) {
  const url = new URL(relativePath, BASE).href;
  return new Promise((resolve, reject) => {
    loader.load(
      url,
      (texture) => {
        if (opts.colorSpace === "srgb") {
          texture.colorSpace = THREE.SRGBColorSpace;
        }
        if (opts.wrap !== false) {
          texture.wrapS = THREE.RepeatWrapping;
          texture.wrapT = THREE.RepeatWrapping;
          texture.anisotropy = 4;
        }
        texture.needsUpdate = true;
        resolve(texture);
      },
      undefined,
      (err) => reject(err instanceof Error ? err : new Error(String(err)))
    );
  });
}

/**
 * Carga el kit de texturas de trama. Fallar aquí permite degradar a materiales planos.
 * @returns {Promise<{ maps: Record<string, Record<string, THREE.Texture>>, dispose: () => void }>}
 */
export async function loadTramaTextureKit() {
  const loader = new THREE.TextureLoader();
  /** @type {Record<string, Record<string, THREE.Texture>>} */
  const maps = {};
  /** @type {THREE.Texture[]} */
  const all = [];

  for (const [key, paths] of Object.entries(TRAMA_TEXTURE_PATHS)) {
    maps[key] = {};
    for (const [slot, rel] of Object.entries(paths)) {
      const texture = await loadOne(rel, loader, {
        colorSpace: slot === "map" ? "srgb" : undefined,
      });
      maps[key][slot] = texture;
      all.push(texture);
    }
  }

  return {
    maps,
    dispose() {
      for (const texture of all) texture.dispose();
    },
  };
}
