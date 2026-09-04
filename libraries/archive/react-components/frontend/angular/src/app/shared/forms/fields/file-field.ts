import { ChangeDetectionStrategy, Component, computed, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

import { FieldBase } from './field-shell';

/**
 * File input, holding real `File` objects.
 *
 * The control value is a `File[]`, which is what makes multipart submission
 * possible — a JSON body cannot carry bytes. `SchemaForm` detects these and
 * switches the request to `FormData`.
 *
 * A native `<input type="file">` is deliberately kept (visually hidden, driven
 * by a button): it is the only element that can open the OS picker, and its
 * value cannot be set programmatically for security reasons — which is also why
 * removing a file clears the input element rather than editing its value.
 */
@Component({
  selector: 'app-file-field',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatButtonModule, MatIconModule],
  template: `
    <div class="file">
      <span class="file__label" [id]="field().name + '-label'">
        {{ field().label }}@if (isRequired()) {<span aria-hidden="true"> *</span>}
      </span>

      <input
        #input
        type="file"
        class="file__input"
        [id]="field().name + '-input'"
        [multiple]="field().multiple ?? false"
        [accept]="field().accept ?? ''"
        (change)="onPicked($any($event.target).files)"
      />
      <button
        mat-stroked-button
        type="button"
        [attr.aria-describedby]="field().name + '-label'"
        (click)="input.click()"
      >
        <mat-icon>upload_file</mat-icon>
        {{ files().length ? 'Change' : 'Choose file' }}
      </button>

      @if (files().length) {
        <ul class="file__list">
          @for (file of files(); track file.name + file.size) {
            <li>
              <span class="file__name">{{ file.name }}</span>
              <span class="file__size">{{ sizeOf(file) }}</span>
              <button
                mat-icon-button
                type="button"
                [attr.aria-label]="'Remove ' + file.name"
                (click)="remove(file, input)"
              >
                <mat-icon>close</mat-icon>
              </button>
            </li>
          }
        </ul>
      }

      @if (errorText()) {
        <p class="file__error" role="alert">{{ errorText() }}</p>
      } @else if (field().hint) {
        <p class="file__hint">{{ field().hint }}</p>
      }
    </div>
  `,
  styles: `
    .file { margin-bottom: 16px; }
    .file__label {
      display: block;
      margin-bottom: 4px;
      color: var(--mat-sys-on-surface-variant);
      font: var(--mat-sys-body-small);
    }
    /*
     * Hidden but still in the accessibility tree and still focusable — a
     * "display: none" input cannot be clicked programmatically in some browsers
     * and disappears for screen readers.
     */
    .file__input {
      position: absolute;
      width: 1px;
      height: 1px;
      opacity: 0;
      pointer-events: none;
    }
    .file__list { list-style: none; margin: 8px 0 0; padding: 0; }
    .file__list li {
      display: flex;
      align-items: center;
      gap: 8px;
      font: var(--mat-sys-body-small);
    }
    .file__name { overflow-wrap: anywhere; }
    .file__size { color: var(--mat-sys-on-surface-variant); font-variant-numeric: tabular-nums; }
    .file__error { margin: 4px 0 0; color: var(--mat-sys-error); font: var(--mat-sys-body-small); }
    .file__hint {
      margin: 4px 0 0;
      color: var(--mat-sys-on-surface-variant);
      font: var(--mat-sys-body-small);
    }
  `,
})
export class FileField extends FieldBase {
  private readonly picked = signal<File[]>([]);

  protected readonly files = computed(() => {
    const value: unknown = this.control().value;
    return Array.isArray(value) ? (value as File[]) : this.picked();
  });

  protected onPicked(list: FileList | null): void {
    const next = list ? Array.from(list) : [];
    this.picked.set(next);
    this.write(next);
  }

  protected remove(file: File, input: HTMLInputElement): void {
    const next = this.files().filter((item) => item !== file);
    this.picked.set(next);
    this.write(next);
    if (next.length === 0) {
      // A file input's value cannot be assigned for security reasons, so
      // clearing it is the only way to let the same file be picked again.
      input.value = '';
    }
  }

  private write(next: File[]): void {
    this.control().setValue(next);
    this.control().markAsTouched();
    this.control().markAsDirty();
  }

  protected sizeOf(file: File): string {
    const kb = file.size / 1024;
    return kb < 1024 ? `${kb.toFixed(0)} KB` : `${(kb / 1024).toFixed(1)} MB`;
  }
}
