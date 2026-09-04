/**
 * Zero-dependency HTML sanitizer for cell content (allowlist based).
 * Strips scripts, event handlers and javascript: URLs via the browser's
 * native DOMParser — no framework overhead, safe for grid-scale rendering.
 *
 * For fully untrusted user-generated HTML, prefer swapping this for
 * DOMPurify (`npm install dompurify`) — the call site stays identical.
 */

const ALLOWED_TAGS = new Set([
  'B',
  'STRONG',
  'I',
  'EM',
  'U',
  'S',
  'SPAN',
  'P',
  'BR',
  'SMALL',
  'SUB',
  'SUP',
  'UL',
  'OL',
  'LI',
  'A',
  'CODE',
]);

const ALLOWED_ATTRS = new Set(['href', 'title', 'target', 'rel']);

function cleanse(element: Element): void {
  for (const child of Array.from(element.children)) {
    if (!ALLOWED_TAGS.has(child.tagName)) {
      // Drop the element entirely but keep its plain-text content.
      child.replaceWith(document.createTextNode(child.textContent ?? ''));
      continue;
    }
    for (const attr of Array.from(child.attributes)) {
      const name = attr.name.toLowerCase();
      const isUnsafeHref = name === 'href' && /^\s*(javascript|data):/i.test(attr.value);
      if (!ALLOWED_ATTRS.has(name) || isUnsafeHref) child.removeAttribute(attr.name);
    }
    if (child.tagName === 'A') child.setAttribute('rel', 'noopener noreferrer');
    cleanse(child);
  }
}

export function sanitizeHtml(html: string): string {
  if (typeof window === 'undefined' || typeof DOMParser === 'undefined') return '';
  const doc = new DOMParser().parseFromString(html, 'text/html');
  cleanse(doc.body);
  return doc.body.innerHTML;
}
