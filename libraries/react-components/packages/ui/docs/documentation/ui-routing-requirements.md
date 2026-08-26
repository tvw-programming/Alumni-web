# UI & Routing Requirements — Public Site + Protected Admin Area

Version 1.0 · July 2026 · Applies to `react-admin-starter` (React 19, React Router 7, MUI 7, AG Grid Community 33)

---

## 1. Information architecture

Two isolated shells, each with its own layout, navigation, and chrome:

| Shell  | Layout component   | Access             | Chrome                                                        |
| ------ | ------------------ | ------------------ | ------------------------------------------------------------- |
| Public | `PublicLayout`     | Anyone             | Top nav (Home/About/Contact Us) + footer                      |
| Admin  | `AdminShellLayout` | Authenticated only | Top nav (Dashboard/Master Data) + user menu; no public footer |

A user must never see admin navigation while logged out, and must never see the public marketing nav inside the admin area.

## 2. Route map

| Path                                 | Component                 | Guard     | Notes                                                    |
| ------------------------------------ | ------------------------- | --------- | -------------------------------------------------------- |
| `/`                                  | `HomePage`                | public    | Landing with project-setup prompt                        |
| `/about`                             | `AboutPage`               | public    | Static content                                           |
| `/contact`                           | `ContactPage`             | public    | Static content / contact form                            |
| `/login`                             | `LoginPage`               | public    | Redirects to `/admin/dashboard` if already authenticated |
| `/admin`                             | —                         | protected | Index redirect → `/admin/dashboard`                      |
| `/admin/dashboard`                   | `DashboardPage`           | protected | Existing dashboard                                       |
| `/admin/master-data`                 | `MasterDataLayout`        | protected | Sidebar shell; index redirect → `products`               |
| `/admin/master-data/products`        | `ManageProductPage`       | protected | 20/80 form+grid split                                    |
| `/admin/master-data/products-inline` | `ManageProductInlinePage` | protected | 20/80 split, grid uses inline-edit framework             |
| `/admin/master-data/users`           | `ManageUserPage`          | protected | 20/80 form+grid split                                    |
| `/admin/master-data/theme`           | `ManageThemePage`         | protected | Hosts existing `ThemeSettingsPanel`                      |
| `/admin/master-data/snackbar`        | `ManageSnackbarPage`      | protected | Hosts existing snackbar demo                             |
| `/admin/master-data/generic-card`    | `ManageGenericCardPage`   | protected | Generic card states, slots, and window controls          |
| `/admin/master-data/generic-popup`   | `ManageGenericPopupPage`  | protected | Dialog/drawer variants, forms, async and close policies  |
| `*`                                  | `RouteErrorView`          | —         | 404 within the active shell                              |

Routing rules:

- All admin routes nest under a single `ProtectedRoute` wrapper (already exists). Unauthenticated access to any `/admin/*` URL redirects to `/login`, preserving the intended URL in `location.state.returnTo`; after login, navigate to `returnTo ?? '/admin/dashboard'`.
- All feature pages remain lazy route modules (`lazy:`), matching the current chunk-per-page pattern.
- Logout from anywhere in the admin area navigates to `/` (public home), clears the session, and invalidates cached queries.

## 3. Public shell

### 3.1 Top navigation (`PublicLayout` AppBar)

- Left: brand/logo, then links **Home**, **About**, **Contact Us** (in this order). Active link is visually distinguished (color or underline per theme).
- Right: theme icon (opens the existing `ThemeSettingsPanel` drawer) and the existing `ThemeModeToggle` (dark/light). Same components as the admin shell — one source of truth for theming.
- Sticky positioning; loading bar (`LinearProgress`) under the bar during route transitions (existing pattern).
- Responsive: below `md`, nav links collapse into a menu (hamburger); right-side icons stay visible.

### 3.2 Footer (all public pages)

Rendered by `PublicFooter`, pinned to the bottom (flex column layout, `mt: 'auto'`). Mandatory content:

- App name + © year (dynamic).
- App version (from `import.meta.env` / package version).
- Links: About, Contact Us, Privacy Policy, Terms of Use.
- **Admin link**: a clearly labelled "Admin" link navigating to `/login` (or straight to `/admin/dashboard` when already authenticated).
- Contact email.
- Responsive: single column on `xs`, multi-column on `md+`.

### 3.3 Home page

- Hero section with product name and short description.
- **Initial project setup prompt**: a prominent card ("Get started — set up your project") with a CTA button leading to `/login`. Shown to unauthenticated visitors; authenticated users instead see a "Go to Admin" CTA.

### 3.4 Login

- Reuses existing `LoginPage` visual style (centered card).
- Fields: username, password — both required, no other constraint (**any non-empty username/password is accepted**; mock auth resolves without a backend credential check, or the dummyjson call is bypassed with a locally-created session).
- On success: store `{ username }` in the auth context/session, then redirect per §2.
- Validation errors inline (required-field messages); submit disabled while pending.

## 4. Admin shell

### 4.1 Top navigation (`AdminShellLayout` AppBar)

- Left: **Dashboard**, **Master Data** links. "Master Data" is active for any `/admin/master-data/*` route.
- Right, in order: logged-in **username** (with avatar/initial), theme icon (ThemeSettingsPanel), dark/light `ThemeModeToggle`, **Logout** button.
- Logout confirms nothing (single click), clears session, navigates to `/`.

### 4.2 Master Data sidebar (`MasterDataLayout`)

- Permanent left sidebar (`Drawer variant="permanent"`, width ≈ 240 px) on `md+`; temporary overlay drawer below `md`.
- Entries (top → bottom), each with icon + label, active state highlighted, navigating via nested routes:
  1. **Manage Product** → `products`
  2. **Manage Product (inline edit)** → `products-inline`
  3. **Manage User** → `users`
  4. **Manage Theme** → `theme`
  5. **Manage Snackbar** → `snackbar`
  6. **Generic Card** → `generic-card`
  7. **Generic Popup** → `generic-popup`
- Content area renders the child route via `<Outlet />`, padded, scrollable independently of the sidebar.

## 5. Manage pages — 20/80 split layout

Applies to Manage Product, Manage Product (inline edit), Manage User. Implemented once as a reusable `FormGridSplit` layout component:

- Vertical split of the available content height: **top 20% form area, bottom 80% grid area** (flex `2/8`, with a sensible `minHeight` on the form area so validation messages never clip; form area scrolls internally if it overflows).
- The grid area hosts the existing `AppDataGrid` configuration for that entity **unchanged** (preferences, filters, renderers, pagination as already implemented).

### 5.1 Form area (create/quick-add)

- Built with the existing TanStack Form + zod pattern (`ProfileFormPage` conventions, `formHelpers.ts`).
- Compact single-row (wrap on small screens) with a Submit button; disabled while invalid or submitting; inline field errors.
- **Manage Product / Manage Product (inline edit)** fields: title (required, 3–80 chars), category (select from `PRODUCT_CATEGORIES`, required), price (number > 0), stock (integer 0–99999). Submit → `createProduct` API → on success prepend the new row to the grid (`applyTransaction({ add, addIndex: 0 })`) + success snackbar; reset form.
- **Manage User** fields: first name (required, 2–40), last name (required, 2–40), email (required, valid email), age (integer 18–100). Submit → mock/dummyjson add-user endpoint → same prepend-row + snackbar behavior.
- API failure: error snackbar, form values preserved.

### 5.2 Grid area

- **Manage Product**: current `AdminProductsPage` grid (read-only + selection features).
- **Manage Product (inline edit)**: current `ProductsGridPage` grid — inline-edit framework (`buildEditableColDefs`) with title/category/stock editable, Apply/Cancel editors, pessimistic default.
- **Manage User**: current `UsersGridPage` grid — page/filter preferences, custom renderers, `GridHeaderActions` toolbar.

## 6. Cross-cutting requirements

- **Theming**: both shells consume the same `ThemeSettingsContext`; mode/theme choice persists (existing `theme/storage.ts`) and applies across public↔admin transitions.
- **State**: auth session in the existing `authContext` (sessionStorage-backed); username displayed in the admin bar comes from it.
- **Errors**: each shell keeps its own `errorElement` (`RouteErrorView`); admin errors never expose the public footer, and vice versa.
- **Accessibility**: nav landmarks (`<nav>`, `<footer>`), skip-to-content link in both shells, focus moved to main content on route change, all icon buttons labelled.
- **Performance**: layouts eager, pages lazy; grid pages keep module-level column defs (stable references) per existing convention.

## 7. Acceptance criteria (summary)

1. Visiting `/` shows Home/About/Contact Us on the left, theme icon + mode toggle on the right, and the footer with the Admin link.
2. Clicking Admin (footer) or the setup CTA leads to `/login`; entering any username/password lands on `/admin/dashboard`.
3. Direct navigation to any `/admin/*` URL while logged out redirects to login and returns to that URL after login.
4. Admin bar shows Dashboard/Master Data left; username, theme icon, mode toggle, Logout right. Logout returns to `/` and re-locks admin routes.
5. Master Data shows the 5 sidebar entries; each renders its page in place with the sidebar persistent.
6. The three manage pages show a validated form in the top ~20% and the existing grid in the bottom ~80%; invalid forms cannot submit; successful submits add a row to the grid without a full reload.
