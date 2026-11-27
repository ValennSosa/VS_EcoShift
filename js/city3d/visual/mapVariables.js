/**
 * Mapeo determinista variables del simulador → intensidades visuales 0..1.
 * Sin fórmulas de indicadores; solo representación.
 */

import { INITIAL_VARIABLES, normalizeVariables } from "../../sim/engine.js";
import { levelFromValue } from "../../sim/zones.js";

/**
 * @param {object} variables
 * @returns {{
 *   variables: Record<string, number>,
 *   levels: Record<string, string>,
 *   vegetation: number,
 *   electricFleet: number,
 *   solar: number,
 *   efficiency: number,
 *   waste: number,
 *   bicycle: number,
 *   recycling: number,
 * }}
 */
export function mapVariablesToVisual(variables) {
  const normalized = normalizeVariables(variables);
  const t = (key) => normalized[key] / 100;

  return {
    variables: { ...normalized },
    levels: Object.fromEntries(
      Object.keys(INITIAL_VARIABLES).map((key) => [key, levelFromValue(normalized[key])])
    ),
    // Curvas suaves: mínimo visible + rango perceptible
    vegetation: 0.18 + t("greenSpaces") * 0.82,
    electricFleet: t("electricTransport"),
    solar: 0.08 + t("solarEnergy") * 0.92,
    efficiency: 0.12 + t("energyEfficiency") * 0.88,
    waste: 0.1 + t("wasteManagement") * 0.9,
    bicycle: 0.1 + t("bicycleUse") * 0.9,
    recycling: 0.1 + t("recycling") * 0.9,
  };
}

export { INITIAL_VARIABLES };
