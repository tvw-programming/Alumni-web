import { ChangeDetectionStrategy, Component, signal } from '@angular/core';

import { ChatMessage } from '../_core/telehealth.types';
import { ChatBubble } from './chat-bubble';

import samples from './chat-bubble.sample.json';

/** Runnable thread. Grouping is computed the way a real list would: the author
 *  name shows only when it changes. */
@Component({
  selector: 'app-chat-bubble-usage',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ChatBubble],
  template: `
    <section class="usage">
      <h2>ChatBubble</h2>
      <div class="usage__thread" role="log" aria-label="Conversation with Dr Imran Sheikh">
        @for (message of thread(); track message.id; let i = $index) {
          <app-chat-bubble
            [message]="message"
            [showAuthor]="showAuthor(i)"
            (retry)="onRetry($event)"
            (openAttachment)="lastAction.set('open ' + $event.attachmentId)"
          />
        }
      </div>
      <p class="usage__echo">last action: {{ lastAction() || '—' }}</p>
    </section>
  `,
  styles: `
    .usage { display: flex; flex-direction: column; gap: 1rem; padding: 1.5rem; }
    .usage__thread {
      display: flex; flex-direction: column; gap: 0.125rem; padding: 1rem;
      border: 1px solid var(--mat-sys-outline-variant); border-radius: 12px;
      background: var(--mat-sys-surface); max-width: 40rem;
    }
    .usage__echo { font-size: 0.8125rem; color: var(--mat-sys-on-surface-variant); }
  `,
})
export class ChatBubbleUsage {
  protected readonly thread = signal<readonly ChatMessage[]>(
    (samples as { thread: ChatMessage[] }).thread,
  );
  protected readonly lastAction = signal('');

  /** Name shown only when the author changes, as a real thread groups. */
  protected showAuthor(index: number): boolean {
    const thread = this.thread();
    return index === 0 || thread[index - 1]?.author !== thread[index]?.author;
  }

  /** Demonstrates recovery: failed → sending → delivered. */
  protected onRetry(message: ChatMessage): void {
    this.lastAction.set(`retry ${message.id}`);
    this.patch(message.id, 'sending');
    setTimeout(() => this.patch(message.id, 'delivered'), 900);
  }

  private patch(id: string, delivery: ChatMessage['delivery']): void {
    this.thread.update((messages) =>
      messages.map((m) => (m.id === id ? { ...m, delivery } : m)),
    );
  }
}
