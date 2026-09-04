import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

import { ChatMessage, MessageDelivery } from '../_core/telehealth.types';

const DELIVERY_LABELS: Readonly<Record<MessageDelivery, string>> = {
  sending: 'Sending',
  sent: 'Sent',
  delivered: 'Delivered',
  read: 'Read',
  failed: 'Not sent',
};

const DELIVERY_ICONS: Readonly<Record<MessageDelivery, string>> = {
  sending: 'schedule',
  sent: 'check',
  delivered: 'done_all',
  read: 'done_all',
  failed: 'error_outline',
};

/**
 * One message in a clinical conversation.
 *
 * Benchmarks in ./README.md — WhatsApp for delivery ticks, MyChart for the
 * clinician/patient distinction, Signal for failed-send recovery.
 *
 * Two things this does that a generic chat bubble does not:
 *
 * - **Attachments are gated on a virus scan.** A clinical thread carries
 *   patient-uploaded photographs; offering a download before the file has been
 *   scanned makes the app the delivery mechanism.
 * - **Redacted messages leave a tombstone.** A withdrawn message that simply
 *   disappears makes the thread read as though it was never sent, which is
 *   wrong in a record that may be disclosed.
 */
@Component({
  selector: 'app-chat-bubble',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatIconModule, MatButtonModule],
  templateUrl: './chat-bubble.html',
  styleUrl: './chat-bubble.scss',
  host: {
    '[class]': '"bubble bubble--" + message().author',
    // A message list is a log; each entry is an article within it.
    role: 'article',
  },
})
export class ChatBubble {
  readonly message = input.required<ChatMessage>();
  readonly locale = input('en-IN');
  /** Hidden on consecutive messages from the same author. */
  readonly showAuthor = input(true);

  readonly retry = output<ChatMessage>();
  readonly openAttachment = output<{ message: ChatMessage; attachmentId: string }>();

  protected readonly isOwn = computed(() => this.message().author === 'patient');
  protected readonly isSystem = computed(() => this.message().author === 'system');

  protected readonly timeLabel = computed(() => {
    const sent = new Date(this.message().sentAt);
    if (Number.isNaN(sent.getTime())) return '';
    return new Intl.DateTimeFormat(this.locale(), {
      hour: 'numeric',
      minute: '2-digit',
    }).format(sent);
  });

  /** Delivery state is only meaningful for messages the patient sent. */
  protected readonly delivery = computed(() =>
    this.isOwn() ? this.message().delivery : null,
  );

  protected readonly deliveryLabel = computed(() => {
    const state = this.delivery();
    return state ? DELIVERY_LABELS[state] : null;
  });

  protected readonly deliveryIcon = computed(() => {
    const state = this.delivery();
    return state ? DELIVERY_ICONS[state] : null;
  });

  protected readonly failed = computed(() => this.message().delivery === 'failed');

  /**
   * The whole bubble as one sentence. Without it a screen reader announces the
   * author, body, time and tick marks as four disconnected fragments.
   */
  protected readonly announcement = computed(() => {
    const message = this.message();
    if (message.redacted) return 'This message was withdrawn';

    const who = this.isOwn() ? 'You' : (message.authorName ?? 'Clinician');
    const status = this.deliveryLabel() ? `, ${this.deliveryLabel()}` : '';
    return `${who}, ${this.timeLabel()}: ${message.body}${status}`;
  });

  protected attachmentSize(bytes?: number): string {
    if (bytes === undefined) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }
}
