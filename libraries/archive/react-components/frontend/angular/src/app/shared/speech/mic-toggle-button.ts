import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';

import { SpeechHelpDialog } from './speech-help-dialog';
import { SpeechService } from '../../core/speech/speech.service';

import type { MicStatus } from '../../core/speech/speech.types';

const TOOLTIPS: Record<MicStatus, string> = {
  unsupported: 'This browser has no speech recognition',
  denied: 'Microphone blocked — allow access, then click to retry',
  off: 'Voice commands off (click to turn on)',
  starting: 'Starting the microphone…',
  listening: 'Listening — say "go to dashboard" or "help"',
};

/**
 * Mic on/off toggle for the app bars, plus a shortcut to the command list.
 *
 * Reads three signals, so it updates when the status or the no-match flash
 * changes and at no other time. React needed `useSyncExternalStore` over a
 * hand-written store to get the same property.
 */
@Component({
  selector: 'app-mic-toggle-button',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatButtonModule, MatIconModule, MatTooltipModule],
  template: `
    <span class="mic">
      <button
        matIconButton
        type="button"
        class="mic__button"
        [class.mic__button--listening]="listening()"
        [class.mic__button--failed]="speech.lastFailed()"
        [disabled]="disabled()"
        [matTooltip]="tooltip()"
        [attr.aria-label]="listening() ? 'Turn voice commands off' : 'Turn voice commands on'"
        [attr.aria-pressed]="listening()"
        (click)="speech.toggleMic()"
      >
        <mat-icon>{{ listening() ? 'mic' : 'mic_off' }}</mat-icon>
      </button>

      @if (listening()) {
        <button
          matIconButton
          type="button"
          matTooltip="Voice commands"
          aria-label="Show voice commands"
          (click)="openHelp()"
        >
          <mat-icon>help_outline</mat-icon>
        </button>
      }

      <!--
        The heard phrase is announced politely rather than shown: it is
        feedback, and a visible caption in the toolbar would push the layout
        around on every utterance.
      -->
      <span class="mic__sr" role="status" aria-live="polite">{{ announcement() }}</span>
    </span>
  `,
  styles: `
    :host { display: inline-flex; }
    .mic { display: inline-flex; align-items: center; }
    .mic__button { position: relative; }

    /*
     * The ring is a pseudo-element, so it cannot affect layout or push the
     * toolbar around while it animates. A CSS keyframe also runs on the
     * compositor: animating this from application state would mean waking the
     * framework 60 times a second for decoration.
     */
    .mic__button--listening::before {
      content: '';
      position: absolute;
      inset: 4px;
      border: 2px solid var(--mat-sys-tertiary);
      border-radius: 50%;
      animation: mic-pulse 1.8s ease-out infinite;
      pointer-events: none;
    }
    .mic__button--failed::before { border-color: var(--mat-sys-error); }

    @keyframes mic-pulse {
      0% { transform: scale(0.85); opacity: 0.7; }
      70% { transform: scale(1.6); opacity: 0; }
      100% { transform: scale(1.6); opacity: 0; }
    }

    /* Reduced motion keeps the ring — the state stays visible, the movement goes. */
    @media (prefers-reduced-motion: reduce) {
      .mic__button--listening::before {
        animation: none;
        opacity: 0.6;
        transform: scale(1);
      }
    }

    .mic__sr {
      position: absolute;
      width: 1px;
      height: 1px;
      margin: -1px;
      padding: 0;
      overflow: hidden;
      clip-path: inset(50%);
      white-space: nowrap;
    }
  `,
})
export class MicToggleButton {
  protected readonly speech = inject(SpeechService);
  private readonly dialog = inject(MatDialog);

  protected readonly listening = this.speech.isListening;
  protected readonly disabled = computed(() => this.speech.status() === 'unsupported');
  protected readonly tooltip = computed(
    () => TOOLTIPS[this.speech.status()] ?? 'Voice commands',
  );

  protected readonly announcement = computed(() => {
    const heard = this.speech.lastHeard();
    if (!heard) return '';
    const matched = this.speech.lastMatched();
    return matched ? `Heard ${heard}, running ${matched}` : `Heard ${heard}, no matching command`;
  });

  protected openHelp(): void {
    this.dialog.open(SpeechHelpDialog, { width: '560px' });
  }
}
