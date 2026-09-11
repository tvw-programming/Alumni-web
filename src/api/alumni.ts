/**
 * Alumni endpoints.
 *
 * Every function has a fixture fallback behind `VITE_USE_FIXTURES`. That is not
 * a testing convenience — it is what lets the admin screen be used and reviewed
 * before the Go gateway compiles. The shapes below are the API's contract; when
 * the gateway lands, only the flag changes.
 */
import { api } from '~/api/client';
import { alumniFixtures } from '~/mocks/fixtures';

export const USING_FIXTURES = import.meta.env.VITE_USE_FIXTURES !== 'false';

/** The editable fields. `course` maps to the primary education_history row. */
export interface AlumniDraft {
  fullName: string;
  yearOfPassing: number | null;
  course: string;
  mobile: string;
  email: string;
  city: string;
  headline: string;
  /**
   * Anything this institution tracks that the schema does not — hostel, batch
   * section, donor tier. Written by the importer from unrecognised spreadsheet
   * columns, and editable as key/value pairs in the form.
   */
  extra: Record<string, string>;
}

export interface AlumniRow extends AlumniDraft {
  id: number;
  status: 'active' | 'suspended' | 'deleted';
  pendingMedia: number;
  createdAt: string;
}

export const EMPTY_DRAFT: AlumniDraft = {
  fullName: '',
  yearOfPassing: null,
  course: '',
  mobile: '',
  email: '',
  city: '',
  headline: '',
  extra: {},
};

export interface AlumniPage {
  rows: AlumniRow[];
  total: number;
}

export interface AlumniQuery {
  search?: string;
  status?: string;
  page: number;
  pageSize: number;
}

export async function fetchAlumniPage(query: AlumniQuery): Promise<AlumniPage> {
  if (USING_FIXTURES) return fixturePage(query);
  const { data } = await api.get<AlumniPage>('/alumni', {
    params: {
      q: query.search || undefined,
      status: query.status || undefined,
      offset: query.page * query.pageSize,
      limit: query.pageSize,
    },
  });
  return data;
}

export async function createAlumni(draft: AlumniDraft): Promise<AlumniRow> {
  if (USING_FIXTURES) {
    const row: AlumniRow = {
      ...draft,
      id: nextFixtureId(),
      status: 'active',
      pendingMedia: 0,
      createdAt: new Date().toISOString(),
    };
    alumniFixtures.unshift(row);
    return row;
  }
  const { data } = await api.post<AlumniRow>('/alumni', draft);
  return data;
}

export async function updateAlumni(id: number, draft: AlumniDraft): Promise<AlumniRow> {
  if (USING_FIXTURES) {
    const row = alumniFixtures.find((a) => a.id === id);
    if (!row) throw new Error(`No alumni with id ${id}`);
    Object.assign(row, draft);
    return row;
  }
  const { data } = await api.put<AlumniRow>(`/alumni/${id}`, draft);
  return data;
}

export async function deleteAlumni(ids: number[]): Promise<void> {
  if (USING_FIXTURES) {
    for (const id of ids) {
      const at = alumniFixtures.findIndex((a) => a.id === id);
      if (at >= 0) alumniFixtures.splice(at, 1);
    }
    return;
  }
  // One request, not one per row: a 200-row delete should be one transaction
  // the server can roll back, not 200 that can half-succeed.
  await api.post('/alumni/bulk-delete', { ids });
}

export interface ImportOutcome {
  created: number;
  failed: { rowNumber: number; reason: string }[];
}

/**
 * Bulk create from a spreadsheet.
 *
 * Valid rows are written and invalid ones reported; the import is not all-or-
 * nothing. Rejecting a 300-row file because row 214 has a typo means the whole
 * thing is re-uploaded after every fix, and in practice people delete the row
 * rather than correct it.
 */
export async function importAlumni(drafts: AlumniDraft[]): Promise<ImportOutcome> {
  if (USING_FIXTURES) {
    for (const draft of drafts) await createAlumni(draft);
    return { created: drafts.length, failed: [] };
  }
  const { data } = await api.post<ImportOutcome>('/alumni/import', { rows: drafts });
  return data;
}

function nextFixtureId(): number {
  return alumniFixtures.reduce((max, row) => Math.max(max, row.id), 0) + 1;
}

/**
 * Filtering and paging applied the way the SQL does, so the grid behaves
 * identically against fixtures and against Postgres. A fixture source that
 * ignores the filters teaches you the wrong thing about your own UI.
 */
function fixturePage(query: AlumniQuery): AlumniPage {
  const needle = query.search?.trim().toLowerCase() ?? '';
  const filtered = alumniFixtures.filter((row) => {
    if (query.status && row.status !== query.status) return false;
    if (!needle) return true;
    return (
      row.fullName.toLowerCase().includes(needle) ||
      row.email.toLowerCase().includes(needle) ||
      row.course.toLowerCase().includes(needle)
    );
  });

  const start = query.page * query.pageSize;
  return { rows: filtered.slice(start, start + query.pageSize), total: filtered.length };
}
