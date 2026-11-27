import * as THREE from "three";

const _box = new THREE.Box3();
const _size = new THREE.Vector3();
const _center = new THREE.Vector3();

/**
 * Normaliza un Object3D cargado: Y-up, origen en el suelo (centro XZ),
 * y escala opcional a un tamaño máximo en unidades de escena.
 *
 * @param {THREE.Object3D} root
 * @param {{ targetSize?: number, groundToOrigin?: boolean }} [options]
 * @returns {{ root: THREE.Object3D, size: THREE.Vector3, scale: number }}
 */
export function normalizeModel(root, options = {}) {
  const targetSize = Number(options.targetSize) > 0 ? Number(options.targetSize) : null;
  const groundToOrigin = options.groundToOrigin !== false;

  root.updateMatrixWorld(true);
  _box.setFromObject(root);

  if (_box.isEmpty()) {
    return { root, size: new THREE.Vector3(), scale: 1 };
  }

  _box.getSize(_size);
  _box.getCenter(_center);

  let scale = 1;
  if (targetSize) {
    const longest = Math.max(_size.x, _size.y, _size.z, 1e-6);
    scale = targetSize / longest;
    root.scale.multiplyScalar(scale);
    root.updateMatrixWorld(true);
    _box.setFromObject(root);
    _box.getSize(_size);
    _box.getCenter(_center);
  }

  if (groundToOrigin) {
    root.position.x += -_center.x;
    root.position.z += -_center.z;
    root.position.y += -_box.min.y;
    root.updateMatrixWorld(true);
    _box.setFromObject(root);
    _box.getSize(_size);
  }

  return {
    root,
    size: _size.clone(),
    scale,
  };
}

/**
 * Clona un modelo ya normalizado sin compartir transform del root original.
 * @param {THREE.Object3D} template
 * @returns {THREE.Object3D}
 */
export function cloneNormalized(template) {
  return template.clone(true);
}
