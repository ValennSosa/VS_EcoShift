/**
 * Catálogo de assets city3d (manifest local).
 * Sin acceso al motor de simulación.
 */

const MANIFEST_URL = new URL("../../../assets/city3d/manifest.json", import.meta.url).href;

/** @type {Promise<object> | null} */
let manifestPromise = null;

/**
 * @returns {Promise<object>}
 */
export function loadManifest() {
  if (!manifestPromise) {
    manifestPromise = fetch(MANIFEST_URL, { cache: "force-cache" }).then(async (response) => {
      if (!response.ok) {
        throw new Error(`No se pudo cargar el manifest city3d (${response.status}).`);
      }
      return response.json();
    });
  }
  return manifestPromise;
}

/**
 * @param {string} id
 * @returns {Promise<object>}
 */
export async function getAssetEntry(id) {
  const manifest = await loadManifest();
  const entry = manifest.assets?.find((item) => item.id === id);
  if (!entry) throw new Error(`Asset no encontrado en catálogo: ${id}`);
  return entry;
}

/**
 * @param {{ poc?: boolean, kind?: string, category?: string }} [filter]
 * @returns {Promise<object[]>}
 */
export async function listAssets(filter = {}) {
  const manifest = await loadManifest();
  const assets = Array.isArray(manifest.assets) ? manifest.assets : [];
  return assets.filter((entry) => {
    if (filter.poc === true && entry.poc !== true) return false;
    if (filter.kind && entry.kind !== filter.kind) return false;
    if (filter.category && entry.category !== filter.category) return false;
    return true;
  });
}

/**
 * Resuelve la URL absoluta de un asset relativo al manifest.
 * @param {object} entry
 * @returns {string}
 */
export function resolveAssetUrl(entry) {
  if (!entry?.url) throw new Error("Entrada de asset sin url.");
  return new URL(entry.url, MANIFEST_URL).href;
}

export function getManifestUrl() {
  return MANIFEST_URL;
}
