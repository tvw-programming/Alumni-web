import { useState } from 'react';

import { asId, type VariantId } from '../../../foundation';

import { ProductVariantSelector, type VariantGroup } from './ProductVariantSelector';
import sample from './sample.json';

export function ProductVariantSelectorUsage() {
  const groups = sample.groups as unknown as VariantGroup[];
  const [value, setValue] = useState<Record<string, VariantId | undefined>>({
    Colour: asId<VariantId>('var_black'),
    Size: asId<VariantId>('var_uk8'),
  });

  return (
    <ProductVariantSelector
      groups={groups}
      value={value}
      // Selection is local state. The mutation is the add-to-cart that follows,
      // which is where the server gets to disagree.
      onChange={(group, optionId) => {
        setValue((current) => ({ ...current, [group]: optionId }));
      }}
    />
  );
}
