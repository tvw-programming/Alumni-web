/**
 * @idol-ui/react — Shared component library for Idol applications.
 *
 * Foundation utilities (money, ids, a11y, mutations, optimistic UI).
 * Domain components live under ./domains/ and are auto-discovered by the
 * gallery registry.
 */
export * from './foundation';
export { DOMAINS, type DomainMeta } from './domainMeta';
export { exportDocComment, readmeIntro, summaryOf } from './componentSummary';
export type { SurfaceTier } from './surfaceTier';
export { classifySurface, needsDomainSurface, rootElementOf } from './surfaceTier';
export { ComponentDemo, demoIds, hasDemo, type ComponentDemoProps } from './registry';
