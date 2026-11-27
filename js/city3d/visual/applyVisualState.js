import { setInstanceRatio } from "../landscape/instancing.js";
import { mapVariablesToVisual } from "./mapVariables.js";

/**
 * Controlador de capas visuales R4.
 * Reutiliza pools InstancedMesh y meshes etiquetados; no recrea geometría.
 *
 * @param {import("three").Object3D} root
 */
export function createVisualController(root) {
  /** @type {Record<string, import("three").InstancedMesh[]>} */
  const pools = {
    vegetation: [],
    cars: [],
    evs: [],
    bikes: [],
    chargers: [],
    waste: [],
    recycling: [],
    solarField: [],
    efficiencyNodes: [],
  };

  /** @type {import("three").Object3D[]} */
  const solarMeshes = [];
  /** @type {import("three").Object3D[]} */
  const greenRoofMeshes = [];
  /** @type {import("three").Object3D[]} */
  const efficiencyMeshes = [];
  /** @type {import("three").Object3D | null} */
  let accentPlants = null;

  root.traverse((obj) => {
    const pool = obj.userData?.visualPool;
    if (pool && obj.isInstancedMesh && pools[pool]) {
      pools[pool].push(obj);
    }
    const layer = obj.userData?.visualLayer;
    if (layer === "solar") solarMeshes.push(obj);
    if (layer === "greenRoof") greenRoofMeshes.push(obj);
    if (layer === "efficiency") efficiencyMeshes.push(obj);
    if (obj.name === "accent-plants") accentPlants = obj;
  });

  let lastKey = "";
  let applyCount = 0;

  /**
   * @param {object} statesOrVariables calculateZoneStates() o variables crudas
   */
  function apply(statesOrVariables) {
    const variables = statesOrVariables?.variables || statesOrVariables || {};
    const visual = mapVariablesToVisual(variables);
    const key = JSON.stringify(visual.variables);
    if (key === lastKey) return visual;
    lastKey = key;
    applyCount += 1;

    // Vegetación (árboles urbanos + parque)
    for (const mesh of pools.vegetation) setInstanceRatio(mesh, visual.vegetation);
    if (accentPlants) {
      accentPlants.visible = visual.vegetation > 0.22;
      const s = 0.65 + visual.vegetation * 0.45;
      accentPlants.scale.setScalar(s);
    }

    // Flota: misma cantidad total aproximada; más EV al subir electricTransport
    const fleet = visual.electricFleet;
    for (const mesh of pools.cars) setInstanceRatio(mesh, 1 - fleet * 0.85);
    for (const mesh of pools.evs) setInstanceRatio(mesh, 0.12 + fleet * 0.88);
    for (const mesh of pools.chargers) setInstanceRatio(mesh, 0.15 + fleet * 0.85);

    // Bicicletas / bicicleteros
    for (const mesh of pools.bikes) setInstanceRatio(mesh, visual.bicycle);

    // Residuos y reciclaje
    for (const mesh of pools.waste) setInstanceRatio(mesh, visual.waste);
    for (const mesh of pools.recycling) setInstanceRatio(mesh, visual.recycling);

    // Campo solar en zona energía
    for (const mesh of pools.solarField) setInstanceRatio(mesh, visual.solar);
    for (const mesh of pools.efficiencyNodes) setInstanceRatio(mesh, visual.efficiency);

    // Paneles en cubiertas tipológicas
    const solarVisible = visual.solar;
    for (let i = 0; i < solarMeshes.length; i += 1) {
      const mesh = solarMeshes[i];
      // Gradual: primeros paneles aparecen antes
      const threshold = (i + 0.5) / Math.max(1, solarMeshes.length);
      mesh.visible = solarVisible >= threshold * 0.85 || solarVisible > 0.92;
      if (mesh.visible) {
        const s = 0.55 + solarVisible * 0.45;
        mesh.scale.setScalar(s);
      }
    }

    // Cubiertas verdes ↔ eficiencia + refuerzo con greenSpaces
    const greenRoof = Math.max(visual.efficiency * 0.7, visual.vegetation * 0.45);
    for (let i = 0; i < greenRoofMeshes.length; i += 1) {
      const mesh = greenRoofMeshes[i];
      const threshold = (i + 0.35) / Math.max(1, greenRoofMeshes.length);
      mesh.visible = greenRoof >= threshold * 0.8 || greenRoof > 0.9;
    }

    // Equipamiento HVAC / eficiencia
    for (let i = 0; i < efficiencyMeshes.length; i += 1) {
      const mesh = efficiencyMeshes[i];
      mesh.visible = visual.efficiency > 0.35;
      if (mesh.material && "emissiveIntensity" in mesh.material) {
        mesh.material.emissiveIntensity = 0.05 + visual.efficiency * 0.25;
      }
    }

    return visual;
  }

  return {
    apply,
    getApplyCount: () => applyCount,
    getPoolSizes: () =>
      Object.fromEntries(
        Object.entries(pools).map(([k, list]) => [
          k,
          list.map((m) => ({ max: m.userData.maxCount || 0, count: m.count })),
        ])
      ),
    counts: {
      solarMeshes: solarMeshes.length,
      greenRoofMeshes: greenRoofMeshes.length,
      efficiencyMeshes: efficiencyMeshes.length,
    },
  };
}
