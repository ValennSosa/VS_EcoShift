import * as THREE from "three";
import { isCoarsePointer } from "./detect.js";

export function createRenderer(canvasHost) {
  const renderer = new THREE.WebGLRenderer({
    antialias: !isCoarsePointer(),
    alpha: false,
    powerPreference: "default",
  });
  renderer.setClearColor(0x0c342b, 1);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.domElement.className = "city3d-canvas";
  renderer.domElement.setAttribute("aria-hidden", "true");
  canvasHost.append(renderer.domElement);
  return renderer;
}

export function resizeRenderer(renderer, camera, canvasHost, updateFrustum) {
  const width = Math.max(1, canvasHost.clientWidth);
  const height = Math.max(1, canvasHost.clientHeight);
  const aspect = width / height;
  updateFrustum(camera, aspect);
  const dpr = Math.min(window.devicePixelRatio || 1, isCoarsePointer() ? 1.25 : 1.5);
  renderer.setPixelRatio(dpr);
  renderer.setSize(width, height, false);
  return { width, height };
}
