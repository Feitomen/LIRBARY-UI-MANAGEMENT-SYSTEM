/* dashboard-ui.js
 * Assigned to: TBD (Dashboard UI / jQuery + Bootstrap interactions)
 * Last updated: 2026-03-13
 */

(() => {
  "use strict";

  function isDashboard() {
    return document.getElementById("dashboardApp") != null;
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

  function normalizeBooks() {
    const books = window.LMS?.getJson?.("books", []) ?? [];
    let changed = false;
    const normalized = books.map((b) => {
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
    }).filter(Boolean);

    if (changed) window.LMS?.setJson?.("books", normalized);
    return normalized;
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

  function computeStats({ books, borrowedActive, borrowHistory }) {
    const available = Math.max(0, books.length - borrowedActive.length);

    const counts = new Map();
    borrowHistory.forEach((e) => {
      const key = e?.bookId || "";
      if (!key) return;
      counts.set(key, (counts.get(key) || 0) + 1);
    });

    let topBookId = null;
    let topCount = 0;
    for (const [bookId, count] of counts.entries()) {
      if (count > topCount) {
        topCount = count;
        topBookId = bookId;
      }
    }

    const topBook = topBookId ? books.find((b) => b.id === topBookId) : null;
    const topBookLabel = topBook ? `${topBook.title} (${topCount})` : "—";

    const lastBorrow = borrowHistory
      .map((e) => ({ ...e, d: safeParseDate(e?.borrowedAt) }))
      .filter((e) => e.d)
      .sort((a, b) => b.d - a.d)[0];

    return {
      available,
      topBookLabel,
      lastBorrowLabel: lastBorrow ? formatDateTime(lastBorrow.borrowedAt) : "—",
    };
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
    const entry = {
      id: uid(),
      bookId,
      title: book.title,
      borrower,
      user: borrower,
      borrowedAt: now,
    };

    borrowedActive.push(entry);
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
      .find((e) => e?.bookId === removed.bookId && !e?.returnedAt);
    if (lastOpen) {
      lastOpen.returnedAt = new Date().toISOString();
      setBorrowHistory(history);
    }

    return { ok: true, message: "Book returned." };
  }

  function upsertKpis({ books, borrowedActive, borrowHistory }) {
    const stats = computeStats({ books, borrowedActive, borrowHistory });
    $("#totalBooks").text(String(books.length));
    $("#borrowedCount").text(String(borrowedActive.length));
    $("#kpiAvailable").text(`Available: ${stats.available}`);
    $("#kpiTopBook").text(`Top book: ${stats.topBookLabel}`);
    $("#kpiLastBorrow").text(`Last borrow: ${stats.lastBorrowLabel}`);
  }

  function renderBooksTable({ books, borrowedActive, search }) {
    const body = $("#booksTableBody");
    body.empty();

    const q = String(search || "").trim().toLowerCase();
    const filtered = q
      ? books.filter((b) =>
          `${b.title} ${b.author} ${b.category}`.toLowerCase().includes(q)
        )
      : books;

    $("#booksEmptyState").prop("hidden", filtered.length > 0);

    filtered.forEach((b) => {
      const isBorrowed = borrowedActive.some((x) => x.bookId === b.id);
      const $tr = $("<tr/>");
      $tr.append($("<td/>").text(b.title || "—"));
      $tr.append($("<td/>").text(b.author || "—"));
      $tr.append($("<td/>").text(b.category || "—"));

      const $actions = $("<td/>").addClass("text-end");
      const $btn = $("<button/>")
        .addClass(`btn btn-sm ${isBorrowed ? "btn-outline-secondary" : "btn-outline-danger"}`)
        .prop("disabled", isBorrowed)
        .text(isBorrowed ? "Borrowed" : "Borrow")
        .attr("data-book-id", b.id);

      $actions.append($btn);
      $tr.append($actions);
      body.append($tr);
    });
  }

  function renderBorrowedTable({ borrowedActive, search }) {
    const body = $("#borrowedTableBody");
    body.empty();

    const q = String(search || "").trim().toLowerCase();
    const filtered = q
      ? borrowedActive.filter((b) =>
          `${b.title} ${b.borrower || b.user || ""}`.toLowerCase().includes(q)
        )
      : borrowedActive;

    $("#borrowedEmptyState").prop("hidden", filtered.length > 0);

    filtered.forEach((b) => {
      const $tr = $("<tr/>");
      $tr.append($("<td/>").text(b.title || "—"));
      $tr.append($("<td/>").text(b.borrower || b.user || "—"));
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

  function fillAnalyticsSelect(books) {
    const sel = $("#analyticsBookSelect");
    const current = sel.val();
    sel.empty();
    books.forEach((b) => {
      sel.append($("<option/>").attr("value", b.id).text(b.title || "Untitled"));
    });
    if (current && books.some((b) => b.id === current)) sel.val(current);
  }

  function renderBookAnalytics({ books, borrowedActive, borrowHistory, bookId }) {
    const book = books.find((b) => b.id === bookId) || books[0] || null;
    if (!book) {
      $("#metricTimesBorrowed").text("0");
      $("#metricCurrentlyBorrowed").text("No");
      $("#metricLastBorrowed").text("—");
      $("#metricAddedAt").text("—");
      return;
    }

    const events = borrowHistory.filter((e) => e?.bookId === book.id);
    const times = events.length;
    const isActive = borrowedActive.some((b) => b.bookId === book.id);
    const last = events
      .map((e) => safeParseDate(e?.borrowedAt))
      .filter(Boolean)
      .sort((a, b) => b - a)[0];

    $("#metricTimesBorrowed").text(String(times));
    $("#metricCurrentlyBorrowed").text(isActive ? "Yes" : "No");
    $("#metricLastBorrowed").text(last ? formatDateTime(last) : "—");
    $("#metricAddedAt").text(formatDateTime(book.addedAt));
  }

  let charts = { category: null, availability: null, activity: null };

  function chartCategories(books) {
    const canvas = document.getElementById("lineChart");
    if (!canvas || typeof Chart === "undefined") return;

    const categories = {};
    books.forEach((b) => {
      const key = (b.category || "Uncategorized").trim() || "Uncategorized";
      categories[key] = (categories[key] || 0) + 1;
    });

    const labels = Object.keys(categories);
    const values = Object.values(categories);

    charts.category?.destroy?.();
    charts.category = new Chart(canvas, {
      type: "bar",
      data: {
        labels,
        datasets: [
          {
            label: "Books per Category",
            data: values,
            backgroundColor: "rgba(179, 0, 0, 0.45)",
            borderColor: "rgba(123, 0, 0, 1)",
            borderWidth: 1,
            borderRadius: 6,
            barPercentage: 0.65,
            categoryPercentage: 0.7,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: true, position: "top" } },
        scales: {
          y: { beginAtZero: true, grid: { color: "#e5e7eb" } },
          x: { grid: { display: false } },
        },
      },
    });
  }

  function chartAvailability(books, borrowedActive) {
    const canvas = document.getElementById("pieChart");
    if (!canvas || typeof Chart === "undefined") return;

    const borrowedCount = borrowedActive.length;
    const available = Math.max(0, books.length - borrowedCount);

    charts.availability?.destroy?.();
    charts.availability = new Chart(canvas, {
      type: "doughnut",
      data: {
        labels: ["Available", "Borrowed"],
        datasets: [
          {
            data: [available, borrowedCount],
            backgroundColor: ["#22c55e", "#ef4444"],
          },
        ],
      },
      options: { responsive: true, maintainAspectRatio: false },
    });
  }

  function chartActivity(borrowHistory) {
    const canvas = document.getElementById("activityChart");
    if (!canvas || typeof Chart === "undefined") return;

    const days = 14;
    const now = new Date();
    const labels = [];
    const values = [];

    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(now.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      labels.push(d.toLocaleDateString(undefined, { month: "short", day: "2-digit" }));
      const count = borrowHistory.filter((e) => (e?.borrowedAt || "").slice(0, 10) === key).length;
      values.push(count);
    }

    charts.activity?.destroy?.();
    charts.activity = new Chart(canvas, {
      type: "line",
      data: {
        labels,
        datasets: [
          {
            label: "Borrows",
            data: values,
            tension: 0.35,
            borderColor: "rgba(179,0,0,1)",
            backgroundColor: "rgba(179,0,0,0.15)",
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

  function refreshAll() {
    const books = normalizeBooks();
    const borrowedActive = normalizeBorrowed();
    const borrowHistory = getBorrowHistory();

    upsertKpis({ books, borrowedActive, borrowHistory });

    renderBooksTable({ books, borrowedActive, search: $("#booksSearch").val() });
    renderBorrowedTable({ borrowedActive, search: $("#borrowedSearch").val() });

    fillAnalyticsSelect(books);
    const selectedBookId = $("#analyticsBookSelect").val() || books[0]?.id || "";
    if (selectedBookId) $("#analyticsBookSelect").val(selectedBookId);
    renderBookAnalytics({ books, borrowedActive, borrowHistory, bookId: selectedBookId });

    chartCategories(books);
    chartAvailability(books, borrowedActive);
    chartActivity(borrowHistory);
  }

  function seedDemoData() {
    const existing = window.LMS?.getJson?.("books", []) ?? [];
    if (existing.length > 0) {
      window.LMS?.toast?.("Books already exist. Demo seed skipped.");
      return;
    }

    const demo = [
      { title: "Introduction to Algorithms", author: "Cormen", category: "Computer Science" },
      { title: "Clean Code", author: "Robert C. Martin", category: "Software Engineering" },
      { title: "Pride and Prejudice", author: "Jane Austen", category: "Literature" },
      { title: "Basic Accounting", author: "Weygandt", category: "Business" },
    ].map((b) => ({ ...b, id: uid(), addedAt: new Date().toISOString() }));

    window.LMS?.setJson?.("books", demo);
    window.LMS?.setJson?.("borrowed", []);
    window.LMS?.setJson?.("borrowHistory", []);
    window.LMS?.toast?.("Demo data added.");
  }

  document.addEventListener("DOMContentLoaded", () => {
    if (!isDashboard()) return;
    if (!window.LMS) return;

    const user = window.LMS.getLoggedUser?.();
    if (!user) {
      window.location.href = "index.html";
      return;
    }
    if (String(user.role || "").toLowerCase() !== "admin") {
      window.location.href = "student.html";
      return;
    }

    refreshAll();

    $("#dashboardSeedDemo").on("click", () => {
      seedDemoData();
      refreshAll();
    });

    $("#dashboardAddBookForm").on("submit", (e) => {
      e.preventDefault();
      const title = String($("#dashboardBookTitle").val() || "").trim();
      const author = String($("#dashboardBookAuthor").val() || "").trim();
      const category = String($("#dashboardBookCategory").val() || "").trim();
      if (!title || !author || !category) return window.LMS.toast("Please fill out all book fields.");

      const books = normalizeBooks();
      books.push({ id: uid(), title, author, category, addedAt: new Date().toISOString() });
      window.LMS.setJson("books", books);
      $("#dashboardAddBookForm")[0].reset();
      window.LMS.toast("Book added.");
      refreshAll();
    });

    $("#booksSearch").on("input", () => refreshAll());
    $("#booksClear").on("click", () => {
      $("#booksSearch").val("");
      refreshAll();
    });

    $("#borrowedSearch").on("input", () => refreshAll());
    $("#borrowedClear").on("click", () => {
      $("#borrowedSearch").val("");
      refreshAll();
    });

    $("#booksTableBody").on("click", "button[data-book-id]", (e) => {
      const bookId = String($(e.currentTarget).attr("data-book-id") || "");
      const books = normalizeBooks();
      const book = books.find((b) => b.id === bookId);
      if (!book) return window.LMS.toast("Book not found.");

      $("#borrowBookId").val(bookId);
      $("#borrowerName").val("");
      $("#borrowModalBookMeta").text(`${book.title} • ${book.author} • ${book.category}`);

      const modalEl = document.getElementById("borrowModal");
      if (!modalEl || typeof bootstrap === "undefined") return;
      bootstrap.Modal.getOrCreateInstance(modalEl).show();
    });

    $("#confirmBorrow").on("click", () => {
      const bookId = String($("#borrowBookId").val() || "");
      const borrower = String($("#borrowerName").val() || "").trim();
      if (!borrower) return window.LMS.toast("Please enter a borrower name.");

      const result = borrowBook({ bookId, borrower });
      window.LMS.toast(result.message);
      if (result.ok) {
        const modalEl = document.getElementById("borrowModal");
        window.bootstrap?.Modal?.getInstance?.(modalEl)?.hide?.();
        refreshAll();
      }
    });

    $("#borrowedTableBody").on("click", "button[data-borrow-id]", (e) => {
      const borrowId = String($(e.currentTarget).attr("data-borrow-id") || "");
      const result = returnBorrowed(borrowId);
      window.LMS.toast(result.message);
      if (result.ok) refreshAll();
    });

    $("#analyticsBookSelect").on("change", () => refreshAll());
  });
})();
