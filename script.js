/* script.js (entry point)
 * Assigned to: TBD (JS bundle owner)
 * Last updated: 2026-03-13
 */

(() => {
  "use strict";

  document.addEventListener("DOMContentLoaded", () => {
    window.LMS?.ensureDefaultAdmin?.();
    if (window.LMS?.guardRoutes?.()) return;
    window.LMS?.initAuthPage?.();
    window.LMS?.initDashboardPages?.();

    // Landing page: add a small click animation before navigation.
    if (document.body.classList.contains("landing-page")) {
      document.addEventListener("click", (e) => {
        const a = e.target?.closest?.("a.landing-btn");
        if (!a) return;

        const href = String(a.getAttribute("href") || "").trim();
        if (!href || href.startsWith("#")) return;
        if (a.hasAttribute("download")) return;
        if (a.getAttribute("target") === "_blank") return;
        if (e.defaultPrevented) return;
        if (e.button && e.button !== 0) return;
        if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;

        const reduceMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;
        if (reduceMotion) return;

        e.preventDefault();
        a.classList.add("is-clicked");
        document.body.classList.add("is-navigating");
        window.setTimeout(() => {
          window.location.href = href;
        }, 180);
      });
    }
  });
})();
