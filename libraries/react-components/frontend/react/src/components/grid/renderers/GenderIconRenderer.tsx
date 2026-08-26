import FemaleIcon from '@mui/icons-material/Female';
import MaleIcon from '@mui/icons-material/Male';
import { memo } from 'react';

import type { CustomCellRendererProps } from 'ag-grid-react';

/** Minimal row shape this renderer needs — keeps it decoupled from features. */
interface GenderRow {
  firstName?: string;
  lastName?: string;
}

/**
 * Dumb, memoized cell renderer. Icon logic lives here (not passed via props)
 * and the tooltip uses the native `title` attribute — zero framework overhead,
 * so AG Grid's cell virtualization stays fast on large datasets.
 */
export const GenderIconRenderer = memo(function GenderIconRenderer(
  props: CustomCellRendererProps<GenderRow, string>,
) {
  const gender = props.value;
  if (!gender) return null;

  const fullName = `${props.data?.firstName ?? ''} ${props.data?.lastName ?? ''}`.trim();
  const isMale = gender.toLowerCase() === 'male';

  return (
    <span
      title={fullName || gender}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        height: '100%',
        cursor: 'help',
      }}
    >
      {isMale ? (
        <MaleIcon color="primary" fontSize="small" />
      ) : (
        <FemaleIcon color="secondary" fontSize="small" />
      )}
      <span>{gender}</span>
    </span>
  );
});
