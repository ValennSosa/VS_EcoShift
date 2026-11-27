import * as THREE from "three";

/** Encuadre para la ciudad procedural (~24u de plataforma). */
export const ISO_OFFSET = new THREE.Vector3(20, 18, 20);
export const FRUSTUM_SIZE = 22;
export const DEFAULT_TARGET = new THREE.Vector3(0, 0.6, 0.4);

export function createOrthoCamera() {
  const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 250);
  camera.position.copy(ISO_OFFSET);
  camera.lookAt(DEFAULT_TARGET);
  return camera;
}

export function updateOrthoFrustum(camera, aspect, frustumSize = FRUSTUM_SIZE) {
  const safeAspect = aspect > 0 ? aspect : 1;
  camera.left = (-frustumSize * safeAspect) / 2;
  camera.right = (frustumSize * safeAspect) / 2;
  camera.top = frustumSize / 2;
  camera.bottom = -frustumSize / 2;
  camera.updateProjectionMatrix();
}

export function resetCamera(camera, controls, target = DEFAULT_TARGET) {
  camera.position.copy(ISO_OFFSET);
  camera.zoom = 1;
  camera.updateProjectionMatrix();
  if (controls) {
    controls.target.copy(target);
    controls.update();
  } else {
    camera.lookAt(target);
  }
}
