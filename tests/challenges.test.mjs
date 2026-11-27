import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { INITIAL_VARIABLES, simulate } from "../js/sim/engine.js";
import {
  CHALLENGES,
  countMet,
  evaluateChallenges,
  evaluateFromResults,
} from "../js/sim/challenges.js";

const presets = JSON.parse(readFileSync(new URL("../data/presets.json", import.meta.url), "utf8")).presets;
const baseline = simulate(presets.find((preset) => preset.id === "ciudad-actual").variables);

test("hay exactamente cuatro desafíos definidos", () => {
  assert.equal(CHALLENGES.length, 4);
  assert.deepEqual(
    CHALLENGES.map((item) => item.id),
    ["emisiones", "renovable", "superficie", "movilidad"]
  );
});

test("Ciudad actual deja los cuatro desafíos pendientes", () => {
  const evaluations = evaluateFromResults(baseline, baseline);
  assert.equal(countMet(evaluations), 0);
  for (const item of evaluations) {
    assert.equal(item.met, false);
    assert.equal(item.statusLabel, "Pendiente");
  }
});

test("Ciudad sostenible cumple los cuatro desafíos", () => {
  const result = simulate(presets.find((preset) => preset.id === "ciudad-sostenible").variables);
  const evaluations = evaluateFromResults(result, baseline);
  assert.equal(countMet(evaluations), 4);
  for (const item of evaluations) assert.equal(item.met, true);
});

test("Ciudad tecnológica cumple emisiones, renovable y movilidad; no superficie", () => {
  const result = simulate(presets.find((preset) => preset.id === "ciudad-tecnologica").variables);
  const byId = Object.fromEntries(evaluateFromResults(result, baseline).map((item) => [item.id, item]));
  assert.equal(byId.emisiones.met, true);
  assert.equal(byId.renovable.met, true);
  assert.equal(byId.superficie.met, false);
  assert.equal(byId.movilidad.met, true);
});

test("Ciudad verde cumple emisiones, superficie y movilidad; no renovable", () => {
  const result = simulate(presets.find((preset) => preset.id === "ciudad-verde").variables);
  const byId = Object.fromEntries(evaluateFromResults(result, baseline).map((item) => [item.id, item]));
  assert.equal(byId.emisiones.met, true);
  assert.equal(byId.renovable.met, false);
  assert.equal(byId.superficie.met, true);
  assert.equal(byId.movilidad.met, true);
});

test("la evaluación de renovable usa precisión completa cerca del umbral 40", () => {
  const almost = { ...baseline.indicators, renewableEnergy: 39.999 };
  const exact = { ...baseline.indicators, renewableEnergy: 40 };
  assert.equal(evaluateChallenges(almost, baseline.indicators).find((item) => item.id === "renovable").met, false);
  assert.equal(evaluateChallenges(exact, baseline.indicators).find((item) => item.id === "renovable").met, true);
});

test("la reducción de emisiones exige al menos 20% con valores completos", () => {
  const initial = baseline.indicators.emissions;
  // 19.999% no alcanza; un valor claramente por encima del 20% sí.
  const justBelow = { ...baseline.indicators, emissions: initial * (1 - 0.19999) };
  const clearPass = { ...baseline.indicators, emissions: initial * 0.79 };
  const belowItem = evaluateChallenges(justBelow, baseline.indicators).find((item) => item.id === "emisiones");
  const passItem = evaluateChallenges(clearPass, baseline.indicators).find((item) => item.id === "emisiones");
  assert.equal(belowItem.met, false);
  assert.ok(belowItem.ratio < 0.2);
  assert.equal(passItem.met, true);
  assert.ok(passItem.ratio >= 0.2);
});

test("superficie verde exige +15 puntos absolutos respecto de Ciudad actual", () => {
  const target = baseline.indicators.greenSurface + 15;
  const below = { ...baseline.indicators, greenSurface: target - 0.0001 };
  const ok = { ...baseline.indicators, greenSurface: target };
  assert.equal(evaluateChallenges(below, baseline.indicators).find((item) => item.id === "superficie").met, false);
  assert.equal(evaluateChallenges(ok, baseline.indicators).find((item) => item.id === "superficie").met, true);
});

test("movilidad sostenible exige >= 55 con precisión completa", () => {
  const below = { ...baseline.indicators, sustainableMobility: 54.999 };
  const ok = { ...baseline.indicators, sustainableMobility: 55 };
  assert.equal(evaluateChallenges(below, baseline.indicators).find((item) => item.id === "movilidad").met, false);
  assert.equal(evaluateChallenges(ok, baseline.indicators).find((item) => item.id === "movilidad").met, true);
});

test("emisiones iniciales <= 0 no dividen y dejan el desafío pendiente", () => {
  const zeroBaseline = { ...baseline.indicators, emissions: 0 };
  const current = { ...baseline.indicators, emissions: 0 };
  const item = evaluateChallenges(current, zeroBaseline).find((entry) => entry.id === "emisiones");
  assert.equal(item.met, false);
  assert.equal(item.ratio, null);
  assert.equal(item.target, null);
  assert.match(item.detail, /no se puede evaluar/i);
});

test("el redondeo visual a 1 decimal no altera la decisión del motor", () => {
  // 39.96 se mostraría como 40,0 pero el umbral exige >= 40 exacto.
  const displayTrap = { ...baseline.indicators, renewableEnergy: 39.96 };
  const item = evaluateChallenges(displayTrap, baseline.indicators).find((entry) => entry.id === "renovable");
  assert.equal(item.met, false);
  assert.equal(Number(item.value.toFixed(1)), 40);
});

test("evaluateFromResults coincide con evaluateChallenges sobre indicadores", () => {
  const mixed = simulate({ ...INITIAL_VARIABLES, solarEnergy: 80, energyEfficiency: 80 });
  const fromResults = evaluateFromResults(mixed, baseline);
  const fromIndicators = evaluateChallenges(mixed.indicators, baseline.indicators);
  assert.deepEqual(
    fromResults.map((item) => ({ id: item.id, met: item.met, value: item.value, target: item.target })),
    fromIndicators.map((item) => ({ id: item.id, met: item.met, value: item.value, target: item.target }))
  );
});
