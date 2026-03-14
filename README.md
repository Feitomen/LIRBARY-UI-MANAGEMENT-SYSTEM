# Library Management System (Static Demo)

This project is a front-end only Library Management System demo that stores data in `localStorage`.

## Pages

- `index.html` — Landing page
- `auth.html` — Login / Register
- `dashboard.html` — Dashboard (Books, Borrowed, Analytics)
- `add-book.html` — Add Book page (legacy page; dashboard also supports adding books)
- `users.html` — Users page (Admin management + profile + borrow history)
- `student.html` — Student portal (borrow + return + analytics)

## Data (localStorage keys)

- `users` — array of `{ username, password, role, program }`
- `loggedInUser` — `{ username, role, program, ... }`
- `books` — array of `{ id, title, author, category, addedAt }`
- `borrowed` — active borrowed list (generated from dashboard borrow/return)
- `borrowHistory` — history of borrow/return events

## Code structure

### CSS

- `css/style.css` — entry point (imports below)
- `css/base.css` — global variables + resets
- `css/auth.css` — login/register styles
- `css/dashboard.css` — legacy dashboard styles
- `css/branding.css` — PCC logo effects
- `css/dashboard-ui.css` — new dashboard UI polish (Bootstrap-friendly)
- `css/users-ui.css` — users page UI polish

### JS

- `js/script.js` — entry point that calls init functions
- `js/lms.core.js` — storage helpers + toast + DOM helpers
- `js/lms.auth.js` — login/register behaviors
- `js/lms.dashboard.js` — legacy add-book + dashboard helpers
- `js/dashboard-ui.js` — redesigned dashboard UI (jQuery + Bootstrap + analytics)
- `js/users-ui.js` — users page UI (jQuery + Bootstrap)

## Notes

This is suitable for a school project/demo UI. For a real college library system, you would add:
- A backend + database (MySQL/PostgreSQL)
- Secure authentication (hashed passwords, sessions/JWT)
- Role permissions and audit logs
- Real book inventory (ISBN, copies, barcode)
- Proper borrowing workflow (due dates, fines, approvals)

### Default Admin (demo)

On first load, the app auto-creates a default Admin account if none exists:
- Username: `admin`
- Password: `admin123`

Admin registration is disabled; only Students can register in `auth.html`.
