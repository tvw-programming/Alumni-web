import Stack from '@mui/material/Stack';

import { PreferenceFieldControl } from './PreferenceFieldControl';

import type { PreferenceSectionConfig } from './types';

export interface PreferenceSectionProps<TDraft> {
  config: PreferenceSectionConfig<TDraft>;
  draft: TDraft;
  onDraftChange: (next: TDraft) => void;
}

/**
 * Body of one preference section, bound to the popup's draft. Renders the
 * config's custom content when provided, otherwise builds a form from its
 * declarative `fields` metadata using the shared controls.
 */
export function PreferenceSection<TDraft>({
  config,
  draft,
  onDraftChange,
}: PreferenceSectionProps<TDraft>) {
  if (config.renderContent) {
    return <>{config.renderContent(draft, onDraftChange)}</>;
  }

  return (
    <Stack spacing={2}>
      {(config.fields ?? []).map((spec) => (
        <PreferenceFieldControl
          key={spec.key}
          spec={spec}
          draft={draft}
          onDraftChange={onDraftChange}
        />
      ))}
    </Stack>
  );
}
