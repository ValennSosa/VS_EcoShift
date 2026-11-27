import { VARIABLE_KEYS, simulate } from "../sim/engine.js";
import { getBaselineVariables, getVariables, initState, resetVariables, setVariables } from "../state/store.js";
import { initCharts, updateCharts } from "../ui/charts.js";
import { initCity, updateCity } from "../ui/city.js";
import { renderControls, syncControls } from "../ui/controls.js";
import { renderIndicators, updateIndicators, updateSummary } from "../ui/indicators.js";

export async function initSimulator() {
  const bar = document.querySelector("[data-scenario-bar]");
  const controls = document.querySelector("[data-controls]");
  const indicators = document.querySelector("[data-indicators]");
  const score = document.querySelector("[data-score]");
  const summary = document.querySelector("[data-live-summary]");
  const zoneLive = document.querySelector("[data-live-zone]");
  const stage = document.querySelector("[data-city-stage]");
  const zonePanel = document.querySelector("[data-zone-panel]");
  const profileCanvas = document.querySelector("[data-chart-profile]");
  const compareCanvas = document.querySelector("[data-chart-compare]");
  const profileAlt = document.querySelector("[data-chart-profile-alt]");
  const compareAlt = document.querySelector("[data-chart-compare-alt]");
  if (!bar || !controls || !indicators || !score || !summary || !zoneLive || !stage || !zonePanel) return;

  try {
    const response = await fetch("./data/presets.json");
    if (!response.ok) throw new Error("No se pudieron leer los escenarios.");
    const presets = (await response.json()).presets;
    const baselinePreset = presets.find((preset) => preset.id === "ciudad-actual");
    if (!baselinePreset) throw new Error("Falta Ciudad actual.");

    initState(baselinePreset.variables);
    const baselineResult = simulate(getBaselineVariables());

    await initCity({
      stage,
      panel: zonePanel,
      liveRegion: zoneLive,
    });

    initCharts({
      profileCanvas,
      compareCanvas,
      profileText: profileAlt,
      compareText: compareAlt,
    });

    function publish(rawVariables, announce) {
      const result = simulate(rawVariables);
      setVariables(result.variables);
      syncControls(controls, result.variables);
      updateIndicators(indicators, score, result, baselineResult);
      updateCharts(result, baselineResult);
      updateCity(result.variables);
      markSelectedPreset(bar, presets, result.variables);
      if (announce) updateSummary(summary, result, baselineResult);
    }

    renderControls(
      controls,
      getVariables(),
      (key, value) => {
        publish({ ...getVariables(), [key]: value }, false);
      },
      () => updateSummary(summary, simulate(getVariables()), baselineResult)
    );

    renderScenarioBar(bar, presets, () => {
      resetVariables();
      publish(getVariables(), true);
    }, (variables) => publish({ ...variables }, true));

    renderIndicators(indicators);
    publish(getVariables(), false);
  } catch {
    bar.replaceChildren(message("No se pudieron cargar los escenarios de referencia."));
    controls.replaceChildren(messageItem("Los controles no están disponibles."));
    indicators.replaceChildren(messageItem("Las lecturas no están disponibles."));
    stage.replaceChildren(message("No se pudo cargar la ciudad interactiva."));
    score.textContent = "";
    if (compareAlt) compareAlt.textContent = "Los gráficos no están disponibles.";
  }
}

function renderScenarioBar(container, items, onReset, onSelectPreset) {
  container.replaceChildren();

  const label = document.createElement("p");
  label.className = "panel__label";
  label.id = "presets-label";
  label.textContent = "Escenarios predefinidos";

  const group = document.createElement("div");
  group.className = "preset-picker";
  group.setAttribute("role", "group");
  group.setAttribute("aria-labelledby", "presets-label");

  for (const preset of items) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "preset-option";
    button.dataset.preset = preset.id;
    button.textContent = preset.name;
    button.addEventListener("click", () => onSelectPreset(preset.variables));
    group.append(button);
  }

  const reset = document.createElement("button");
  reset.type = "button";
  reset.className = "btn btn--ghost";
  reset.textContent = "Volver a Ciudad actual";
  reset.addEventListener("click", onReset);

  container.append(label, group, reset);
}

function markSelectedPreset(container, presets, variables) {
  for (const preset of presets) {
    const button = container.querySelector(`[data-preset="${preset.id}"]`);
    if (!button) continue;
    const selected = VARIABLE_KEYS.every((key) => variables[key] === preset.variables[key]);
    button.setAttribute("aria-pressed", String(selected));
  }
}

function message(text) {
  const paragraph = document.createElement("p");
  paragraph.textContent = text;
  return paragraph;
}

function messageItem(text) {
  const item = document.createElement("li");
  item.textContent = text;
  return item;
}
