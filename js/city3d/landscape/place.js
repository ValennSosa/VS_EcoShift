import * as THREE from "three";
import { CITY_SEED } from "../layout.js";
import { createFurnitureGeometries, placeStreetFurniture } from "./furniture.js";
import { createMobilityGeometries, placeMobility } from "./mobility.js";
import { buildCentralPark } from "./park.js";
import { placeAccentPlants } from "./plants.js";
import { createTreeGeometries, placeUrbanTrees } from "./trees.js";

/**
 * Orquesta vegetación, movilidad y mobiliario urbano (R3).
 * @param {{
 *   root: import("three").Group,
 *   zones: Record<string, { group: import("three").Group }>,
 *   landscapeMats: { mats: Record<string, import("three").Material>, dispose: () => void },
 *   plantKit?: object | null,
 *   quality?: import("../quality/profile.js").QualityProfile | null,
 * }} ctx
 */
export function placeLandscape(ctx) {
  const { root, zones, landscapeMats, plantKit = null, quality = null } = ctx;
  const density = quality?.landscapeDensity ?? 1;
  const usePlants = plantKit && quality?.plantKit !== false;

  const disposables = [];
  if (landscapeMats) disposables.push(landscapeMats);
  if (plantKit) disposables.push(plantKit);

  const treeGeos = createTreeGeometries();
  const mobilityGeos = createMobilityGeometries();
  const furnitureGeos = createFurnitureGeometries();

  const landscapeRoot = new THREE.Group();
  landscapeRoot.name = "landscape-r3";
  root.add(landscapeRoot);

  placeUrbanTrees(landscapeRoot, landscapeMats, treeGeos, CITY_SEED, disposables, density);

  if (zones.green?.group) {
    buildCentralPark(
      zones.green.group,
      landscapeMats,
      treeGeos,
      furnitureGeos,
      CITY_SEED,
      disposables,
      usePlants ? plantKit : null
    );
  }

  placeMobility(landscapeRoot, landscapeMats, mobilityGeos, CITY_SEED, disposables);
  placeStreetFurniture(landscapeRoot, landscapeMats, furnitureGeos, CITY_SEED, disposables);
  if (usePlants) placeAccentPlants(landscapeRoot, plantKit, CITY_SEED);

  return {
    root: landscapeRoot,
    disposables,
  };
}
