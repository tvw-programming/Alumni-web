# ConsentDialog

## Benchmark references

| App | Kind | What we took |
|---|---|---|
| **Teladoc** | Design | Pre-consult consent gate: a single dialog immediately before the call, not a link buried in onboarding. |
| **Teladoc** | Feature | Required and optional consents visibly separated, so declining research use does not read as blocking the appointment. |
| **Amwell** | Design | Each clause carries its own short plain-language body under the checkbox rather than one wall of legal text. |
| **Amwell** | Feature | Recording consent handled as its own decision, because it is the one patients most often decline. |
| **MyChart (Epic)** | Feature | Versioned document acknowledgement — the record stores *which version* was agreed to. |
| **Doctolib** | Design | "Read the full document" as a secondary link, so the summary stays readable and the full text stays reachable. |
| **Babylon Health** | Feature | Explicit statement that a remote consultation cannot include a physical examination — a clinical-safety disclosure, not boilerplate. |

## Four rules this component enforces

Each is a compliance requirement before it is a UX preference.

1. **Nothing is pre-ticked.** A checkbox that arrives checked is not consent;
   it is an assumption the patient must notice and undo.
2. **Optional consents are genuinely optional**, and the heading says so out
   loud — a list of checkboxes reads as all-or-nothing otherwise.
3. **Every clause produces a decision, including declines.** `granted: false`
   is a fact the audit trail needs; absence is not evidence.
4. **Dismissal is distinguishable from decline.** Open with
   `disableClose: true`; a patient who read the terms and said no is a
   different audit entry from one who hit Escape.

One timestamp is stamped across the whole snapshot, because the decision was
made when the button was pressed — not when a box happened to be ticked while
reading.

## Accessibility

- The error names *which* clauses are outstanding rather than saying "please
  accept the terms".
- `role="alert"` so the failed attempt is announced.
- Content is height-capped so the actions stay visible: a patient should always
  be able to see the way out of a consent dialog.
- Clause bodies are capped at ~60 characters per line — consent prose is read,
  not scanned.

## Usage

```ts
const ref = this.dialog.open<ConsentDialog, ConsentDialogData, ConsentDialogResult>(
  ConsentDialog,
  {
    data: consentData,
    disableClose: true, // dismissal must not masquerade as a decision
    width: '40rem',
  },
);

const result = await firstValueFrom(ref.afterClosed());
if (result?.outcome === 'accepted') {
  await this.audit.recordConsent(result.decisions); // server-side, always
  this.call.join();
} else if (result?.outcome === 'declined') {
  await this.audit.recordConsent(result.decisions); // declines are recorded too
}
```

The component never writes the audit entry itself — it returns decisions and
the caller persists them server-side, so consent cannot be recorded by a client
that then fails to reach the server.
