import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { INITIAL_VARIABLES, simulate } from "../js/sim/engine.js";
import {
  MAX_CUSTOM_SCENARIOS,
  compareCustomScenarios,
  deleteScenario,
  listCustomScenarios,
  loadCustomIntoDraft,
  loadPresetIntoDraft,
  renameScenario,
  saveDraftAsNew,
  saveDraftChanges,
} from "../js/state/scenarios.js";
import { STORAGE_KEY } from "../js/state/persistence.js";
import {
  ORIGIN,
  getDraftMeta,
  getVariables,
  initState,
  persistAll,
  setDraftOrigin,
  setVariables,
} from "../js/state/store.js";

class MemoryStorage {
  constructor() {
    this.map = new Map();
  }
  getItem(key) {
    return this.map.has(key) ? this.map.get(key) : null;
  }
  setItem(key, value) {
    this.map.set(key, String(value));
  }
  removeItem(key) {
    this.map.delete(key);
  }
  clear() {
    this.map.clear();
  }
}

const presets = JSON.parse(readFileSync(new URL("../data/presets.json", import.meta.url), "utf8")).presets;
const baselinePreset = presets.find((item) => item.id === "ciudad-actual");
const sustainable = presets.find((item) => item.id === "ciudad-sostenible");

function boot(storage = new MemoryStorage()) {
  globalThis.localStorage = storage;
  initState(baselinePreset.variables);
  return storage;
}

test("crear y persistir un escenario propio", () => {
  const storage = boot();
  setVariables({ ...INITIAL_VARIABLES, greenSpaces: 80 });
  const saved = saveDraftAsNew("Parques altos");
  assert.equal(saved.ok, true);
  assert.equal(getDraftMeta().origin, ORIGIN.CUSTOM);
  assert.equal(getDraftMeta().sourceId, saved.scenario.id);

  const raw = JSON.parse(storage.getItem(STORAGE_KEY));
  assert.equal(raw.scenarios.length, 1);
  assert.equal(raw.scenarios[0].name, "Parques altos");
  assert.equal(raw.draft.origin, ORIGIN.CUSTOM);
});

test("guardar cambios conserva id, nombre y createdAt", () => {
  boot();
  saveDraftAsNew("Original");
  const before = listCustomScenarios()[0];
  setVariables({ ...getVariables(), solarEnergy: 90 });
  const updated = saveDraftChanges();
  assert.equal(updated.ok, true);
  assert.equal(updated.scenario.id, before.id);
  assert.equal(updated.scenario.name, before.name);
  assert.equal(updated.scenario.createdAt, before.createdAt);
  assert.ok(updated.scenario.updatedAt >= before.updatedAt);
  assert.equal(updated.scenario.variables.solarEnergy, 90);
});

test("guardar como nuevo no altera el escenario original", () => {
  boot();
  const first = saveDraftAsNew("Uno");
  setVariables({ ...getVariables(), recycling: 95 });
  const second = saveDraftAsNew("Dos");
  assert.equal(second.ok, true);
  const list = listCustomScenarios();
  assert.equal(list.length, 2);
  assert.equal(list.find((item) => item.id === first.scenario.id).variables.recycling, 30);
  assert.equal(getDraftMeta().sourceId, second.scenario.id);
});

test("eliminar el escenario vinculado conserva variables y pasa a new", () => {
  boot();
  setVariables({ ...INITIAL_VARIABLES, bicycleUse: 88 });
  const saved = saveDraftAsNew("Bici");
  const result = deleteScenario(saved.scenario.id);
  assert.equal(result.ok, true);
  assert.equal(result.unbound, true);
  assert.equal(getDraftMeta().origin, ORIGIN.NEW);
  assert.equal(getVariables().bicycleUse, 88);
  assert.equal(listCustomScenarios().length, 0);
});

test("no se pueden crear más de ocho escenarios", () => {
  boot();
  for (let index = 0; index < MAX_CUSTOM_SCENARIOS; index += 1) {
    setVariables({ ...INITIAL_VARIABLES, greenSpaces: 10 + index });
    const saved = saveDraftAsNew(`Escenario ${index + 1}`);
    assert.equal(saved.ok, true);
  }
  const blocked = saveDraftAsNew("Noveno");
  assert.equal(blocked.ok, false);
  assert.match(blocked.reason, /límite/i);
  assert.equal(listCustomScenarios().length, MAX_CUSTOM_SCENARIOS);
});

test("los presets no se sobrescriben ni eliminan", () => {
  boot();
  loadPresetIntoDraft(sustainable);
  assert.equal(getDraftMeta().origin, ORIGIN.PRESET);
  const overwrite = saveDraftChanges();
  assert.equal(overwrite.ok, false);
  const removed = deleteScenario(sustainable.id);
  assert.equal(removed.ok, false);
  assert.deepEqual(sustainable.variables, presets.find((item) => item.id === "ciudad-sostenible").variables);
});

test("modificar un preset mantiene el origen preset", () => {
  boot();
  loadPresetIntoDraft(sustainable);
  setVariables({ ...getVariables(), greenSpaces: 12 });
  persistAll();
  assert.equal(getDraftMeta().origin, ORIGIN.PRESET);
  assert.equal(getDraftMeta().sourceId, sustainable.id);
  assert.equal(saveDraftChanges().ok, false);
});

test("guardar como nuevo desde preset pasa el origen a custom", () => {
  boot();
  loadPresetIntoDraft(sustainable);
  setVariables({ ...getVariables(), solarEnergy: 15 });
  const saved = saveDraftAsNew("Desde preset");
  assert.equal(saved.ok, true);
  assert.equal(getDraftMeta().origin, ORIGIN.CUSTOM);
  assert.equal(getDraftMeta().sourceId, saved.scenario.id);
  assert.equal(getDraftMeta().sourceName, "Desde preset");
});

test("el origen preset modificado sobrevive a la recarga", () => {
  const storage = boot();
  loadPresetIntoDraft(sustainable);
  setVariables({ ...getVariables(), bicycleUse: 7 });
  persistAll();

  const raw = JSON.parse(storage.getItem(STORAGE_KEY));
  assert.equal(raw.draft.origin, ORIGIN.PRESET);
  assert.equal(raw.draft.sourceId, sustainable.id);
  assert.equal(raw.draft.variables.bicycleUse, 7);

  initState(baselinePreset.variables);
  assert.equal(getDraftMeta().origin, ORIGIN.PRESET);
  assert.equal(getDraftMeta().sourceId, sustainable.id);
  assert.equal(getVariables().bicycleUse, 7);
});

test("comparar dos escenarios no muta borrador ni lista", () => {
  boot();
  setVariables({ ...INITIAL_VARIABLES, greenSpaces: 90 });
  const a = saveDraftAsNew("A");
  setVariables({ ...INITIAL_VARIABLES, electricTransport: 90 });
  const b = saveDraftAsNew("B");
  const beforeDraft = getVariables();
  const beforeMeta = getDraftMeta();
  const beforeList = JSON.stringify(listCustomScenarios());

  const comparison = compareCustomScenarios(a.scenario.id, b.scenario.id);
  assert.equal(comparison.ok, true);
  assert.equal(comparison.left.result.score, simulate(a.scenario.variables).score);
  assert.equal(comparison.right.result.score, simulate(b.scenario.variables).score);
  assert.equal(comparison.rows.length, 7);

  assert.deepEqual(getVariables(), beforeDraft);
  assert.deepEqual(getDraftMeta(), beforeMeta);
  assert.equal(JSON.stringify(listCustomScenarios()), beforeList);
});

test("renombrar actualiza el vínculo del borrador", () => {
  boot();
  const saved = saveDraftAsNew("Viejo");
  const renamed = renameScenario(saved.scenario.id, "Nuevo");
  assert.equal(renamed.ok, true);
  assert.equal(getDraftMeta().sourceName, "Nuevo");
});

test("cargar escenario propio restaura variables y origen custom", () => {
  boot();
  setVariables({ ...INITIAL_VARIABLES, wasteManagement: 77 });
  const saved = saveDraftAsNew("Residuos");
  setVariables(INITIAL_VARIABLES);
  setDraftOrigin(ORIGIN.NEW);
  const loaded = loadCustomIntoDraft(saved.scenario.id);
  assert.equal(loaded.ok, true);
  assert.equal(getVariables().wasteManagement, 77);
  assert.equal(getDraftMeta().origin, ORIGIN.CUSTOM);
});

test("JSON inválido no se aplica y no se sobrescribe en silencio", () => {
  const storage = new MemoryStorage();
  storage.setItem(STORAGE_KEY, "{no-json");
  globalThis.localStorage = storage;
  const bootResult = initState(baselinePreset.variables);
  assert.equal(bootResult.restored, false);
  assert.match(bootResult.message, /dañados|compatibles|almacenamiento|restablecer/i);
  assert.equal(getDraftMeta().origin, ORIGIN.NEW);
  assert.equal(listCustomScenarios().length, 0);
  persistAll();
  assert.equal(storage.getItem(STORAGE_KEY), "{no-json");
});

test("versión incompatible no se carga", () => {
  const storage = new MemoryStorage();
  storage.setItem(
    STORAGE_KEY,
    JSON.stringify({
      version: 99,
      draft: { variables: INITIAL_VARIABLES, origin: "custom", sourceId: "x", sourceName: "X" },
      scenarios: [{ id: "x", name: "X", variables: INITIAL_VARIABLES }],
    })
  );
  globalThis.localStorage = storage;
  const bootResult = initState(baselinePreset.variables);
  assert.equal(bootResult.restored, false);
  assert.equal(bootResult.incompatible, true);
  assert.equal(listCustomScenarios().length, 0);
});

test("modificar controles no altera escenarios persistidos", () => {
  const storage = boot();
  const saved = saveDraftAsNew("Fijo");
  const before = JSON.parse(storage.getItem(STORAGE_KEY)).scenarios[0];
  setVariables({ ...getVariables(), solarEnergy: 11 });
  persistAll();
  const after = JSON.parse(storage.getItem(STORAGE_KEY)).scenarios[0];
  assert.deepEqual(after.variables, before.variables);
  assert.equal(after.id, saved.scenario.id);
});
