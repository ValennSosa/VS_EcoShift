import * as THREE from "three";
import { resolveQualityProfile } from "./quality/profile.js";

/**
 * @param {HTMLElement} canvasHost
 * @param {import("./quality/profile.js").QualityProfile} [quality]
 */
export function createRenderer(canvasHost, quality = null) {
  const profile = quality || resolveQualityProfile();
  const renderer = new THREE.WebGLRenderer({
    antialias: profile.antialias,
    alpha: false,
    powerPreference: "high-performance",
  });
  renderer.setClearColor(0x0c342b, 1);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.setPixelRatio(profile.pixelRatio);
  renderer.domElement.className = "city3d-canvas";
  renderer.domElement.setAttribute("aria-hidden", "true");
  canvasHost.append(renderer.domElement);
  return renderer;
}

export function resizeRenderer(renderer, camera, canvasHost, updateFrustum, quality = null) {
  const profile = quality || resolveQualityProfile();
  const width = Math.max(1, canvasHost.clientWidth);
  const height = Math.max(1, canvasHost.clientHeight);
  const aspect = width / height;
  updateFrustum(camera, aspect);
  renderer.setPixelRatio(profile.pixelRatio);
  renderer.setSize(width, height, false);
  return { width, height };
}
