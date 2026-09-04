/**
 * Every navigable destination, in one place.
 *
 * The layouts render these, the router builds its paths from the same values,
 * and the speech layer will turn them into voice commands. Keeping one list is
 * the point: a new page becomes clickable and speakable in the same edit, and a
 * renamed page can never drift out of sync with what the user has to say to
 * reach it.
 *
 * This is a direct port of the React app's `routes/navigation.tsx`. It is a
 * `.ts` file rather than `.tsx` because Angular Material icons are ligature
 * names (`<mat-icon>category</mat-icon>`), so no markup is needed to describe
 * one — the icon is data here, not an element.
 */

export interface NavItem {
  readonly label: string;
  /** Router path. Sidebar entries are relative to `/admin/master-data`. */
  readonly path: string;
  /** Match the whole URL rather than a prefix (`routerLinkActiveOptions`). */
  readonly exact?: boolean;
  /** Material Symbols ligature name. */
  readonly icon?: string;
  /**
   * Extra phrasings a speaker might use for this destination. The label itself
   * is always matched, so these only cover what the label does not say —
   * abbreviations, synonyms, and the words people reach for instead.
   */
  readonly aliases?: readonly string[];
}

export const PUBLIC_NAV: readonly NavItem[] = [
  { label: 'Home', path: '/', exact: true, aliases: ['home page', 'start', 'landing page'] },
  { label: 'About', path: '/about', aliases: ['about us', 'about page'] },
  { label: 'Team', path: '/team', aliases: ['our team', 'people', 'team page'] },
  { label: 'Contact Us', path: '/contact', aliases: ['contact', 'get in touch', 'support'] },
  { label: 'Login', path: '/login', aliases: ['sign in', 'log in'] },
];

export const ADMIN_NAV: readonly NavItem[] = [
  {
    label: 'Dashboard',
    path: '/admin/dashboard',
    aliases: ['admin dashboard', 'charts', 'overview'],
  },
  // Prefix match, so this stays active for every master-data child route.
  { label: 'Master Data', path: '/admin/master-data', aliases: ['master', 'data'] },
  {
    label: 'Documentation',
    path: '/admin/documentation',
    aliases: ['docs', 'specs', 'specifications'],
  },
];

/**
 * The Documentation sidebar.
 *
 * Its own section rather than a Master Data entry: Master Data is the sample
 * data and component gallery, and specifications describe the app itself. They
 * also have different audiences — one is a demo, the other is reference.
 */
export const DOCUMENTATION_NAV: readonly NavItem[] = [
  {
    label: 'Spec Doc',
    path: 'spec-doc',
    icon: 'menu_book',
    aliases: ['spec', 'specs', 'ui spec', 'frontend spec', 'component spec'],
  },
  {
    label: 'API Spec Doc',
    path: 'api-spec-doc',
    icon: 'api',
    aliases: ['api spec', 'api docs', 'backend spec', 'server spec'],
  },
  {
    label: 'Spring API Spec Doc',
    path: 'spring-spec-doc',
    icon: 'coffee',
    aliases: ['spring spec', 'java spec', 'spring boot spec', 'spring docs'],
  },
];

/**
 * The 13 Master Data sections, in display order.
 *
 * Order is load-bearing: the speech layer addresses these by position
 * ("open the second menu"), and the sidebar renders the matching number.
 */
export const MASTER_DATA_NAV: readonly NavItem[] = [
  {
    label: 'Manage Product',
    path: 'products',
    icon: 'category',
    aliases: ['products', 'product list', 'manage products'],
  },
  {
    label: 'Manage Product (inline edit)',
    path: 'products-inline',
    icon: 'edit_note',
    aliases: ['inline edit', 'inline products', 'products inline'],
  },
  {
    label: 'Manage User',
    path: 'users',
    icon: 'group',
    aliases: ['users', 'user list', 'manage users'],
  },
  {
    label: 'Manage Theme',
    path: 'theme',
    icon: 'palette',
    aliases: ['theme', 'appearance', 'colors'],
  },
  {
    label: 'Manage Snackbar',
    path: 'snackbar',
    icon: 'notifications',
    aliases: ['snackbar', 'notifications', 'toasts'],
  },
  {
    label: 'Generic Card',
    path: 'generic-card',
    icon: 'dashboard_customize',
    aliases: ['card', 'cards'],
  },
  {
    label: 'Generic Popup',
    path: 'generic-popup',
    icon: 'web_asset',
    aliases: ['popup', 'dialog', 'modal'],
  },
  {
    label: 'Generic Chart',
    path: 'generic-chart',
    icon: 'insert_chart_outlined',
    aliases: ['chart', 'charts', 'graph'],
  },
  {
    label: 'Api call Scenarios',
    path: 'api-call-scenarios',
    icon: 'lan',
    aliases: ['api scenarios', 'scenarios'],
  },
  {
    label: 'Api call examples',
    path: 'api-call-examples',
    icon: 'code',
    aliases: ['api examples', 'examples', 'api calls'],
  },
  {
    label: 'Product Form (schema demo)',
    path: 'product-form',
    icon: 'list_alt',
    aliases: ['product form'],
  },
  {
    label: 'Order Form (schema demo)',
    path: 'order-form',
    icon: 'receipt_long',
    aliases: ['order form', 'orders'],
  },
  {
    label: 'Error Log',
    path: 'error-log',
    icon: 'report_problem',
    aliases: ['errors', 'error logger', 'logs', 'monitoring'],
  },
];

/** Absolute path for a sidebar entry, which the router nests under master-data. */
export function masterDataPath(item: NavItem): string {
  return `/admin/master-data/${item.path}`;
}

/** Absolute path for a Documentation sidebar entry. */
export function documentationPath(item: NavItem): string {
  return `/admin/documentation/${item.path}`;
}
