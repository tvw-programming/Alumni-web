import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';

import { CallDeviceState, CallQuality } from '../_core/telehealth.types';

const QUALITY_LABELS: Readonly<Record<CallQuality, string>> = {
  good: 'Connection good',
  fair: 'Connection unstable',
  poor: 'Connection poor',
  reconnecting: 'Reconnecting…',
  disconnected: 'Disconnected',
};

/**
 * The control bar for a video consultation.
 *
 * Benchmarks in ./README.md — Zoom for the control cluster and the separated
 * end-call, Doxy.me for the clinical framing, Amwell for connection quality.
 *
 * The distinction this component insists on: **"muted" and "no microphone
 * permission" are different states.** A greyed-out mic button that means
 * "you denied access in a dialog three weeks ago" is the single most common
 * dead end in a telehealth call. Permission is modelled separately, the button
 * says which situation the patient is in, and denial offers the fix rather than
 * a disabled control.
 *
 * End call is deliberately not adjacent to the toggles: it is the one
 * irreversible action on the bar.
 */
@Component({
  selector: 'app-video-call-controls',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatButtonModule, MatIconModule, MatTooltipModule],
  templateUrl: './video-call-controls.html',
  styleUrl: './video-call-controls.scss',
})
export class VideoCallControls {
  readonly devices = input.required<CallDeviceState>();
  readonly quality = input<CallQuality>('good');
  readonly elapsedSeconds = input(0);
  readonly canShareScreen = input(true);
  /** Clinician-only controls; a patient bar hides them. */
  readonly canEndForAll = input(false);

  readonly toggleMic = output<boolean>();
  readonly toggleCamera = output<boolean>();
  readonly toggleScreenShare = output<boolean>();
  readonly openDeviceSettings = output<void>();
  readonly endCall = output<void>();
  /** Raised instead of toggling, when the browser has no permission to give. */
  readonly requestPermission = output<'microphone' | 'camera'>();

  protected readonly micBlocked = computed(() => this.devices().micPermission === 'denied');
  protected readonly cameraBlocked = computed(() => this.devices().cameraPermission === 'denied');

  protected readonly micLabel = computed(() => {
    if (this.micBlocked()) return 'Microphone blocked — allow access';
    return this.devices().micEnabled ? 'Mute microphone' : 'Unmute microphone';
  });

  protected readonly cameraLabel = computed(() => {
    if (this.cameraBlocked()) return 'Camera blocked — allow access';
    return this.devices().cameraEnabled ? 'Turn camera off' : 'Turn camera on';
  });

  protected readonly micIcon = computed(() => {
    if (this.micBlocked()) return 'mic_off';
    return this.devices().micEnabled ? 'mic' : 'mic_off';
  });

  protected readonly cameraIcon = computed(() => {
    if (this.cameraBlocked()) return 'videocam_off';
    return this.devices().cameraEnabled ? 'videocam' : 'videocam_off';
  });

  protected readonly qualityLabel = computed(() => QUALITY_LABELS[this.quality()]);

  protected readonly qualityIsProblem = computed(() =>
    this.quality() === 'poor' || this.quality() === 'reconnecting' || this.quality() === 'disconnected',
  );

  /** mm:ss, or h:mm:ss past an hour. Consultations are billed by duration, so
   *  the timer is information rather than decoration. */
  protected readonly elapsedLabel = computed(() => {
    const total = Math.max(0, Math.floor(this.elapsedSeconds()));
    const hours = Math.floor(total / 3600);
    const minutes = Math.floor((total % 3600) / 60);
    const seconds = total % 60;
    const mm = String(minutes).padStart(2, '0');
    const ss = String(seconds).padStart(2, '0');
    return hours > 0 ? `${hours}:${mm}:${ss}` : `${mm}:${ss}`;
  });

  protected onMic(): void {
    if (this.micBlocked()) {
      this.requestPermission.emit('microphone');
      return;
    }
    this.toggleMic.emit(!this.devices().micEnabled);
  }

  protected onCamera(): void {
    if (this.cameraBlocked()) {
      this.requestPermission.emit('camera');
      return;
    }
    this.toggleCamera.emit(!this.devices().cameraEnabled);
  }
}
