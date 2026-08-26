import { describe, expect, it } from 'vitest';

import { classifySurface, needsDomainSurface, rootElementOf } from './surfaceTier';

/**
 * The classifier decides which components the gallery wraps, so its edge cases
 * are worth pinning: every one below was found in the real library.
 */

const card = `
export function ProductCard({ product }: Props) {
  return (
    <Card variant="outlined">
      <CardContent>{product.name}</CardContent>
    </Card>
  );
}
`;

const stack = `
export function ReactionBar({ reactions }: Props) {
  return (
    <Stack direction="row" spacing={1}>
      {reactions.map((r) => <Chip key={r.id} label={r.label} />)}
    </Stack>
  );
}
`;

const nestedSurface = `
export function OrderSummary({ order }: Props) {
  return (
    <Box>
      <Card><CardContent>{order.total}</CardContent></Card>
    </Box>
  );
}
`;

const listRow = `
export function TaskListItem({ task }: Props) {
  return (
    <ListItemButton onClick={task.open}>
      <ListItemText primary={task.title} />
    </ListItemButton>
  );
}
`;

const dialog = `
export function ConsentDialog({ open }: Props) {
  return (
    <Dialog open={open}>
      <DialogTitle>Consent</DialogTitle>
    </Dialog>
  );
}
`;

describe('rootElementOf', () => {
  it('reads the returned element', () => {
    expect(rootElementOf('ProductCard', card)).toBe('Card');
  });

  it('reports a fragment root rather than failing', () => {
    // A fragment is a real answer: there is no single root to style, so
    // classification has to fall through to what is rendered inside.
    const fragment = `
export function UserRoleChip({ role }: Props) {
  return (
    <>
      <Chip label={role} />
    </>
  );
}
`;
    expect(rootElementOf('UserRoleChip', fragment)).toBe('Fragment');
  });

  it('skips a leading JSX comment', () => {
    const commented = `
export function PriceBreakdown({ lines }: Props) {
  return (
    {/* Totals are right-aligned so the decimal points line up. */}
    <Box>{lines.length}</Box>
  );
}
`;
    expect(rootElementOf('PriceBreakdown', commented)).toBe('Box');
  });

  it('starts at the named export, not at an earlier helper', () => {
    // Helpers above the export would otherwise decide the tier.
    const withHelper = `
function Row({ label }: { label: string }) {
  return (
    <Card>{label}</Card>
  );
}

export function CouponInput({ code }: Props) {
  return (
    <Stack direction="row">{code}</Stack>
  );
}
`;
    expect(rootElementOf('CouponInput', withHelper)).toBe('Stack');
  });

  it('returns null when no root can be read', () => {
    expect(rootElementOf('Mystery', 'export const Mystery = () => null;')).toBeNull();
  });
});

describe('classifySurface', () => {
  it.each([
    ['a Card at the root', 'ProductCard', card, 'surface-root'],
    ['a Stack at the root', 'ReactionBar', stack, 'no-surface'],
    ['a Card further down', 'OrderSummary', nestedSurface, 'surface-nested'],
    ['a list row', 'TaskListItem', listRow, 'list-row'],
    ['a dialog', 'ConsentDialog', dialog, 'portal'],
  ])('classifies %s', (_label, name, source, expected) => {
    expect(classifySurface(name, source)).toBe(expected);
  });

  it('classifies a fragment root by what it renders inside', () => {
    const fragmentWithCard = `
export function MediaGridViewer({ items }: Props) {
  return (
    <>
      <Card>{items.length}</Card>
    </>
  );
}
`;
    expect(classifySurface('MediaGridViewer', fragmentWithCard)).toBe('surface-nested');
  });

  it('returns null when the root cannot be read', () => {
    // Deliberately not a tier: defaulting here is how a component ends up with
    // no styling and nothing fails.
    expect(classifySurface('Mystery', 'export const Mystery = () => null;')).toBeNull();
  });
});

describe('needsDomainSurface', () => {
  it('asks for a wrapper only where there is no surface', () => {
    expect(needsDomainSurface('no-surface')).toBe(true);
  });

  it.each(['surface-root', 'surface-nested', 'list-row', 'portal', null] as const)(
    'does not ask for a wrapper for %s',
    (tier) => {
      expect(needsDomainSurface(tier)).toBe(false);
    },
  );
});
