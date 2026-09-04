# Feature specification template (for AI code generation)

A spec that produces good generated code is **not** a description of the
feature. It is a list of *decisions already made*, *constraints that must hold*,
and *how we will know it worked*.

Everything below is derived from what actually went wrong building this
repository. Each section names the real bug it would have prevented.

---

## The template

Copy this per feature or component. Delete sections that genuinely do not apply
— but delete them deliberately, not by forgetting.

````markdown
# <Feature name>

## 1. Identity
- **Route / entry point:** /admin/master-data/products-inline
- **Files:** frontend/react/src/features/admin/…, api/internal/handler/…
- **Replaces / extends:** (existing file, or "new")
- **Who uses it:** internal admin | end user | developer showcase

## 2. Data contract  ← the single most valuable section
- **Source of truth:** `db/init/003_products.sql` / `productSchema.json` / this doc
- **Shape:** (paste the interface, JSON Schema, or SQL DDL — do not describe it in prose)
- **Which API does this read?** exact URL + method
- **Which API does this write?** exact URL + method + status codes
- **Field-by-field:** name, type, required, constraints, and *what the constraint
  means* (e.g. "3–15 chars, because it is a human-typed SKU")

## 3. Behaviour
Numbered, each independently checkable. Write them so a test could be pasted
straight out.

1. On load, the table populates from `GET /api/products?page=1&pageSize=25`.
2. On valid submit, POST returns the created row; the row is inserted at the top
   of the table **without a refetch**.
3. On invalid submit, no request is sent and each invalid field shows a message.
4. …

## 4. States
Every one, explicitly. Missing states is the most common cause of "works on my
machine".

| State | What renders | Notes |
| --- | --- | --- |
| loading (first) | skeleton / spinner | |
| loading (refresh) | previous data + subtle indicator | **must not** blank the view |
| empty | message + next action | distinct from loading |
| error | message + retry | which message? whose wording? |
| partial (some fields failed) | | |
| unauthorised | redirect where? | |

## 5. Decisions already made
So the generator does not re-litigate them, and so a reviewer can tell intent
from accident.

- Price is `NUMERIC(12,2)` / string in JSON — **never** a float.
- The access token lives in memory; the refresh token in an httpOnly cookie.
- Create does **not** invalidate the list; the response row is inserted directly.
- Sorting is whitelisted server-side.

## 6. Non-goals
Explicit exclusions. Without these, scope grows silently.

- No bulk import.
- No soft delete.
- No optimistic UI on create (only on inline edit).

## 7. Constraints
- **Versions:** Angular 22 / AG Grid v36 / Node ≥ 24.15
- **Performance budget:** initial bundle ≤ 170 kB; list query ≤ 1 query + 1 count
- **Accessibility:** keyboard-operable; every control labelled; no `role="img"`
  on composite widgets
- **Security:** whose data is this? what happens if the client is modified?

## 8. Verification  ← write this *before* the code
How we will know it works. Be specific enough that "done" is not a judgement
call.

- [ ] `curl 'localhost:8081/api/products?pageSize=2'` returns 2 items and a total
- [ ] Submitting the form with an empty required field sends **no** request
- [ ] After create, the new row is visually first (sort by bounding rect — AG Grid
      DOM order is not visual order)
- [ ] Reload on a protected route does not bounce to /login
- [ ] `pnpm test && pnpm lint && ng build` all clean

## 9. Known traps
Environment-specific things that will otherwise be discovered the hard way.

- Backticks inside an Angular inline `template:`/`styles:` terminate the
  template literal.
- `localStorage` is present-but-`undefined` in this test DOM.
- Postgres `NOT NULL DEFAULT '{}'` is not applied when the client sends explicit
  NULL (a nil Go slice does exactly that).
````

---

## Why each section earns its place

Every row below is a real defect from this repository, and the section that
would have caught it.

| Section | Bug it would have prevented |
| --- | --- |
| **2. Data contract** | The inline-edit page was built against `dummyjson.com`, then had to be rewired to our own API. "Which API does this read?" is one line and would have saved the rebuild. |
| **2. Field constraints** | `product_document_paths` is `NOT NULL DEFAULT '{}'`; a nil Go slice sends explicit NULL, which the default does not cover. Every create 500'd. |
| **3. Behaviour, numbered** | "On create, silently update the table" is unambiguous. "The table should update" is not — it permits a refetch, which would have discarded the user's scroll position. |
| **4. States** | The React and Angular apps both redirected to `/login` on reload, because "restoring" was not listed as a state distinct from "signed out". |
| **5. Decisions** | I twice wrote a *confident false comment* — "`httpResource` aborts the in-flight request" (it does not) and "AG Grid ignores `addIndex`" (it does not). A decisions list is where such a claim gets checked once instead of asserted repeatedly. |
| **6. Non-goals** | Grid column-preference persistence exists in React and not in Angular. That is fine — but it needed saying, not discovering. |
| **7. Constraints (versions)** | AG Grid v36 renamed `.ag-center-cols-container`; `corepack` was removed from Node 25+ images; `@angular/animations` is deprecated in v22. Each cost a build cycle. |
| **8. Verification** | Highcharts rendered in dev and **silently rendered nothing** in the production container. Only "verify in the built image" caught it. |
| **9. Known traps** | The backtick-in-template-literal bug hit **three separate times**. Written down once, it costs nothing thereafter. |

---

## Practical rules

### Paste the contract; do not describe it

The single highest-leverage thing in this repo is
[`productSchema.json`](../frontend/react/src/schemas/productSchema.json) — 21
fields as data. Both frontends render from it and the database mirrors it. A
prose description of those fields would have drifted within a week.

> **Rule:** if a shape can be expressed as SQL DDL, a TypeScript interface, or a
> JSON Schema, paste that. Prose is for *why*, never for *what*.

### Write the verification before the code

Not as ceremony — because it forces the ambiguity out early. "The table updates
silently" becomes "the new row is visually first, and no GET is issued", and
those two are checkable. The first is an opinion.

### State the failure direction

For anything security- or data-adjacent, say which way it should fail:

- "A production build with no `AUTH_ENDPOINT` **refuses to sign anyone in**"
- "Closing is blocked while saving **unless the caller opts out**"
- "An unknown sort column is **ignored**, not passed through"

Generated code defaults to the permissive branch unless told otherwise.

### Distinguish "absent" from "empty"

This one bites constantly. In this repo it appears in three places: PATCH
semantics (pointer fields), form values (`''` means untouched), and pagination
(`total: null` means *not counted*, `0` means *counted, none*). If your feature
has a partial-update path, say so explicitly.

### Do not specify what you do not care about

A spec that pins the variable names produces code that fights the codebase's
existing conventions. Pin the **contract**, the **behaviour**, and the
**constraints** — leave structure to whatever matches the surrounding code.

---

## Minimal version

For a small component, this is enough:

````markdown
# <Component>
**Contract:** (interface / props)
**Behaviour:** 1) … 2) … 3) …
**States:** loading | empty | error | content — what renders in each
**Non-goals:** …
**Verify:** …
````

---

## One more thing: ask for the evidence

When the generated code comes back, ask *how it was verified*, not whether it
works. In this session that distinction mattered repeatedly — several things
"looked right" and were wrong:

- Chart rendering, which passed in dev and failed in the container
- Row ordering, where the DOM order I measured was not the visual order
- A bcrypt hash I nearly committed that did **not** match the password it
  claimed to

A spec that ends with "how we will know" turns that from a habit into a
requirement.
