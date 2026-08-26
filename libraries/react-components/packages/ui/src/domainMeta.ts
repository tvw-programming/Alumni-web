/**
 * Domain identity: the labels and blurbs the gallery shows.
 *
 * Its own module because two very different consumers need it: `registry.ts`,
 * which runs in the bundler and uses `import.meta.glob`, and
 * `scripts/build-domain-catalogue.mjs`, which runs in plain Node and cannot
 * evaluate a glob at all. Keeping the table here lets the build script import
 * the real values instead of keeping a second copy in step with this one.
 */

export interface DomainMeta {
  readonly id: string;
  readonly label: string;
  readonly description: string;
}

/**
 * Display order and wording for each domain.
 *
 * A domain missing from this table still appears — it falls back to its folder
 * name — so a new domain is never invisible just because someone forgot to add
 * a label.
 */
export const DOMAINS: readonly DomainMeta[] = [
  { id: 'ecommerce', label: 'E-commerce', description: 'Catalogue, cart, checkout and orders.' },
  { id: 'fintech', label: 'FinTech', description: 'Balances, transactions, payments and KYC.' },
  {
    id: 'healthcare',
    label: 'Healthcare',
    description: 'Appointments, vitals, medication and consent.',
  },
  {
    id: 'social',
    label: 'Social & Messaging',
    description: 'Feeds, reactions, chat and mentions.',
  },
  {
    id: 'dashboard',
    label: 'Dashboard & Analytics',
    description: 'Tables, KPIs, filters and exports.',
  },
  {
    id: 'collaboration',
    label: 'Task & Collaboration',
    description: 'Tasks, boards, approvals and teams.',
  },
  {
    id: 'iot',
    label: 'IoT & Smart Home',
    description: 'Devices, scenes, automations and pairing.',
  },
  { id: 'travel', label: 'Travel & Booking', description: 'Search, fares, bookings and rides.' },
  { id: 'media', label: 'Media & OTT', description: 'Catalogue, player, downloads and plans.' },
  {
    id: 'fitness',
    label: 'Fitness & Wellness',
    description: 'Workouts, activity, meals and sleep.',
  },
];
