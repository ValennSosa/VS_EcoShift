import assert from "node:assert/strict";
import test from "node:test";

import { INITIAL_VARIABLES } from "../js/sim/engine.js";
import {
  LEVELS,
  ZONE_DEFINITIONS,
  calculateZoneStates,
  getZoneState,
  levelFromValue,
} from "../js/sim/zones.js";

test("existen exactamente seis zonas con variables asociadas", () => {
  assert.equal(ZONE_DEFINITIONS.length, 6);
  for (const zone of ZONE_DEFINITIONS) {
    assert.ok(zone.id);
    assert.ok(zone.name);
    assert.ok(Array.isArray(zone.variables));
    assert.ok(zone.variables.length >= 1);
    assert.ok(zone.features);
  }
});

test("los niveles bajo, medio y alto respetan los límites 33, 34, 66 y 67", () => {
  assert.equal(levelFromValue(0), "low");
  assert.equal(levelFromValue(33), "low");
  assert.equal(levelFromValue(34), "medium");
  assert.equal(levelFromValue(66), "medium");
  assert.equal(levelFromValue(67), "high");
  assert.equal(levelFromValue(100), "high");
  assert.deepEqual(LEVELS, ["low", "medium", "high"]);
});

test("los estados visuales cambian cuando cambian las variables", () => {
  const base = calculateZoneStates(INITIAL_VARIABLES);
  const greener = calculateZoneStates({ ...INITIAL_VARIABLES, greenSpaces: 90 });
  const baseGreen = getZoneState(base, "green");
  const richGreen = getZoneState(greener, "green");

  assert.equal(base.variableLevels.greenSpaces, "medium");
  assert.equal(baseGreen.features.vegetation, "medium");
  assert.equal(richGreen.features.vegetation, "high");
  assert.equal(richGreen.level, "high");
  assert.notEqual(baseGreen.level, richGreen.level);
});

test("valores inválidos se normalizan antes de calcular niveles", () => {
  const states = calculateZoneStates({
    greenSpaces: -40,
    electricTransport: 250,
    solarEnergy: Number.NaN,
    energyEfficiency: "12.6",
    wasteManagement: null,
    bicycleUse: undefined,
    recycling: "no",
  });

  assert.equal(states.variables.greenSpaces, 0);
  assert.equal(states.variables.electricTransport, 100);
  assert.equal(states.variables.solarEnergy, 20);
  assert.equal(states.variables.energyEfficiency, 13);
  assert.equal(states.variables.wasteManagement, 35);
  assert.equal(states.variables.bicycleUse, 25);
  assert.equal(states.variables.recycling, 30);
  assert.equal(states.variableLevels.greenSpaces, "low");
  assert.equal(states.variableLevels.electricTransport, "high");
});

test("calculateZoneStates no modifica la entrada", () => {
  const input = { ...INITIAL_VARIABLES, greenSpaces: 12 };
  const snapshot = { ...input };
  calculateZoneStates(input);
  assert.deepEqual(input, snapshot);
});

test("el resultado es determinista", () => {
  const first = calculateZoneStates(INITIAL_VARIABLES);
  const second = calculateZoneStates(INITIAL_VARIABLES);
  assert.deepEqual(second, first);
});

test("cada zona expone nivel, variables y características", () => {
  const states = calculateZoneStates(INITIAL_VARIABLES);
  assert.equal(states.zones.length, 6);

  for (const zone of states.zones) {
    assert.ok(LEVELS.includes(zone.level));
    assert.ok(zone.variables.length >= 1);
    assert.equal(typeof zone.overallValue, "number");
    for (const featureLevel of Object.values(zone.features)) {
      assert.ok(LEVELS.includes(featureLevel));
    }
  }

  const transport = getZoneState(states, "transport");
  assert.deepEqual(
    transport.variables.map((item) => item.key).sort(),
    ["bicycleUse", "electricTransport"]
  );
});

test("caso A: eficiencia alta no activa paneles solares bajos", () => {
  const states = calculateZoneStates({
    ...INITIAL_VARIABLES,
    energyEfficiency: 100,
    solarEnergy: 10,
  });
  const residential = getZoneState(states, "residential");
  const energy = getZoneState(states, "energy");

  assert.equal(residential.features.efficiency, "high");
  assert.equal(residential.features.solar, "low");
  assert.equal(energy.features.efficiency, "high");
  assert.equal(energy.features.solar, "low");
  assert.equal(states.variableLevels.solarEnergy, "low");
});

test("caso B: vegetación alta no activa transporte eléctrico bajo", () => {
  const states = calculateZoneStates({
    ...INITIAL_VARIABLES,
    greenSpaces: 90,
    electricTransport: 10,
  });
  const green = getZoneState(states, "green");
  const transport = getZoneState(states, "transport");

  assert.equal(green.features.vegetation, "high");
  assert.equal(transport.features.electric, "low");
  assert.equal(states.variableLevels.electricTransport, "low");
});

test("caso C: transporte eléctrico alto no activa bicicletas bajas", () => {
  const states = calculateZoneStates({
    ...INITIAL_VARIABLES,
    electricTransport: 90,
    bicycleUse: 10,
  });
  const transport = getZoneState(states, "transport");

  assert.equal(transport.features.electric, "high");
  assert.equal(transport.features.bicycle, "low");
  assert.notEqual(transport.features.electric, transport.features.bicycle);
});

test("caso D: residuos altos no activan reciclaje bajo", () => {
  const states = calculateZoneStates({
    ...INITIAL_VARIABLES,
    recycling: 10,
    wasteManagement: 90,
  });
  const commercial = getZoneState(states, "commercial");
  const industrial = getZoneState(states, "industrial");

  assert.equal(commercial.features.recycling, "low");
  assert.equal(commercial.features.waste, "high");
  assert.equal(industrial.features.waste, "high");
  assert.equal(states.variableLevels.recycling, "low");
});
