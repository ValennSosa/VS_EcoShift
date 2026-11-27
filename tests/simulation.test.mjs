import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { INITIAL_VARIABLES, normalizeVariables, simulate } from "../js/sim/engine.js";

const presets = JSON.parse(readFileSync(new URL("../data/presets.json", import.meta.url), "utf8")).presets;

function clamp(value) {
  return Math.min(100, Math.max(0, value));
}

function reference(variables) {
  const V = variables.greenSpaces;
  const E = variables.electricTransport;
  const S = variables.solarEnergy;
  const F = variables.energyEfficiency;
  const Rsd = variables.wasteManagement;
  const B = variables.bicycleUse;
  const Rec = variables.recycling;
  const indicators = {
    emissions: clamp(74 - 0.18 * V - 0.16 * E - 0.14 * S - 0.12 * F - 0.06 * Rsd - 0.1 * B - 0.04 * Rec),
    airQuality: clamp(24 + 0.34 * V + 0.2 * E + 0.18 * B + 0.08 * S + 0.06 * F),
    energyConsumption: clamp(80 - 0.34 * F - 0.18 * S - 0.08 * V + 0.06 * E),
    renewableEnergy: clamp(S * (0.55 + 0.25 * F / 100)),
    greenSurface: clamp(8 + 0.72 * V),
    sustainableMobility: clamp(12 + 0.4 * E + 0.38 * B + 0.08 * Math.min(E, B)),
    recycling: clamp(6 + 0.5 * Rec + 0.22 * Rsd + 0.18 * Math.min(Rec, Rsd)),
  };
  const score = clamp(
    (100 - indicators.emissions) * 0.22 +
      indicators.airQuality * 0.16 +
      (100 - indicators.energyConsumption) * 0.16 +
      indicators.renewableEnergy * 0.14 +
      indicators.greenSurface * 0.12 +
      indicators.sustainableMobility * 0.12 +
      indicators.recycling * 0.08
  );
  return { indicators, score };
}

function assertClose(actual, expected, label) {
  assert.ok(Math.abs(actual - expected) < 1e-9, `${label}: ${actual} ≠ ${expected}`);
}

function assertResult(variables) {
  const result = simulate(variables);
  const oracle = reference(variables);
  for (const [key, value] of Object.entries(oracle.indicators)) {
    assertClose(result.indicators[key], value, key);
    assert.ok(result.indicators[key] >= 0 && result.indicators[key] <= 100, key);
  }
  assertClose(result.score, oracle.score, "score");
  assert.ok(result.score >= 0 && result.score <= 100);
  return result;
}

test("el motor corre en Node sin DOM", () => {
  assert.equal(typeof document, "undefined");
  assert.equal(typeof window, "undefined");
});

test("Ciudad actual coincide con las fórmulas completas", () => {
  const preset = presets.find((item) => item.id === "ciudad-actual");
  assert.deepEqual(preset.variables, INITIAL_VARIABLES);
  assertResult(preset.variables);
});

test("Ciudad sostenible coincide con las fórmulas completas", () => {
  assertResult(presets.find((item) => item.id === "ciudad-sostenible").variables);
});

test("Ciudad tecnológica coincide con las fórmulas completas", () => {
  assertResult(presets.find((item) => item.id === "ciudad-tecnologica").variables);
});

test("Ciudad verde coincide con las fórmulas completas", () => {
  assertResult(presets.find((item) => item.id === "ciudad-verde").variables);
});

test("el puntaje usa los indicadores completos", () => {
  const result = simulate(INITIAL_VARIABLES);
  const again = reference(result.variables);
  assertClose(result.score, again.score, "score");
  assert.notEqual(Object.is(result.score, Number(result.score.toFixed(1))), true);
});

test("limita variables entre 0 y 100 y normaliza decimales e inválidos", () => {
  const normalized = normalizeVariables({
    greenSpaces: -20,
    electricTransport: 140.2,
    solarEnergy: 10.4,
    energyEfficiency: Number.NaN,
    wasteManagement: "80.6",
    bicycleUse: undefined,
    recycling: null,
  });

  assert.deepEqual(normalized, {
    greenSpaces: 0,
    electricTransport: 100,
    solarEnergy: 10,
    energyEfficiency: 40,
    wasteManagement: 81,
    bicycleUse: 25,
    recycling: 30,
  });

  const fromInvalidRoot = simulate(null);
  assert.deepEqual(fromInvalidRoot.variables, INITIAL_VARIABLES);
});

test("los extremos 0 y 100 mantienen los indicadores dentro del rango", () => {
  for (const value of [0, 100]) {
    const variables = Object.fromEntries(Object.keys(INITIAL_VARIABLES).map((key) => [key, value]));
    const result = assertResult(variables);
    assert.deepEqual(result.variables, variables);
  }

  const maxed = simulate(Object.fromEntries(Object.keys(INITIAL_VARIABLES).map((key) => [key, 100])));
  assertClose(maxed.indicators.emissions, 0, "emissions-floor");
  assertClose(maxed.indicators.airQuality, 100, "air-ceiling");
});

test("más transporte eléctrico baja emisiones y sube el consumo", () => {
  const base = simulate(INITIAL_VARIABLES);
  const electrified = simulate({ ...INITIAL_VARIABLES, electricTransport: INITIAL_VARIABLES.electricTransport + 10 });

  assert.ok(electrified.indicators.emissions < base.indicators.emissions);
  assert.ok(electrified.indicators.energyConsumption > base.indicators.energyConsumption);
});

test("no modifica la entrada ni los presets", () => {
  const input = { ...INITIAL_VARIABLES, greenSpaces: 12.2 };
  const snapshot = { ...input };
  const before = JSON.stringify(presets);

  simulate(input);
  simulate(presets[0].variables);

  assert.deepEqual(input, snapshot);
  assert.equal(JSON.stringify(presets), before);
});

test("la misma entrada produce el mismo resultado", () => {
  const first = simulate(INITIAL_VARIABLES);
  const second = simulate(INITIAL_VARIABLES);
  assert.deepEqual(second, first);
});
