/**
 * Escenarios propios. Los presets de data/presets.json no se modifican ni eliminan.
 */

import { normalizeVariables, simulate } from "../sim/engine.js";
import { buildComparisonRows, summarizeComparison } from "../ui/indicators.js";
import {
  MAX_CUSTOM_SCENARIOS,
  ORIGIN,
  createScenarioId,
  sanitizeScenario,
} from "./persistence.js";
import {
  getDraftMeta,
  getScenarios,
  getVariables,
  persistAll,
  setDraftOrigin,
  setScenarios,
  setVariables,
} from "./store.js";

const PRESET_ID_PREFIX = "ciudad-";

export function listCustomScenarios() {
  return getScenarios();
}

export function getCustomScenario(id) {
  return getScenarios().find((item) => item.id === id) || null;
}

export function canCreateScenario() {
  return getScenarios().length < MAX_CUSTOM_SCENARIOS;
}

export function isPresetId(id) {
  return typeof id === "string" && id.startsWith(PRESET_ID_PREFIX);
}

/**
 * Guarda el borrador como escenario nuevo y vincula el borrador al nuevo ID.
 */
export function saveDraftAsNew(name) {
  const trimmed = typeof name === "string" ? name.trim() : "";
  if (!trimmed) {
    return { ok: false, reason: "Escribí un nombre para el escenario." };
  }
  if (!canCreateScenario()) {
    return {
      ok: false,
      reason: `Alcanzaste el límite de ${MAX_CUSTOM_SCENARIOS} escenarios propios.`,
    };
  }

  const now = Date.now();
  const scenario = {
    id: createUniqueId(getScenarios()),
    name: trimmed,
    variables: normalizeVariables(getVariables()),
    createdAt: now,
    updatedAt: now,
  };

  const next = [...getScenarios(), scenario];
  setScenarios(next);
  setDraftOrigin(ORIGIN.CUSTOM, scenario.id, scenario.name);
  const persisted = persistAll();
  if (!persisted.ok) {
    return { ok: false, reason: persisted.reason, scenario };
  }
  return { ok: true, scenario };
}

/**
 * Guarda cambios sobre el escenario vinculado (mismo id, nombre y createdAt).
 */
export function saveDraftChanges() {
  const meta = getDraftMeta();
  if (meta.origin !== ORIGIN.CUSTOM || !meta.sourceId) {
    return {
      ok: false,
      reason: "No hay un escenario propio vinculado. Usá «Guardar como nuevo».",
    };
  }
  if (isPresetId(meta.sourceId)) {
    return { ok: false, reason: "Los presets no se pueden sobrescribir." };
  }

  const list = getScenarios();
  const index = list.findIndex((item) => item.id === meta.sourceId);
  if (index < 0) {
    setDraftOrigin(ORIGIN.NEW);
    persistAll();
    return {
      ok: false,
      reason: "El escenario vinculado ya no existe. El borrador quedó como nuevo.",
      unbound: true,
    };
  }

  const current = list[index];
  const updated = {
    ...current,
    variables: normalizeVariables(getVariables()),
    updatedAt: Date.now(),
  };
  const next = list.slice();
  next[index] = updated;
  setScenarios(next);
  setDraftOrigin(ORIGIN.CUSTOM, updated.id, updated.name);
  const persisted = persistAll();
  if (!persisted.ok) return { ok: false, reason: persisted.reason, scenario: updated };
  return { ok: true, scenario: updated };
}

export function renameScenario(id, name) {
  if (isPresetId(id)) {
    return { ok: false, reason: "Los presets no se pueden renombrar." };
  }
  const trimmed = typeof name === "string" ? name.trim() : "";
  if (!trimmed) {
    return { ok: false, reason: "Escribí un nombre válido." };
  }

  const list = getScenarios();
  const index = list.findIndex((item) => item.id === id);
  if (index < 0) return { ok: false, reason: "No se encontró el escenario." };

  const updated = { ...list[index], name: trimmed, updatedAt: Date.now() };
  const next = list.slice();
  next[index] = updated;
  setScenarios(next);

  const meta = getDraftMeta();
  if (meta.origin === ORIGIN.CUSTOM && meta.sourceId === id) {
    setDraftOrigin(ORIGIN.CUSTOM, id, trimmed);
  }

  const persisted = persistAll();
  if (!persisted.ok) return { ok: false, reason: persisted.reason, scenario: updated };
  return { ok: true, scenario: updated };
}

export function deleteScenario(id) {
  if (isPresetId(id)) {
    return { ok: false, reason: "Los presets no se pueden eliminar." };
  }

  const list = getScenarios();
  const exists = list.some((item) => item.id === id);
  if (!exists) return { ok: false, reason: "No se encontró el escenario." };

  setScenarios(list.filter((item) => item.id !== id));

  const meta = getDraftMeta();
  let unbound = false;
  if (meta.origin === ORIGIN.CUSTOM && meta.sourceId === id) {
    // Conserva variables del borrador; solo desvincula.
    setDraftOrigin(ORIGIN.NEW);
    unbound = true;
  }

  const persisted = persistAll();
  if (!persisted.ok) return { ok: false, reason: persisted.reason, unbound };
  return { ok: true, unbound };
}

export function loadCustomIntoDraft(id) {
  if (isPresetId(id)) {
    return { ok: false, reason: "Usá la carga de presets del simulador." };
  }
  const scenario = getCustomScenario(id);
  if (!scenario) return { ok: false, reason: "No se encontró el escenario." };

  setVariables(scenario.variables);
  setDraftOrigin(ORIGIN.CUSTOM, scenario.id, scenario.name);
  const persisted = persistAll();
  if (!persisted.ok) {
    return { ok: false, reason: persisted.reason, scenario };
  }
  return { ok: true, scenario };
}

export function loadPresetIntoDraft(preset) {
  if (!preset || typeof preset !== "object" || !preset.id) {
    return { ok: false, reason: "Preset inválido." };
  }
  setVariables(preset.variables);
  setDraftOrigin(ORIGIN.PRESET, preset.id, preset.name || preset.id);
  const persisted = persistAll();
  if (!persisted.ok) return { ok: false, reason: persisted.reason };
  return { ok: true };
}

/**
 * Compara hasta dos escenarios propios. No muta borrador ni lista.
 */
export function compareCustomScenarios(idA, idB) {
  if (!idA || !idB || idA === idB) {
    return { ok: false, reason: "Elegí dos escenarios propios distintos." };
  }
  if (isPresetId(idA) || isPresetId(idB)) {
    return { ok: false, reason: "La comparación de esta pantalla usa escenarios propios." };
  }

  const left = getCustomScenario(idA);
  const right = getCustomScenario(idB);
  if (!left || !right) {
    return { ok: false, reason: "No se encontraron ambos escenarios." };
  }

  // Copias defensivas: simulate no debe poder afectar lo guardado.
  const leftResult = simulate({ ...left.variables });
  const rightResult = simulate({ ...right.variables });
  const rows = buildComparisonRows(rightResult, leftResult);
  const summary = summarizeComparison(rows);

  return {
    ok: true,
    left: {
      id: left.id,
      name: left.name,
      result: leftResult,
    },
    right: {
      id: right.id,
      name: right.name,
      result: rightResult,
    },
    rows,
    summary,
  };
}

export function validateScenarioShape(item) {
  return sanitizeScenario(item, []);
}

function createUniqueId(existing) {
  let id = createScenarioId();
  const ids = new Set(existing.map((item) => item.id));
  let guard = 0;
  while (ids.has(id) && guard < 8) {
    id = createScenarioId();
    guard += 1;
  }
  return id;
}

export { MAX_CUSTOM_SCENARIOS, ORIGIN };
