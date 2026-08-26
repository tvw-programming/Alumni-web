import Stack from '@mui/material/Stack';
import { useState } from 'react';

import { PreferenceIconButton } from './PreferenceIconButton';
import { PreferencePopup } from './PreferencePopup';

import type { AnyPreferenceSectionConfig } from './types';

export interface PreferencesBarProps {
  /** One icon button per section; each opens its own popup. */
  sections: AnyPreferenceSectionConfig[];
}

/**
 * Row of icon-button triggers for a route's preference sections.
 *
 * Badge behaviour is fully config-driven: set `active: true` on a section
 * config to show the red dot — no extra props needed here.
 *
 * Any route gets the same UX by handing this component its own sections.
 */
export function PreferencesBar({ sections }: PreferencesBarProps) {
  const [openId, setOpenId] = useState<string | null>(null);

  return (
    <Stack direction="row" spacing={1} alignItems="center">
      {sections.map((section) => (
        <PreferenceIconButton
          key={section.id}
          title={section.title}
          icon={section.icon}
          active={openId === section.id}
          // Red dot when the section's preferences are non-default.
          // Comes straight from the section config — no extra wiring required.
          badgeActive={section.active}
          onClick={() => setOpenId(openId === section.id ? null : section.id)}
        />
      ))}

      {sections.map((section) => (
        <PreferencePopup
          key={section.id}
          config={section}
          open={openId === section.id}
          onClose={() => setOpenId(null)}
        />
      ))}
    </Stack>
  );
}
