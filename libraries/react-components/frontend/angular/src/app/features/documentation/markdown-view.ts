import { ChangeDetectionStrategy, Component, input } from '@angular/core';

import type { InlineNode, ParsedMarkdown } from './markdown';

/**
 * Renders a parsed document.
 *
 * Every node becomes a real element and every string goes through an
 * interpolation, so **no HTML is ever constructed or injected**. There is no
 * `[innerHTML]` here and there must not be one — that is what makes the viewer
 * safe without a sanitizer, and why `DomSanitizer` is not imported.
 */
@Component({
  selector: 'app-markdown-inline',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @for (node of nodes(); track $index) {
      @switch (node.kind) {
        @case ('text') {
          <!--
            The interpolation is the span's entire content, with no newline
            beside it. Written bare inside the block, the indentation would join
            the same text node and collapse to a real space — enough to render
            "Error ;" where the source ends an inline-code span with a
            semicolon. (No backticks in this comment: one would terminate the
            template literal this template lives in.)
          -->
          <span>{{ $any(node).value }}</span>
        }
        @case ('code') {
          <code class="md-inline-code">{{ $any(node).value }}</code>
        }
        @case ('strong') {
          <strong><app-markdown-inline [nodes]="$any(node).children" /></strong>
        }
        @case ('em') {
          <em><app-markdown-inline [nodes]="$any(node).children" /></em>
        }
        @case ('link') {
          <!--
            Only http(s) and in-page anchors are linkable. Anything else —
            including a relative path to a source file — renders as text,
            because it would 404 and because "javascript:" must never survive.
          -->
          @if (isSafeHref($any(node).href)) {
            <a
              [href]="$any(node).href"
              [attr.target]="$any(node).href.startsWith('#') ? null : '_blank'"
              rel="noopener noreferrer"
            >
              <app-markdown-inline [nodes]="$any(node).children" />
            </a>
          } @else {
            <span class="md-dead-link">
              <app-markdown-inline [nodes]="$any(node).children" />
            </span>
          }
        }
      }
    }
  `,
  styles: `
    :host { display: inline; }
    .md-inline-code {
      padding: 1px 5px;
      border-radius: 4px;
      background: var(--mat-sys-surface-container-highest);
      font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
      font-size: 0.86em;
      overflow-wrap: anywhere;
    }
    .md-dead-link { text-decoration: underline dotted; }
    a { color: var(--mat-sys-primary); }
  `,
})
export class MarkdownInline {
  readonly nodes = input.required<readonly InlineNode[]>();

  protected isSafeHref(href: string): boolean {
    return /^(https?:\/\/|#)/i.test(href);
  }
}

@Component({
  selector: 'app-markdown-view',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MarkdownInline],
  template: `
    <article class="md">
      @for (block of doc().blocks; track $index) {
        @switch (block.kind) {
          @case ('heading') {
            <!-- The level is data, so the tag is chosen rather than templated. -->
            @switch ($any(block).level) {
              @case (1) { <h1 [id]="$any(block).id"><app-markdown-inline [nodes]="$any(block).children" /></h1> }
              @case (2) { <h2 [id]="$any(block).id"><app-markdown-inline [nodes]="$any(block).children" /></h2> }
              @case (3) { <h3 [id]="$any(block).id"><app-markdown-inline [nodes]="$any(block).children" /></h3> }
              @default  { <h4 [id]="$any(block).id"><app-markdown-inline [nodes]="$any(block).children" /></h4> }
            }
          }
          @case ('paragraph') {
            <p><app-markdown-inline [nodes]="$any(block).children" /></p>
          }
          @case ('code') {
            <pre class="md-code"><code [attr.aria-label]="$any(block).language ? $any(block).language + ' code' : 'code'">{{ $any(block).value }}</code></pre>
          }
          @case ('list') {
            @if ($any(block).ordered) {
              <ol>
                @for (item of $any(block).items; track $index) {
                  <li><app-markdown-inline [nodes]="item" /></li>
                }
              </ol>
            } @else {
              <ul>
                @for (item of $any(block).items; track $index) {
                  <li><app-markdown-inline [nodes]="item" /></li>
                }
              </ul>
            }
          }
          @case ('table') {
            <div class="md-table-scroll">
              <table class="md-table">
                <thead>
                  <tr>
                    @for (cell of $any(block).head; track $index) {
                      <th scope="col"><app-markdown-inline [nodes]="cell" /></th>
                    }
                  </tr>
                </thead>
                <tbody>
                  @for (row of $any(block).rows; track $index) {
                    <tr>
                      @for (cell of row; track $index) {
                        <td><app-markdown-inline [nodes]="cell" /></td>
                      }
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          }
          @case ('quote') {
            <blockquote><app-markdown-inline [nodes]="$any(block).children" /></blockquote>
          }
          @case ('rule') {
            <hr />
          }
        }
      }
    </article>
  `,
  styles: `
    :host { display: block; }
    .md { max-width: 900px; }
    .md h1, .md h2, .md h3, .md h4 { font-weight: 700; margin: 32px 0 8px; scroll-margin-top: 80px; }
    .md h1 { font: var(--mat-sys-headline-medium); font-weight: 700; margin-top: 0; }
    .md h2 { font: var(--mat-sys-headline-small); font-weight: 700; }
    .md h3 { font: var(--mat-sys-title-medium); font-weight: 700; margin-top: 24px; }
    .md h4 { font: var(--mat-sys-title-small); font-weight: 700; margin-top: 20px; }
    .md p { margin: 0 0 12px; line-height: 1.75; font: var(--mat-sys-body-medium); }
    .md ul, .md ol { margin: 12px 0; padding-left: 24px; }
    .md li { margin-bottom: 6px; line-height: 1.7; font: var(--mat-sys-body-medium); }
    .md hr { border: 0; border-top: 1px solid var(--mat-sys-outline-variant); margin: 24px 0; }

    /* Code blocks are wide; they scroll inside their own box so the page
       never scrolls sideways. */
    .md-code {
      margin: 16px 0;
      padding: 16px;
      border: 1px solid var(--mat-sys-outline-variant);
      border-radius: 12px;
      background: var(--mat-sys-surface-container-highest);
      font-size: 13px;
      line-height: 1.65;
      overflow-x: auto;
    }
    .md-table-scroll { overflow-x: auto; margin: 16px 0; }
    .md-table { width: 100%; border-collapse: collapse; font: var(--mat-sys-body-small); }
    .md-table th, .md-table td {
      padding: 8px 12px;
      border: 1px solid var(--mat-sys-outline-variant);
      text-align: left;
      vertical-align: top;
    }
    .md-table th { background: var(--mat-sys-surface-container); font-weight: 700; white-space: nowrap; }
    blockquote {
      margin: 16px 0;
      padding: 8px 16px;
      border-left: 4px solid var(--mat-sys-primary);
      background: var(--mat-sys-surface-container-highest);
      border-radius: 0 8px 8px 0;
    }
    blockquote p { margin: 0; }
  `,
})
export class MarkdownView {
  readonly doc = input.required<ParsedMarkdown>();
}
