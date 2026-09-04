# IoT & Smart Home / Wearables Component Library (React Native Paper)

Domain layer for connected devices: cards, tiles, sliders, a thermostat
dial, a colour picker, room navigation, scenes, automations, a pairing
wizard, sensor readings, device health, firmware updates, and schedules.
Built directly on **React Native Paper** primitives per the spec's own
component guide — `Card`, `Surface`, `Switch`, `IconButton`,
`ActivityIndicator`, `Snackbar`, `SegmentedButtons`, `Menu`,
`Dialog`/`Portal` (via the shared `AppSheet`), `ProgressBar`, `Chip`,
`Badge` — layered on top of the base library in `src/components/`.

## Folder structure

```
src/components/iot/
├── theme/iotTokens.ts   # online/offline/pending, deviceOn/Off, battery*, signal*, climate*
├── types/domain.ts      # SmartDevice, DeviceSyncMeta, SensorReading, AutomationRule, …
│
├── DeviceHealth/         # BatteryIndicator + SignalStrengthIcon — built first, reused everywhere
├── DeviceCard/
├── DeviceToggleTile/
├── SliderControl/
├── ThermostatDial/
├── ColorPicker/          # ColorPickerWheel + ColorPresetChips
├── RoomTabs/
├── SceneCard/
├── AutomationRuleCard/
├── DevicePairingWizard/
├── SensorReadingCard/
├── FirmwareUpdateCard/
└── ScheduleTimerRow/
```

Every folder follows the same three-file shape:
**`Component.tsx`** · **`Component.sample.json`** (dummy data) ·
**`Component.usage.tsx`** (a real, compiling example).

The usage files are not documentation-only — the **Smart Home UI** tab
renders them directly, so an example that drifts from its component fails
the typecheck.

## Reused from the base and other domains

- **`AppCard`** / **`AppButton`** (`@ui/molecules`, `@ui/atoms`) — every
  card and primary action across the domain.
- **`AppSheet`** (`@ui/organisms`) — the same Portal-based primitive every
  other domain's dialogs and sheets use, available for a device's detail
  sheet or a scene editor built on top of this library.
- **`@react-native-community/slider`** — `SliderControl` uses the same
  slider import established in fintech's `EMICalculator` and realestate's
  `EMICalculatorCard`; React Native Paper has no `Slider` export.
- The `Sparkline` SVG polyline pattern in `SensorReadingCard` mirrors the
  one built for enterprise's `KPIStatCard`.
- `DevicePairingWizard`'s step indicator ("Step X of Y" as real text,
  non-gesture-only navigation) follows the same shape as enterprise's
  `MultiStepFormWizard`.

## The one rule

> State honesty. The interface should always make clear what the user
> requested, what the device acknowledged, what the device actually
> applied, and what the system cannot currently verify.

Enforced by construction:

| Component | What it deliberately cannot do |
|---|---|
| `DeviceCard` | Assume every device supports "power" — controls are driven by the device's own capability list, and "offline" never renders or reads aloud as "off." |
| `DeviceToggleTile` | Collapse `pending`/`offline`/`error` into the `on`/`off` visual — each keeps its own visible, accessible state. |
| `SliderControl` | Be gesture-only — plus/minus `IconButton`s sit next to the drag track, and `accessibilityValue` always reports min/max/now/text. |
| `ThermostatDial` | Make the ring the only way to change a target, or hide current temperature — both target and current are always on screen. |
| `ColorPickerWheel` / `ColorPresetChips` | Leave hue unannounced, or silently disable colour on unsupported devices — the wheel gives way to explanatory text instead. |
| `RoomTabs` | Signal an alert count with colour alone — a `Badge` is always paired with a number in the accessible label. |
| `SceneCard` | Report "completed" when only some devices in a scene responded — a `partial` execution renders its own honest state. |
| `AutomationRuleCard` | Render trigger/condition/action as raw if-this-then-that syntax — each renders as a plain-language sentence. |
| `DevicePairingWizard` | Leave a failure with no way forward — "Try again" and "Cancel" are always present, and a manual setup-code path is a real fallback next to the QR scan. |
| `SensorReadingCard` | Label a reading "critical" with no explanation — a threshold note is required wherever severity is shown; the sparkline always ships a text/table fallback. |
| `BatteryIndicator` / `SignalStrengthIcon` | Use colour alone for any status — every colour is paired with an icon and a word. |
| `FirmwareUpdateCard` | Declare "success" or "up to date" from a completed download — install and restart must both finish first. |
| `ScheduleTimerRow` | Leave the switch to speak for itself — the accessible label always combines the schedule's name and its live enabled/disabled state. |

## Cross-cutting standards

**Never colour alone.** Connection state, battery, signal, climate mode,
and scene/automation status all pair an icon or text label with any
colour.

**Optimistic UI always has a way back.** `AutomationRuleCard`,
`ScheduleTimerRow`, and `DeviceCard`'s quick toggle update local state
immediately, then roll back — visibly, with a `syncError` message — if the
caller's promise rejects. No domain component swallows a failed command
silently.

**Domain components stay thin.** Device communication, optimistic-update
reconciliation, capability discovery, pairing protocols, firmware delivery,
and automation execution all live in services outside this folder — every
component here only ever emits an intent via a callback prop. Every
`*.usage.tsx` owns the simulated async delay that stands in for these
services.

**Connection is never confused with power state.** `DeviceSyncMeta`
separates `connection: online|connecting|offline|unknown` from a device's
`powerState`, so a device that's off is never described the same way as one
that's unreachable.

## Tokens

`design-tokens/iot.tokens.json` — light and dark, semantic names only:
`background`/`surface`/`surfaceVariant`, `online`/`offline`/`pending`/
`warning`/`error`, `deviceOn`/`deviceOff`, `batteryNormal`/`Low`/`Critical`/
`Charging`, `signalStrong`/`Weak`/`Offline`, `climateHeat`/`Cool`/`Auto`/
`Off`.

Read them with `useSmartHomeTheme()`. No component in this folder accepts a
hex value.

## Usage

```tsx
import { DeviceCard, ThermostatDial, SceneCard } from '@ui/iot';

<DeviceCard
  device={device}
  toggling={pendingId === device.id}
  onToggle={(d) => toggleDevice(d.id)}   // caller owns optimistic update + rollback
  onPress={(d) => openDeviceDetail(d.id)}
/>
```

See the running app's **Smart Home UI** tab for all thirteen, or read any
`*.usage.tsx` for the same examples in source form.
