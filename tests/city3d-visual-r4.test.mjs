/**
 * R4 — integración visual del simulador con la ciudad 3D.
 */
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

import { INITIAL_VARIABLES, VARIABLE_KEYS, normalizeVariables } from "../js/sim/engine.js";
import { calculateZoneStates } from "../js/sim/zones.js";
import { mapVariablesToVisual } from "../js/city3d/visual/mapVariables.js";

const ROOT = join(import.meta.dirname, "..");

test("mapVariablesToVisual cubre las siete variables", () => {
  const visual = mapVariablesToVisual(INITIAL_VARIABLES);
  for (const key of VARIABLE_KEYS) {
    assert.equal(visual.variables[key], INITIAL_VARIABLES[key]);
    assert.ok(["low", "medium", "high"].includes(visual.levels[key]));
  }
  assert.ok(visual.vegetation > 0 && visual.vegetation <= 1);
  assert.ok(visual.electricFleet >= 0 && visual.electricFleet <= 1);
  assert.ok(visual.solar > 0 && visual.solar <= 1);
});

test("intensidades visuales crecen con cada variable", () => {
  const low = mapVariablesToVisual({
    ...INITIAL_VARIABLES,
    greenSpaces: 5,
    electricTransport: 5,
    solarEnergy: 5,
    energyEfficiency: 5,
    wasteManagement: 5,
    bicycleUse: 5,
    recycling: 5,
  });
  const high = mapVariablesToVisual({
    ...INITIAL_VARIABLES,
    greenSpaces: 95,
    electricTransport: 95,
    solarEnergy: 95,
    energyEfficiency: 95,
    wasteManagement: 95,
    bicycleUse: 95,
    recycling: 95,
  });
  assert.ok(high.vegetation > low.vegetation);
  assert.ok(high.electricFleet > low.electricFleet);
  assert.ok(high.solar > low.solar);
  assert.ok(high.efficiency > low.efficiency);
  assert.ok(high.waste > low.waste);
  assert.ok(high.bicycle > low.bicycle);
  assert.ok(high.recycling > low.recycling);
});

test("valores iniciales del motor no cambiaron", () => {
  assert.deepEqual(INITIAL_VARIABLES, {
    greenSpaces: 35,
    electricTransport: 25,
    solarEnergy: 20,
    energyEfficiency: 40,
    wasteManagement: 35,
    bicycleUse: 25,
    recycling: 30,
  });
});

test("módulos R4 de capa visual existen", () => {
  for (const rel of [
    "js/city3d/visual/mapVariables.js",
    "js/city3d/visual/applyVisualState.js",
  ]) {
    assert.ok(existsSync(join(ROOT, rel)), `falta ${rel}`);
  }
});

test("buildCity aplica applyVisualState con controlador", () => {
  const build = readFileSync(join(ROOT, "js/city3d/buildCity.js"), "utf8");
  assert.match(build, /createVisualController/);
  assert.match(build, /applyVisualState\(states\)/);
  assert.doesNotMatch(build, /Etapa 3 \/ R4: mapear/);
});

test("city.js sincroniza 3D y acepta variables iniciales", () => {
  const city = readFileSync(join(ROOT, "js/ui/city.js"), "utf8");
  assert.match(city, /variables = null/);
  assert.match(city, /updateCity\(variables\)/);
  assert.match(city, /applyVisualState\(latestStates\)/);
});

test("simulator pasa variables a initCity", () => {
  const sim = readFileSync(join(ROOT, "js/pages/simulator.js"), "utf8");
  assert.match(sim, /variables:\s*getVariables\(\)/);
  assert.match(sim, /updateCity\(result\.variables\)/);
});

test("capas visuales etiquetan solar y greenRoof en assemble", () => {
  const assemble = readFileSync(join(ROOT, "js/city3d/architecture/assemble.js"), "utf8");
  assert.match(assemble, /visualLayer = "solar"/);
  assert.match(assemble, /visualLayer = "greenRoof"/);
});

test("mergeBuilding respeta visualLayer", () => {
  const merge = readFileSync(join(ROOT, "js/city3d/architecture/mergeBuilding.js"), "utf8");
  assert.match(merge, /visualLayer/);
});

test("calculateZoneStates sigue siendo la fuente para niveles", () => {
  const states = calculateZoneStates(INITIAL_VARIABLES);
  const visual = mapVariablesToVisual(states);
  assert.deepEqual(visual.variables, normalizeVariables(INITIAL_VARIABLES));
  assert.equal(visual.levels.greenSpaces, states.variableLevels.greenSpaces);
});

test("persistencia mantiene clave vs-ecoshift:v1", () => {
  const persistence = readFileSync(join(ROOT, "js/state/persistence.js"), "utf8");
  assert.match(persistence, /vs-ecoshift:v1/);
});
