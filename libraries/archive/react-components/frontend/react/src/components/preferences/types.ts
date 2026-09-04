import type { ReactNode } from 'react';

/**
 * ============================================================================
 * Preference popup framework — shared types
 * ============================================================================
 * A route exposes preference sections as *config* ({@link PreferenceSectionConfig}):
 * icon-button triggers open a compact popup with the section's controls, a
 * draft-until-committed edit model, and two distinct commits:
 *   - Apply  → push the draft into app state immediately (no API).
 *   - Save   → POST the draft to `saveEndpoint`, then apply the server response.
 * New sections (on any route) are added by writing a new config object — the
 * popup, actions, draft and save plumbing are all shared.
 */

/** One declarative form field, rendered by the shared field controls. */
export type PreferenceFieldSpec<TDraft> =
  | { kind: 'switch'; key: keyof TDraft & string; label: string; helperText?: string }
  | { kind: 'text'; key: keyof TDraft & string; label: string; placeholder?: string }
  | { kind: 'number'; key: keyof TDraft & string; label: string; min?: number; max?: number }
  | {
      kind: 'select';
      key: keyof TDraft & string;
      label: string;
      options: { value: string; label: string }[];
    };

/**
 * Config for one preference section. `fields` covers simple flat forms with
 * the shared controls; `renderContent` is the escape hatch for rich bodies
 * (e.g. an existing controlled panel component). Provide one of the two.
 */
export interface PreferenceSectionConfig<TDraft> {
  /** Stable identifier; also sent to the API with the payload. */
  id: string;
  title: string;
  /** Icon shown on the trigger button and in the popup header. */
  icon: ReactNode;
  /** Optional one-liner under the title. */
  description?: string;

  /** Committed value — the popup seeds its draft from this when it opens. */
  value: TDraft;

  /** Declarative fields rendered by the shared controls. */
  fields?: PreferenceFieldSpec<TDraft>[];
  /** Custom body bound to the draft (controlled). Wins over `fields`. */
  renderContent?: (draft: TDraft, onDraftChange: (next: TDraft) => void) => ReactNode;

  /** Apply: commit the draft to app state immediately. No API involved. */
  onApply: (draft: TDraft) => void;

  /** Endpoint the Save action POSTs the draft to (via preferenceService). */
  saveEndpoint: string;
  /** Called with the server-confirmed draft after a successful save. */
  onSaveSuccess?: (saved: TDraft) => void;

  /** Close the popup after a successful save. Default true. */
  closeOnSave?: boolean;
  /** Close the popup after Apply. Default false (keep tweaking). */
  closeOnApply?: boolean;

  /** Popup width (px number or CSS length). Default '40vw'. */
  width?: number | string;
  /**
   * Max body height in px before the body scrolls. Pass 'none' to let the
   * popup grow with its content (no scrollbar). Default 420.
   */
  bodyMaxHeight?: number | 'none';

  /**
   * When true the trigger icon button shows a red badge dot, signalling that
   * the section's preferences differ from the default (i.e. are "applied").
   * Computed by the section owner and passed in through the config.
   */
  active?: boolean;
}

/**
 * Type-erased config so heterogeneous sections can live in one array
 * (each section's TDraft differs; the popup treats it opaquely).
 *
 * `unknown` cannot replace the `any` here. TDraft is invariant — it appears
 * covariantly in `value`, contravariantly in `onApply`, and as `keyof TDraft`
 * inside `PreferenceFieldSpec` — so `PreferenceSectionConfig<PagePreferencesDraft>`
 * is not assignable to `PreferenceSectionConfig<unknown>`. Type erasure through
 * `any` is the intended escape, and `PreferencesBar` never reads a draft's
 * contents: it hands each config straight back to the section that owns it.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- see the note above; TDraft is invariant
export type AnyPreferenceSectionConfig = PreferenceSectionConfig<any>;
