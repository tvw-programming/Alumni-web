import { AllCommunityModule, ModuleRegistry } from 'ag-grid-community';

/**
 * Registers AG Grid's community modules exactly once.
 *
 * Deliberately NOT done in `main.ts`: importing `ag-grid-community` there pulls
 * the entire grid (~450 kB) into the initial bundle, which every page pays for
 * even though only two routes render a grid. Importing this module from the
 * grid wrapper instead keeps AG Grid inside the lazy chunks that actually use
 * it — the same split the React app gets from its lazy routes.
 *
 * Registration is idempotent, so importing this from several grid components is
 * safe.
 */
ModuleRegistry.registerModules([AllCommunityModule]);
