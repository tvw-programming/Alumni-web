import { memo, useMemo } from 'react';

import { sanitizeHtml } from '@/utils/sanitizeHtml';

import type { CustomCellRendererProps } from 'ag-grid-react';

/**
 * Renders sanitized HTML (mixed bold/normal/multi-line text) inside a cell.
 * Sanitization is memoized per value so scrolling stays cheap.
 */
export const HtmlCellRenderer = memo(function HtmlCellRenderer(
  props: CustomCellRendererProps<unknown, string>,
) {
  const html = useMemo(
    () => (typeof props.value === 'string' ? sanitizeHtml(props.value) : ''),
    [props.value],
  );

  if (!html) return null;
  // Safe: content passed through the allowlist sanitizer above.
  return <span style={{ lineHeight: 1.4 }} dangerouslySetInnerHTML={{ __html: html }} />;
});
