# MediaGridViewer

A media grid that opens into a lightbox.

## API

```ts
type MediaGridViewerProps = {
  media: MediaAsset[]; // alt is required on every asset
  maxTiles?: number; // default 4; the last tile shows "+N"
};
```

## Alt text is a visible caption

Shown in the lightbox, not only in the `alt` attribute. Sighted users benefit
from a description too, and making it visible is what causes anyone to notice
when it is missing or wrong.

## Keyboard

Arrow keys move between items, Escape closes. A lightbox without keyboard
navigation is a trap for anyone not using a mouse. Every tile is a real
`<button>` with a focus ring, and the position is announced as _"3 of 5"_
through `role="status"`.

## Details

Grid tiles use `alt=""` because the button already carries the description —
otherwise it is announced twice. The overflow tile says _"…, and 2 more"_.
