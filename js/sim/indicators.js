/**
 * Fórmulas aprobadas. Cada indicador queda entre 0 y 100.
 * El redondeo no ocurre acá: estos valores alimentan el puntaje y las comparaciones.
 */

export const INDICATOR_KEYS = [
  "emissions",
  "airQuality",
  "energyConsumption",
  "renewableEnergy",
  "greenSurface",
  "sustainableMobility",
  "recycling",
];

export function clampUnit(value) {
  return Math.min(100, Math.max(0, value));
}

export function calculateIndicators(variables) {
  const V = variables.greenSpaces;
  const E = variables.electricTransport;
  const S = variables.solarEnergy;
  const F = variables.energyEfficiency;
  const Rsd = variables.wasteManagement;
  const B = variables.bicycleUse;
  const Rec = variables.recycling;

  return {
    emissions: clampUnit(74 - 0.18 * V - 0.16 * E - 0.14 * S - 0.12 * F - 0.06 * Rsd - 0.1 * B - 0.04 * Rec),
    airQuality: clampUnit(24 + 0.34 * V + 0.2 * E + 0.18 * B + 0.08 * S + 0.06 * F),
    energyConsumption: clampUnit(80 - 0.34 * F - 0.18 * S - 0.08 * V + 0.06 * E),
    renewableEnergy: clampUnit(S * (0.55 + 0.25 * F / 100)),
    greenSurface: clampUnit(8 + 0.72 * V),
    sustainableMobility: clampUnit(12 + 0.4 * E + 0.38 * B + 0.08 * Math.min(E, B)),
    recycling: clampUnit(6 + 0.5 * Rec + 0.22 * Rsd + 0.18 * Math.min(Rec, Rsd)),
  };
}

export function calculateScore(indicators) {
  return clampUnit(
    (100 - indicators.emissions) * 0.22 +
      indicators.airQuality * 0.16 +
      (100 - indicators.energyConsumption) * 0.16 +
      indicators.renewableEnergy * 0.14 +
      indicators.greenSurface * 0.12 +
      indicators.sustainableMobility * 0.12 +
      indicators.recycling * 0.08
  );
}
