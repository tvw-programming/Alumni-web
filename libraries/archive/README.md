# Library archive

These trees are **not part of the 24-step CodeGen Core engine**. They were
advertised as first-class monorepo projects but are either empty stubs or large
component showcases unrelated to `core/backend` / `core/frontend`.

| Path | Approx. size | Why archived |
|------|--------------|--------------|
| `react-components/` | ~405 MB | Domain UI showcase / multi-frontend demo; not consumed by the pipeline |
| `myapp4-2/` | ~14 MB | Misnamed React Native copy (`myapp4 2`); space + trailing `2` = accidental duplicate |
| `angular-components/` | 0 B | Empty placeholder |
| `shared-components/` | 0 B | Empty placeholder |

Do **not** wire these back into `monorepo.json` workspaces or root `package.json`
until they have a real consumer and a maintainer.

The live product lives under **`core/`**. Outer `libraries/` is reserved capacity
only (this `archive/` folder plus future real shared libs).
