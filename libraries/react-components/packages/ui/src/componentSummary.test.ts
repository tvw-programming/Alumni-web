import { describe, expect, it } from 'vitest';

import { exportDocComment, readmeIntro, summaryOf } from './componentSummary';

const withIntro = `# ProductCard

A catalogue tile in three densities: \`grid\`, \`list\`, \`compact\`.

## API

\`\`\`ts
type ProductCardProps = { product: ProductSummary };
\`\`\`
`;

const noIntro = `# CouponInput

## API

\`\`\`ts
type CouponInputProps = { value: string };
\`\`\`

## The rule

One coupon at a time.
`;

const source = `
interface CouponInputProps {
  /** The server's wording. Specific beats "Invalid code". */
  message?: string;
}

/**
 * Promo code entry.
 *
 * The apply button stays disabled until the field has content.
 */
export function CouponInput({ message }: CouponInputProps) {
  return <Stack>{message}</Stack>;
}
`;

describe('readmeIntro', () => {
  it('takes the prose between the title and the first section', () => {
    expect(readmeIntro(withIntro)).toBe('A catalogue tile in three densities: grid, list, compact.');
  });

  it('returns null when the title is followed straight by a section', () => {
    // The regression: treating the next line as the intro returned the opening
    // code fence, and 57 of 99 components were described as "ts".
    expect(readmeIntro(noIntro)).toBeNull();
  });

  it('returns null rather than reading into a code fence', () => {
    expect(readmeIntro('# Thing\n\n```ts\nconst a = 1;\n```\n')).toBeNull();
  });
});

describe('exportDocComment', () => {
  it('takes the first line of the comment attached to the export', () => {
    expect(exportDocComment(source, 'CouponInput')).toBe('Promo code entry.');
  });

  it("does not reach past it into a prop's documentation", () => {
    // A lazy pattern across the whole prefix spans several comments and returns
    // the last prop's doc, which reads plausibly enough to go unnoticed.
    expect(exportDocComment(source, 'CouponInput')).not.toContain('Invalid code');
  });

  it('ignores a comment that is not attached to the export', () => {
    const detached = `
/** A helper, documented, but not the component. */
const SIZE = 4;

export function Thing() {
  return null;
}
`;
    expect(exportDocComment(detached, 'Thing')).toBeNull();
  });

  it('skips tag lines', () => {
    const tagged = `
/**
 * @deprecated
 * Use the other one.
 */
export function Old() {
  return null;
}
`;
    expect(exportDocComment(tagged, 'Old')).toBe('Use the other one.');
  });

  it('returns null when the export is missing', () => {
    expect(exportDocComment(source, 'Absent')).toBeNull();
  });
});

describe('summaryOf', () => {
  it('prefers the README intro', () => {
    expect(summaryOf(withIntro, source, 'ProductCard')).toBe(
      'A catalogue tile in three densities: grid, list, compact.',
    );
  });

  it('falls back to the doc comment when there is no intro', () => {
    expect(summaryOf(noIntro, source, 'CouponInput')).toBe('Promo code entry.');
  });

  it('falls back to the name when there is neither', () => {
    expect(summaryOf('# Bare\n\n## API\n', 'export function Bare() {}', 'Bare')).toBe('Bare');
  });

  it('never returns a code-fence language tag', () => {
    expect(summaryOf(noIntro, source, 'CouponInput')).not.toBe('ts');
  });
});
