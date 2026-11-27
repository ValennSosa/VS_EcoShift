import * as THREE from "three";
import { applyQualityProfile, resolveQualityProfile } from "./quality/profile.js";

/**
 * @param {THREE.Scene} scene
 * @param {THREE.WebGLRenderer} renderer
 * @param {import("./quality/profile.js").QualityProfile} [quality]
 */
export function createLights(scene, renderer, quality = null) {
  const profile = quality || resolveQualityProfile();

  const hemi = new THREE.HemisphereLight(0xdce9ff, 0x2a4036, 0.48);
  const ambient = new THREE.AmbientLight(0xf2f7f0, 0.32);
  const sun = new THREE.DirectionalLight(0xfff1d6, 1.4);
  sun.position.set(16, 26, 12);
  sun.target.position.set(0, 0, 0);
  scene.add(hemi, ambient, sun, sun.target);

  const fill = new THREE.DirectionalLight(0xb7d7c8, 0.32);
  fill.position.set(-12, 10, -8);
  scene.add(fill);

  applyQualityProfile(profile, { renderer, sun });

  return { hemi, ambient, sun, fill, quality: profile };
}
