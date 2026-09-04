import { SpecDocBrowser } from './SpecDocBrowser';

/** Specifications for the Go API. */
export function ApiSpecDocPage() {
  return (
    <SpecDocBrowser
      setId="api"
      title="API Spec Doc"
      description="Component specifications for the Go API, generated from api/specDoc."
    />
  );
}
