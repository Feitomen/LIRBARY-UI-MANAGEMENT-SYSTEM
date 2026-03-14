/* lms.core.js
 * Assigned to: TBD (Core utilities / storage / toast)
 * Last updated: 2026-03-13
 */

(() => {
  "use strict";

  const LMS = (window.LMS ||= {});

  LMS.getJson = function getJson(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      if (raw == null) return fallback;
      const parsed = JSON.parse(raw);
      return parsed ?? fallback;
    } catch {
      return fallback;
    }
  };

  LMS.setJson = function setJson(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
  };

  LMS.getUsers = function getUsers() {
    return LMS.getJson("users", []);
  };

  LMS.setUsers = function setUsers(users) {
    LMS.setJson("users", users);
  };

  LMS.getLoggedUser = function getLoggedUser() {
    return LMS.getJson("loggedInUser", null);
  };

  LMS.setLoggedUser = function setLoggedUser(user) {
    LMS.setJson("loggedInUser", user);
  };

  LMS.clearSession = function clearSession() {
    localStorage.removeItem("loggedInUser");
  };

  LMS.qs = function qs(selector, root = document) {
    return root.querySelector(selector);
  };

  LMS.qsa = function qsa(selector, root = document) {
    return Array.from(root.querySelectorAll(selector));
  };

  function ensureToastEl() {
    let toast = LMS.qs(".toast");
    if (toast) return toast;
    toast = document.createElement("div");
    toast.className = "toast";
    toast.setAttribute("role", "status");
    toast.setAttribute("aria-live", "polite");
    document.body.appendChild(toast);
    return toast;
  }

  let toastTimer = null;
  LMS.toast = function toast(message) {
    const el = ensureToastEl();
    el.textContent = message;
    el.classList.add("show");
    if (toastTimer) window.clearTimeout(toastTimer);
    toastTimer = window.setTimeout(() => el.classList.remove("show"), 2600);
  };

  LMS.getCurrentPage = function getCurrentPage() {
    const path = (window.location.pathname || "").split("/").pop() || "";
    return String(path).toLowerCase();
  };

  LMS.redirectToHome = function redirectToHome(user) {
    const role = String(user?.role || "").toLowerCase();
    if (role === "admin") window.location.href = "dashboard.html";
    else window.location.href = "student.html";
  };

  LMS.guardRoutes = function guardRoutes() {
    const page = LMS.getCurrentPage();
    const user = LMS.getLoggedUser();

    const isLanding = page === "" || page === "index.html";
    const isAuth = page === "auth.html";
    const isPublic = isLanding || isAuth;
    const isAdminOnly = page === "dashboard.html" || page === "add-book.html" || page === "users.html";
    const isStudentPage = page === "student.html";

    if (user && isAuth) {
      // If already logged in, skip the auth page.
      LMS.redirectToHome(user);
      return true;
    }

    if (!user && !isPublic) {
      // Always start at the landing page when unauthenticated.
      window.location.href = "index.html";
      return true;
    }

    if (user && isAdminOnly) {
      const role = String(user.role || "").toLowerCase();
      if (role !== "admin") {
        window.location.href = "student.html";
        return true;
      }
    }

    if (user && isStudentPage) {
      // Student page is allowed for Students (and optionally Admins).
      return false;
    }

    return false;
  };

  LMS.ensureDefaultAdmin = function ensureDefaultAdmin() {
    const users = LMS.getUsers();
    const hasAdmin = users.some((u) => String(u?.role || "").toLowerCase() === "admin");
    if (hasAdmin) return;
    users.push({
      username: "admin",
      password: "admin123",
      role: "Admin",
      program: "College Admin",
    });
    LMS.setUsers(users);
  };
})();
