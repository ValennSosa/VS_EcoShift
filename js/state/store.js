/**
 * Estado del borrador de simulación.
 * Independiente de los escenarios guardados: editar controles no muta la lista persistida.
 */

import { normalizeVariables } from "../sim/engine.js";
import {
  ORIGIN,
  STORAGE_VERSION,
  createEmptyPayload,
  getWriteBlockReason,
  isWriteBlocked,
  readStorage,
  resetStorageSafely,
  sanitizeDraft,
  writeStorage,
} from "./persistence.js";

function copyVariables(variables) {
  return { ...normalizeVariables(variables) };
}

let baseline = null;
let current = null;
let draftMeta = {
  origin: ORIGIN.NEW,
  sourceId: null,
  sourceName: null,
  updatedAt: Date.now(),
};
let scenariosCache = [];
let storageAvailable = true;
let lastStorageMessage = "";
let bootWarnings = [];

export function initState(initialVariables, options = {}) {
  baseline = copyVariables(initialVariables);
  current = copyVariables(initialVariables);
  draftMeta = {
    origin: ORIGIN.NEW,
    sourceId: null,
    sourceName: null,
    updatedAt: Date.now(),
  };
  scenariosCache = [];
  storageAvailable = true;
  lastStorageMessage = "";
  bootWarnings = [];

  if (options.skipStorage) return { restored: false, warnings: [], message: "" };

  const loaded = readStorage();
  storageAvailable = loaded.storageAvailable !== false;

  if (!loaded.ok) {
    lastStorageMessage = loaded.reason;
    bootWarnings = loaded.warnings || [];
    return {
      restored: false,
      warnings: bootWarnings,
      message: lastStorageMessage,
      incompatible: Boolean(loaded.incompatible),
    };
  }

  bootWarnings = loaded.warnings || [];

  if (!loaded.data) {
    persistAll();
    return { restored: false, warnings: bootWarnings, message: "" };
  }

  current = copyVariables(loaded.data.draft.variables);
  draftMeta = {
    origin: loaded.data.draft.origin,
    sourceId: loaded.data.draft.sourceId,
    sourceName: loaded.data.draft.sourceName,
    updatedAt: loaded.data.draft.updatedAt,
  };
  scenariosCache = loaded.data.scenarios.map((item) => ({ ...item, variables: copyVariables(item.variables) }));

  if (draftMeta.origin === ORIGIN.CUSTOM) {
    const linked = scenariosCache.find((item) => item.id === draftMeta.sourceId);
    if (!linked) {
      draftMeta = {
        origin: ORIGIN.NEW,
        sourceId: null,
        sourceName: null,
        updatedAt: Date.now(),
      };
      bootWarnings.push("El escenario vinculado al borrador ya no existía; el borrador quedó como nuevo.");
      persistAll();
    } else {
      draftMeta.sourceName = linked.name;
    }
  }

  if (bootWarnings.length) {
    lastStorageMessage = "Se cargaron los datos con avisos de integridad. Revisá el listado de escenarios.";
  }

  return {
    restored: true,
    warnings: bootWarnings,
    message: lastStorageMessage,
  };
}

export function getVariables() {
  return copyVariables(current);
}

export function getBaselineVariables() {
  return copyVariables(baseline);
}

export function setVariables(variables) {
  current = copyVariables(variables);
  draftMeta = { ...draftMeta, updatedAt: Date.now() };
}

export function resetVariables() {
  current = copyVariables(baseline);
  draftMeta = {
    origin: ORIGIN.NEW,
    sourceId: null,
    sourceName: null,
    updatedAt: Date.now(),
  };
}

export function getDraftMeta() {
  return { ...draftMeta };
}

export function setDraftOrigin(origin, sourceId = null, sourceName = null) {
  if (origin === ORIGIN.NEW) {
    draftMeta = {
      origin: ORIGIN.NEW,
      sourceId: null,
      sourceName: null,
      updatedAt: Date.now(),
    };
    return;
  }

  draftMeta = {
    origin,
    sourceId: sourceId || null,
    sourceName: sourceName || null,
    updatedAt: Date.now(),
  };
}

export function getScenarios() {
  return scenariosCache.map((item) => ({
    ...item,
    variables: copyVariables(item.variables),
  }));
}

export function setScenarios(list) {
  scenariosCache = list.map((item) => ({
    ...item,
    variables: copyVariables(item.variables),
  }));
}

export function getStorageStatus() {
  return {
    available: storageAvailable,
    message: lastStorageMessage,
    warnings: [...bootWarnings],
  };
}

export function persistDraftOnly() {
  return persistAll();
}

export function persistAll() {
  if (!baseline) {
    return { ok: false, reason: "Estado no inicializado." };
  }

  const draft = sanitizeDraft({
    variables: current,
    origin: draftMeta.origin,
    sourceId: draftMeta.sourceId,
    sourceName: draftMeta.sourceName,
    updatedAt: draftMeta.updatedAt,
  });

  const payload = {
    version: STORAGE_VERSION,
    draft,
    scenarios: scenariosCache,
  };

  const result = writeStorage(payload);
  storageAvailable = result.ok || storageAvailable;
  if (!result.ok) {
    lastStorageMessage = result.reason || getWriteBlockReason();
  } else if (!bootWarnings.length && !isWriteBlocked()) {
    lastStorageMessage = "";
  }
  return result;
}

export function resetDamagedStorage() {
  const payload = {
    version: STORAGE_VERSION,
    draft: sanitizeDraft({
      variables: current || baseline,
      origin: draftMeta.origin,
      sourceId: draftMeta.sourceId,
      sourceName: draftMeta.sourceName,
      updatedAt: Date.now(),
    }),
    scenarios: scenariosCache,
  };
  const result = resetStorageSafely(payload);
  if (result.ok) {
    lastStorageMessage = "Almacenamiento restablecido. Se guardó un respaldo local si fue posible.";
    bootWarnings = [];
  } else {
    lastStorageMessage = result.reason;
  }
  return result;
}

export function replacePayload(payload) {
  const empty = createEmptyPayload(baseline || payload?.draft?.variables || {});
  const next = payload || empty;
  current = copyVariables(next.draft.variables);
  draftMeta = {
    origin: next.draft.origin,
    sourceId: next.draft.sourceId,
    sourceName: next.draft.sourceName,
    updatedAt: next.draft.updatedAt,
  };
  scenariosCache = next.scenarios.map((item) => ({ ...item, variables: copyVariables(item.variables) }));
  return persistAll();
}

export { ORIGIN };
