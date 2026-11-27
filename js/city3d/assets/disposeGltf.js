/**
 * Liberación de recursos GLTF / texturas / entornos.
 */

/**
 * @param {import("three").Object3D | null | undefined} root
 */
export function disposeObjectTree(root) {
  if (!root) return;
  root.traverse((object) => {
    if (object.geometry) object.geometry.dispose?.();
    const materials = Array.isArray(object.material) ? object.material : [object.material];
    for (const material of materials) {
      if (!material) continue;
      for (const key of Object.keys(material)) {
        const value = material[key];
        if (value && typeof value === "object" && "isTexture" in value && value.isTexture) {
          value.dispose?.();
        }
      }
      material.dispose?.();
    }
  });
}

/**
 * @param {import("three").Texture | import("three").WebGLRenderTarget | null | undefined} resource
 */
export function disposeTextureLike(resource) {
  if (!resource) return;
  if (resource.isWebGLRenderTarget) {
    resource.dispose?.();
    return;
  }
  resource.dispose?.();
}
