import { NAV, SITE } from "../config.js";

export function renderFooter() {
  const footer = document.querySelector("[data-app-footer]");
  if (!footer) return;

  const links = NAV.map((item) => `<li><a href="${item.href}">${item.label}</a></li>`).join("");

  footer.innerHTML = `
    <div class="container">
      <div class="site-footer__grid">
        <div>
          <p class="site-footer__brand">${SITE.name}</p>
          <p>Simulador educativo de sostenibilidad urbana. Una ciudad ficticia para explorar decisiones, no un medidor de datos ambientales reales.</p>
        </div>
        <nav aria-label="Pie">
          <ul class="site-footer__links">${links}</ul>
        </nav>
      </div>
      <p class="disclaimer">${SITE.disclaimer}</p>
      <p class="site-footer__legal">© 2026 ${SITE.name}</p>
    </div>
  `;
}
