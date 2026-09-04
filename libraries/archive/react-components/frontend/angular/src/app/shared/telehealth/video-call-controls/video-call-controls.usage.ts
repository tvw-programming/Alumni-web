import { ChangeDetectionStrategy, Component, signal } from '@angular/core';

import { CallDeviceState, CallQuality } from '../_core/telehealth.types';
import { VideoCallControls } from './video-call-controls';

import samples from './video-call-controls.sample.json';

interface Case {
  readonly key: string;
  readonly note: string;
  readonly devices: CallDeviceState;
  readonly quality: CallQuality;
  readonly elapsedSeconds: number;
  readonly canEndForAll: boolean;
}

/** Gallery plus one live bar whose toggles actually work, so the muted-versus-
 *  blocked distinction can be felt rather than read. */
@Component({
  selector: 'app-video-call-controls-usage',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [VideoCallControls],
  template: `
    <section class="usage">
      <h2>VideoCallControls</h2>

      <article class="usage__case">
        <p class="usage__note"><code>live</code> toggles work; permission is granted here</p>
        <app-video-call-controls
          [devices]="liveDevices()"
          quality="good"
          [elapsedSeconds]="184"
          (toggleMic)="setMic($event)"
          (toggleCamera)="setCamera($event)"
          (toggleScreenShare)="setShare($event)"
          (endCall)="lastAction.set('ended call')"
          (openDeviceSettings)="lastAction.set('opened settings')"
        />
      </article>

      @for (item of cases(); track item.key) {
        <article class="usage__case">
          <p class="usage__note"><code>{{ item.key }}</code> {{ item.note }}</p>
          <app-video-call-controls
            [devices]="item.devices"
            [quality]="item.quality"
            [elapsedSeconds]="item.elapsedSeconds"
            [canEndForAll]="item.canEndForAll"
            (requestPermission)="lastAction.set('requested ' + $event + ' permission')"
          />
        </article>
      }

      <p class="usage__echo">last action: {{ lastAction() || '—' }}</p>
    </section>
  `,
  styles: `
    .usage { display: flex; flex-direction: column; gap: 1.25rem; padding: 1.5rem; max-width: 44rem; }
    .usage__case { display: grid; gap: 0.5rem; container-type: inline-size; }
    .usage__note { margin: 0; font-size: 0.75rem; color: var(--mat-sys-on-surface-variant); }
    .usage__note code { font-weight: 600; margin-right: 0.5rem; }
    .usage__echo { font-size: 0.8125rem; }
  `,
})
export class VideoCallControlsUsage {
  protected readonly lastAction = signal('');

  protected readonly liveDevices = signal<CallDeviceState>({
    micEnabled: true,
    cameraEnabled: true,
    speakerEnabled: true,
    screenSharing: false,
    micPermission: 'granted',
    cameraPermission: 'granted',
  });

  protected setMic(on: boolean): void {
    this.liveDevices.update((d) => ({ ...d, micEnabled: on }));
  }
  protected setCamera(on: boolean): void {
    this.liveDevices.update((d) => ({ ...d, cameraEnabled: on }));
  }
  protected setShare(on: boolean): void {
    this.liveDevices.update((d) => ({ ...d, screenSharing: on }));
  }

  protected readonly cases = signal<readonly Case[]>(
    Object.entries(samples as unknown as Record<string, Record<string, unknown>>)
      .filter(([key]) => !key.startsWith('$'))
      .map(([key, value]) => ({
        key,
        note: (value['$comment'] as string) ?? '',
        devices: value['devices'] as CallDeviceState,
        quality: value['quality'] as CallQuality,
        elapsedSeconds: value['elapsedSeconds'] as number,
        canEndForAll: (value['canEndForAll'] as boolean) ?? false,
      })),
  );
}
