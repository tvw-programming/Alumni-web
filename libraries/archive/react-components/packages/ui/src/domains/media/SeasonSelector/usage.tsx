import { useState } from 'react';

import sample from './sample.json';
import { SeasonSelector } from './SeasonSelector';

export function SeasonSelectorUsage() {
  const [selectedId, setSelectedId] = useState(sample.selectedId);
  return (
    <SeasonSelector seasons={sample.seasons} selectedId={selectedId} onChange={setSelectedId} />
  );
}
