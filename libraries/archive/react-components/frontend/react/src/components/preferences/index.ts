/**
 * Popup-based preferences framework.
 *
 * Quick start (any route):
 *   1. Describe each section as a PreferenceSectionConfig — id, title, icon,
 *      committed `value`, `fields` metadata or `renderContent`, `onApply`,
 *      and a `saveEndpoint`.
 *   2. Render <PreferencesBar sections={[...]} /> wherever the triggers go.
 *
 * Apply commits the draft to app state instantly (no API); Save POSTs the
 * draft and commits the server response. Adding a section = adding a config.
 */
export { PreferencesBar } from './PreferencesBar';
export type { PreferencesBarProps } from './PreferencesBar';
export { PreferencePopup } from './PreferencePopup';
export type { PreferencePopupProps } from './PreferencePopup';
export { PreferenceIconButton } from './PreferenceIconButton';
export type { PreferenceIconButtonProps } from './PreferenceIconButton';
export { PreferenceSection } from './PreferenceSection';
export type { PreferenceSectionProps } from './PreferenceSection';
export { PreferenceActions } from './PreferenceActions';
export type { PreferenceActionsProps } from './PreferenceActions';
export { PreferenceFieldControl } from './PreferenceFieldControl';
export { usePreferenceDraft } from './usePreferenceDraft';
export { usePreferenceSave } from './usePreferenceSave';
export type {
  AnyPreferenceSectionConfig,
  PreferenceFieldSpec,
  PreferenceSectionConfig,
} from './types';
