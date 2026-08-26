import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import FormLabel from '@mui/material/FormLabel';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';

import { describe, formatMoney, type Money, type VariantId } from '../../../foundation';

export interface VariantOption {
  id: VariantId;
  label: string;
  /** `null` when the option exists but cannot currently be bought. */
  price?: Money | null;
  available: boolean;
  /** A swatch renders a colour chip; anything else renders text. */
  swatch?: string;
}

export interface VariantGroup {
  name: string;
  options: VariantOption[];
}

export interface ProductVariantSelectorProps {
  groups: VariantGroup[];
  /** Selected option id per group name. Controlled. */
  value: Record<string, VariantId | undefined>;
  onChange: (groupName: string, optionId: VariantId) => void;
}

/**
 * Size, colour and the rest, as radio groups.
 *
 * Radio semantics rather than buttons: a screen reader then announces "2 of 5"
 * and arrow keys move between options, which is what a user expects of a
 * single-choice control.
 *
 * Unavailable options stay visible and disabled rather than disappearing.
 * Removing them hides the fact that the product comes in that size at all, and
 * "we don't have your size right now" is more useful than silence.
 *
 * No React 19 Action here: selection is local until something is added to the
 * cart, and that is the mutation.
 */
export function ProductVariantSelector({ groups, value, onChange }: ProductVariantSelectorProps) {
  return (
    <Stack spacing={2}>
      {groups.map((group) => {
        const selectedId = value[group.name];
        const selected = group.options.find((option) => option.id === selectedId);

        return (
          <Box key={group.name} role="radiogroup" aria-label={group.name}>
            <Stack direction="row" spacing={1} alignItems="baseline" sx={{ mb: 0.5 }}>
              <FormLabel component="legend" sx={{ fontWeight: 600, fontSize: 14 }}>
                {group.name}
              </FormLabel>
              {selected ? (
                <Typography variant="caption" color="text.secondary">
                  {selected.label}
                </Typography>
              ) : null}
            </Stack>

            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
              {group.options.map((option) => {
                const isSelected = option.id === selectedId;
                return (
                  <Chip
                    key={option.id}
                    role="radio"
                    aria-checked={isSelected}
                    aria-disabled={!option.available}
                    // The label states availability; the strike-through and the
                    // colour only reinforce it.
                    aria-label={describe(
                      `${group.name} ${option.label}`,
                      option.price ? formatMoney(option.price) : undefined,
                      option.available ? undefined : 'unavailable',
                    )}
                    label={option.label}
                    variant={isSelected ? 'filled' : 'outlined'}
                    color={isSelected ? 'primary' : 'default'}
                    onClick={
                      option.available
                        ? () => {
                            onChange(group.name, option.id);
                          }
                        : undefined
                    }
                    icon={
                      option.swatch ? (
                        <Box
                          component="span"
                          aria-hidden
                          sx={{
                            width: 14,
                            height: 14,
                            borderRadius: '50%',
                            bgcolor: option.swatch,
                            border: '1px solid',
                            borderColor: 'divider',
                            ml: 1,
                          }}
                        />
                      ) : undefined
                    }
                    sx={{
                      opacity: option.available ? 1 : 0.5,
                      textDecoration: option.available ? 'none' : 'line-through',
                      cursor: option.available ? 'pointer' : 'not-allowed',
                    }}
                  />
                );
              })}
            </Stack>
          </Box>
        );
      })}
    </Stack>
  );
}
