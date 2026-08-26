import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { MatListModule } from '@angular/material/list';

import type { SpecNode } from './spec-doc.types';

/**
 * Folder-structure navigator.
 *
 * Mirrors the `specDoc/` layout on disk rather than showing a flat list, because
 * the folder *is* information here — it says which layer a document describes,
 * which is exactly what someone browsing specifications is looking for.
 *
 * Open and selected state are owned by the page, so this component is a pure
 * function of its inputs and the page can open the tree to a deep link.
 */
@Component({
  selector: 'app-spec-tree',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatIconModule, MatListModule],
  template: `
    <ul class="tree" [attr.role]="depth() === 0 ? 'tree' : 'group'">
      @for (node of nodes(); track node.path) {
        <li class="tree__item">
          @if (node.type === 'folder') {
            <button
              type="button"
              class="tree__row tree__row--folder"
              [style.padding-left.px]="12 + depth() * 14"
              [attr.aria-expanded]="isOpen(node.path)"
              (click)="toggleFolder.emit(node.path)"
            >
              <mat-icon class="tree__icon">folder_open</mat-icon>
              <span class="tree__label">{{ node.name }}</span>
              <mat-icon class="tree__chevron">
                {{ isOpen(node.path) ? 'expand_less' : 'expand_more' }}
              </mat-icon>
            </button>

            <!--
              The subtree is removed, not hidden. A collapsed folder whose items
              stay in the DOM keeps them focusable — a keyboard trap.
            -->
            @if (isOpen(node.path)) {
              <app-spec-tree
                [nodes]="$any(node).children"
                [selectedPath]="selectedPath()"
                [openFolders]="openFolders()"
                [depth]="depth() + 1"
                (toggleFolder)="toggleFolder.emit($event)"
                (selectFile)="selectFile.emit($event)"
              />
            }
          } @else {
            <button
              type="button"
              class="tree__row tree__row--file"
              [class.tree__row--active]="node.path === selectedPath()"
              [style.padding-left.px]="12 + depth() * 14"
              [attr.aria-current]="node.path === selectedPath() ? 'page' : null"
              (click)="selectFile.emit(node.path)"
            >
              <mat-icon class="tree__icon">description</mat-icon>
              <span class="tree__text">
                <span class="tree__label" [title]="$any(node).title">{{ $any(node).title }}</span>
                <span class="tree__file">{{ node.name }}</span>
              </span>
            </button>
          }
        </li>
      }
    </ul>
  `,
  styles: `
    :host { display: block; }
    .tree { list-style: none; margin: 0; padding: 0; }
    .tree__row {
      display: flex;
      align-items: center;
      gap: 8px;
      width: 100%;
      padding: 6px 12px;
      border: 0;
      background: transparent;
      color: inherit;
      font: inherit;
      text-align: left;
      cursor: pointer;
      border-radius: 6px;
    }
    .tree__row:hover { background: var(--mat-sys-surface-container-highest); }
    .tree__row:focus-visible { outline: 2px solid var(--mat-sys-primary); outline-offset: -2px; }
    .tree__row--active { background: var(--mat-sys-secondary-container); }
    .tree__row--active .tree__label { color: var(--mat-sys-on-secondary-container); font-weight: 600; }
    .tree__row--folder .tree__label { font-weight: 600; }
    .tree__icon, .tree__chevron {
      flex: 0 0 auto;
      font-size: 18px;
      width: 18px;
      height: 18px;
      color: var(--mat-sys-on-surface-variant);
    }
    .tree__chevron { margin-left: auto; }
    .tree__text { display: flex; flex-direction: column; min-width: 0; }
    .tree__label {
      font: var(--mat-sys-body-medium);
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .tree__file {
      font: var(--mat-sys-body-small);
      color: var(--mat-sys-on-surface-variant);
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
  `,
})
export class SpecTree {
  readonly nodes = input.required<readonly SpecNode[]>();
  readonly selectedPath = input<string | null>(null);
  readonly openFolders = input.required<ReadonlySet<string>>();
  readonly depth = input(0);

  readonly toggleFolder = output<string>();
  readonly selectFile = output<string>();

  protected isOpen(path: string): boolean {
    return this.openFolders().has(path);
  }
}
