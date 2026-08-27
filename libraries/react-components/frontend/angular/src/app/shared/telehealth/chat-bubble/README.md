# ChatBubble

## Benchmark references

| App | Kind | What we took |
|---|---|---|
| **WhatsApp** | Design | Side-anchored bubbles with a tail, time and delivery ticks tucked into the bottom-right of the bubble. |
| **WhatsApp** | Feature | Four-state delivery (sending → sent → delivered → read) shown only on messages you sent. |
| **iMessage** | Design | Consecutive messages from one author grouped, with the name shown once. |
| **Signal** | Feature | Failed sends recover **in place** — "Not sent · Try again" beside the message, not a toast that scrolls away. |
| **MyChart (Epic)** | Design | System notices centred and visually distinct from turns in the conversation. |
| **MyChart** | Feature | The thread is stated to be part of the medical record — messages are not ephemeral chat. |
| **Halodoc** | Feature | Attachment handling built for patient-uploaded clinical photographs. |
| **Doctolib** | Feature | Withdrawn messages leave a tombstone rather than disappearing. |

## Two things a generic chat bubble does not do

**Attachments are gated on a virus scan.** A clinical thread carries
patient-uploaded files. `scanStatus: 'pending'` renders as text with no link;
only `'clean'` becomes an openable control. Offering a download before the scan
completes makes the app the delivery mechanism.

**Redaction leaves a tombstone.** A withdrawn message that simply disappears
makes the thread read as though it was never sent — wrong in a record that may
later be disclosed.

## Accessibility

- The frame carries one `aria-label` with the whole sentence
  (*"Dr Imran Sheikh, 9:14 am: Is it itchy or painful…"*); the visual parts are
  `aria-hidden`. Otherwise a screen reader announces author, body, time and tick
  marks as four disconnected fragments.
- Side is the primary author signal and colour is secondary, so the thread reads
  correctly in greyscale.
- `role="alert"` on a failed send.
- `overflow-wrap: anywhere` — clinical messages carry long identifiers and URLs
  that otherwise overflow the bubble.

## Usage

```html
@for (message of thread(); track message.id; let i = $index) {
  <app-chat-bubble
    [message]="message"
    [showAuthor]="message.author !== thread()[i - 1]?.author"
    (retry)="chat.resend($event)"
    (openAttachment)="viewer.open($event)"
  />
}
```

`ChatMessage.body` is PHI: never log it, never put it in an analytics payload.
