import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { INITIAL_VARIABLES, simulate } from "../js/sim/engine.js";
import {
  READINGS,
  buildComparisonRows,
  describeChange,
  summarizeComparison,
} from "../js/ui/indicators.js";

const presets = JSON.parse(readFileSync(new URL("../data/presets.json", import.meta.url), "utf8")).presets;
const baseline = simulate(presets.find((preset) => preset.id === "ciudad-actual").variables);

test("el orden de comparación coincide con las siete lecturas", () => {
  const rows = buildComparisonRows(baseline, baseline);
  assert.equal(rows.length, 7);
  assert.deepEqual(
    rows.map((row) => row.key),
    READINGS.map((reading) => reading.key)
  );
});

test("contra Ciudad actual no hay mejoras ni retrocesos", () => {
  const rows = buildComparisonRows(baseline, baseline);
  const summary = summarizeComparison(rows);
  assert.equal(summary.improvements.length, 0);
  assert.equal(summary.regressions.length, 0);
  assert.equal(summary.same.length, 7);
  assert.match(summary.text, /Sin cambios/);
});

test("emisiones más bajas cuentan como mejora", () => {
  const change = describeChange(40, 50, "lower");
  assert.equal(change.status, "improved");
});

test("consumo más alto cuenta como retroceso", () => {
  const change = describeChange(70, 60, "lower");
  assert.equal(change.status, "regressed");
});

test("Ciudad sostenible produce mejoras reales del motor", () => {
  const sustainable = simulate(presets.find((preset) => preset.id === "ciudad-sostenible").variables);
  const rows = buildComparisonRows(sustainable, baseline);
  const summary = summarizeComparison(rows);

  assert.ok(summary.improvements.length >= 1);
  for (const row of rows) {
    assert.equal(row.current, sustainable.indicators[row.key]);
    assert.equal(row.baseline, baseline.indicators[row.key]);
    assert.match(row.displayCurrent, /^\d+,\d$/);
    assert.match(row.displayBaseline, /^\d+,\d$/);
  }
});

test("subir solo el transporte eléctrico puede mezclar mejora y retroceso", () => {
  const mixed = simulate({ ...INITIAL_VARIABLES, electricTransport: 90 });
  const rows = buildComparisonRows(mixed, baseline);
  const emissions = rows.find((row) => row.key === "emissions");
  const consumption = rows.find((row) => row.key === "energyConsumption");

  assert.equal(emissions.change.status, "improved");
  assert.equal(consumption.change.status, "regressed");
});
