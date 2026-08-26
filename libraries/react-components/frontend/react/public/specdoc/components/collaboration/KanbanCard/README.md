# KanbanCard

## API

```ts
type KanbanCardProps = {
  card: KanbanCardData;
  moveTargets: { id: string; label: string }[];
  onPress: () => void;
  onMove: (toColumnId: string) => Promise<void>;
};
```

## The menu is not a convenience

It is the **only** way this card moves without a pointer. Drag and drop is
unusable by keyboard and by screen reader, so "Move to In progress" exists on
every card whether or not dragging is wired up.

## React 19

Moving is the parent's Action, because the mutation needs source column,
destination column **and position** — and only the board knows the position.
`useOptimistic` applies after the drop or menu choice, and rolls back on
conflict (see `KanbanColumn`).

## Details

"Blocked" is a reason, not a flag: _"Blocked · waiting on legal review"_. A
blocked card with no reason is a card nobody can unblock.
