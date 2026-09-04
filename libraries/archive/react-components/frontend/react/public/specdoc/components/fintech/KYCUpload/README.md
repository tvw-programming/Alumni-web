# KYCUpload

One identity document.

## API

```ts
type KYCUploadProps = {
  document: KycDocument; // { id, label, guidance, state, rejectionReason?, acceptedTypes?, maxSizeBytes? }
  onUpload: (file: File) => Promise<void>;
};
```

## What matters

- **`guidance` does the real work.** Most KYC rejections are avoidable
  photographs — a cut corner, a glare, an expired card. Telling people before
  they shoot is cheaper than a rejection round trip that takes days.
- **A rejection always carries a reason.** "Rejected" with no reason is the most
  frustrating state in onboarding.
- **The file never enters component state.** It goes straight to the Action.

## React 19

`useActionState` for the upload, so the pending state is managed and a failure
is state rather than a thrown error.

## Privacy

An identity document is the most sensitive payload in the app. Never log it,
never put it in a cache key, never retry it into a third-party error reporter.
Upload as multipart — a 5 MB photo becomes 6.7 MB base64-encoded.

## Accessibility

The file input is positioned off-screen with opacity rather than `hidden`: some
screen readers skip a `hidden` input entirely. The visible button carries the
label and relabels itself to "Upload a new photo" after a rejection.
