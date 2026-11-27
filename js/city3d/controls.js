import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { DEFAULT_TARGET } from "./camera.js";
import { isCoarsePointer, prefersReducedMotion } from "./detect.js";

export function createControls(camera, domElement) {
  const controls = new OrbitControls(camera, domElement);
  const reducedMotion = prefersReducedMotion();
  const coarse = isCoarsePointer();

  controls.enableDamping = !reducedMotion;
  controls.dampingFactor = 0.08;
  controls.enablePan = false;
  controls.minZoom = 0.45;
  controls.maxZoom = 2.8;
  controls.minPolarAngle = Math.PI / 5;
  controls.maxPolarAngle = Math.PI / 2.15;
  controls.target.copy(DEFAULT_TARGET);

  // En táctil: un dedo desplaza la página; zoom con pellizco.
  if (coarse) {
    controls.enableRotate = false;
    domElement.style.touchAction = "pan-y";
  } else {
    domElement.style.touchAction = "none";
  }

  controls.update();
  return controls;
}
