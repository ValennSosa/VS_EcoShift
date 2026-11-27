import * as THREE from "three";
import { isCoarsePointer } from "./detect.js";

export function createLights(scene, renderer) {
  const ambient = new THREE.AmbientLight(0xf2f7f0, 0.62);
  const sun = new THREE.DirectionalLight(0xfff6e0, 1.15);
  sun.position.set(14, 22, 10);
  sun.target.position.set(0, 0, 0);
  scene.add(ambient, sun, sun.target);

  const fill = new THREE.DirectionalLight(0xc6ef4a, 0.22);
  fill.position.set(-10, 8, -6);
  scene.add(fill);

  const coarse = isCoarsePointer();
  if (!coarse && renderer) {
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    sun.castShadow = true;
    sun.shadow.mapSize.set(1024, 1024);
    sun.shadow.camera.near = 2;
    sun.shadow.camera.far = 60;
    sun.shadow.camera.left = -18;
    sun.shadow.camera.right = 18;
    sun.shadow.camera.top = 18;
    sun.shadow.camera.bottom = -18;
    sun.shadow.bias = -0.001;
  }

  return { ambient, sun, fill };
}
