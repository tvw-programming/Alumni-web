import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { useMemo } from 'react';

import { GenericPopup } from '@/components/GenericPopup';

import { useSpeechContext } from './useSpeechCommands';

/**
 * The vocabulary, read from the live registry.
 *
 * A voice interface with no discoverable command list is a guessing game, so
 * "help" opens this. It lists what is registered *right now*, which means a
 * page that adds its own commands documents itself for free.
 */
export function SpeechHelpDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { getCommands } = useSpeechContext();

  // Read once per open: the registry is a ref, so there is nothing to subscribe
  // to and nothing that should re-render this while it is on screen.
  const groups = useMemo(() => {
    if (!open) return [];
    const byGroup = new Map<string, string[]>();
    for (const command of getCommands()) {
      const existing = byGroup.get(command.group) ?? [];
      existing.push(command.phrases[0]);
      byGroup.set(command.group, existing);
    }
    return [...byGroup.entries()];
  }, [open, getCommands]);

  return (
    <GenericPopup
      open={open}
      onClose={onClose}
      size="medium"
      header={{
        title: 'Voice commands',
        description:
          'Say a destination on its own, or lead with "go to", "open" or "show me". Close phrases still match. Master Data entries also answer to their position — "open the second menu", "menu 3".',
      }}
      actions={{ hideCancel: false, cancelLabel: 'Close' }}
    >
      <Stack spacing={2}>
        {groups.map(([group, phrases]) => (
          <Stack key={group} spacing={1}>
            <Typography variant="subtitle2">{group}</Typography>
            <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
              {phrases.map((phrase) => (
                <Chip key={phrase} size="small" variant="outlined" label={phrase} />
              ))}
            </Stack>
          </Stack>
        ))}
        {groups.length === 0 && (
          <Typography color="text.secondary">No commands are registered on this screen.</Typography>
        )}
      </Stack>
    </GenericPopup>
  );
}
