import { VARIABLE_KEYS, simulate } from "../sim/engine.js";
import { evaluateFromResults } from "../sim/challenges.js";
import {
  MAX_CUSTOM_SCENARIOS,
  loadPresetIntoDraft,
  saveDraftAsNew,
  saveDraftChanges,
} from "../state/scenarios.js";
import {
  ORIGIN,
  getDraftMeta,
  getBaselineVariables,
  getStorageStatus,
  getVariables,
  initState,
  persistDraftOnly,
  resetDamagedStorage,
  resetVariables,
  setVariables,
} from "../state/store.js";
import { isWriteBlocked } from "../state/persistence.js";

import { initCharts, updateCharts } from "../ui/charts.js";
import { renderChallenges, summarizeChallengeStatus } from "../ui/challenges.js";
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
  const draftPanel = document.querySelector("[data-draft-panel]");
  const storageStatus = document.querySelector("[data-storage-status]");
  const challengesPanel = document.querySelector("[data-challenges-panel]");
  const challengesSummary = document.querySelector("[data-challenges-summary]");
  if (!bar || !controls || !indicators || !score || !summary || !zoneLive || !stage || !zonePanel) return;

  try {
    const response = await fetch("./data/presets.json");
    if (!response.ok) throw new Error("No se pudieron leer los escenarios.");
    const presets = (await response.json()).presets;
    const baselinePreset = presets.find((preset) => preset.id === "ciudad-actual");
    if (!baselinePreset) throw new Error("Falta Ciudad actual.");

    const boot = initState(baselinePreset.variables);
    paintStorageStatus(storageStatus, boot);

    const baselineResult = simulate(getBaselineVariables());

    await initCity({
      stage,
      panel: zonePanel,
      liveRegion: zoneLive,
      variables: getVariables(),
    });

    initCharts({
      profileCanvas,
      compareCanvas,
      profileText: profileAlt,
      compareText: compareAlt,
    });

    function publish(rawVariables, announce, { persist = true } = {}) {
      const result = simulate(rawVariables);
      setVariables(result.variables);
      syncControls(controls, result.variables);
      updateIndicators(indicators, score, result, baselineResult);
      updateCharts(result, baselineResult);
      updateCity(result.variables);
      markSelectedPreset(bar, presets, result.variables);
      if (draftPanel) renderDraftPanel(draftPanel, () => afterDraftAction());
      paintChallenges(result, baselineResult, challengesPanel, challengesSummary);
      if (announce) updateSummary(summary, result, baselineResult);
      if (persist) {
        const saved = persistDraftOnly();
        if (!saved.ok) paintStorageStatus(storageStatus, { message: saved.reason });
      }
      return result;
    }

    function afterDraftAction() {
      publish(getVariables(), true);
      paintStorageStatus(storageStatus, getStorageStatus());
    }

    renderControls(
      controls,
      getVariables(),
      (key, value) => {
        // Solo actualiza el borrador; no muta escenarios persistidos ni el origen.
        publish({ ...getVariables(), [key]: value }, false);
        if (draftPanel) renderDraftPanel(draftPanel, () => afterDraftAction());
      },
      () => updateSummary(summary, simulate(getVariables()), baselineResult)
    );

    renderScenarioBar(
      bar,
      presets,
      () => {
        resetVariables();
        publish(getVariables(), true);
      },
      (preset) => {
        const loaded = loadPresetIntoDraft(preset);
        if (!loaded.ok) {
          paintStorageStatus(storageStatus, { message: loaded.reason });
        }
        publish(getVariables(), true, { persist: false });
        persistDraftOnly();
      }
    );

    renderIndicators(indicators);
    if (draftPanel) renderDraftPanel(draftPanel, () => afterDraftAction());

    applyQueryPreset(presets, () => publish(getVariables(), true));
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

function applyQueryPreset(presets, publish) {
  const params = new URLSearchParams(window.location.search);
  const presetId = params.get("preset");
  if (!presetId) return;
  const preset = presets.find((item) => item.id === presetId);
  if (!preset) return;
  loadPresetIntoDraft(preset);
  publish();
  params.delete("preset");
  const next = `${window.location.pathname}${params.toString() ? `?${params}` : ""}${window.location.hash}`;
  window.history.replaceState({}, "", next);
}

function renderDraftPanel(container, onChanged) {
  const meta = getDraftMeta();
  container.replaceChildren();

  const label = document.createElement("p");
  label.className = "panel__label";
  label.textContent = "Borrador";

  const status = document.createElement("p");
  status.className = "draft-status";
  status.textContent = describeOrigin(meta);

  const note = document.createElement("p");
  note.className = "draft-note";
  note.textContent =
    "Los controles solo cambian este borrador. Los escenarios guardados no se modifican hasta que uses Guardar.";

  const actions = document.createElement("div");
  actions.className = "cluster draft-actions";

  const saveNew = document.createElement("button");
  saveNew.type = "button";
  saveNew.className = "btn btn--primary";
  saveNew.textContent = "Guardar como nuevo";
  saveNew.addEventListener("click", () => {
    const name = window.prompt("Nombre del escenario nuevo");
    if (name == null) return;
    const result = saveDraftAsNew(name);
    if (!result.ok) {
      window.alert(result.reason);
      return;
    }
    onChanged();
  });

  actions.append(saveNew);

  if (meta.origin === ORIGIN.CUSTOM && meta.sourceId) {
    const saveChanges = document.createElement("button");
    saveChanges.type = "button";
    saveChanges.className = "btn btn--ghost";
    saveChanges.textContent = "Guardar cambios";
    saveChanges.addEventListener("click", () => {
      const result = saveDraftChanges();
      if (!result.ok) {
        window.alert(result.reason);
        onChanged();
        return;
      }
      onChanged();
    });
    actions.append(saveChanges);
  }

  const manage = document.createElement("a");
  manage.className = "btn btn--ghost";
  manage.href = "./escenarios.html";
  manage.textContent = "Gestionar escenarios";
  actions.append(manage);

  const limit = document.createElement("p");
  limit.className = "draft-note";
  limit.textContent = `Podés guardar hasta ${MAX_CUSTOM_SCENARIOS} escenarios propios.`;

  container.append(label, status, note, actions, limit);
}

function describeOrigin(meta) {
  if (meta.origin === ORIGIN.CUSTOM) {
    return `Origen: escenario propio «${meta.sourceName || meta.sourceId}».`;
  }
  if (meta.origin === ORIGIN.PRESET) {
    return `Origen: preset «${meta.sourceName || meta.sourceId}» (solo lectura; no se puede sobrescribir).`;
  }
  return "Origen: borrador nuevo, sin vínculo a un escenario guardado.";
}

function paintStorageStatus(node, info) {
  if (!node) return;
  const message = info?.message || "";
  node.replaceChildren();
  if (!message) {
    node.hidden = true;
    return;
  }
  node.hidden = false;
  const text = document.createElement("span");
  text.textContent = message;
  node.append(text);
  if (isWriteBlocked()) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "btn btn--ghost";
    button.textContent = "Restablecer almacenamiento";
    button.addEventListener("click", () => {
      const result = resetDamagedStorage();
      paintStorageStatus(node, {
        message: result.ok
          ? "Almacenamiento restablecido. Se guardó un respaldo local si fue posible."
          : result.reason,
      });
    });
    node.append(button);
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
    button.addEventListener("click", () => onSelectPreset(preset));
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
  const meta = getDraftMeta();
  for (const preset of presets) {
    const button = container.querySelector(`[data-preset="${preset.id}"]`);
    if (!button) continue;
    const byOrigin = meta.origin === ORIGIN.PRESET && meta.sourceId === preset.id;
    const byValues = VARIABLE_KEYS.every((key) => variables[key] === preset.variables[key]);
    button.setAttribute("aria-pressed", String(byOrigin || (meta.origin === ORIGIN.NEW && byValues && preset.id === "ciudad-actual")));
  }
}

function paintChallenges(result, baselineResult, panel, summaryNode) {
  if (!panel) return;
  const evaluations = evaluateFromResults(result, baselineResult);
  if (summaryNode) summaryNode.textContent = summarizeChallengeStatus(evaluations);
  renderChallenges(panel, evaluations, { compact: true, headingId: "desafios-sim-titulo" });
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
