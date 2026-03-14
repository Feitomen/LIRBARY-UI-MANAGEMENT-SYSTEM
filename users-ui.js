/* users-ui.js
 * Assigned to: TBD (Users page logic / jQuery + Bootstrap)
 * Last updated: 2026-03-13
 */

(() => {
  "use strict";

  function isUsersPage() {
    return document.getElementById("usersApp") != null;
  }

  function formatDateTime(value) {
    const d = value ? new Date(value) : null;
    if (!d || Number.isNaN(d.getTime())) return "—";
    return d.toLocaleString(undefined, {
      year: "numeric",
      month: "short",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  function getBorrowHistory() {
    return window.LMS?.getJson?.("borrowHistory", []) ?? [];
  }

  function setBorrowHistory(items) {
    window.LMS?.setJson?.("borrowHistory", items);
  }

  function seedDemoUsers() {
    const users = window.LMS?.getUsers?.() ?? [];
    if (users.length > 0) {
      window.LMS?.toast?.("Users already exist. Demo seed skipped.");
      return;
    }

    users.push(
      { username: "admin", password: "admin123", role: "Admin", program: "College Admin" },
      { username: "2026-0001", password: "student123", role: "Student", program: "BSIT 2A" },
      { username: "2026-0002", password: "student123", role: "Student", program: "BSBA 1B" }
    );
    window.LMS?.setUsers?.(users);
    window.LMS?.toast?.("Demo users added (admin/admin123).");
  }

  function renderUsersTable({ users, q, currentUser }) {
    const body = $("#usersTableBody");
    body.empty();

    const query = String(q || "").trim().toLowerCase();
    const filtered = query
      ? users.filter((u) =>
          `${u.username || ""} ${u.program || ""} ${u.role || ""}`.toLowerCase().includes(query)
        )
      : users;

    $("#usersEmptyState").prop("hidden", filtered.length > 0);

    filtered.forEach((u) => {
      const $tr = $("<tr/>");
      $tr.append($("<td/>").text(u.username || "—"));
      $tr.append($("<td/>").text(u.program || "—"));
      $tr.append($("<td/>").text(u.role || "—"));

      const $actions = $("<td/>").addClass("text-end");

      const isSelf = (u.username || "") === (currentUser?.username || "");
      const $reset = $("<button/>")
        .addClass("btn btn-sm btn-outline-warning me-2")
        .text("Reset PW")
        .attr("data-action", "reset")
        .attr("data-username", u.username || "")
        .prop("disabled", !u.username);

      const $del = $("<button/>")
        .addClass("btn btn-sm btn-outline-danger")
        .text("Delete")
        .attr("data-action", "delete")
        .attr("data-username", u.username || "")
        .prop("disabled", !u.username || isSelf);

      $actions.append($reset, $del);
      $tr.append($actions);
      body.append($tr);
    });
  }

  function renderHistoryTable({ history, q, isAdmin, currentUser }) {
    const body = $("#historyTableBody");
    body.empty();

    const query = String(q || "").trim().toLowerCase();
    const username = String(currentUser?.username || "").trim();

    let items = history.slice();
    if (!isAdmin && username) {
      items = items.filter((e) => String(e?.borrower || "").trim() === username);
    }

    if (query) {
      items = items.filter((e) => {
        const status = e?.returnedAt ? "returned" : "borrowed";
        return `${e?.title || ""} ${e?.borrower || ""} ${status}`.toLowerCase().includes(query);
      });
    }

    $("#historyEmptyState").prop("hidden", items.length > 0);

    items
      .map((e) => ({ ...e, d: e?.borrowedAt ? new Date(e.borrowedAt) : null }))
      .sort((a, b) => (b.d?.getTime?.() || 0) - (a.d?.getTime?.() || 0))
      .forEach((e) => {
        const status = e?.returnedAt ? "Returned" : "Borrowed";
        const $tr = $("<tr/>");
        $tr.append($("<td/>").text(e?.title || "—"));
        $tr.append($("<td/>").text(e?.borrower || "—"));
        $tr.append($("<td/>").text(formatDateTime(e?.borrowedAt)));
        $tr.append($("<td/>").text(formatDateTime(e?.returnedAt)));
        $tr.append($("<td/>").text(status));
        body.append($tr);
      });
  }

  function refreshAll({ isAdmin, currentUser }) {
    const users = window.LMS?.getUsers?.() ?? [];
    const history = getBorrowHistory();

    $("#statTotalUsers").text(String(users.length));
    $("#statBorrowEvents").text(String(history.length));

    renderUsersTable({ users, q: $("#usersSearch").val(), currentUser });
    renderHistoryTable({
      history,
      q: $("#historySearch").val(),
      isAdmin,
      currentUser,
    });

    $("#profileUsername").text(currentUser?.username || "—");
    $("#profileProgram").text(currentUser?.program || "—");
    $("#profileRole").text(currentUser?.role || "—");
  }

  document.addEventListener("DOMContentLoaded", () => {
    if (!isUsersPage()) return;
    if (!window.LMS) return;

    const currentUser = window.LMS.getLoggedUser?.();
    if (!currentUser) {
      window.location.href = "index.html";
      return;
    }

    $("#userRoleBadge").text(currentUser.role || "");

    const isAdmin = String(currentUser.role || "").toLowerCase() === "admin";
    if (!isAdmin) {
      window.location.href = "student.html";
      return;
    }

    refreshAll({ isAdmin, currentUser });

    $("#usersSeedDemo").on("click", () => {
      seedDemoUsers();
      refreshAll({ isAdmin, currentUser: window.LMS.getLoggedUser?.() });
    });

    $("#usersSearch").on("input", () => refreshAll({ isAdmin, currentUser }));
    $("#usersClear").on("click", () => {
      $("#usersSearch").val("");
      refreshAll({ isAdmin, currentUser });
    });

    $("#historySearch").on("input", () => refreshAll({ isAdmin, currentUser }));
    $("#historyClear").on("click", () => {
      $("#historySearch").val("");
      refreshAll({ isAdmin, currentUser });
    });

    $("#addUserForm").on("submit", (e) => {
      e.preventDefault();
      if (!isAdmin) return;

      const username = String($("#newUsername").val() || "").trim();
      const program = String($("#newProgram").val() || "").trim();
      const role = String($("#newRole").val() || "").trim();
      const password = String($("#newPassword").val() || "");

      if (!username || !program || !role) return window.LMS.toast("Please fill out all fields.");
      if (password.length < 6) return window.LMS.toast("Password must be at least 6 characters.");

      const users = window.LMS.getUsers();
      if (users.some((u) => u.username === username)) return window.LMS.toast("User already exists.");
      if (role === "Admin" && users.some((u) => u.role === "Admin"))
        return window.LMS.toast("Only one Admin account is allowed.");

      users.push({ username, password, role, program });
      window.LMS.setUsers(users);
      $("#addUserForm")[0].reset();
      window.LMS.toast("User created.");
      refreshAll({ isAdmin, currentUser });
    });

    $("#usersTableBody").on("click", "button[data-action]", (e) => {
      if (!isAdmin) return;

      const $btn = $(e.currentTarget);
      const action = String($btn.attr("data-action") || "");
      const username = String($btn.attr("data-username") || "");
      if (!username) return;

      const users = window.LMS.getUsers();
      const idx = users.findIndex((u) => u.username === username);
      if (idx < 0) return window.LMS.toast("User not found.");

      if (action === "reset") {
        users[idx].password = "123456";
        window.LMS.setUsers(users);
        window.LMS.toast("Password reset to 123456.");
        refreshAll({ isAdmin, currentUser });
        return;
      }

      if (action === "delete") {
        if (username === currentUser.username) return window.LMS.toast("You cannot delete your own account.");
        if (!confirm(`Delete user '${username}'?`)) return;

        const next = users.filter((u) => u.username !== username);
        window.LMS.setUsers(next);

        const history = getBorrowHistory().filter((e) => e?.borrower !== username);
        setBorrowHistory(history);

        window.LMS.toast("User deleted.");
        refreshAll({ isAdmin, currentUser });
      }
    });

    $("#logout").on("click", () => {
      if (!window.confirm("Log out now?")) return;
      window.LMS.clearSession?.();
      window.location.href = "index.html";
    });
  });
})();
