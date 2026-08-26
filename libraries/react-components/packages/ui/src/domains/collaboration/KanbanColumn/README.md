# KanbanColumn

## API

```ts
type KanbanColumnProps = {
  title: string;
  count: number;
  wipLimit?: number;
  notice?: string; // e.g. after a rejected move
  children: ReactNode;
  onAddCard?: () => void;
};
```

## The WIP limit is surfaced, never silently enforced

Blocking a drop with no explanation reads as a broken board. "5/4 — over the
limit of 4" tells the team what the board is trying to say, which is the entire
purpose of the limit.

## React 19

`useOptimistic` for card movement — applied **after** the drop or the menu
choice, never during a drag. The mutation carries source column, destination
column and position, and rolls back on conflict, with the reason surfaced
through `notice`: _"Card moved."_ / _"Column limit reached."_

## Accessibility

A labelled `<section>`: _"In progress, 5 cards, over the work-in-progress
limit."_ A screen-reader user can move between columns and know how many cards
each holds without stepping through all of them. The empty state says so rather
than rendering nothing.
