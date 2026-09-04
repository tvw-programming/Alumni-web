import { ChangeDetectionStrategy, Component } from '@angular/core';

import { SpecDocBrowser } from './spec-doc-browser';

/** Documentation → Spring API Spec Doc: the Java port's specifications. */
@Component({
  selector: 'app-spring-spec-doc-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [SpecDocBrowser],
  template: `
    <app-spec-doc-browser
      setId="api-spring"
      title="Spring API Spec Doc"
      description="Component specifications for the Java port of the API, generated from api-spring/specDoc."
    />
  `,
})
export class SpringSpecDocPage {}
