/* lms.dashboard.js
 * Assigned to: TBD (Dashboard / books / borrowed / charts)
 * Last updated: 2026-03-13
 */

(() => {
  "use strict";

  const LMS = window.LMS;
  if (!LMS) return;

  function highlightActiveSidebar() {
    const path = (window.location.pathname || "").split("/").pop()?.toLowerCase() || "";
    LMS.qsa(".sidebar a").forEach((a) => {
      const href = (a.getAttribute("href") || "").toLowerCase();
      const li = a.closest("li");
      if (!li) return;
      li.classList.toggle("active", href === path);
      if (href === path) a.setAttribute("aria-current", "page");
      else a.removeAttribute("aria-current");
    });
  }

  let charts = { bar: null, pie: null };
  function renderChartsIfPresent() {
    // The redesigned dashboard renders charts via `js/dashboard-ui.js`.
    if (document.getElementById("activityChart")) return;

    const lineCanvas = document.getElementById("lineChart");
    const pieCanvas = document.getElementById("pieChart");
    if (!lineCanvas || !pieCanvas) return;
    if (typeof Chart === "undefined") return;

    const books = LMS.getJson("books", []);
    const borrowed = LMS.getJson("borrowed", []);

    const categories = {};
    books.forEach((b) => {
      const key = (b?.category || "Uncategorized").trim() || "Uncategorized";
      categories[key] = (categories[key] || 0) + 1;
    });

    const labels = Object.keys(categories);
    const values = Object.values(categories);

    charts.bar?.destroy?.();
    charts.pie?.destroy?.();

    charts.bar = new Chart(lineCanvas, {
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
          y: { beginAtZero: true, grid: { color: "#e5e5e5" } },
          x: { grid: { display: false } },
        },
      },
    });

    charts.pie = new Chart(pieCanvas, {
      type: "doughnut",
      data: {
        labels: ["Available", "Borrowed"],
        datasets: [
          {
            data: [Math.max(0, books.length - borrowed.length), borrowed.length],
            backgroundColor: ["#22c55e", "#ef4444"],
          },
        ],
      },
      options: { responsive: true },
    });
  }

  LMS.initDashboardPages = function initDashboardPages() {
    if (!LMS.qs(".dashboard")) return;

    const user = LMS.getLoggedUser();
    if (!user) {
      window.location.href = "index.html";
      return;
    }

    // Enforce role-based access for admin-only pages.
    const isAdminApp =
      document.getElementById("dashboardApp") ||
      document.getElementById("addBookApp") ||
      document.getElementById("usersApp");
    if (isAdminApp && String(user.role || "").toLowerCase() !== "admin") {
      window.location.href = "student.html";
      return;
    }

    const badge = document.getElementById("userRoleBadge");
    if (badge) badge.textContent = user.role || "";

    highlightActiveSidebar();

    const books = LMS.getJson("books", []);
    const borrowed = LMS.getJson("borrowed", []);
    const users = LMS.getUsers();

    const totalBooks = document.getElementById("totalBooks");
    const borrowedCount = document.getElementById("borrowedCount");
    const totalUsers = document.getElementById("totalUsers");
    if (totalBooks) totalBooks.textContent = String(books.length);
    if (borrowedCount) borrowedCount.textContent = String(borrowed.length);
    if (totalUsers) totalUsers.textContent = String(users.length);

    const bookForm = document.getElementById("bookForm");
    if (bookForm) {
      bookForm.addEventListener("submit", (e) => {
        e.preventDefault();

        const title = (LMS.qs("#bookTitle")?.value || "").trim();
        const author = (LMS.qs("#bookAuthor")?.value || "").trim();
        const category = (LMS.qs("#bookCategory")?.value || "").trim();
        const coverUrl = (LMS.qs("#bookCoverUrl")?.value || "").trim();
        const description = (LMS.qs("#bookDescription")?.value || "").trim();

        if (!title || !author || !category) return LMS.toast("Please fill out all required book fields.");

        books.push({ title, author, category, coverUrl, description });
        LMS.setJson("books", books);
        bookForm.reset();
        LMS.toast("Book added.");
      });
    }

    const logoutBtn = document.getElementById("logout");
    logoutBtn?.addEventListener("click", () => {
      if (!window.confirm("Log out now?")) return;
      LMS.clearSession();
      window.location.href = "index.html";
    });

    renderChartsIfPresent();
  };
})();
