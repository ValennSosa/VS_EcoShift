/**
 * Motor determinista de VS EcoShift.
 *
 * simulate(variables) devuelve:
 * {
 *   variables: siete enteros normalizados de 0 a 100,
 *   indicators: siete números completos de 0 a 100,
 *   score: puntaje educativo completo de 0 a 100
 * }
 *
 * Normalización, en este orden:
 * - Si la entrada no es un objeto, se usan los valores de Ciudad actual.
 * - Si una variable falta, no es finita o no se puede leer como número, se usa el valor inicial de esa variable.
 * - Los decimales se redondean al entero más cercano.
 * - El resultado se recorta entre 0 y 100.
 * La entrada y los presets no se modifican.
 */

import { calculateIndicators, calculateScore } from "./indicators.js";

export const VARIABLE_KEYS = [
  "greenSpaces",
  "electricTransport",
  "solarEnergy",
  "energyEfficiency",
  "wasteManagement",
  "bicycleUse",
  "recycling",
];

export const INITIAL_VARIABLES = {
  greenSpaces: 35,
  electricTransport: 25,
  solarEnergy: 20,
  energyEfficiency: 40,
  wasteManagement: 35,
  bicycleUse: 25,
  recycling: 30,
};

export function normalizeVariables(input) {
  const source = input && typeof input === "object" ? input : {};
  const normalized = {};

  for (const key of VARIABLE_KEYS) {
    normalized[key] = normalizeValue(source[key], INITIAL_VARIABLES[key]);
  }

  return normalized;
}

export function simulate(variables) {
  const normalized = normalizeVariables(variables);
  const indicators = calculateIndicators(normalized);

  return {
    variables: normalized,
    indicators,
    score: calculateScore(indicators),
  };
}

function normalizeValue(value, fallback) {
  const numeric = typeof value === "number" ? value : typeof value === "string" && value.trim() !== "" ? Number(value) : Number.NaN;
  if (!Number.isFinite(numeric)) return fallback;
  return Math.min(100, Math.max(0, Math.round(numeric)));
}
