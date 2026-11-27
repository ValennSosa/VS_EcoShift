import { resolveCityViewMode, detectWebGL } from "../city3d/detect.js";
import { VARIABLE_KEYS } from "../sim/engine.js";
import { ZONE_DEFINITIONS, calculateZoneStates, getZoneState } from "../sim/zones.js";

const LEVEL_LABELS = {
  low: "Bajo",
  medium: "Medio",
  high: "Alto",
};

let root = null;
let panel = null;
let live = null;
let chipBox = null;
let selectedId = null;
let latestStates = null;
let onSelectCallback = null;
let labelResizeObserver = null;
let viewMode = "svg";
let city3d = null;
let stageRoot = null;
let pageHideBound = null;

const CITY_VIEWBOX_WIDTH = 920;
const LABEL_SCREEN_PX = 14;

export async function initCity({ stage, panel: panelNode, liveRegion, onSelect }) {
  if (!stage || !panelNode) return null;

  disposeCityView();

  panel = panelNode;
  live = liveRegion || null;
  onSelectCallback = typeof onSelect === "function" ? onSelect : null;
  stageRoot = stage;
  selectedId = null;
  latestStates = null;
  root = null;
  city3d = null;

  stage.replaceChildren();

  const shell = document.createElement("div");
  shell.className = "city-view";

  const toolbar = document.createElement("div");
  toolbar.className = "city-view__toolbar";

  const modeNote = document.createElement("p");
  modeNote.className = "city-view__mode";

  const resetBtn = document.createElement("button");
  resetBtn.type = "button";
  resetBtn.className = "city-view__reset";
  resetBtn.textContent = "Restablecer vista";
  resetBtn.hidden = true;
  resetBtn.addEventListener("click", () => {
    city3d?.resetCamera?.();
  });

  toolbar.append(modeNote, resetBtn);

  const viewport = document.createElement("div");
  viewport.className = "city-view__viewport";

  chipBox = document.createElement("div");
  chipBox.className = "city-zone-chips";
  chipBox.setAttribute("role", "group");
  chipBox.setAttribute("aria-label", "Zonas de la ciudad");

  const caption = document.createElement("p");
  caption.className = "city-stage__caption";
  caption.textContent =
    "Elegí una zona en la lista (o en el mapa SVG). La selección no modifica los controles ni el resultado del motor.";

  shell.append(toolbar, viewport, chipBox, caption);
  stage.append(shell);

  const preferred = resolveCityViewMode();
  let mounted = false;

  if (preferred === "3d" && detectWebGL()) {
    try {
      // Interruptor de prueba: localStorage vs-ecoshift:city3d-fail=1
      let forceFail = false;
      try {
        forceFail = window.localStorage.getItem("vs-ecoshift:city3d-fail") === "1";
      } catch {
        forceFail = false;
      }
      if (forceFail) throw new Error("Fallo forzado de inicialización 3D");
      const { createCity3D } = await import("../city3d/index.js");
      city3d = createCity3D({ host: viewport });
      viewMode = "3d";
      modeNote.textContent = "Vista 3D de la ciudad";
      resetBtn.hidden = false;
      mounted = true;
    } catch (error) {
      console.warn("No se pudo iniciar la ciudad 3D; se usa el SVG.", error);
      city3d = null;
    }
  }

  if (!mounted) {
    await mountSvgInto(viewport);
    viewMode = "svg";
    modeNote.textContent =
      preferred === "3d"
        ? "Vista SVG (fallback: WebGL no disponible o fallo 3D)"
        : "Vista SVG";
    resetBtn.hidden = true;
  }

  mountZoneChips(viewMode === "svg");
  renderPanel(null);

  pageHideBound = () => disposeCityView();
  window.addEventListener("pagehide", pageHideBound, { once: true });

  return { selectZone, updateCity, getSelectedId: () => selectedId, getViewMode: () => viewMode };
}

export function updateCity(variables) {
  if (!stageRoot) return null;
  latestStates = calculateZoneStates(variables);

  if (viewMode === "svg" && root) {
    for (const key of VARIABLE_KEYS) {
      root.setAttribute(`data-v-${toKebab(key)}`, latestStates.variableLevels[key]);
    }
    for (const zone of latestStates.zones) {
      const node = root.querySelector(`[data-zone="${zone.id}"]`);
      if (!node) continue;
      node.setAttribute("data-level", zone.level);
    }
  }

  if (viewMode === "3d" && city3d) {
    city3d.applyVisualState(latestStates);
  }

  if (selectedId) renderPanel(getZoneState(latestStates, selectedId));
  return latestStates;
}

export function selectZone(zoneId) {
  if (!ZONE_DEFINITIONS.some((zone) => zone.id === zoneId)) return;
  if (viewMode === "svg" && !root) return;

  selectedId = zoneId;

  for (const definition of ZONE_DEFINITIONS) {
    const chip = chipBox?.querySelector(`[data-zone-target="${definition.id}"]`);
    const active = definition.id === zoneId;
    if (chip) chip.setAttribute("aria-pressed", String(active));
    if (root) {
      const node = root.querySelector(`[data-zone="${definition.id}"]`);
      node?.classList.toggle("is-selected", active);
    }
  }

  const state = latestStates ? getZoneState(latestStates, zoneId) : null;
  renderPanel(state);

  if (live && state) {
    live.textContent = `Zona seleccionada: ${state.name}. Nivel ${LEVEL_LABELS[state.level]}.`;
  }

  onSelectCallback?.(zoneId);
}

function mountZoneChips(wireSvgHits) {
  if (!chipBox) return;
  chipBox.replaceChildren();

  for (const definition of ZONE_DEFINITIONS) {
    if (wireSvgHits && root) {
      const zone = root.querySelector(`[data-zone="${definition.id}"]`);
      if (zone) {
        zone.classList.add("city-zone");
        zone.style.cursor = "pointer";
        zone.addEventListener("click", () => selectZone(definition.id));
      }
    }

    const chip = document.createElement("button");
    chip.type = "button";
    chip.className = "city-zone-chip";
    chip.dataset.zoneTarget = definition.id;
    chip.setAttribute("aria-pressed", "false");
    chip.textContent = definition.name;
    chip.addEventListener("click", () => selectZone(definition.id));
    chipBox.append(chip);
  }
}

async function mountSvgInto(viewport) {
  const response = await fetch("./assets/city/city.svg");
  if (!response.ok) throw new Error("No se pudo cargar la ciudad.");
  const markup = await response.text();

  viewport.replaceChildren();
  const frame = document.createElement("div");
  frame.className = "city-canvas-wrap";
  frame.innerHTML = markup;

  const svg = frame.querySelector("svg");
  if (!svg) throw new Error("El SVG de la ciudad es inválido.");

  svg.querySelector("style")?.remove();
  svg.removeAttribute("role");
  svg.removeAttribute("aria-labelledby");
  svg.setAttribute("aria-hidden", "true");
  svg.classList.add("city-canvas");
  root = svg;
  viewport.append(frame);

  syncZoneLabelSizes();
  if (typeof ResizeObserver === "function") {
    labelResizeObserver?.disconnect();
    labelResizeObserver = new ResizeObserver(() => syncZoneLabelSizes());
    labelResizeObserver.observe(svg);
  } else {
    window.addEventListener("resize", syncZoneLabelSizes);
  }
}

function disposeCityView() {
  if (pageHideBound) {
    window.removeEventListener("pagehide", pageHideBound);
    pageHideBound = null;
  }
  city3d?.dispose?.();
  city3d = null;
  labelResizeObserver?.disconnect();
  labelResizeObserver = null;
  window.removeEventListener("resize", syncZoneLabelSizes);
  root = null;
  chipBox = null;
  stageRoot = null;
  viewMode = "svg";
}

function renderPanel(zone) {
  if (!panel) return;

  if (!zone) {
    panel.innerHTML = `
      <p class="panel__label">Zona</p>
      <h2 id="zona-titulo">Explorá la ciudad</h2>
      <p>Seleccioná una zona en el mapa para ver qué variables la afectan y cómo se lee su nivel visual.</p>
      <p class="disclaimer">La selección es solo consulta: no cambia los controles ni el resultado del motor.</p>
    `;
    return;
  }

  const variables = zone.variables
    .map(
      (item) => `
      <li>
        <div class="zone-metric">
          <strong>${escapeHtml(item.label)}</strong>
          <span>${item.value}</span>
        </div>
        <p>Nivel ${escapeHtml(LEVEL_LABELS[item.level])}</p>
      </li>`
    )
    .join("");

  panel.innerHTML = `
    <p class="panel__label">Zona seleccionada</p>
    <h2 id="zona-titulo">${escapeHtml(zone.name)}</h2>
    <p>${escapeHtml(zone.description)}</p>
    <p class="zone-level-pill" data-level="${zone.level}">Nivel visual: ${escapeHtml(LEVEL_LABELS[zone.level])}</p>
    <h3 class="zone-subtitle">Variables que influyen</h3>
    <ul class="quiet-list zone-metrics">${variables}</ul>
    <h3 class="zone-subtitle">Cómo la afectan las decisiones</h3>
    <p>${escapeHtml(zone.effect)}</p>
  `;
}

function syncZoneLabelSizes() {
  if (!root) return;
  const width = root.getBoundingClientRect().width;
  if (!width) return;
  const scale = width / CITY_VIEWBOX_WIDTH;
  const fontSize = Math.max(18, Math.min(34, LABEL_SCREEN_PX / scale));
  const strokeWidth = Math.max(3, Math.min(7, 5 * (28 / fontSize)));
  for (const label of root.querySelectorAll(".zone-label")) {
    label.setAttribute("font-size", fontSize.toFixed(2));
    label.setAttribute("stroke-width", strokeWidth.toFixed(2));
  }
}

function toKebab(value) {
  return value.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`);
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}
