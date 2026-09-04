import type { ImageAsset } from '@ui/primitives/media';

/** Prevents "off" from ever being confused with "offline" or "unknown". */
export interface DeviceSyncMeta {
  lastSeenAt?: string;
  lastUpdatedAt?: string;
  connection: 'online' | 'connecting' | 'offline' | 'unknown';
  source?: string;
  requestId?: string;
}

// ---------------------------------------------------------------------------
// 11. BatteryIndicator / SignalStrengthIcon (built first — reused everywhere)
// ---------------------------------------------------------------------------

export type BatteryStatus = 'normal' | 'low' | 'critical' | 'unknown';
export type SignalStatus = 'excellent' | 'good' | 'fair' | 'poor' | 'offline' | 'unknown';
export type SignalProtocol = 'wifi' | 'bluetooth' | 'thread' | 'cellular';

// ---------------------------------------------------------------------------
// 1. DeviceCard
// ---------------------------------------------------------------------------

export type DevicePowerState = 'on' | 'off' | 'unknown';
export type DeviceConnection = 'online' | 'offline' | 'connecting' | 'error';

export type DeviceCapability =
  | { type: 'power'; value: boolean }
  | { type: 'brightness'; value: number; min: number; max: number }
  | { type: 'temperature'; value: number; unit: string }
  | { type: 'lock'; value: 'locked' | 'unlocked' };

export interface SmartDevice {
  id: string;
  name: string;
  type: string;
  room?: string;
  icon?: string;
  image?: ImageAsset;
  powerState?: DevicePowerState;
  connection: DeviceConnection;
  capabilities: string[];
  batteryLevel?: number;
  batteryStatus?: BatteryStatus;
  signalStatus?: SignalStatus;
  signalProtocol?: SignalProtocol;
  sync?: DeviceSyncMeta;
}

// ---------------------------------------------------------------------------
// 2. DeviceToggleTile
// ---------------------------------------------------------------------------

export type ToggleTileState = 'on' | 'off' | 'pending' | 'offline' | 'error';

// ---------------------------------------------------------------------------
// 3. SliderControl — plain numeric props, no dedicated type needed

// ---------------------------------------------------------------------------
// 4. ThermostatDial
// ---------------------------------------------------------------------------

export type ClimateMode = 'heat' | 'cool' | 'auto' | 'off';
export type FanMode = 'auto' | 'on';

export interface ClimateCapability {
  target: number;
  current?: number;
  min: number;
  max: number;
  step: number;
  unit: 'C' | 'F';
  modes: ClimateMode[];
}

// ---------------------------------------------------------------------------
// 5. ColorPickerWheel / ColorPresetChips
// ---------------------------------------------------------------------------

export interface ColorPreset {
  id: string;
  label: string;
  color: string;
}

export interface LightColorCapability {
  supportsColor: boolean;
  supportsTemperature: boolean;
  supportsBrightness: boolean;
}

// ---------------------------------------------------------------------------
// 6. RoomTabs
// ---------------------------------------------------------------------------

export interface RoomTab {
  id: string;
  label: string;
  deviceCount?: number;
  alertCount?: number;
}

// ---------------------------------------------------------------------------
// 7. SceneCard
// ---------------------------------------------------------------------------

export type SceneExecutionStatus = 'idle' | 'running' | 'success' | 'partial' | 'error';

export interface SceneExecution {
  status: SceneExecutionStatus;
  completedDeviceIds?: string[];
  failedDeviceIds?: string[];
}

export interface SmartScene {
  id: string;
  name: string;
  icon?: string;
  description?: string;
  deviceCount: number;
  enabled: boolean;
  lastRunAt?: string;
}

// ---------------------------------------------------------------------------
// 8. AutomationRuleCard
// ---------------------------------------------------------------------------

export type AutomationStatus = 'active' | 'paused' | 'error' | 'neverRun';

export interface AutomationRule {
  id: string;
  name: string;
  enabled: boolean;
  triggerSummary: string;
  conditionSummary?: string;
  actionSummary: string;
  lastRunAt?: string;
  status: AutomationStatus;
}

// ---------------------------------------------------------------------------
// 9. DevicePairingWizard
// ---------------------------------------------------------------------------

export type PairingStepId = 'scan' | 'discover' | 'connect' | 'configure' | 'complete';

export interface PairingStep {
  id: PairingStepId;
  title: string;
  description: string;
}

export type PairingState = 'idle' | 'requestingPermission' | 'scanning' | 'discovering' | 'connecting' | 'configuring' | 'success' | 'error' | 'canceled';

export interface DeviceCandidate {
  id: string;
  name: string;
  type: string;
  signalStatus?: SignalStatus;
}

export interface PairingError {
  message: string;
  recoverable: boolean;
}

export interface DeviceConfig {
  name: string;
  roomId?: string;
}

// ---------------------------------------------------------------------------
// 10. SensorReadingCard
// ---------------------------------------------------------------------------

export type SensorTrend = 'up' | 'down' | 'stable' | 'unknown';
export type SensorStatus = 'normal' | 'warning' | 'critical' | 'stale' | 'offline';

export interface SensorReading {
  label: string;
  value?: number;
  unit: string;
  timestamp?: string;
  trend?: SensorTrend;
  status?: SensorStatus;
  source?: string;
  sparkline?: number[];
}

// ---------------------------------------------------------------------------
// 12. FirmwareUpdateCard
// ---------------------------------------------------------------------------

export type FirmwareStatus = 'upToDate' | 'available' | 'downloading' | 'installing' | 'restarting' | 'success' | 'error' | 'blocked';

// ---------------------------------------------------------------------------
// 13. ScheduleTimerRow
// ---------------------------------------------------------------------------

export type ScheduleStatus = 'active' | 'paused' | 'conflict' | 'error';

export interface DeviceSchedule {
  id: string;
  label?: string;
  days: string[];
  time: string;
  enabled: boolean;
  actionSummary: string;
  nextRun?: string;
  status?: ScheduleStatus;
}
