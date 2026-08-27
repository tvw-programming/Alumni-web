import { ChangeDetectionStrategy, Component, computed, input, output, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

import { AppointmentSlot, SlotDay, SlotId } from '../_core/telehealth.types';

/**
 * Bookable times, grouped by day.
 *
 * Benchmarks in ./README.md — Zocdoc and Doctolib for the day-column layout,
 * Calendly for keyboard behaviour.
 *
 * The accessibility decision that drives the markup: **this is a radio group,
 * not a grid of buttons.** Picking a time is choosing one of a set, and a radio
 * group gives that for free — arrow keys move between slots, only the selected
 * one is in the tab order, and the group's name is announced once instead of
 * being repeated on every cell.
 *
 * Unavailable slots stay visible and disabled rather than being removed. An
 * empty column reads as "nothing here"; a column of struck-through times reads
 * as "fully booked", which is the true and more useful statement.
 */
@Component({
  selector: 'app-appointment-slot-grid',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatButtonModule, MatIconModule],
  templateUrl: './appointment-slot-grid.html',
  styleUrl: './appointment-slot-grid.scss',
})
export class AppointmentSlotGrid {
  readonly days = input.required<readonly SlotDay[]>();
  readonly selectedSlotId = input<SlotId | null>(null);
  readonly loading = input(false);
  readonly locale = input('en-IN');
  /** Slots per day before "Show more" — a full clinic day is 40+ times, and an
   *  unbounded column buries the next day below the fold. */
  readonly collapsedCount = input(8);

  readonly selectSlot = output<AppointmentSlot>();
  readonly requestMoreDays = output<void>();

  /** Days the user has expanded. Keyed by date so expansion survives a refresh
   *  of the slot data. */
  private readonly expanded = signal<ReadonlySet<string>>(new Set());

  protected readonly hasAnySlot = computed(() =>
    this.days().some((day) => day.slots.length > 0),
  );

  protected readonly hasAnyBookable = computed(() =>
    this.days().some((day) => day.slots.some((slot) => slot.availability === 'available' || slot.availability === 'few')),
  );

  /** Days with their visible slice and a flag for the toggle. */
  protected readonly visibleDays = computed(() => {
    const expanded = this.expanded();
    const limit = this.collapsedCount();
    return this.days().map((day) => {
      const isExpanded = expanded.has(day.date);
      return {
        ...day,
        visibleSlots: isExpanded ? day.slots : day.slots.slice(0, limit),
        hiddenCount: isExpanded ? 0 : Math.max(0, day.slots.length - limit),
        isExpanded,
      };
    });
  });

  protected isBookable(slot: AppointmentSlot): boolean {
    return slot.availability === 'available' || slot.availability === 'few';
  }

  protected timeLabel(slot: AppointmentSlot): string {
    const start = new Date(slot.startsAt);
    if (Number.isNaN(start.getTime())) return '';
    return new Intl.DateTimeFormat(this.locale(), { hour: 'numeric', minute: '2-digit' }).format(start);
  }

  /**
   * The full sentence for one option. A radio labelled only "4:30 pm" is
   * ambiguous in a grid of seven days — the day has to be in the name.
   */
  protected slotLabel(day: SlotDay, slot: AppointmentSlot): string {
    const time = this.timeLabel(slot);
    if (!this.isBookable(slot)) {
      return `${day.label} ${time}, ${slot.disabledReason ?? this.unavailableWord(slot)}`;
    }
    const scarcity = slot.availability === 'few' ? ', few slots left' : '';
    return `${day.label} ${time}${scarcity}`;
  }

  protected unavailableWord(slot: AppointmentSlot): string {
    switch (slot.availability) {
      case 'full': return 'fully booked';
      case 'blocked': return 'unavailable';
      case 'past': return 'no longer available';
      default: return 'unavailable';
    }
  }

  protected toggleDay(date: string): void {
    this.expanded.update((current) => {
      const next = new Set(current);
      if (!next.delete(date)) next.add(date);
      return next;
    });
  }

  protected onSelect(slot: AppointmentSlot): void {
    if (!this.isBookable(slot)) return;
    this.selectSlot.emit(slot);
  }
}
