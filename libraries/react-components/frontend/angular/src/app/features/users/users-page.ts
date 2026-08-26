import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';

import { AppDataGrid } from '../../shared/grid/app-data-grid';
import { GenericCard } from '../../shared/generic-card/generic-card';
import { SchemaForm } from '../../shared/forms/schema-form';
import { SnackbarService } from '../../shared/snackbar/snackbar.service';
import { UserService } from './user.service';
import { getUserMessage, normalizeError } from '../../core/errors/normalize-error';

import type { ColDef } from 'ag-grid-community';
import type { FormSchema, FormValues } from '../../shared/forms/form.types';
import type { NewUser, User } from './user.types';

/**
 * Manage User — quick-add form beside the users grid.
 *
 * The React page hand-wrote four `<TextField>` blocks with per-field Zod
 * schemas; here the same form is a schema object handed to `SchemaForm`.
 *
 * A created row is prepended locally rather than refetched. The demo API does
 * not persist writes, so a refetch would make the new row vanish; and against a
 * real backend this is still better, since the create response already contains
 * the row and a refetch would discard the user's scroll position and filters.
 * See `createdUsers` for why this is a signal rather than a grid transaction.
 */
@Component({
  selector: 'app-users-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    AppDataGrid,
    GenericCard,
    MatButtonModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    SchemaForm,
  ],
  providers: [UserService],
  template: `
    <div class="users">
      <aside class="users__form">
        <app-generic-card title="Add user" icon="person_add">
          <app-schema-form
            [schema]="schema"
            [defaultValues]="defaults"
            [submitting]="service.creating()"
            (formSubmit)="onCreate($event)"
            (invalidSubmit)="onInvalid($event)"
          />
          @if (createError()) {
            <p class="users__error" role="alert">{{ createError() }}</p>
          }
        </app-generic-card>
      </aside>

      <section class="users__grid-area">
        <!--
          The loading flag stays on the grid, not the card: the card's loading
          state replaces its content, which would tear the grid down and build
          it again on every refetch. The grid has its own overlay for this.
        -->
        <app-generic-card
          title="Users grid"
          [subtitle]="total() + ' users'"
          icon="group"
          size="expanded"
          [error]="errorText()"
          [showRetry]="true"
          (retry)="reload()"
        >
          <div card-header-action>
            <button matIconButton aria-label="Reload users" (click)="reload()">
              <mat-icon>refresh</mat-icon>
            </button>
          </div>

          <div class="users__actions">
            <mat-form-field appearance="outline" subscriptSizing="dynamic" class="users__search">
              <mat-label>Quick filter</mat-label>
              <input
                matInput
                type="search"
                [value]="quickFilter()"
                (input)="quickFilter.set($any($event.target).value)"
                placeholder="Filter across all columns"
              />
              <mat-icon matSuffix>search</mat-icon>
            </mat-form-field>
          </div>

          <div class="users__grid">
            <app-data-grid
              [rowData]="rows()"
              [columnDefs]="columnDefs"
              [loading]="isLoading()"
              [quickFilterText]="quickFilter()"
              [rowId]="rowId"
              [pagination]="true"
              [paginationPageSize]="10"
              [floatingFilter]="true"
              noRowsMessage="No users match the current filters"
            />
          </div>
        </app-generic-card>
      </section>
    </div>
  `,
  styles: `
    :host { display: block; padding: 16px 0; }
    .users {
      display: grid;
      grid-template-columns: minmax(240px, 1fr) minmax(0, 3fr);
      gap: 24px;
      align-items: start;
    }
    /* Below the split point the form stacks above the grid. */
    @media (max-width: 900px) {
      .users { grid-template-columns: 1fr; }
    }
    .users__actions {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-bottom: 12px;
    }
    .users__search { min-width: 260px; }
    /* AG Grid needs a resolved height; a flex child alone collapses to zero. */
    .users__grid { height: 560px; }
    .users__error {
      margin: 8px 0 0;
      color: var(--mat-sys-error);
      font: var(--mat-sys-body-small);
    }
  `,
})
export class UsersPage {
  protected readonly service = inject(UserService);
  private readonly snackbar = inject(SnackbarService);

  protected readonly quickFilter = signal('');
  protected readonly createError = signal<string | null>(null);

  /**
   * Users created in this session, newest first.
   *
   * The React page did this with `gridApi.applyTransaction({ addIndex: 0 })`.
   * A signal is the better fit for a signals-only port: the row is part of
   * `rowData` like any other, so it sorts and filters normally, it survives a
   * grid re-creation, and the page needs no imperative grid handle at all.
   */
  private readonly createdUsers = signal<User[]>([]);

  protected readonly rows = computed(() => [
    ...this.createdUsers(),
    ...(this.service.users.value()?.users ?? []),
  ]);
  protected readonly total = computed(
    () => (this.service.users.value()?.total ?? 0) + this.createdUsers().length,
  );
  protected readonly isLoading = computed(() => this.service.users.isLoading());

  protected readonly errorText = computed(() => {
    const error = this.service.users.error();
    return error ? getUserMessage(normalizeError(error)) : null;
  });

  protected readonly schema: FormSchema = {
    submitLabel: 'Add',
    fields: [
      {
        name: 'firstName',
        label: 'First name',
        type: 'text',
        validation: { required: true, minLength: 2, maxLength: 40 },
      },
      {
        name: 'lastName',
        label: 'Last name',
        type: 'text',
        validation: { required: true, minLength: 2, maxLength: 40 },
      },
      { name: 'email', label: 'Email', type: 'email', validation: { required: true } },
      {
        name: 'age',
        label: 'Age',
        type: 'number',
        validation: { required: true, min: 18, max: 100 },
      },
    ],
  };

  protected readonly defaults: FormValues = { age: 18 };

  protected readonly columnDefs: ColDef<User>[] = [
    { field: 'id', headerName: 'ID', maxWidth: 90, flex: 0 },
    { field: 'firstName', headerName: 'First name' },
    { field: 'lastName', headerName: 'Last name' },
    { field: 'gender', headerName: 'Gender', maxWidth: 120 },
    { field: 'email', headerName: 'Email', minWidth: 220, flex: 2 },
    { field: 'birthDate', headerName: 'Birth date' },
    { field: 'age', headerName: 'Age', filter: 'agNumberColumnFilter', maxWidth: 110 },
    {
      colId: 'role',
      headerName: 'Role',
      sortable: false,
      filter: false,
      minWidth: 200,
      // Composed from two fields, so it needs a getter rather than a `field`.
      valueGetter: ({ data }) =>
        data?.company ? `${data.company.title ?? ''} · ${data.company.name ?? ''}` : '',
    },
  ];

  protected readonly rowId = (row: User): string => String(row.id);


  protected reload(): void {
    this.service.users.reload();
  }

  protected async onCreate(values: FormValues): Promise<void> {
    this.createError.set(null);
    const payload: NewUser = {
      firstName: String(values['firstName']),
      lastName: String(values['lastName']),
      email: String(values['email']),
      age: Number(values['age']),
    };

    try {
      const created = await this.service.create(payload);
      this.createdUsers.update((current) => [created, ...current]);
      this.snackbar.success(
        `Created ${created.firstName} ${created.lastName} (id ${String(created.id)})`,
      );
    } catch (error) {
      const message = getUserMessage(normalizeError(error));
      this.createError.set(message);
      this.snackbar.error(message);
    }
  }

  protected onInvalid(fields: string[]): void {
    this.snackbar.error(`Fix these fields first: ${fields.join(', ')}`);
  }
}
