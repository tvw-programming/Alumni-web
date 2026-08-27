/**
 * Fixture data for reviewing the UI before the gateway exists.
 *
 * Generated rather than hand-written so there is enough of it to exercise the
 * things that only break at volume — grid paging, gallery virtualisation, the
 * filter box. Deterministic (no Math.random) so a screenshot taken today
 * matches one taken tomorrow.
 *
 * Images are drawn as data-URI SVGs. A remote placeholder service would be one
 * more thing to be offline, and the published artifact CSP blocks it anyway.
 */
import type { AlumniRow } from '~/api/alumni';
import type { MediaItem } from '~/api/media';

const FIRST = ['Aditi', 'Rahul', 'Meera', 'Vikram', 'Sana', 'Arjun', 'Priya', 'Kabir', 'Neha', 'Rohan'];
const LAST = ['Deshmukh', 'Iyer', 'Kulkarni', 'Nair', 'Sharma', 'Bose', 'Reddy', 'Chatterjee'];
const STATUSES: AlumniRow['status'][] = ['active', 'active', 'active', 'suspended', 'deleted'];

const COURSES = [
  'B.Tech Computer Science', 'B.E. Mechanical', 'B.Sc. Physics', 'MBA Finance',
  'M.Tech Data Science', 'B.Com', 'LL.B.', 'M.Sc. Chemistry',
];
const CITIES = ['Pune', 'Bengaluru', 'Mumbai', 'Berlin', 'Singapore', 'Dubai'];

export const alumniFixtures: AlumniRow[] = Array.from({ length: 120 }, (_, i) => {
  const first = FIRST[i % FIRST.length];
  const last = LAST[(i * 3) % LAST.length];
  return {
    id: i + 1,
    fullName: `${first} ${last}`,
    email: `${first}.${last}`.toLowerCase() + `${i + 1}@example.com`,
    yearOfPassing: 2000 + (i % 25),
    course: COURSES[i % COURSES.length],
    // Two in five have no mobile, so the completion column shows a real spread
    // rather than one value — 70% is only interesting next to 60%.
    // Valid Indian mobiles: 10 digits starting 6-9, stored canonically.
    mobile: i % 5 < 3 ? `+91${[6, 7, 8, 9][i % 4]}${String(100000000 + i * 137).slice(0, 9)}` : '',
    city: i % 3 === 0 ? '' : CITIES[i % CITIES.length],
    headline: i % 4 === 0 ? '' : `${['Engineer', 'Analyst', 'Founder', 'Designer'][i % 4]} at ${['Acme', 'Globex', 'Initech'][i % 3]}`,
    status: STATUSES[i % STATUSES.length],
    // Only a few have anything waiting, which is what makes the column worth
    // scanning — a number on every row carries no signal.
    pendingMedia: i % 17 === 0 ? (i % 3) + 1 : 0,
    // Columns an alumni office added that the schema never had.
    extra: i % 6 === 0 ? { Hostel: ['Tilak', 'Nehru', 'Bose'][i % 3], 'Batch section': String.fromCharCode(65 + (i % 4)) } : {},
    createdAt: new Date(Date.UTC(2024, 0, 1) + i * 36e5 * 19).toISOString(),
  };
});

export const mediaFixtures: MediaItem[] = Array.from({ length: 42 }, (_, i) => ({
  id: i + 1,
  contentType: 'image/webp',
  caption: `Reunion photo ${i + 1}`,
  width: 1200,
  height: 800,
}));

const HUES = [206, 168, 32, 340, 268, 12];

/** A labelled placeholder, so a mis-ordered gallery is visible at a glance. */
export function fixtureImageUrl(id: number): string {
  const hue = HUES[id % HUES.length];
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="800">
    <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="hsl(${hue} 52% 46%)"/>
      <stop offset="100%" stop-color="hsl(${(hue + 34) % 360} 46% 30%)"/>
    </linearGradient></defs>
    <rect width="1200" height="800" fill="url(#g)"/>
    <text x="600" y="430" font-family="system-ui,sans-serif" font-size="140"
          font-weight="600" fill="rgba(255,255,255,.9)" text-anchor="middle">${id}</text>
  </svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}
