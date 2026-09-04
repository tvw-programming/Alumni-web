import { SpecDocBrowser } from './SpecDocBrowser';

/** Specifications for the shared component library, one per component. */
export function ComponentSpecDocPage() {
  return (
    <SpecDocBrowser
      setId="components"
      title="Component Spec Doc"
      description="Documentation for every component in @idol-ui/react, generated from the README beside each one."
    />
  );
}
