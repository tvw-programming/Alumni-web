import { ChangeDetectionStrategy, Component } from '@angular/core';

import { SpecDocBrowser } from './spec-doc-browser';

/** Documentation → Spec Doc: this app's own component specifications. */
@Component({
  selector: 'app-spec-doc-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [SpecDocBrowser],
  template: `
    <app-spec-doc-browser
      setId="ui"
      title="Spec Doc"
      description="Component specifications for this Angular app, generated from frontend/angular/specDoc."
    />
  `,
})
export class SpecDocPage {}
