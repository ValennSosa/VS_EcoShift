/**
 * Perfiles de calidad gráfica (desktop / mobile).
 * Detección por capacidades, no solo user-agent.
 */

import * as THREE from "three";
import { isCoarsePointer, prefersReducedMotion } from "../detect.js";

/** @typedef {'desktop' | 'mobile'} QualityId */

/**
 * @typedef {object} QualityProfile
 * @property {QualityId} id
 * @property {boolean} antialias
 * @property {number} pixelRatio
 * @property {boolean} shadows
 * @property {number} shadowMapSize
 * @property {boolean} plantKit
 * @property {number} landscapeDensity 0..1
 * @property {boolean} mergeBuildings
 * @property {boolean} buildingLod
 * @property {number} lodNear
 * @property {number} lodFar
 * @property {'high'|'mid'|'low'} defaultBuildingLod
 */

function defaultPixelRatio(cap) {
  if (typeof window === "undefined") return 1;
  return Math.min(window.devicePixelRatio || 1, cap);
}

/** @type {Record<QualityId, QualityProfile>} */
export const QUALITY_PROFILES = Object.freeze({
  desktop: Object.freeze({
    id: "desktop",
    antialias: true,
    pixelRatio: defaultPixelRatio(1.5),
    shadows: true,
    shadowMapSize: 1024,
    plantKit: true,
    landscapeDensity: 1,
    mergeBuildings: true,
    buildingLod: true,
    lodNear: 14,
    lodFar: 26,
    defaultBuildingLod: "high",
  }),
  mobile: Object.freeze({
    id: "mobile",
    antialias: false,
    pixelRatio: defaultPixelRatio(1.15),
    shadows: false,
    shadowMapSize: 512,
    plantKit: false,
    landscapeDensity: 0.55,
    mergeBuildings: true,
    buildingLod: true,
    lodNear: 10,
    lodFar: 18,
    defaultBuildingLod: "mid",
  }),
});

/**
 * Resuelve perfil por capacidad del dispositivo o id forzado.
 * @param {string | null | undefined} forcedId
 * @returns {QualityProfile}
 */
export function resolveQualityProfile(forcedId = null) {
  if (forcedId && QUALITY_PROFILES[forcedId]) {
    return { ...QUALITY_PROFILES[forcedId] };
  }

  const coarse = isCoarsePointer();
  const reduced = prefersReducedMotion();
  const mem = typeof navigator !== "undefined" ? Number(navigator.deviceMemory) || 0 : 0;
  const cores = typeof navigator !== "undefined" ? Number(navigator.hardwareConcurrency) || 0 : 0;
  const saveData =
    typeof navigator !== "undefined" && navigator.connection
      ? Boolean(navigator.connection.saveData)
      : false;

  const preferMobile =
    coarse ||
    saveData ||
    reduced ||
    (mem > 0 && mem <= 4) ||
    (cores > 0 && cores <= 4 && coarse);

  return { ...(preferMobile ? QUALITY_PROFILES.mobile : QUALITY_PROFILES.desktop) };
}

/**
 * Aplica perfil a renderer / sol.
 * @param {import("./profile.js").QualityProfile} profile
 * @param {{
 *   renderer: THREE.WebGLRenderer,
 *   sun?: THREE.DirectionalLight | null,
 *   forceShadows?: boolean | null,
 * }} ctx
 */
export function applyQualityProfile(profile, ctx) {
  const { renderer, sun = null, forceShadows = null } = ctx;
  const shadows = forceShadows == null ? profile.shadows : forceShadows;

  renderer.setPixelRatio(profile.pixelRatio);
  renderer.shadowMap.enabled = shadows;
  renderer.shadowMap.type = THREE.PCFShadowMap;

  if (sun) {
    sun.castShadow = shadows;
    if (shadows) {
      sun.shadow.mapSize.set(profile.shadowMapSize, profile.shadowMapSize);
      sun.shadow.camera.near = 2;
      sun.shadow.camera.far = 70;
      sun.shadow.camera.left = -20;
      sun.shadow.camera.right = 20;
      sun.shadow.camera.top = 20;
      sun.shadow.camera.bottom = -20;
      sun.shadow.bias = -0.0009;
      sun.shadow.normalBias = 0.02;
      sun.shadow.camera.updateProjectionMatrix();
    }
  }

  return { shadows };
}
