import { simulate } from "../sim/engine.js";
import {
  MAX_CUSTOM_SCENARIOS,
  compareCustomScenarios,
  deleteScenario,
  listCustomScenarios,
  loadCustomIntoDraft,
  renameScenario,
} from "../state/scenarios.js";
import { getStorageStatus, initState } from "../state/store.js";

const numberFormat = new Intl.NumberFormat("es-AR", {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});

export async function initScenariosPage() {
  const presetsRoot = document.querySelector("[data-presets-list]");
  const customRoot = document.querySelector("[data-custom-scenarios]");
  const compareRoot = document.querySelector("[data-compare-panel]");
  const statusRoot = document.querySelector("[data-storage-status]");
  if (!presetsRoot || !customRoot || !compareRoot) return;

  let presets = [];
  try {
    const response = await fetch("./data/presets.json");
    if (!response.ok) throw new Error("presets");
    presets = (await response.json()).presets || [];
  } catch {
    presetsRoot.innerHTML = `<p class="status-note">No se pudieron cargar los presets de referencia.</p>`;
    return;
  }

  const baseline = presets.find((item) => item.id === "ciudad-actual");
  if (!baseline) {
    presetsRoot.innerHTML = `<p class="status-note">Falta el preset Ciudad actual.</p>`;
    return;
  }

  const boot = initState(baseline.variables);
  paintStatus(statusRoot, boot);

  renderPresets(presetsRoot, presets);
  renderCustom(customRoot, compareRoot);
}

function paintStatus(node, boot) {
  if (!node) return;
  const storage = getStorageStatus();
  const parts = [];
  if (boot?.message) parts.push(boot.message);
  else if (storage.message) parts.push(storage.message);
  if (boot?.warnings?.length) parts.push(boot.warnings.join(" "));
  if (!parts.length) {
    node.hidden = true;
    node.textContent = "";
    return;
  }
  node.hidden = false;
  node.textContent = parts.join(" ");
}

function renderPresets(root, presets) {
  root.replaceChildren();
  const grid = document.createElement("div");
  grid.className = "preset-grid";

  for (const preset of presets) {
    const card = document.createElement("article");
    card.className = `preset-card${preset.id === "ciudad-actual" ? " preset-card--base" : ""}`;
    const title = document.createElement("h3");
    title.textContent = preset.name;
    const text = document.createElement("p");
    text.textContent = presetDescription(preset.id);
    const actions = document.createElement("p");
    actions.className = "cluster";
    const link = document.createElement("a");
    link.className = "btn btn--ghost";
    link.href = `./simulador.html?preset=${encodeURIComponent(preset.id)}`;
    link.textContent = "Cargar en el simulador";
    actions.append(link);
    card.append(title, text, actions);
    grid.append(card);
  }

  root.append(grid);
}

function renderCustom(root, compareRoot) {
  const scenarios = listCustomScenarios();
  root.replaceChildren();

  const heading = document.createElement("div");
  heading.className = "scenarios-head";
  const title = document.createElement("h2");
  title.id = "propios-titulo";
  title.textContent = "Escenarios propios";
  const count = document.createElement("p");
  count.className = "scenarios-count";
  count.textContent = `${scenarios.length} de ${MAX_CUSTOM_SCENARIOS}`;
  heading.append(title, count);
  root.append(heading);

  if (!scenarios.length) {
    const empty = document.createElement("div");
    empty.className = "empty-state";
    empty.innerHTML = `
      <p>Todavía no hay escenarios guardados. Creá uno desde el borrador del simulador con «Guardar como nuevo».</p>
      <p class="cluster">
        <a class="btn btn--primary" href="./simulador.html">Ir al simulador</a>
      </p>`;
    root.append(empty);
    compareRoot.replaceChildren();
    compareRoot.hidden = true;
    compareRoot.dataset.ready = "false";
    return;
  }

  const cue = document.createElement("p");
  cue.className = "compare-cue";
  cue.innerHTML =
    `Marcá hasta dos escenarios y usá <a href="#comparar-propios-titulo">Comparar selección</a> para ver el contraste educativo.`;
  root.append(cue);

  const list = document.createElement("ul");
  list.className = "scenario-list";

  for (const scenario of scenarios) {
    const item = document.createElement("li");
    item.className = "scenario-card";
    item.dataset.scenarioId = scenario.id;

    const top = document.createElement("div");
    top.className = "scenario-card__top";
    const name = document.createElement("h3");
    name.textContent = scenario.name;
    const meta = document.createElement("p");
    meta.className = "scenario-card__meta";
    meta.textContent = `Actualizado ${formatDate(scenario.updatedAt)}`;
    top.append(name, meta);

    const score = simulate(scenario.variables).score;
    const scoreLine = document.createElement("p");
    scoreLine.className = "scenario-card__score";
    scoreLine.textContent = `Valoración educativa: ${numberFormat.format(score)}`;

    const comparePick = document.createElement("label");
    comparePick.className = "scenario-compare-pick";
    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.name = "compare";
    checkbox.value = scenario.id;
    checkbox.addEventListener("change", () => syncCompareSelection(compareRoot));
    comparePick.append(checkbox, document.createTextNode(" Comparar"));

    const actions = document.createElement("div");
    actions.className = "cluster scenario-card__actions";

    const loadBtn = document.createElement("button");
    loadBtn.type = "button";
    loadBtn.className = "btn btn--primary";
    loadBtn.textContent = "Cargar";
    loadBtn.addEventListener("click", () => {
      const result = loadCustomIntoDraft(scenario.id);
      if (!result.ok) {
        window.alert(result.reason);
        return;
      }
      window.location.href = "./simulador.html";
    });

    const renameBtn = document.createElement("button");
    renameBtn.type = "button";
    renameBtn.className = "btn btn--ghost";
    renameBtn.textContent = "Renombrar";
    renameBtn.addEventListener("click", () => {
      const nextName = window.prompt("Nuevo nombre del escenario", scenario.name);
      if (nextName == null) return;
      const result = renameScenario(scenario.id, nextName);
      if (!result.ok) {
        window.alert(result.reason);
        return;
      }
      renderCustom(root, compareRoot);
    });

    const deleteBtn = document.createElement("button");
    deleteBtn.type = "button";
    deleteBtn.className = "btn btn--ghost";
    deleteBtn.textContent = "Eliminar";
    deleteBtn.addEventListener("click", () => {
      if (!window.confirm(`¿Eliminar «${scenario.name}»? El borrador del simulador no se reinicia.`)) return;
      const result = deleteScenario(scenario.id);
      if (!result.ok) {
        window.alert(result.reason);
        return;
      }
      renderCustom(root, compareRoot);
    });

    const resultLink = document.createElement("a");
    resultLink.className = "btn btn--ghost";
    resultLink.href = `./resultado.html?scenario=${encodeURIComponent(scenario.id)}`;
    resultLink.textContent = "Ver resultado";

    actions.append(comparePick, loadBtn, resultLink, renameBtn, deleteBtn);
    item.append(top, scoreLine, actions);
    list.append(item);
  }

  root.append(list);
  compareRoot.hidden = false;
  ensureCompareShell(compareRoot);
  syncCompareSelection(compareRoot);
}

function ensureCompareShell(root) {
  if (root.dataset.ready === "true") return;
  root.dataset.ready = "true";
  root.innerHTML = `
    <h2 id="comparar-propios-titulo">Comparar escenarios propios</h2>
    <p>Elegí hasta dos escenarios de la lista. La comparación usa el motor y no modifica el borrador ni lo guardado.</p>
    <div class="cluster">
      <button type="button" class="btn btn--primary" data-run-compare>Comparar selección</button>
      <button type="button" class="btn btn--ghost" data-clear-compare>Limpiar</button>
    </div>
    <div data-compare-result class="compare-result" hidden></div>
  `;

  root.querySelector("[data-run-compare]").addEventListener("click", () => {
    const selected = [...root.ownerDocument.querySelectorAll('input[name="compare"]:checked')].map((input) => input.value);
    const out = root.querySelector("[data-compare-result]");
    if (selected.length !== 2) {
      out.hidden = false;
      out.innerHTML = `<p class="status-note">Seleccioná exactamente dos escenarios propios.</p>`;
      return;
    }
    const comparison = compareCustomScenarios(selected[0], selected[1]);
    if (!comparison.ok) {
      out.hidden = false;
      out.innerHTML = `<p class="status-note">${escapeHtml(comparison.reason)}</p>`;
      return;
    }
    out.hidden = false;
    out.innerHTML = renderComparisonMarkup(comparison);
  });

  root.querySelector("[data-clear-compare]").addEventListener("click", () => {
    for (const input of root.ownerDocument.querySelectorAll('input[name="compare"]')) {
      input.checked = false;
    }
    const out = root.querySelector("[data-compare-result]");
    out.hidden = true;
    out.replaceChildren();
    syncCompareSelection(root);
  });
}

function syncCompareSelection(compareRoot) {
  const checked = [...document.querySelectorAll('input[name="compare"]:checked')];
  if (checked.length > 2) {
    checked[checked.length - 1].checked = false;
  }
  const enabled = [...document.querySelectorAll('input[name="compare"]:not(:checked)')];
  const atLimit = document.querySelectorAll('input[name="compare"]:checked').length >= 2;
  for (const input of enabled) input.disabled = atLimit;
  if (!compareRoot) return;
}

function renderComparisonMarkup(comparison) {
  const { left, right, rows, summary } = comparison;
  const rowsHtml = rows
    .map((row) => {
      return `<tr>
        <th scope="row">${escapeHtml(row.label)}</th>
        <td>${escapeHtml(row.displayBaseline)}</td>
        <td>${escapeHtml(row.displayCurrent)}</td>
        <td><span class="reading-change reading-change--${row.change.status}">${escapeHtml(row.changeText)}</span></td>
      </tr>`;
    })
    .join("");

  return `
    <p class="compare-summary">${escapeHtml(summary.text)}</p>
    <p class="score-line">${escapeHtml(left.name)}: valoración ${numberFormat.format(left.result.score)} · ${escapeHtml(right.name)}: valoración ${numberFormat.format(right.result.score)}</p>
    <div class="table-wrap">
      <table class="compare-table">
        <thead>
          <tr>
            <th scope="col">Indicador</th>
            <th scope="col">${escapeHtml(left.name)}</th>
            <th scope="col">${escapeHtml(right.name)}</th>
            <th scope="col">Lectura</th>
          </tr>
        </thead>
        <tbody>${rowsHtml}</tbody>
      </table>
    </div>
  `;
}

function presetDescription(id) {
  switch (id) {
    case "ciudad-actual":
      return "Punto de partida y referencia de todas las comparaciones.";
    case "ciudad-sostenible":
      return "Equilibra territorio, energía, movilidad y materiales.";
    case "ciudad-tecnologica":
      return "Prioriza transporte eléctrico, solar y eficiencia.";
    case "ciudad-verde":
      return "Prioriza parques, bicicleta y recuperación de materiales.";
    default:
      return "Preset de referencia inmutable.";
  }
}

function formatDate(value) {
  try {
    return new Intl.DateTimeFormat("es-AR", {
      dateStyle: "short",
      timeStyle: "short",
    }).format(value);
  } catch {
    return "—";
  }
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}
