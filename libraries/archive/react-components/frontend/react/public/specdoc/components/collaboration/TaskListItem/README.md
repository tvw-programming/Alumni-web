# TaskListItem

## API

```ts
type TaskListItemProps = {
  task: Task; // title, completed, status, priority?, dueDate?, assignee?, subtaskProgress?
  onToggle: (completed: boolean) => Promise<void>;
  onPress: () => void;
};
```

## React 19

`useOptimistic` for completion — the user's own decision, instantly reversible,
and a checkbox that waits for a round trip is the most annoying control in any
task app. React restores the server's value if a permission or conflict rule
rejects it.

Assignment and priority changes are `useActionState` (see `KanbanCard`): those
can be refused for reasons the user cannot predict.

## Accessibility

The row is one sentence:

> "Prepare quarterly report, incomplete, High priority, due 2 days ago
> (19 Aug 2026, 17:00), overdue, assigned to Maya, 3 of 5 subtasks done."

The checkbox carries its own label ("Complete Prepare quarterly report") because
the row's label describes the whole task. **Overdue is a word**, not a red date —
red is invisible to a screen reader and to a colour-blind user.
