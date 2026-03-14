/* lms.auth.js
 * Assigned to: TBD (Login / Register behavior)
 * Last updated: 2026-03-13
 */

(() => {
  "use strict";

  const LMS = window.LMS;
  if (!LMS) return;

  function setRoleInSection(sectionEl, role) {
    LMS.qsa(".role-btn", sectionEl).forEach((b) => b.classList.remove("active"));
    const btn = LMS.qs(`.role-btn[data-role="${role}"]`, sectionEl);
    if (btn) btn.classList.add("active");

    const hidden = LMS.qs('input[type="hidden"]', sectionEl);
    if (hidden) hidden.value = role;
  }

  function initPasswordToggles() {
    LMS.qsa("[data-toggle-password]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const inputId = btn.getAttribute("data-toggle-password");
        const input = inputId ? document.getElementById(inputId) : null;
        if (!input) return;
        const nextType = input.type === "password" ? "text" : "password";
        input.type = nextType;
        btn.textContent = nextType === "password" ? "Show" : "Hide";
      });
    });
  }

  LMS.initAuthPage = function initAuthPage() {
    const loginForm = document.getElementById("loginForm");
    const registerForm = document.getElementById("registerForm");
    if (!loginForm || !registerForm) return;

    const loginSection = document.getElementById("loginSection");
    const registerSection = document.getElementById("registerSection");
    const showRegister = document.getElementById("showRegister");
    const showLogin = document.getElementById("showLogin");

    const loginUsername = document.getElementById("loginUsername");
    const loginPassword = document.getElementById("loginPassword");
    const loginRole = document.getElementById("loginRole");

    const regUsername = document.getElementById("regUsername");
    const programInput = document.getElementById("program");
    const regPassword = document.getElementById("regPassword");
    const confirmPassword = document.getElementById("confirmPassword");
    const registerRole = document.getElementById("registerRole");

    if (!loginSection || !registerSection) return;

    showRegister?.addEventListener("click", () => {
      loginSection.classList.remove("active");
      registerSection.classList.add("active");
    });

    showLogin?.addEventListener("click", () => {
      registerSection.classList.remove("active");
      loginSection.classList.add("active");
    });

    LMS.qsa(".form-section").forEach((sectionEl) => {
      LMS.qsa(".role-btn", sectionEl).forEach((btn) => {
        btn.addEventListener("click", () => {
          const role = btn.getAttribute("data-role") || "";
          if (!role) return;
          setRoleInSection(sectionEl, role);
        });
      });
    });

    initPasswordToggles();

    const strengthBar = LMS.qs(".strength-bar", registerSection);
    const strengthText = LMS.qs(".strength-text", registerSection);
    regPassword?.addEventListener("input", () => {
      if (!strengthBar) return;
      const val = regPassword.value || "";
      let strength = 0;

      if (val.length >= 8) strength++;
      if (/[A-Z]/.test(val)) strength++;
      if (/[0-9]/.test(val)) strength++;
      if (/[^A-Za-z0-9]/.test(val)) strength++;

      const styles = [
        { width: "25%", background: "#ef4444", label: "Weak" },
        { width: "50%", background: "#f97316", label: "Fair" },
        { width: "75%", background: "#eab308", label: "Good" },
        { width: "100%", background: "#22c55e", label: "Strong" },
      ];
      const pick = styles[Math.max(0, Math.min(3, strength - 1))] || styles[0];
      strengthBar.style.cssText = `width:${pick.width};background:${pick.background};`;
      if (strengthText) strengthText.textContent = `Password strength: ${pick.label}`;
    });

    registerForm.addEventListener("submit", (e) => {
      e.preventDefault();

      const username = (regUsername?.value || "").trim();
      const program = (programInput?.value || "").trim();
      const password = regPassword?.value || "";
      const confirm = confirmPassword?.value || "";
      const role = "Student";

      if (!username) return LMS.toast("Please enter a username / student ID.");
      if (!program) return LMS.toast("Please enter your program / section.");
      if (password.length < 6) return LMS.toast("Password must be at least 6 characters.");
      if (password !== confirm) return LMS.toast("Passwords do not match.");

      const users = LMS.getUsers();
      if (users.find((u) => u.username === username)) return LMS.toast("User already exists.");

      users.push({ username, password, role, program });
      LMS.setUsers(users);

      registerForm.reset();
      setRoleInSection(registerSection, "");
      LMS.toast("Registration successful. You can now log in.");
      showLogin?.click();
    });

    loginForm.addEventListener("submit", (e) => {
      e.preventDefault();
      const username = (loginUsername?.value || "").trim();
      const password = loginPassword?.value || "";
      const role = loginRole?.value || "";

      if (!role) return LMS.toast("Please select a role.");
      if (!username || !password) return LMS.toast("Please enter your username and password.");

      const users = LMS.getUsers();
      const user = users.find(
        (u) => u.username === username && u.password === password && u.role === role
      );
      if (!user) return LMS.toast("Invalid credentials.");

      LMS.setLoggedUser(user);
      LMS.redirectToHome?.(user);
    });
  };
})();
