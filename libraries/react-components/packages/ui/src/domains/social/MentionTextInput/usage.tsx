import { useState } from 'react';

import { MentionTextInput, type MentionCandidate } from './MentionTextInput';
import sample from './sample.json';

export function MentionTextInputUsage() {
  const [value, setValue] = useState(sample.value);
  const [candidates, setCandidates] = useState<MentionCandidate[]>(sample.candidates);

  return (
    <MentionTextInput
      value={value}
      label={sample.label}
      candidates={candidates}
      onChange={setValue}
      // Debounce and cancel upstream. `useActionState` is for submitting the
      // comment, never for an autocomplete keystroke — one Action per character
      // is a request storm with a queue behind it.
      onQueryChange={(query) => {
        if (query === null) {
          setCandidates([]);
          return;
        }
        setCandidates(
          sample.candidates.filter((candidate) =>
            `${candidate.name} ${candidate.handle}`.toLowerCase().includes(query.toLowerCase()),
          ),
        );
      }}
    />
  );
}
