/**
 * The one-line description the gallery shows under a component's name.
 *
 * Three sources, in order of how well they answer "what is this?":
 *
 * 1. A prose intro in the README, before the first section heading.
 * 2. The doc comment on the exported component.
 * 3. The component's own name, which at least never lies.
 *
 * The order matters because most of the library skips straight from the title
 * to `## API`. Taking "the first line after the title" — which is what this used
 * to do — returned the opening code fence for 57 of 99 components, so the
 * gallery displayed the word "ts" as the description of more than half the
 * library.
 */

/**
 * The README's intro paragraph: prose between the title and the first section.
 *
 * Returns `null` the moment a heading or a code fence appears, because at that
 * point there is no intro and guessing further is what produced "ts".
 */
export function readmeIntro(readme: string): string | null {
  const lines = readme.split('\n');
  const start = lines.findIndex((line) => line.trimStart().startsWith('# ')) + 1;

  for (const raw of lines.slice(start)) {
    const line = raw.trim();
    if (line === '') continue;
    if (line.startsWith('#') || line.startsWith('```')) return null;
    return clean(line);
  }
  return null;
}

/**
 * The first sentence of the doc comment attached to the exported component.
 *
 * Only the block immediately above the export counts. Matching "any doc comment
 * before the export" with a lazy pattern silently spans several of them and
 * returns the documentation of the last *prop* instead — which reads plausibly
 * enough that it took a screenshot to notice.
 */
export function exportDocComment(source: string, componentName: string): string | null {
  const at = new RegExp(`export (?:const|function) ${componentName}\\b`).exec(source);
  if (at === null) return null;

  const before = source.slice(0, at.index);
  const blocks = before.match(/\/\*\*(?:(?!\*\/)[\s\S])*\*\//g);
  if (blocks === null) return null;

  const last = blocks[blocks.length - 1];
  // Attached to the export, not merely somewhere above it.
  if (before.slice(before.lastIndexOf(last) + last.length).trim() !== '') return null;

  for (const raw of last.split('\n')) {
    const line = raw.replace(/^\s*\/?\*+\/?/, '').trim();
    // `@param` and friends describe arguments, not the component.
    if (line !== '' && !line.startsWith('@')) return clean(line);
  }
  return null;
}

/** Markdown emphasis carries no meaning in a one-line label. */
function clean(line: string): string {
  return line.replace(/[*`]/g, '').trim();
}

export function summaryOf(readme: string, source: string, componentName: string): string {
  return (
    readmeIntro(readme) ?? exportDocComment(source, componentName) ?? componentName
  );
}
