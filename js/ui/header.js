import { NAV } from "../config.js";

export function renderHeader(pageId) {
  const header = document.querySelector("[data-app-header]");
  if (!header) return;

  const links = NAV.map((item) => {
    const current = item.id === pageId ? ' aria-current="page"' : "";
    return `<li><a class="nav-link" href="${item.href}"${current}>${item.label}</a></li>`;
  }).join("");

  header.innerHTML = `
    <div class="container site-header__bar">
      <a class="brand" href="./index.html">
        <span class="brand__mark" aria-hidden="true">
          <svg width="18" height="18" viewBox="0 0 32 32" fill="none">
            <path d="M6 24V12l7-6 7 6v12" stroke="#f8fbf6" stroke-width="2"></path>
            <path d="M20 24c0-6 7-7 7-7s-1 7-7 7z" fill="#c6ef4a"></path>
          </svg>
        </span>
        VS EcoShift
      </a>
      <button class="nav-toggle" type="button" aria-expanded="false" aria-controls="nav-panel">Menú</button>
      <nav id="nav-panel" class="nav-panel" aria-label="Principal">
        <ul class="nav-list">${links}</ul>
        <a class="btn btn--primary nav-cta" href="./simulador.html">Transformá tu ciudad</a>
      </nav>
    </div>
  `;

  const button = header.querySelector(".nav-toggle");
  const panel = header.querySelector(".nav-panel");

  function setOpen(open, restoreFocus) {
    button.setAttribute("aria-expanded", String(open));
    panel.classList.toggle("is-open", open);
    if (open) {
      panel.querySelector("a")?.focus();
    } else if (restoreFocus) {
      button.focus();
    }
  }

  const compactNav = window.matchMedia("(max-width: 61.99rem)");

  button.addEventListener("click", () => {
    if (!compactNav.matches) return;
    setOpen(button.getAttribute("aria-expanded") !== "true", false);
  });

  header.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && compactNav.matches && button.getAttribute("aria-expanded") === "true") {
      setOpen(false, true);
    }
  });

  panel.addEventListener("click", (event) => {
    if (event.target.closest("a")) setOpen(false, false);
  });
}
