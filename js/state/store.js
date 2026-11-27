/**
 * Estado en memoria del borrador. No escribe en localStorage.
 * Guardar, editar y comparar escenarios propios corresponde a una etapa posterior.
 */

function copyVariables(variables) {
  return { ...variables };
}

let baseline = null;
let current = null;

export function initState(initialVariables) {
  baseline = copyVariables(initialVariables);
  current = copyVariables(initialVariables);
}

export function getVariables() {
  return copyVariables(current);
}

export function getBaselineVariables() {
  return copyVariables(baseline);
}

export function setVariables(variables) {
  current = copyVariables(variables);
}

export function resetVariables() {
  current = copyVariables(baseline);
}
