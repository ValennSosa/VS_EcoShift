import { VARIABLE_KEYS } from "../sim/engine.js";

const CONTROLS = [
  { key: "greenSpaces", label: "Espacios verdes", text: "Parques y calles arboladas." },
  {
    key: "electricTransport",
    label: "Transporte eléctrico",
    text: "Reemplazo de flota de combustión. Puede mejorar el aire y aumentar el consumo eléctrico.",
  },
  { key: "solarEnergy", label: "Energía solar", text: "Generación renovable sobre la demanda de la ciudad." },
  { key: "energyEfficiency", label: "Eficiencia energética", text: "Menos energía para el mismo servicio." },
  { key: "wasteManagement", label: "Gestión de residuos", text: "Capacidad de recolección y tratamiento." },
  { key: "bicycleUse", label: "Uso de bicicletas", text: "Participación de la bicicleta en los viajes." },
  { key: "recycling", label: "Reciclaje", text: "Separación de materiales. Necesita un sistema que los recoja." },
];

export function renderControls(container, variables, onInput, onCommit) {
  container.replaceChildren();

  for (const control of CONTROLS) {
    const item = document.createElement("li");
    item.className = "control-row";

    const top = document.createElement("div");
    top.className = "control-row__top";

    const label = document.createElement("label");
    const inputId = `variable-${control.key}`;
    const helpId = `ayuda-${control.key}`;
    label.htmlFor = inputId;
    label.textContent = control.label;

    const output = document.createElement("output");
    output.setAttribute("for", inputId);
    output.textContent = String(variables[control.key]);

    const help = document.createElement("p");
    help.id = helpId;
    help.textContent = control.text;

    const input = document.createElement("input");
    input.id = inputId;
    input.type = "range";
    input.min = "0";
    input.max = "100";
    input.step = "1";
    input.value = String(variables[control.key]);
    input.dataset.variable = control.key;
    input.setAttribute("aria-describedby", helpId);

    input.addEventListener("input", () => {
      output.textContent = input.value;
      onInput(control.key, Number(input.value));
    });
    input.addEventListener("change", () => onCommit());

    top.append(label, output);
    item.append(top, help, input);
    container.append(item);
  }
}

export function syncControls(container, variables) {
  for (const key of VARIABLE_KEYS) {
    const input = container.querySelector(`[data-variable="${key}"]`);
    if (!input) continue;
    input.value = String(variables[key]);
    const output = container.querySelector(`output[for="${input.id}"]`);
    if (output) output.textContent = String(variables[key]);
  }
}
