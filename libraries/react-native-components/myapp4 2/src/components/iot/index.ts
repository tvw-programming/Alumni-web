/**
 * IoT & SMART HOME / WEARABLES COMPONENT LIBRARY (React Native Paper)
 *
 * Domain layer on top of the base library in `src/components/`. Same
 * portability rule as the other domain libraries: nothing here imports from
 * `src/features`, `src/store` or `src/services`. Built directly on React
 * Native Paper primitives per the spec's own component guide — `Card`,
 * `Surface`, `Switch`, `IconButton`, `ActivityIndicator`, `Snackbar`,
 * `SegmentedButtons`, `Menu`, `Dialog`/`Portal` (via the shared `AppSheet`),
 * `ProgressBar`, `Chip`, `Badge` — with SVG rendering for the thermostat
 * dial and colour wheel, since Paper has no dial or colour-picker primitive.
 *
 * The organising principle from the spec — state honesty. The interface
 * should always make clear what the user requested, what the device
 * acknowledged, what the device actually applied, and what the system
 * cannot currently verify:
 *
 *   - `DeviceCard` never assumes every device supports "power" — its
 *     controls are driven entirely by the device's own capability list,
 *     and "offline" is never rendered or read aloud as "off"
 *   - `DeviceToggleTile` keeps `pending`/`offline`/`error` as their own
 *     visible states, distinct from `on`/`off`
 *   - `SliderControl` always exposes plus/minus buttons alongside the drag
 *     gesture, and reports `accessibilityValue` with min/max/now/text
 *   - `ThermostatDial` never makes the ring the only way to change a
 *     target — IconButton steppers sit next to it, and current vs. target
 *     temperature are always both on screen
 *   - `ColorPickerWheel` / `ColorPresetChips` always announce the selected
 *     hue as text, and the wheel is hidden — never disabled silently —
 *     when a device doesn't support colour
 *   - `RoomTabs` never renders an alert count as colour alone; a `Badge`
 *     is always paired with a number in the accessible label
 *   - `SceneCard` never reports "completed" when only some devices in a
 *     scene responded — a `partial` execution renders its own honest state
 *   - `AutomationRuleCard` always renders trigger/condition/action as plain
 *     language, never raw if-this-then-that syntax
 *   - `DevicePairingWizard` keeps every failure recoverable — "Try again"
 *     and "Cancel" are always available, and a manual setup-code path sits
 *     next to the QR scan as a real fallback, not a last resort
 *   - `SensorReadingCard` never labels a reading "critical" without a
 *     paired, product-specific threshold explanation, and its sparkline
 *     always ships a text/table fallback
 *   - `BatteryIndicator` / `SignalStrengthIcon` pair every colour with an
 *     icon and a word — never colour alone
 *   - `FirmwareUpdateCard` never declares "success" from a 100% download —
 *     install and restart must both finish first
 *   - `ScheduleTimerRow` combines a schedule's name and live state in one
 *     accessible label, and rolls back visibly if a toggle is rejected
 *
 * Device communication, optimistic-update reconciliation, capability
 * discovery, pairing protocols, firmware delivery, and automation execution
 * all live in domain services outside this folder — every component here
 * only ever emits an intent via a callback prop.
 */

// Foundations
export * from './theme/iotTokens';
export * from './types';

// Components
export * from './DeviceHealth';
export * from './DeviceCard';
export * from './DeviceToggleTile';
export * from './SliderControl';
export * from './ThermostatDial';
export * from './ColorPicker';
export * from './RoomTabs';
export * from './SceneCard';
export * from './AutomationRuleCard';
export * from './DevicePairingWizard';
export * from './SensorReadingCard';
export * from './FirmwareUpdateCard';
export * from './ScheduleTimerRow';
