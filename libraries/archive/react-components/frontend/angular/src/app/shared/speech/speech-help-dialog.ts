import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';

import { GenericPopup } from '../generic-popup/generic-popup';
import { SpeechService } from '../../core/speech/speech.service';

import type { SpeechCommand } from '../../core/speech/command-matcher';

interface CommandGroup {
  group: string;
  commands: SpeechCommand[];
}

/**
 * Every command currently registered, grouped by owner.
 *
 * Built from the live registry rather than a hand-maintained list, so it cannot
 * describe a command that no longer exists or miss one that was just added —
 * the failure mode of every written-down shortcut reference.
 */
@Component({
  selector: 'app-speech-help-dialog',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [GenericPopup, MatDialogModule],
  template: `
    <app-generic-popup
      title="Voice commands"
      description="Say a phrase on its own, or lead with “go to”, “open” or “show”."
      icon="mic"
      confirmLabel="Done"
      [hideCancel]="true"
      (confirm)="close()"
    >
      @for (section of groups(); track section.group) {
        <section class="help__group">
          <h3 class="help__heading">{{ section.group }}</h3>
          <ul class="help__list">
            @for (command of section.commands; track command.id) {
              <li>
                <span class="help__phrase">{{ command.phrases[0] }}</span>
                @if (command.phrases.length > 1) {
                  <span class="help__aliases">
                    also: {{ aliasesOf(command) }}
                  </span>
                }
              </li>
            }
          </ul>
        </section>
      } @empty {
        <p class="help__empty">No commands are registered on this screen.</p>
      }
    </app-generic-popup>
  `,
  styles: `
    .help__group { margin-bottom: 20px; }
    .help__heading {
      margin: 0 0 8px;
      font: var(--mat-sys-title-small);
      font-weight: 700;
    }
    .help__list { margin: 0; padding-left: 20px; }
    .help__list li { margin-bottom: 6px; }
    .help__phrase { font-weight: 600; }
    .help__aliases {
      display: block;
      color: var(--mat-sys-on-surface-variant);
      font: var(--mat-sys-body-small);
    }
    .help__empty { margin: 0; color: var(--mat-sys-on-surface-variant); }
  `,
})
export class SpeechHelpDialog {
  private readonly speech = inject(SpeechService);

  /**
   * Snapshotted on open rather than read live: commands register and unregister
   * as routes change, and a list reshuffling while it is being read is worse
   * than one that is a few seconds stale.
   */
  private readonly commands = signal<SpeechCommand[]>(this.speech.getCommands());

  protected readonly groups = computed<CommandGroup[]>(() => {
    const byGroup = new Map<string, SpeechCommand[]>();
    for (const command of this.commands()) {
      const key = command.group || 'General';
      const existing = byGroup.get(key);
      if (existing) existing.push(command);
      else byGroup.set(key, [command]);
    }
    return [...byGroup.entries()].map(([group, commands]) => ({ group, commands }));
  });

  protected aliasesOf(command: SpeechCommand): string {
    // Cap the list: a sidebar entry carries its label, aliases and four
    // positional phrases, and printing all of them buries the useful ones.
    return command.phrases.slice(1, 4).join(', ');
  }

  private readonly dialogRef = inject(MatDialogRef<SpeechHelpDialog>);

  protected close(): void {
    // `GenericPopup` routes cancel and the close button through its policy, but
    // `confirm` is the owner's to handle — here that just means dismissing.
    this.dialogRef.close();
  }
}
