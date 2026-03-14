/* student-ui.js
 * Assigned to: TBD (Student borrow/return + analytics)
 * Last updated: 2026-03-13
 */

(() => {
  "use strict";

  function isStudentPage() {
    return document.getElementById("studentApp") != null;
  }

  const CATALOG_PIN_KEY = "lms.student.catalog.pinned";
  const CATALOG_VIEW_KEY = "lms.student.catalog.view";
  const pinnedBookIds = new Set();

  function loadPinnedBookIds() {
    try {
      const raw = window.sessionStorage?.getItem?.(CATALOG_PIN_KEY);
      const parsed = raw ? JSON.parse(raw) : [];
      if (Array.isArray(parsed)) parsed.forEach((id) => pinnedBookIds.add(String(id)));
    } catch {}
  }

  function savePinnedBookIds() {
    try {
      window.sessionStorage?.setItem?.(CATALOG_PIN_KEY, JSON.stringify([...pinnedBookIds]));
    } catch {}
  }

  loadPinnedBookIds();

  function normalizeCatalogView(value) {
    const v = String(value || "").toLowerCase().trim();
    if (v === "list" || v === "cards") return v;
    return "cards";
  }

  function getCatalogViewPreference() {
    try {
      const raw = window.localStorage?.getItem?.(CATALOG_VIEW_KEY);
      if (!raw) return null;
      return normalizeCatalogView(raw);
    } catch {
      return null;
    }
  }

  function setCatalogViewPreference(view) {
    try {
      window.localStorage?.setItem?.(CATALOG_VIEW_KEY, normalizeCatalogView(view));
    } catch {}
  }

  function applyCatalogView(view) {
    const grid = document.getElementById("catalogGrid");
    if (!grid) return;
    grid.dataset.view = normalizeCatalogView(view);
  }

  function syncCatalogViewControls(view) {
    const v = normalizeCatalogView(view);
    const cards = document.getElementById("catalogViewCards");
    const list = document.getElementById("catalogViewList");
    if (cards) cards.checked = v === "cards";
    if (list) list.checked = v === "list";
  }

  function initCatalogViewToggle() {
    const grid = document.getElementById("catalogGrid");
    if (!grid) return;

    const initial = normalizeCatalogView(getCatalogViewPreference() ?? grid.dataset.view);
    applyCatalogView(initial);
    syncCatalogViewControls(initial);

    const onChange = (nextView) => {
      const v = normalizeCatalogView(nextView);
      applyCatalogView(v);
      syncCatalogViewControls(v);
      setCatalogViewPreference(v);
    };

    const cards = document.getElementById("catalogViewCards");
    const list = document.getElementById("catalogViewList");
    if (cards) cards.addEventListener("change", () => cards.checked && onChange("cards"));
    if (list) list.addEventListener("change", () => list.checked && onChange("list"));
  }

  function safeParseDate(value) {
    const d = value ? new Date(value) : null;
    return d && !Number.isNaN(d.getTime()) ? d : null;
  }

  function formatDateTime(value) {
    const d = value instanceof Date ? value : safeParseDate(value);
    if (!d) return "—";
    return d.toLocaleString(undefined, {
      year: "numeric",
      month: "short",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  function uid() {
    if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
    return `id_${Date.now()}_${Math.random().toString(16).slice(2)}`;
  }

  function getBooks() {
    return window.LMS?.getJson?.("books", []) ?? [];
  }

  function setBooks(items) {
    window.LMS?.setJson?.("books", items);
  }

  function normalizeBooks() {
    const books = getBooks();
    let changed = false;
    const normalized = books
      .map((b) => {
        if (!b || typeof b !== "object") return null;
        const next = { ...b };
        if (!next.id) {
          next.id = uid();
          changed = true;
        }
        if (!next.addedAt) {
          next.addedAt = new Date().toISOString();
          changed = true;
        }
        next.title = String(next.title || "").trim();
        next.author = String(next.author || "").trim();
        next.category = String(next.category || "").trim();
        return next;
      })
      .filter(Boolean);
    if (changed) setBooks(normalized);
    return normalized;
  }

  function getBorrowedActive() {
    return window.LMS?.getJson?.("borrowed", []) ?? [];
  }

  function setBorrowedActive(items) {
    window.LMS?.setJson?.("borrowed", items);
  }

  function getBorrowHistory() {
    return window.LMS?.getJson?.("borrowHistory", []) ?? [];
  }

  function setBorrowHistory(items) {
    window.LMS?.setJson?.("borrowHistory", items);
  }

  function normalizeBorrowed() {
    const active = getBorrowedActive();
    let changed = false;
    const normalized = active
      .map((b) => {
        if (!b || typeof b !== "object") return null;
        const next = { ...b };
        if (!next.id) {
          next.id = uid();
          changed = true;
        }
        if (!next.borrowedAt) {
          next.borrowedAt = new Date().toISOString();
          changed = true;
        }
        const borrower = next.borrower || next.user || "";
        if (borrower && next.borrower !== borrower) {
          next.borrower = borrower;
          changed = true;
        }
        if (borrower && next.user !== borrower) {
          next.user = borrower;
          changed = true;
        }
        next.title = String(next.title || "").trim();
        next.borrower = String(next.borrower || "").trim();
        next.user = String(next.user || "").trim();
        next.bookId = next.bookId ? String(next.bookId) : "";
        return next;
      })
      .filter(Boolean);

    if (changed) setBorrowedActive(normalized);
    return normalized;
  }

  function borrowBook({ bookId, borrower }) {
    const books = normalizeBooks();
    const book = books.find((b) => b.id === bookId);
    if (!book) return { ok: false, message: "Book not found." };

    const borrowedActive = normalizeBorrowed();
    if (borrowedActive.some((b) => b.bookId === bookId)) {
      return { ok: false, message: "This book is already borrowed." };
    }

    const now = new Date().toISOString();
    borrowedActive.push({
      id: uid(),
      bookId,
      title: book.title,
      borrower,
      user: borrower,
      borrowedAt: now,
    });
    setBorrowedActive(borrowedActive);

    const history = getBorrowHistory();
    history.push({
      id: uid(),
      bookId,
      title: book.title,
      borrower,
      borrowedAt: now,
      returnedAt: null,
    });
    setBorrowHistory(history);

    return { ok: true, message: "Book borrowed." };
  }

  function returnBorrowed(activeBorrowId) {
    const borrowedActive = normalizeBorrowed();
    const idx = borrowedActive.findIndex((b) => b.id === activeBorrowId);
    if (idx < 0) return { ok: false, message: "Borrow record not found." };

    const [removed] = borrowedActive.splice(idx, 1);
    setBorrowedActive(borrowedActive);

    const history = getBorrowHistory();
    const lastOpen = [...history]
      .reverse()
      .find((e) => e?.bookId === removed.bookId && e?.borrower === removed.borrower && !e?.returnedAt);
    if (lastOpen) {
      lastOpen.returnedAt = new Date().toISOString();
      setBorrowHistory(history);
    }
    return { ok: true, message: "Book returned." };
  }

  function renderCatalog({ books, borrowedActive, q }) {
    const grid = $("#catalogGrid");
    grid.empty();

    const coverPlaceholderSvg = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(
      [
        '<svg xmlns="http://www.w3.org/2000/svg" width="320" height="480" viewBox="0 0 320 480">',
        "<defs>",
        '<linearGradient id="g" x1="0" y1="0" x2="1" y2="1">',
        '<stop offset="0" stop-color="#ffffff"/>',
        '<stop offset="1" stop-color="#f1f3f6"/>',
        "</linearGradient>",
        "</defs>",
        '<rect width="320" height="480" rx="18" fill="url(#g)"/>',
        '<rect x="22" y="22" width="276" height="436" rx="14" fill="#ffffff" stroke="rgba(0,0,0,0.08)"/>',
        '<path d="M68 168h184v10H68zM68 196h152v10H68zM68 224h168v10H68z" fill="rgba(0,0,0,0.10)"/>',
        '<text x="50%" y="76%" text-anchor="middle" font-family="Poppins,system-ui,Segoe UI,Arial" font-size="18" fill="rgba(0,0,0,0.45)">No Cover</text>',
        "</svg>",
      ].join("")
    )}`;

    const query = String(q || "").trim().toLowerCase();
    const filtered = query
      ? books.filter((b) =>
          `${b.title} ${b.author} ${b.category}`.toLowerCase().includes(query)
        )
      : books;

    $("#catalogEmptyState").prop("hidden", filtered.length > 0);

    filtered.forEach((b) => {
      const bookId = String(b.id || "");
      const active = borrowedActive.find((x) => x.bookId === bookId);
      const isUnavailable = !!active;

      const coverUrl = String(b.coverUrl || b.cover || "").trim();
      const description = String(b.description || b.desc || "").trim();

      const descId = `bookDesc_${bookId.replace(/[^a-zA-Z0-9_-]/g, "_")}`;
      const isPinned = pinnedBookIds.has(bookId);

      const $card = $("<div/>")
        .addClass(`book-card ${isPinned ? "is-pinned" : ""}`)
        .attr({
          "data-book-id": bookId,
          tabindex: 0,
          role: "group",
          "aria-expanded": isPinned ? "true" : "false",
          "aria-controls": descId,
        });

      const $cover = $("<img/>")
        .addClass("book-cover")
        .attr("alt", `${b.title || "Book"} cover`)
        .attr("loading", "lazy")
        .attr("src", coverUrl || coverPlaceholderSvg);

      const $media = $("<div/>").addClass("book-media").append($cover);

      const $title = $("<div/>").addClass("book-card-title").text(b.title || "—");
      const author = String(b.author || "—");
      const category = String(b.category || "—");
      const $meta = $("<div/>").addClass("book-card-meta").text(`${author} • ${category}`);

      const borrower = String(active?.borrower || active?.user || "").trim();
      const $sub = $("<div/>")
        .addClass("book-card-sub")
        .text(isUnavailable ? `Borrowed by ${borrower || "—"}` : "Hover to preview • Click to pin");

      const $status = $("<span/>")
        .addClass(`book-status badge ${isUnavailable ? "text-bg-secondary" : "text-bg-success"}`)
        .text(isUnavailable ? "Unavailable" : "Available");

      const $header = $("<div/>")
        .addClass("book-card-header")
        .append($("<div/>").addClass("book-card-heading").append($title, $meta, $sub))
        .append($status);

      const $desc = $("<div/>")
        .addClass("book-card-desc")
        .attr("id", descId)
        .text(description || "No description available.");

      const $actions = $("<div/>").addClass("book-card-actions");
      const $btn = $("<button/>")
        .addClass(`btn btn-sm ${isUnavailable ? "btn-outline-secondary" : "btn-outline-danger"}`)
        .prop("disabled", isUnavailable)
        .text(isUnavailable ? "Unavailable" : "Borrow")
        .attr("data-book-id", bookId);
      $actions.append($btn);

      const $body = $("<div/>").addClass("book-body").append($header, $actions);

      $card.append($media, $body, $desc);
      grid.append($card);
    });
  }

  function renderMyBorrowed({ borrowedActive, username, q }) {
    const body = $("#myBorrowedTableBody");
    body.empty();

    const mine = borrowedActive.filter((b) => (b.borrower || b.user || "") === username);
    const query = String(q || "").trim().toLowerCase();
    const filtered = query ? mine.filter((b) => String(b.title || "").toLowerCase().includes(query)) : mine;

    $("#myBorrowedEmptyState").prop("hidden", filtered.length > 0);

    filtered.forEach((b) => {
      const $tr = $("<tr/>");
      $tr.append($("<td/>").text(b.title || "—"));
      $tr.append($("<td/>").text(formatDateTime(b.borrowedAt)));
      const $actions = $("<td/>").addClass("text-end");
      const $btn = $("<button/>")
        .addClass("btn btn-sm btn-outline-success")
        .text("Return")
        .attr("data-borrow-id", b.id);
      $actions.append($btn);
      $tr.append($actions);
      body.append($tr);
    });
  }

  function renderStudentHistory({ history, username, q }) {
    const body = $("#studentHistoryTableBody");
    body.empty();

    const mine = history.filter((e) => String(e?.borrower || "").trim() === username);
    const query = String(q || "").trim().toLowerCase();
    const filtered = query
      ? mine.filter((e) => {
          const status = e?.returnedAt ? "returned" : "borrowed";
          return `${e?.title || ""} ${status}`.toLowerCase().includes(query);
        })
      : mine;

    $("#studentHistoryEmptyState").prop("hidden", filtered.length > 0);

    filtered
      .map((e) => ({ ...e, d: safeParseDate(e?.borrowedAt) }))
      .sort((a, b) => (b.d?.getTime?.() || 0) - (a.d?.getTime?.() || 0))
      .forEach((e) => {
        const status = e?.returnedAt ? "Returned" : "Borrowed";
        const $tr = $("<tr/>");
        $tr.append($("<td/>").text(e?.title || "—"));
        $tr.append($("<td/>").text(formatDateTime(e?.borrowedAt)));
        $tr.append($("<td/>").text(formatDateTime(e?.returnedAt)));
        $tr.append($("<td/>").text(status));
        body.append($tr);
      });
  }

  let activityChart = null;
  function renderStudentActivity(history, username) {
    const canvas = document.getElementById("studentActivityChart");
    if (!canvas || typeof Chart === "undefined") return;

    const mine = history.filter((e) => (e?.borrower || "") === username);

    const days = 14;
    const now = new Date();
    const labels = [];
    const values = [];
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(now.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      labels.push(d.toLocaleDateString(undefined, { month: "short", day: "2-digit" }));
      const count = mine.filter((e) => (e?.borrowedAt || "").slice(0, 10) === key).length;
      values.push(count);
    }

    activityChart?.destroy?.();
    activityChart = new Chart(canvas, {
      type: "line",
      data: {
        labels,
        datasets: [
          {
            label: "My borrows",
            data: values,
            tension: 0.35,
            borderColor: "rgba(179,0,0,1)",
            backgroundColor: "rgba(179,0,0,0.12)",
            fill: true,
            pointRadius: 3,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: true, position: "top" } },
        scales: { y: { beginAtZero: true } },
      },
    });
  }

  function refreshAll({ username }) {
    const books = normalizeBooks();
    const borrowedActive = normalizeBorrowed();
    const history = getBorrowHistory();

    renderCatalog({ books, borrowedActive, q: $("#catalogSearch").val() });
    renderMyBorrowed({ borrowedActive, username, q: $("#myBorrowedSearch").val() });
    renderStudentHistory({
      history,
      username,
      q: $("#studentHistorySearch").val(),
    });

    const mineHistory = history.filter((e) => (e?.borrower || "") === username);
    const mineActive = borrowedActive.filter((b) => (b.borrower || b.user || "") === username);

    $("#metricStudentActive").text(String(mineActive.length));
    $("#metricStudentTotal").text(String(mineHistory.length));

    const last = mineHistory
      .map((e) => safeParseDate(e?.borrowedAt))
      .filter(Boolean)
      .sort((a, b) => b - a)[0];
    $("#metricStudentLast").text(last ? formatDateTime(last) : "—");

    const counts = new Map();
    mineHistory.forEach((e) => {
      const t = e?.title || "";
      if (!t) return;
      counts.set(t, (counts.get(t) || 0) + 1);
    });
    let topTitle = "";
    let topCount = 0;
    for (const [title, count] of counts.entries()) {
      if (count > topCount) {
        topTitle = title;
        topCount = count;
      }
    }
    $("#metricStudentTop").text(topTitle ? `${topTitle} (${topCount})` : "—");

    renderStudentActivity(history, username);
  }

  document.addEventListener("DOMContentLoaded", () => {
    if (!isStudentPage()) return;
    if (!window.LMS) return;

    const user = window.LMS.getLoggedUser?.();
    if (!user) {
      window.location.href = "index.html";
      return;
    }

    $("#userRoleBadge").text(user.role || "");
    $("#studentWelcome").text(`Student ID: ${user.username || ""}`);
    $("#studentProfileUsername").text(user.username || "—");
    $("#studentProfileProgram").text(user.program || "—");
    $("#studentProfileRole").text(user.role || "—");

    const role = String(user.role || "").toLowerCase();
    if (role !== "student" && role !== "admin") {
      window.location.href = "index.html";
      return;
    }

    initCatalogViewToggle();
    refreshAll({ username: user.username || "" });

    function activatePaneById(paneId) {
      const id = String(paneId || "").replace(/^#/, "");
      if (!id) return;

      const pane = document.getElementById(id);
      if (!pane) return;

      const trigger = document.querySelector(`.student-menu-link[data-pane="#${id}"]`);

      // Manual tab switching (avoids Bootstrap tab selector-engine errors on file://).
      document.querySelectorAll("#studentApp .tab-pane").forEach((el) => {
        el.classList.remove("show", "active");
      });
      pane.classList.add("show", "active");

      document.querySelectorAll(".student-menu-link").forEach((a) => a.classList.remove("active"));
      if (trigger) trigger.classList.add("active");
    }

    // Sidebar menu tab navigation (Bootstrap + fallback).
    $(".student-menu-link").on("click", (e) => {
      e.preventDefault();
      const target = String(e.currentTarget.getAttribute("data-pane") || "");
      activatePaneById(target);
      if (target) window.location.hash = target;
    });

    // Open pane from URL hash if present.
    if (window.location.hash) activatePaneById(window.location.hash);

    $("#catalogSearch").on("input", () => refreshAll({ username: user.username || "" }));
    $("#catalogClear").on("click", () => {
      $("#catalogSearch").val("");
      refreshAll({ username: user.username || "" });
    });

    $("#myBorrowedSearch").on("input", () => refreshAll({ username: user.username || "" }));
    $("#myBorrowedClear").on("click", () => {
      $("#myBorrowedSearch").val("");
      refreshAll({ username: user.username || "" });
    });

    $("#studentHistorySearch").on("input", () => refreshAll({ username: user.username || "" }));
    $("#studentHistoryClear").on("click", () => {
      $("#studentHistorySearch").val("");
      refreshAll({ username: user.username || "" });
    });

    $("#catalogGrid").on("click", ".book-card", (e) => {
      if ($(e.target).closest("button, a, input, textarea, select, label").length) return;
      const bookId = String($(e.currentTarget).attr("data-book-id") || "");
      if (!bookId) return;

      const isPinnedNext = !pinnedBookIds.has(bookId);
      if (isPinnedNext) pinnedBookIds.add(bookId);
      else pinnedBookIds.delete(bookId);
      savePinnedBookIds();

      $(e.currentTarget)
        .toggleClass("is-pinned", isPinnedNext)
        .attr("aria-expanded", isPinnedNext ? "true" : "false");
    });

    $("#catalogGrid").on("keydown", ".book-card", (e) => {
      if (e.key !== "Enter" && e.key !== " ") return;
      if ($(e.target).closest("button, a, input, textarea, select, label").length) return;
      e.preventDefault();
      $(e.currentTarget).trigger("click");
    });

    $("#catalogGrid").on("click", "button[data-book-id]", (e) => {
      const bookId = String($(e.currentTarget).attr("data-book-id") || "");
      const books = normalizeBooks();
      const book = books.find((b) => b.id === bookId);
      if (!book) return window.LMS.toast("Book not found.");

      const borrowedActive = normalizeBorrowed();
      const isUnavailable = borrowedActive.some((b) => b.bookId === bookId);

      $("#studentBorrowBookId").val(bookId);
      $("#studentBorrowBookTitle").text(book.title || "—");
      $("#studentBorrowBookMeta").text(`${book.author || "—"} • ${book.category || "—"}`);

      const description = String(book.description || book.desc || "").trim();
      $("#studentBorrowBookDescription").text(description || "No description available.");

      const coverUrl = String(book.coverUrl || book.cover || "").trim();
      const $cover = $("#studentBorrowBookCover");
      if (coverUrl) {
        $cover.attr("src", coverUrl).removeClass("d-none");
      } else {
        $cover.addClass("d-none");
      }

      const $status = $("#studentBorrowBookStatus");
      $status
        .text(isUnavailable ? "Unavailable" : "Available")
        .removeClass("bg-success bg-secondary")
        .addClass(isUnavailable ? "bg-secondary" : "bg-success");

      $("#studentConfirmBorrow").prop("disabled", isUnavailable);

      const modalEl = document.getElementById("studentBorrowModal");
      if (!modalEl) return;
      window.bootstrap?.Modal?.getOrCreateInstance?.(modalEl)?.show?.();
    });

    $("#studentConfirmBorrow").on("click", () => {
      const bookId = String($("#studentBorrowBookId").val() || "");
      const borrower = String(user.username || "").trim();
      const result = borrowBook({ bookId, borrower });
      window.LMS.toast(result.message);
      if (result.ok) {
        const modalEl = document.getElementById("studentBorrowModal");
        window.bootstrap?.Modal?.getInstance?.(modalEl)?.hide?.();
        refreshAll({ username: user.username || "" });
      }
    });

    $("#myBorrowedTableBody").on("click", "button[data-borrow-id]", (e) => {
      const borrowId = String($(e.currentTarget).attr("data-borrow-id") || "");
      const result = returnBorrowed(borrowId);
      window.LMS.toast(result.message);
      if (result.ok) refreshAll({ username: user.username || "" });
    });

    $("#logout").on("click", () => {
      if (!window.confirm("Log out now?")) return;
      window.LMS.clearSession?.();
      window.location.href = "index.html";
    });
  });
})();
