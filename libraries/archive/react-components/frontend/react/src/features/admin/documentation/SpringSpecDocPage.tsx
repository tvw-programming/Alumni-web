import { SpecDocBrowser } from './SpecDocBrowser';

/** Specifications for the Spring Boot port of the API. */
export function SpringSpecDocPage() {
  return (
    <SpecDocBrowser
      setId="api-spring"
      title="Spring API Spec Doc"
      description="Component specifications for the Java port of the API, generated from api-spring/specDoc."
    />
  );
}
