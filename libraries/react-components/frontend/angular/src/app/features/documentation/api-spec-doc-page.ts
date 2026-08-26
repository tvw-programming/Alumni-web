import { ChangeDetectionStrategy, Component } from '@angular/core';

import { SpecDocBrowser } from './spec-doc-browser';

/** Documentation → API Spec Doc: the Go service's specifications. */
@Component({
  selector: 'app-api-spec-doc-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [SpecDocBrowser],
  template: `
    <app-spec-doc-browser
      setId="api"
      title="API Spec Doc"
      description="Handler, repository, model and middleware specifications for the Go API, generated from api/specDoc."
    />
  `,
})
export class ApiSpecDocPage {}
