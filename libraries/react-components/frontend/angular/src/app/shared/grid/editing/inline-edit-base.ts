import { Directive, ElementRef, computed, inject, signal, viewChild } from '@angular/core';

import { SnackbarService } from '../../snackbar/snackbar.service';
import { normalizeError } from '../../../core/errors/normalize-error';
import { validateDraft } from './validate-draft';

import type { ICellEditorAngularComp } from 'ag-grid-angular';
import type { ICellEditorParams } from 'ag-grid-community';
import type { EditorType, InlineEditorParams, SaveContext } from './editing.types';

export type InlineEditorCellParams<TData> = ICellEditorParams<TData> & InlineEditorParams<TData>;

/**
 * The inline-edit state machine, shared by every editor component.
 *
 * This is React's `useInlineEdit` as an abstract base class. A hook cannot be
 * expressed directly in Angular, but the behaviour is identical, and the state
 * that was `useState` is now signals — so `canApply` is a `computed` the
 * template reads rather than a value recomputed on render.
 *
 * **Button-driven commit.** AG Grid's own "stop editing" (clicking away,
 * Enter, focus loss) is intercepted by `isCancelAfterEnd` and discarded unless
 * the user pressed Apply, so nothing is ever persisted by accident.
 *
 * Apply, pessimistic (the default):
 *   validate → call the save handler → commit to the grid only on success;
 *   on failure the editor stays open with the error, ready for a retry.
 *
 * Apply, optimistic:
 *   validate → commit immediately → persist in the background → roll the row
 *   back and raise a snackbar if the request fails.
 */
@Directive()
export abstract class InlineEditBase<TData, TValue = unknown> implements ICellEditorAngularComp {
  private readonly snackbar = inject(SnackbarService);

  protected params!: InlineEditorCellParams<TData>;
  protected abstract readonly editorType: EditorType;

  readonly draft = signal('');
  readonly saving = signal(false);
  readonly saveError = signal<string | null>(null);

  /** True only once Apply has succeeded — this is what gates the cancel guard. */
  private committed = false;

  readonly validationError = computed(() =>
    validateDraft(this.draft(), this.editorType, this.params.validation),
  );

  readonly canApply = computed(() => this.validationError() === null && !this.saving());

  /** The message to surface: an API failure outranks a stale validation one. */
  readonly errorText = computed(() => this.saveError() ?? this.validationError());

  /**
   * The editor's own control, marked `#field` in each subclass template.
   *
   * Declared here rather than in each editor: view queries on an `@Directive`
   * base are resolved against the subclass's template, so one declaration gives
   * every editor autofocus. React needed a `useAutoFocus` hook per editor.
   */
  protected readonly field = viewChild<ElementRef<HTMLElement>>('field');

  agInit(params: InlineEditorCellParams<TData>): void {
    this.params = params;
    this.draft.set(params.value === null || params.value === undefined ? '' : String(params.value));
  }

  /**
   * AG Grid calls this once the editor is in the DOM — the only point at which
   * focusing can work. Without it the user has to click into a cell they just
   * asked to edit.
   */
  afterGuiAttached(): void {
    this.field()?.nativeElement.focus();
  }

  /**
   * AG Grid reads this when editing stops. The value is committed through
   * `apply()` instead, so returning the original here keeps a grid-initiated
   * stop from writing anything.
   */
  getValue(): TValue {
    return this.params.value as TValue;
  }

  /**
   * Grid-initiated stops never commit; only the Apply button does. This is the
   * guard that makes the workflow button-driven rather than focus-driven.
   */
  isCancelAfterEnd(): boolean {
    return !this.committed;
  }

  /** Converts the draft string to the committed value. Overridden by subclasses. */
  protected parseDraft(draft: string): unknown {
    return draft;
  }

  updateDraft(next: string): void {
    this.draft.set(next);
    // A stale API error should not outlive the value that caused it.
    this.saveError.set(null);
  }

  cancel(): void {
    this.params.api.stopEditing(true);
  }

  async apply(): Promise<void> {
    if (this.validationError() !== null || this.saving() || !this.params.data) return;

    // The data field beats the colId: an extra column bound to the same field
    // (a star-rating view of `rating`, say) must persist against the real name.
    const field = this.params.column.getColDef().field ?? this.params.column.getColId();
    const newValue = this.parseDraft(this.draft());
    const context: SaveContext<TData> = {
      data: this.params.data,
      field,
      oldValue: this.params.value,
      newValue,
    };

    const refreshMode = this.params.refreshMode ?? 'cell';
    const strategy = this.params.updateStrategy ?? 'pessimistic';
    const { api, saveHandler } = this.params;

    const commitCell = (): void => {
      this.committed = true;
      // `getValue` is what the grid reads on stop, so it must see the new value.
      this.params.value = newValue as TValue;
      api.stopEditing();
    };

    /** Closes the editor without committing, then replaces the whole row. */
    const commitRow = (patch: Partial<TData> | void): void => {
      api.stopEditing(); // isCancelAfterEnd discards the cell-level commit
      const updated = { ...this.params.data, [field]: newValue, ...(patch ?? {}) } as TData;
      api.applyTransaction({ update: [updated] }); // needs getRowId on the grid
    };

    if (strategy === 'optimistic') {
      if (refreshMode === 'row') commitRow(undefined);
      else commitCell();

      if (!saveHandler) return;
      try {
        const patch = await saveHandler(context);
        if (refreshMode === 'row' && patch) {
          api.applyTransaction({
            update: [{ ...context.data, [field]: newValue, ...patch }],
          });
        }
      } catch (error) {
        api.applyTransaction({
          update: [{ ...context.data, [field]: context.oldValue }],
        });
        this.snackbar.error(
          `Save failed — change reverted (${normalizeError(error).message})`,
        );
      }
      return;
    }

    // Pessimistic: nothing touches the grid until the API confirms.
    this.saving.set(true);
    this.saveError.set(null);
    try {
      const patch = saveHandler ? await saveHandler(context) : undefined;
      if (refreshMode === 'row') commitRow(patch);
      else commitCell();
    } catch (error) {
      this.saveError.set(normalizeError(error).message);
    } finally {
      this.saving.set(false);
    }
  }

  /** Enter applies, Escape cancels. Both stop propagation so AG Grid's own
   * commit/navigation cannot race the button-driven flow. */
  onKeydown(event: KeyboardEvent): void {
    if (event.key === 'Enter') {
      event.preventDefault();
      event.stopPropagation();
      if (this.canApply()) void this.apply();
    } else if (event.key === 'Escape') {
      event.stopPropagation();
      this.cancel();
    }
  }
}
