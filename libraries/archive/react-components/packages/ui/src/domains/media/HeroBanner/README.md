# HeroBanner

The featured title at the top of a catalogue.

## API

```ts
type HeroBannerProps = {
  title: HeroTitle; // title, backdropUri, logline, year?, maturityRating?, genres?, resumeLabel?
  onPlay: () => void;
  onMoreInfo?: () => void;
  onToggleWatchlist?: (next: boolean) => Promise<void>;
};
```

## The title is text over the image

Never a title-treatment PNG baked into the artwork. A logo image carries no text
for a screen reader, does not reflow, and vanishes when the CDN is slow —
precisely when the user is staring at the top of the page.

The gradient is what keeps the text readable over arbitrary artwork; without it,
contrast depends on whatever the still happens to look like.

## `resumeLabel`

"Resume from 1:02:22" rather than a bare "Play" — the position is the reason
someone came back.

## Accessibility

A labelled `<section>` carrying the whole pitch, so a screen-reader user gets the
logline without hunting; every visual fragment is `aria-hidden`.
