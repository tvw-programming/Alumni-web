import ApiIcon from '@mui/icons-material/Api';
import CategoryIcon from '@mui/icons-material/Category';
import CodeIcon from '@mui/icons-material/Code';
import CoffeeIcon from '@mui/icons-material/Coffee';
import DashboardCustomizeIcon from '@mui/icons-material/DashboardCustomize';
import EditNoteIcon from '@mui/icons-material/EditNote';
import GroupIcon from '@mui/icons-material/Group';
import InsertChartOutlinedIcon from '@mui/icons-material/InsertChartOutlined';
import LanOutlinedIcon from '@mui/icons-material/LanOutlined';
import ListAltIcon from '@mui/icons-material/ListAlt';
import MenuBookIcon from '@mui/icons-material/MenuBook';
import NotificationsIcon from '@mui/icons-material/Notifications';
import PaletteIcon from '@mui/icons-material/Palette';
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong';
import ReportProblemIcon from '@mui/icons-material/ReportProblem';
import WebAssetIcon from '@mui/icons-material/WebAsset';
import WidgetsOutlinedIcon from '@mui/icons-material/WidgetsOutlined';

import type { ReactNode } from 'react';

/**
 * Every navigable destination, in one place.
 *
 * The layouts render these and the speech layer turns them into voice commands.
 * Keeping one list is the point: a new page becomes clickable and speakable in
 * the same edit, and a renamed page can never drift out of sync with what the
 * user has to say to reach it.
 */
export interface NavItem {
  label: string;
  /** Router path. Sidebar entries are relative to `/admin/master-data`. */
  to: string;
  /** `NavLink`'s exact-match flag. */
  end?: boolean;
  icon?: ReactNode;
  /**
   * Extra phrasings a speaker might use for this destination. The label itself
   * is always matched, so these only cover what the label does not say —
   * abbreviations, synonyms, and the words people reach for instead.
   */
  aliases?: readonly string[];
}

export const PUBLIC_NAV: readonly NavItem[] = [
  { label: 'Home', to: '/', end: true, aliases: ['home page', 'start', 'landing page'] },
  { label: 'About', to: '/about', aliases: ['about us', 'about page'] },
  { label: 'Team', to: '/team', aliases: ['our team', 'people', 'team page'] },
  { label: 'Contact Us', to: '/contact', aliases: ['contact', 'get in touch', 'support'] },
  { label: 'Login', to: '/login', aliases: ['sign in', 'log in'] },
];

export const ADMIN_NAV: readonly NavItem[] = [
  {
    label: 'Dashboard',
    to: '/admin/dashboard',
    aliases: ['admin dashboard', 'charts', 'overview'],
  },
  // `end: false` + the /admin/master-data prefix keeps this active for all children.
  { label: 'Master Data', to: '/admin/master-data', aliases: ['master', 'data'] },
  { label: 'Documentation', to: '/admin/documentation', aliases: ['docs', 'specs', 'spec docs'] },
];

/**
 * The Documentation section's own sidebar.
 *
 * Deliberately a separate top-level area rather than another Master Data entry:
 * Master Data is a component showcase over editable records, and the
 * specifications are reference material about the codebase. Mixing them would
 * make one sidebar mean two different things.
 */
export const DOCUMENTATION_NAV: readonly NavItem[] = [
  {
    label: 'Spec Doc',
    to: 'spec-doc',
    icon: <MenuBookIcon />,
    aliases: ['spec', 'specs', 'ui spec', 'frontend spec', 'component spec'],
  },
  {
    label: 'API Spec Doc',
    to: 'api-spec-doc',
    icon: <ApiIcon />,
    aliases: ['api spec', 'api specs', 'backend spec', 'server spec'],
  },
  {
    label: 'Component Spec Doc',
    to: 'component-spec-doc',
    icon: <WidgetsOutlinedIcon />,
    aliases: ['component spec', 'component specs', 'library spec', 'ui components'],
  },
  {
    label: 'Spring API Spec Doc',
    to: 'spring-spec-doc',
    icon: <CoffeeIcon />,
    aliases: ['spring spec', 'java spec', 'spring boot spec', 'spring docs'],
  },
];

export const MASTER_DATA_NAV: readonly NavItem[] = [
  {
    label: 'Manage Product',
    to: 'products',
    icon: <CategoryIcon />,
    aliases: ['products', 'product list', 'manage products'],
  },
  {
    label: 'Manage Product (inline edit)',
    to: 'products-inline',
    icon: <EditNoteIcon />,
    aliases: ['inline edit', 'inline products', 'products inline'],
  },
  {
    label: 'Manage User',
    to: 'users',
    icon: <GroupIcon />,
    aliases: ['users', 'user list', 'manage users'],
  },
  {
    label: 'Manage Theme',
    to: 'theme',
    icon: <PaletteIcon />,
    aliases: ['theme', 'appearance', 'colors'],
  },
  {
    label: 'Manage Snackbar',
    to: 'snackbar',
    icon: <NotificationsIcon />,
    aliases: ['snackbar', 'notifications', 'toasts'],
  },
  {
    label: 'Generic Card',
    to: 'generic-card',
    icon: <DashboardCustomizeIcon />,
    aliases: ['card', 'cards'],
  },
  {
    label: 'Generic Popup',
    to: 'generic-popup',
    icon: <WebAssetIcon />,
    aliases: ['popup', 'dialog', 'modal'],
  },
  {
    label: 'Generic Chart',
    to: 'generic-chart',
    icon: <InsertChartOutlinedIcon />,
    aliases: ['chart', 'charts', 'graph'],
  },
  {
    label: 'Api call Scenarios',
    to: 'api-call-scenarios',
    icon: <LanOutlinedIcon />,
    aliases: ['api scenarios', 'scenarios'],
  },
  {
    label: 'Api call examples',
    to: 'api-call-examples',
    icon: <CodeIcon />,
    aliases: ['api examples', 'examples', 'api calls'],
  },
  {
    label: 'Product Form (schema demo)',
    to: 'product-form',
    icon: <ListAltIcon />,
    aliases: ['product form'],
  },
  {
    label: 'Order Form (schema demo)',
    to: 'order-form',
    icon: <ReceiptLongIcon />,
    aliases: ['order form', 'orders'],
  },
  {
    label: 'Error Log',
    to: 'error-log',
    icon: <ReportProblemIcon />,
    aliases: ['errors', 'error logger', 'logs', 'monitoring'],
  },
];

/** Absolute path for a sidebar entry, which the router nests under master-data. */
export function masterDataPath(item: NavItem): string {
  return `/admin/master-data/${item.to}`;
}

/** Absolute path for a Documentation sidebar entry. */
export function documentationPath(item: NavItem): string {
  return `/admin/documentation/${item.to}`;
}
