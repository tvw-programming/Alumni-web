# ContentCarousel

A titled rail.

## API

```ts
type ContentCarouselProps = {
  title: string;
  itemCount: number;
  loading?: boolean;
  emptyMessage?: string;
  children: ReactNode;
};
```

## A native scroller, not a transform carousel

`overflow-x: auto` with `scroll-snap` keeps momentum scrolling on touch,
keyboard tabbing through items, and the browser's own scrollbar. A
transform-based carousel throws all three away and reimplements them worse.

The scrollbar stays visible — hiding it removes the only cue that there is more
to the right.

## Accessibility

A labelled `<section>`: _"Trending now, 12 titles."_ A screen-reader user can
skip a rail they do not want instead of tabbing through twelve posters to find
out what it is.

The arrow buttons are `aria-hidden` with `tabIndex={-1}` — keyboard users
already have Tab and arrow keys, and duplicating that adds two dead stops per
rail.

## States

loading (five skeletons at poster size, so the row does not collapse) · empty
(a sentence, not a blank strip) · content.
