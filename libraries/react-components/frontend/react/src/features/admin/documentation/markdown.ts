/**
 * A small Markdown reader for the specification viewer.
 *
 * Produces a **structured tree**, not an HTML string. That is the whole point:
 * nothing here ever reaches `innerHTML` / `[innerHTML]`, so there is no sanitizer
 * to get wrong and no XSS surface — the renderer creates elements and sets text.
 * `utils/sanitizeHtml.ts` exists for the grid's HTML cells; it is deliberately
 * not used here, and its allowlist is far too narrow for Markdown anyway.
 *
 * Framework-free on purpose: this file is copied verbatim into the Angular app,
 * the same way `commandMatcher.ts` and `validateDraft.ts` are.
 *
 * Supports exactly what the specification documents use: ATX headings, fenced
 * code, pipe tables, ordered/unordered lists, blockquotes, horizontal rules and
 * paragraphs; inline code, bold, italic and links. Anything else degrades to
 * plain text rather than being dropped.
 */

export type InlineNode =
  | { kind: 'text'; value: string }
  | { kind: 'code'; value: string }
  | { kind: 'strong'; children: InlineNode[] }
  | { kind: 'em'; children: InlineNode[] }
  | { kind: 'link'; href: string; children: InlineNode[] };

export type BlockNode =
  | { kind: 'heading'; level: 1 | 2 | 3 | 4 | 5 | 6; id: string; children: InlineNode[] }
  | { kind: 'paragraph'; children: InlineNode[] }
  | { kind: 'code'; language: string; value: string }
  | { kind: 'list'; ordered: boolean; items: InlineNode[][] }
  | { kind: 'table'; head: InlineNode[][]; rows: InlineNode[][][] }
  | { kind: 'quote'; children: InlineNode[] }
  | { kind: 'rule' };

/** One entry in the on-page table of contents. */
export interface HeadingRef {
  id: string;
  level: number;
  text: string;
}

export interface ParsedMarkdown {
  blocks: BlockNode[];
  headings: HeadingRef[];
}

/** Stable, URL-safe anchor for a heading. */
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s-]/gu, '')
    .trim()
    .replace(/\s+/g, '-');
}

export function parseMarkdown(source: string): ParsedMarkdown {
  const lines = source.replace(/\r\n?/g, '\n').split('\n');
  const blocks: BlockNode[] = [];
  const headings: HeadingRef[] = [];
  const seenIds = new Map<string, number>();

  /** Two headings can share a title; anchors must still be unique. */
  const uniqueId = (text: string): string => {
    const base = slugify(text) || 'section';
    const seen = seenIds.get(base) ?? 0;
    seenIds.set(base, seen + 1);
    return seen === 0 ? base : `${base}-${String(seen)}`;
  };

  let index = 0;
  while (index < lines.length) {
    const line = lines[index];

    if (line.trim() === '') {
      index += 1;
      continue;
    }

    // Fenced code. Read to the closing fence, or to EOF if it never comes —
    // an unterminated fence must not swallow the parser.
    const fence = /^```(\S*)\s*$/.exec(line);
    if (fence) {
      const language = fence[1];
      const body: string[] = [];
      index += 1;
      while (index < lines.length && !/^```\s*$/.test(lines[index])) {
        body.push(lines[index]);
        index += 1;
      }
      index += 1; // consume the closing fence
      blocks.push({ kind: 'code', language, value: body.join('\n') });
      continue;
    }

    const heading = /^(#{1,6})\s+(.*)$/.exec(line);
    if (heading) {
      const level = heading[1].length as 1 | 2 | 3 | 4 | 5 | 6;
      const text = heading[2].trim();
      const id = uniqueId(stripInline(text));
      blocks.push({ kind: 'heading', level, id, children: parseInline(text) });
      headings.push({ id, level, text: stripInline(text) });
      index += 1;
      continue;
    }

    if (/^(-{3,}|\*{3,}|_{3,})\s*$/.test(line)) {
      blocks.push({ kind: 'rule' });
      index += 1;
      continue;
    }

    // Pipe table: a header row followed by a separator of dashes.
    if (
      line.trimStart().startsWith('|') &&
      index + 1 < lines.length &&
      /^\s*\|?[\s:|-]+\|[\s:|-]*$/.test(lines[index + 1])
    ) {
      const head = splitRow(line).map(parseInline);
      index += 2;
      const rows: InlineNode[][][] = [];
      while (index < lines.length && lines[index].trimStart().startsWith('|')) {
        rows.push(splitRow(lines[index]).map(parseInline));
        index += 1;
      }
      blocks.push({ kind: 'table', head, rows });
      continue;
    }

    if (/^\s*>\s?/.test(line)) {
      const body: string[] = [];
      while (index < lines.length && /^\s*>\s?/.test(lines[index])) {
        body.push(lines[index].replace(/^\s*>\s?/, ''));
        index += 1;
      }
      blocks.push({ kind: 'quote', children: parseInline(body.join(' ').trim()) });
      continue;
    }

    const bullet = /^\s*([-*+]|\d+\.)\s+/.exec(line);
    if (bullet) {
      const ordered = /\d/.test(bullet[1]);
      const items: InlineNode[][] = [];
      while (index < lines.length) {
        const item = /^\s*(?:[-*+]|\d+\.)\s+(.*)$/.exec(lines[index]);
        if (!item) {
          // A wrapped continuation line belongs to the item above it.
          if (items.length > 0 && /^\s{2,}\S/.test(lines[index])) {
            items[items.length - 1].push({ kind: 'text', value: ' ' + lines[index].trim() });
            index += 1;
            continue;
          }
          break;
        }
        items.push(parseInline(item[1]));
        index += 1;
      }
      blocks.push({ kind: 'list', ordered, items });
      continue;
    }

    // Paragraph: consume until a blank line or the start of another block.
    const paragraph: string[] = [];
    while (index < lines.length && lines[index].trim() !== '' && !startsBlock(lines[index])) {
      paragraph.push(lines[index].trim());
      index += 1;
    }
    blocks.push({ kind: 'paragraph', children: parseInline(paragraph.join(' ')) });
  }

  return { blocks, headings };
}

function startsBlock(line: string): boolean {
  return (
    line.startsWith('```') ||
    /^#{1,6}\s/.test(line) ||
    /^(-{3,}|\*{3,}|_{3,})\s*$/.test(line) ||
    /^\s*>\s?/.test(line) ||
    /^\s*(?:[-*+]|\d+\.)\s+/.test(line) ||
    line.trimStart().startsWith('|')
  );
}

function splitRow(line: string): string[] {
  return line
    .trim()
    .replace(/^\|/, '')
    .replace(/\|$/, '')
    .split('|')
    .map((cell) => cell.trim());
}

/**
 * Inline parsing.
 *
 * Code spans are matched first and are never re-scanned, so `**` inside
 * backticks stays literal — which matters here, because these documents are
 * full of code containing Markdown-significant characters.
 */
export function parseInline(source: string): InlineNode[] {
  const nodes: InlineNode[] = [];
  let rest = source;

  const pattern = /(`[^`]+`)|(\*\*[^*]+\*\*)|(__[^_]+__)|(\*[^*\n]+\*)|(\[[^\]]*\]\([^)\s]+\))/;

  while (rest.length > 0) {
    const match = pattern.exec(rest);
    if (!match) {
      nodes.push({ kind: 'text', value: rest });
      break;
    }
    if (match.index > 0) {
      nodes.push({ kind: 'text', value: rest.slice(0, match.index) });
    }
    const token = match[0];

    if (token.startsWith('`')) {
      nodes.push({ kind: 'code', value: token.slice(1, -1) });
    } else if (token.startsWith('**') || token.startsWith('__')) {
      nodes.push({ kind: 'strong', children: parseInline(token.slice(2, -2)) });
    } else if (token.startsWith('[')) {
      const link = /^\[([^\]]*)\]\(([^)\s]+)\)$/.exec(token);
      if (link) {
        nodes.push({ kind: 'link', href: link[2], children: parseInline(link[1]) });
      } else {
        nodes.push({ kind: 'text', value: token });
      }
    } else {
      nodes.push({ kind: 'em', children: parseInline(token.slice(1, -1)) });
    }

    rest = rest.slice(match.index + token.length);
  }

  return nodes;
}

/** Plain text of a marked-up string, for anchors and the table of contents. */
export function stripInline(source: string): string {
  return source
    .replace(/`([^`]+)`/g, '$1')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/__([^_]+)__/g, '$1')
    .replace(/\*([^*\n]+)\*/g, '$1')
    .replace(/\[([^\]]*)\]\([^)\s]+\)/g, '$1')
    .trim();
}
