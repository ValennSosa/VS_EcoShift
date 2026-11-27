/**
 * Persistencia local de VS EcoShift.
 * Clave: vs-ecoshift:v1
 * No asume que los datos guardados sean válidos.
 */

import { normalizeVariables } from "../sim/engine.js";

export const STORAGE_KEY = "vs-ecoshift:v1";
export const STORAGE_VERSION = 1;
export const MAX_CUSTOM_SCENARIOS = 8;

export const ORIGIN = {
  NEW: "new",
  PRESET: "preset",
  CUSTOM: "custom",
};

/**
 * @typedef {{ ok: true, data: object, warnings: string[] } | { ok: false, reason: string, warnings: string[] }} LoadResult
 */

export function createEmptyPayload(baselineVariables) {
  const now = Date.now();
  return {
    version: STORAGE_VERSION,
    draft: {
      variables: normalizeVariables(baselineVariables),
      origin: ORIGIN.NEW,
      sourceId: null,
      sourceName: null,
      updatedAt: now,
    },
    scenarios: [],
  };
}

let writeBlocked = false;
let lastBlockedReason = "";

export function isWriteBlocked() {
  return writeBlocked;
}

export function getWriteBlockReason() {
  return lastBlockedReason;
}

export function clearWriteBlock() {
  writeBlocked = false;
  lastBlockedReason = "";
}

export function readStorage() {
  const warnings = [];
  let raw;

  try {
    raw = localStorage.getItem(STORAGE_KEY);
  } catch {
    writeBlocked = true;
    lastBlockedReason = "No se pudo leer el almacenamiento local. La simulación sigue en memoria.";
    return {
      ok: false,
      reason: lastBlockedReason,
      warnings,
      storageAvailable: false,
    };
  }

  if (raw == null || raw === "") {
    writeBlocked = false;
    lastBlockedReason = "";
    return { ok: true, data: null, warnings, storageAvailable: true };
  }

  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch {
    writeBlocked = true;
    lastBlockedReason =
      "Los datos guardados estaban dañados y no se cargaron. No se sobrescribió el almacenamiento para evitar pérdidas. Usá «Restablecer almacenamiento» si querés empezar de cero.";
    return {
      ok: false,
      reason: lastBlockedReason,
      warnings,
      storageAvailable: true,
      corrupt: true,
      raw,
    };
  }

  const sanitized = sanitizePayload(parsed, warnings);
  if (!sanitized) {
    writeBlocked = true;
    lastBlockedReason =
      "Los datos guardados no son compatibles con esta versión y no se cargaron. No se sobrescribió el almacenamiento. Usá «Restablecer almacenamiento» si querés empezar de cero.";
    return {
      ok: false,
      reason: lastBlockedReason,
      warnings,
      storageAvailable: true,
      incompatible: true,
      raw,
    };
  }

  writeBlocked = false;
  lastBlockedReason = "";
  return { ok: true, data: sanitized, warnings, storageAvailable: true };
}

export function writeStorage(payload) {
  if (writeBlocked) {
    return {
      ok: false,
      reason:
        lastBlockedReason ||
        "La escritura está bloqueada hasta restablecer el almacenamiento dañado o incompatible.",
      blocked: true,
    };
  }

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    return { ok: true };
  } catch (error) {
    const quota = error && (error.name === "QuotaExceededError" || error.code === 22);
    return {
      ok: false,
      reason: quota
        ? "El almacenamiento local está lleno. La simulación sigue en memoria, pero no se pudo guardar."
        : "No se pudo escribir en el almacenamiento local. La simulación sigue en memoria.",
    };
  }
}

/** Respalda la clave actual y habilita escritura sobre un estado limpio. */
export function resetStorageSafely(freshPayload) {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw != null) {
      localStorage.setItem(`${STORAGE_KEY}:backup:${Date.now()}`, raw);
    }
  } catch {
    // Si no se puede respaldar, igual se intenta limpiar la clave principal.
  }

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(freshPayload));
    clearWriteBlock();
    return { ok: true };
  } catch {
    return {
      ok: false,
      reason: "No se pudo restablecer el almacenamiento local. La simulación sigue en memoria.",
    };
  }
}

export function sanitizePayload(input, warnings = []) {
  if (!input || typeof input !== "object") return null;
  if (input.version !== STORAGE_VERSION) {
    warnings.push("Versión de datos incompatible.");
    return null;
  }

  const draft = sanitizeDraft(input.draft, warnings);
  if (!draft) return null;

  const scenarios = sanitizeScenarios(input.scenarios, warnings);

  return {
    version: STORAGE_VERSION,
    draft,
    scenarios,
  };
}

export function sanitizeDraft(draft, warnings = []) {
  if (!draft || typeof draft !== "object") {
    warnings.push("Borrador ausente o inválido.");
    return null;
  }

  const origin = normalizeOrigin(draft.origin);
  const variables = normalizeVariables(draft.variables);
  let sourceId = typeof draft.sourceId === "string" && draft.sourceId.trim() ? draft.sourceId.trim() : null;
  let sourceName = typeof draft.sourceName === "string" && draft.sourceName.trim() ? draft.sourceName.trim() : null;

  if (origin === ORIGIN.NEW) {
    sourceId = null;
    sourceName = null;
  }

  if (origin === ORIGIN.PRESET && !sourceId) {
    warnings.push("Origen preset sin identificador; se trató como nuevo.");
    return {
      variables,
      origin: ORIGIN.NEW,
      sourceId: null,
      sourceName: null,
      updatedAt: Number.isFinite(draft.updatedAt) ? draft.updatedAt : Date.now(),
    };
  }

  if (origin === ORIGIN.CUSTOM && !sourceId) {
    warnings.push("Origen custom sin sourceId; se desvinculó el borrador.");
    return {
      variables,
      origin: ORIGIN.NEW,
      sourceId: null,
      sourceName: null,
      updatedAt: Number.isFinite(draft.updatedAt) ? draft.updatedAt : Date.now(),
    };
  }

  return {
    variables,
    origin,
    sourceId,
    sourceName,
    updatedAt: Number.isFinite(draft.updatedAt) ? draft.updatedAt : Date.now(),
  };
}

export function sanitizeScenarios(list, warnings = []) {
  if (!Array.isArray(list)) {
    if (list != null) warnings.push("La lista de escenarios no era un arreglo y se ignoró.");
    return [];
  }

  const seen = new Set();
  const result = [];

  for (const item of list) {
    const scenario = sanitizeScenario(item, warnings);
    if (!scenario) continue;
    if (seen.has(scenario.id)) {
      warnings.push(`Se omitió un escenario duplicado (${scenario.id}).`);
      continue;
    }
    seen.add(scenario.id);
    result.push(scenario);
    if (result.length >= MAX_CUSTOM_SCENARIOS) {
      if (list.length > MAX_CUSTOM_SCENARIOS) {
        warnings.push(`Se respetó el límite de ${MAX_CUSTOM_SCENARIOS} escenarios propios.`);
      }
      break;
    }
  }

  return result;
}

export function sanitizeScenario(item, warnings = []) {
  if (!item || typeof item !== "object") return null;
  const id = typeof item.id === "string" ? item.id.trim() : "";
  const name = typeof item.name === "string" ? item.name.trim() : "";
  if (!id || !name) {
    warnings.push("Se omitió un escenario sin id o nombre válido.");
    return null;
  }

  return {
    id,
    name,
    variables: normalizeVariables(item.variables),
    createdAt: Number.isFinite(item.createdAt) ? item.createdAt : Date.now(),
    updatedAt: Number.isFinite(item.updatedAt) ? item.updatedAt : Date.now(),
  };
}

export function createScenarioId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return `esc-${crypto.randomUUID()}`;
  }
  return `esc-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

function normalizeOrigin(value) {
  if (value === ORIGIN.PRESET || value === ORIGIN.CUSTOM || value === ORIGIN.NEW) return value;
  return ORIGIN.NEW;
}
