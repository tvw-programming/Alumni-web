import { SpecDocBrowser } from './SpecDocBrowser';

/** Specifications for this React app's own components. */
export function SpecDocPage() {
  return (
    <SpecDocBrowser
      setId="ui"
      title="Spec Doc"
      description="Component specifications for this React application, generated from frontend/react/specDoc."
    />
  );
}
