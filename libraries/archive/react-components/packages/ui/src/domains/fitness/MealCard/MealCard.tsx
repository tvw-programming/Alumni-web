import AddIcon from '@mui/icons-material/Add';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Divider from '@mui/material/Divider';
import LinearProgress from '@mui/material/LinearProgress';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';

import { describe } from '../../../foundation';

export interface FoodEntry {
  id: string;
  name: string;
  portion: string;
  calories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  /** True while the entry is still being saved. */
  pending?: boolean;
}

export interface MealCardProps {
  mealName: string;
  entries: FoodEntry[];
  /** Calorie target for this meal, when the plan sets one. */
  targetCalories?: number;
  onAddFood: () => void;
  onRemoveEntry?: (id: string) => void;
}

/** Pure. Totals are arithmetic, not state — deriving them cannot go stale. */
function totals(entries: FoodEntry[]) {
  return entries.reduce(
    (sum, entry) => ({
      calories: sum.calories + entry.calories,
      proteinG: sum.proteinG + entry.proteinG,
      carbsG: sum.carbsG + entry.carbsG,
      fatG: sum.fatG + entry.fatG,
    }),
    { calories: 0, proteinG: 0, carbsG: 0, fatG: 0 },
  );
}

/**
 * One meal and its food entries.
 *
 * Macros are shown in **grams with their unit**, never as unlabelled numbers or
 * a colour-coded bar alone. "P 32g · C 45g · F 12g" is what someone tracking
 * actually needs, and it is the part that must survive being read aloud.
 *
 * A pending entry is visibly marked. Optimistic insertion is fine here — it is
 * the user's own log — but only while the row says it has not saved yet.
 */
export function MealCard({
  mealName,
  entries,
  targetCalories,
  onAddFood,
  onRemoveEntry,
}: MealCardProps) {
  const sum = totals(entries);
  const percent =
    targetCalories === undefined || targetCalories === 0
      ? undefined
      : Math.round((sum.calories / targetCalories) * 100);

  return (
    <Card variant="outlined">
      <CardContent>
        <Stack direction="row" justifyContent="space-between" alignItems="baseline">
          <Typography variant="subtitle2" fontWeight={700}>
            {mealName}
          </Typography>
          <Typography
            variant="body2"
            fontWeight={700}
            aria-label={describe(
              mealName,
              `${String(sum.calories)} calories`,
              targetCalories ? `of ${String(targetCalories)} target` : undefined,
              `protein ${String(sum.proteinG)} grams`,
              `carbohydrate ${String(sum.carbsG)} grams`,
              `fat ${String(sum.fatG)} grams`,
            )}
          >
            {targetCalories !== undefined
              ? `${String(sum.calories)} / ${String(targetCalories)} kcal`
              : `${String(sum.calories)} kcal`}
          </Typography>
        </Stack>

        {percent !== undefined ? (
          <LinearProgress
            variant="determinate"
            value={Math.min(percent, 100)}
            aria-hidden
            sx={{ mt: 1, height: 4, borderRadius: 2 }}
          />
        ) : null}

        {/* Grams with units, always. */}
        <Typography
          variant="caption"
          color="text.secondary"
          sx={{ mt: 0.5, display: 'block' }}
          aria-hidden
        >
          {`P ${String(sum.proteinG)}g · C ${String(sum.carbsG)}g · F ${String(sum.fatG)}g`}
        </Typography>

        <Divider sx={{ my: 1.5 }} />

        <Stack spacing={1}>
          {entries.length === 0 ? (
            <Typography variant="caption" color="text.secondary">
              Nothing logged yet.
            </Typography>
          ) : (
            entries.map((entry) => (
              <Stack
                key={entry.id}
                direction="row"
                justifyContent="space-between"
                spacing={2}
                sx={{ opacity: entry.pending === true ? 0.6 : 1 }}
                aria-label={describe(
                  entry.name,
                  entry.portion,
                  `${String(entry.calories)} calories`,
                  `protein ${String(entry.proteinG)} grams`,
                  `carbohydrate ${String(entry.carbsG)} grams`,
                  `fat ${String(entry.fatG)} grams`,
                  // Marked, always, while it is still saving.
                  entry.pending === true ? 'saving' : undefined,
                )}
              >
                <Box sx={{ minWidth: 0 }} aria-hidden>
                  <Typography variant="body2" noWrap>
                    {entry.name}
                    {entry.pending === true ? ' · saving…' : ''}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {`${entry.portion} · P ${String(entry.proteinG)}g · C ${String(entry.carbsG)}g · F ${String(entry.fatG)}g`}
                  </Typography>
                </Box>

                <Stack direction="row" spacing={1} alignItems="center">
                  <Typography variant="body2" aria-hidden>
                    {`${String(entry.calories)} kcal`}
                  </Typography>
                  {onRemoveEntry ? (
                    <Button
                      size="small"
                      color="inherit"
                      aria-label={`Remove ${entry.name}`}
                      onClick={() => {
                        onRemoveEntry(entry.id);
                      }}
                    >
                      Remove
                    </Button>
                  ) : null}
                </Stack>
              </Stack>
            ))
          )}
        </Stack>

        <Button size="small" startIcon={<AddIcon />} onClick={onAddFood} sx={{ mt: 1.5 }}>
          {`Add food to ${mealName}`}
        </Button>
      </CardContent>
    </Card>
  );
}
