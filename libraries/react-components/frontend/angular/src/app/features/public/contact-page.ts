import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { MatCardModule } from '@angular/material/card';

import { AccentCard } from '../../shared/accent-card/accent-card';
import { PageContainer } from '../../shared/page-container/page-container';
import { SchemaForm } from '../../shared/forms/schema-form';
import { SnackbarService } from '../../shared/snackbar/snackbar.service';

import type { FormSchema, FormValues } from '../../shared/forms/form.types';

/**
 * Contact page.
 *
 * React hand-wrote three `<TextField>` blocks with per-field Zod schemas. Here
 * the same form is four lines of data through the shared schema engine, which
 * is the point of having built it — the validation rules, error text and
 * submit-disabled behaviour all come for free and stay consistent with every
 * other form in the app.
 */
@Component({
  selector: 'app-contact-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [AccentCard, MatCardModule, PageContainer, SchemaForm],
  template: `
    <app-page-container
      title="Contact us"
      subtitle="Questions or feedback? Send us a message and we’ll respond by email."
    >
      <div class="contact__frame">
        <app-accent-card accent="teal">
          <mat-card-content>
            <app-schema-form
              [schema]="schema"
              [submitting]="submitting()"
              (formSubmit)="onSubmit($event)"
              (invalidSubmit)="onInvalid()"
            />
          </mat-card-content>
        </app-accent-card>
      </div>
    </app-page-container>
  `,
  styles: `.contact__frame { max-width: 560px; }`,
})
export class ContactPage {
  private readonly snackbar = inject(SnackbarService);

  protected readonly submitting = signal(false);

  protected readonly schema: FormSchema = {
    submitLabel: 'Send message',
    fields: [
      {
        name: 'name',
        label: 'Name',
        type: 'text',
        validation: { required: true, minLength: 2 },
      },
      {
        // The `email` type contributes its own format validator.
        name: 'email',
        label: 'Email',
        type: 'email',
        validation: { required: true },
      },
      {
        name: 'message',
        label: 'Message',
        type: 'textarea',
        rows: 4,
        validation: { required: true, minLength: 10, maxLength: 1000 },
      },
    ],
  };

  protected onSubmit(values: FormValues): void {
    this.submitting.set(true);
    // No contact endpoint exists; the submit path is what is being demonstrated.
    setTimeout(() => {
      this.submitting.set(false);
      this.snackbar.success(
        `Thanks, ${String(values['name'])} — we’ll get back to you shortly.`,
      );
    }, 500);
  }

  protected onInvalid(): void {
    this.snackbar.error('Please complete every field before sending.');
  }
}
