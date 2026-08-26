# MealCard

## API

```ts
type MealCardProps = {
  mealName: string;
  entries: FoodEntry[]; // name, portion, calories, proteinG, carbsG, fatG, pending?
  targetCalories?: number;
  onAddFood: () => void;
  onRemoveEntry?: (id: string) => void;
};
```

## Macros in grams, with units

"P 32g · C 45g · F 12g" — never unlabelled numbers or a colour-coded bar alone.
That line is what someone tracking actually needs, and it is the part that must
survive being read aloud.

## Totals are derived, not stored

A pure `totals()` reduce. Storing them alongside the entries gives two sources
for one number, and they drift the first time a row is removed.

## React 19

`useOptimistic` for adding an entry — **only while the row is visibly marked
"saving…"**, in both the text and the accessible label. `useActionState` for the
save itself.
