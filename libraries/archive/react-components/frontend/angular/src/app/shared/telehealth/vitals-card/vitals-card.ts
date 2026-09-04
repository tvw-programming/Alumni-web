import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';

import { Vital, VitalBand } from '../_core/telehealth.types';

const BAND_WORDS: Readonly<Record<VitalBand, string>> = {
  low: 'Below range',
  normal: 'In range',
  elevated: 'Slightly above range',
  high: 'Above range',
  critical: 'Needs attention',
  unknown: 'Not assessed',
};

/**
 * One vital sign: latest value, band, and a trend sparkline.
 *
 * Benchmarks in ./README.md — Apple Health and Fitbit for the compact metric
 * tile, MyChart for the reference-range framing.
 *
 * The rule that shapes this component: **the band is never computed here.**
 * Reference ranges vary by age, pregnancy, comorbidity and laboratory. A tile
 * that decides "140/90 is high" from a hard-coded constant is practising
 * medicine with a magic number, so `band` arrives from the server and the UI
 * only renders it — in words as well as colour, because a red tile means
 * nothing to a colour-blind patient.
 *
 * The sparkline is drawn as inline SVG rather than a charting dependency: it is
 * a polyline over at most a few dozen points, and it must be `aria-hidden` with
 * the real information available as text regardless.
 */
@Component({
  selector: 'app-vitals-card',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatCardModule, MatIconModule],
  templateUrl: './vitals-card.html',
  styleUrl: './vitals-card.scss',
  host: { '[attr.data-band]': 'vital().latest.band' },
})
export class VitalsCard {
  readonly vital = input.required<Vital>();
  readonly locale = input('en-IN');
  readonly showTrend = input(true);

  readonly openHistory = output<Vital>();

  protected readonly bandWord = computed(() => BAND_WORDS[this.vital().latest.band]);

  protected readonly needsAttention = computed(() => {
    const band = this.vital().latest.band;
    return band === 'critical' || band === 'high' || band === 'low';
  });

  /** Blood pressure is "120/80"; everything else is a single number. */
  protected readonly valueText = computed(() => {
    const { value, secondaryValue } = this.vital().latest;
    return secondaryValue === undefined ? String(value) : `${value}/${secondaryValue}`;
  });

  protected readonly measuredLabel = computed(() => {
    const at = new Date(this.vital().latest.at);
    if (Number.isNaN(at.getTime())) return '';

    const minutes = Math.round((Date.now() - at.getTime()) / 60_000);
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes} min ago`;
    if (minutes < 60 * 24) return `${Math.round(minutes / 60)} h ago`;

    return new Intl.DateTimeFormat(this.locale(), {
      day: 'numeric',
      month: 'short',
    }).format(at);
  });

  /** A patient-entered reading is a different claim from a device measurement,
   *  and a clinician needs to know which before acting. */
  protected readonly sourceLabel = computed(() => {
    switch (this.vital().source) {
      case 'manual': return 'Entered manually';
      case 'clinic': return 'Measured in clinic';
      case 'device': return 'From your device';
      default: return null;
    }
  });

  /** Trend needs at least two points; one reading is not a direction. */
  private readonly points = computed(() => {
    const history = this.vital().history ?? [];
    return history.length >= 2 ? history : [];
  });

  protected readonly hasTrend = computed(() => this.showTrend() && this.points().length >= 2);

  /**
   * Sparkline path in a 100×32 viewBox. Normalised to the series' own range so
   * a flat-looking line means genuinely flat, not "scaled to zero".
   */
  protected readonly sparkline = computed(() => {
    const points = this.points();
    if (points.length < 2) return '';

    const values = points.map((p) => p.value);
    const min = Math.min(...values);
    const max = Math.max(...values);
    // A constant series would divide by zero; draw it down the middle.
    const span = max - min || 1;

    return values
      .map((value, index) => {
        const x = (index / (values.length - 1)) * 100;
        const y = 32 - ((value - min) / span) * 28 - 2;
        return `${index === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`;
      })
      .join(' ');
  });

  /** The trend as words, because the sparkline is decorative to assistive tech. */
  protected readonly trendText = computed(() => {
    const points = this.points();
    if (points.length < 2) return null;

    const first = points[0]?.value ?? 0;
    const last = points[points.length - 1]?.value ?? 0;
    if (first === last) return 'Unchanged over the last readings';
    const direction = last > first ? 'up' : 'down';
    return `Trending ${direction} over the last ${points.length} readings`;
  });

  /** The whole tile as one sentence. */
  protected readonly announcement = computed(() => {
    const vital = this.vital();
    const parts = [
      `${vital.label}: ${this.valueText()} ${vital.unit}`,
      this.bandWord(),
      this.measuredLabel(),
    ];
    const trend = this.trendText();
    if (trend) parts.push(trend);
    return parts.filter(Boolean).join(', ');
  });
}
