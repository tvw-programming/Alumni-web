# ReportListItem

## Benchmark references

| App | Kind | What we took |
|---|---|---|
| **MyChart (Epic)** | Feature | **Clinician release model** — a result can exist and still be held pending review, and the row says so rather than hiding it. |
| **MyChart** | Feature | Amended results marked distinctly, because a correction supersedes one the patient may already have acted on. |
| **LabCorp** | Design | Compact list row: category icon, title, collected/reported date, status, actions on the right. |
| **LabCorp** | Feature | Abnormal-findings flag set by the laboratory, never derived by the client. |
| **NHS App** | Design | Processing state as a spinner in the icon slot, so the row keeps its geometry while a result is pending. |
| **1mg / Apollo 24\|7** | Feature | Download size shown before the tap — relevant on metered mobile data. |
| **Practo** | Design | Long formal report titles clamped to two lines so rows stay even. |

## The clinically important behaviour

**A result can exist and still not be releasable.** `awaitingClinicianRelease`
is modelled separately from `status`, because a patient reading an abnormal
cancer marker before their clinician has seen it is a genuine harm — and the
opposite failure, hiding the row entirely, makes the patient think nothing was
done.

So the row shows the result exists, withholds View and Download, and explains
the wait: *"Your clinician is reviewing this result and will release it with an
explanation."*

Abnormality is flagged by the source system, never computed here — the same rule
as `VitalsCard`, for the same reason.

## Accessibility

- One `role="group"` per row, labelled with title, category, date, status, and
  — critically — the abnormal-findings and held states. A flag a screen-reader
  user never hears is not a flag.
- "Findings outside the reference range" is a **word plus an icon**; a red dot
  alone communicates nothing in greyscale.
- Download names the file and its size.
- Cancelled titles are struck through *and* the actions are withheld.

## Usage

```html
@for (report of reports(); track report.id) {
  <app-report-list-item
    [report]="report"
    (view)="viewer.open($event)"
    (download)="documents.download($event)"
  />
}
```

Report URLs must not carry PHI — pass an id and let the server resolve it behind
authentication.
