# `_core` — telehealth domain

Shared types and the signal stores every telehealth component reads.

## Corrections to the source blueprint

The specification these were built from contains patterns that do not compile
on Angular 22. They are corrected here, and the reasons are worth keeping:

| Blueprint | Reality | Why it matters |
|---|---|---|
| `signal.mutate(arr => arr.push(x))` | **Removed from Angular** before v18. Use `update(cur => [...cur, x])`. | Beyond not existing: mutating in place leaves the signal's reference identical, so no `computed()` downstream re-evaluates. The UI would silently not update. |
| `readonly appointments = computed(() => this._appointments())` | `this._appointments.asReadonly()` | A `computed` wrapping a bare signal read allocates a second reactive node for no derivation. |
| `@Input() doctor!: Doctor` | `readonly doctor = input.required<Doctor>()` | Signal inputs participate in the reactive graph; decorator inputs force `ngOnChanges` plumbing for anything derived. |
| `standalone: true` | Omit it | Standalone is the default from v19; the flag is redundant. |
| `constructor(private http: HttpClient)` | `private readonly http = inject(HttpClient)` | The idiom this codebase already uses everywhere. |
| `.subscribe()` inside the API service | Return the observable, or use `httpResource` | A `subscribe` with no teardown and no error branch leaks and swallows failures. |
| `*ngFor` + `trackBy` | `@for (x of xs; track x.id)` | Built-in control flow; `track` is mandatory rather than optional. |
| `mat-stroked-button` | `matButton="outlined"` | Material 19+ renamed the button attribute API. |

## PHI handling

- `clear()` on every store is called at sign-out. Appointment and chat data is
  PHI; a store that outlives a session hands the next user the previous one's
  clinical data.
- Nothing here writes to `localStorage`. If caching becomes necessary it must be
  encrypted and user-scoped, per the blueprint's own governance section.
- `ChatMessage.body` and `Appointment.reasonForVisit` are PHI and must never
  reach a logger or an analytics payload.
