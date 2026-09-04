import { MealCard, type FoodEntry } from './MealCard';
import sample from './sample.json';

export function MealCardUsage() {
  // The third entry is marked `pending` — optimistic insertion is fine for the
  // user's own log, but only while the row says it has not saved yet.
  const entries = sample.entries as FoodEntry[];

  return (
    <MealCard
      mealName={sample.mealName}
      entries={entries}
      targetCalories={sample.targetCalories}
      onAddFood={() => {
        /* open the food search */
      }}
      onRemoveEntry={() => {
        /* delete and refetch the day */
      }}
    />
  );
}
