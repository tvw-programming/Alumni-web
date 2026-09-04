import AccountBalanceOutlinedIcon from '@mui/icons-material/AccountBalanceOutlined';
import FitnessCenterOutlinedIcon from '@mui/icons-material/FitnessCenterOutlined';
import FlightTakeoffOutlinedIcon from '@mui/icons-material/FlightTakeoffOutlined';
import ForumOutlinedIcon from '@mui/icons-material/ForumOutlined';
import InsightsOutlinedIcon from '@mui/icons-material/InsightsOutlined';
import MonitorHeartOutlinedIcon from '@mui/icons-material/MonitorHeartOutlined';
import MovieOutlinedIcon from '@mui/icons-material/MovieOutlined';
import SensorsOutlinedIcon from '@mui/icons-material/SensorsOutlined';
import ShoppingBagOutlinedIcon from '@mui/icons-material/ShoppingBagOutlined';
import ViewKanbanOutlinedIcon from '@mui/icons-material/ViewKanbanOutlined';
import type { SvgIconProps } from '@mui/material/SvgIcon';
import type { ComponentType } from 'react';

import { resolveDomainVisuals, type DomainIconId } from './domainVisuals';

/**
 * The Material icon for a domain.
 *
 * Drawn from `@mui/icons-material`, which is already a peer dependency — a
 * second icon set for ten pictures would be a dependency nobody asked for.
 *
 * The outlined variants throughout: these sit beside text in a navigation tree,
 * where filled glyphs read as heavier than the label they belong to.
 *
 * The map is a module-level constant, not built per render. Components created
 * during render remount on every pass, and the compiler lint rejects it.
 */
const ICONS: Record<DomainIconId, ComponentType<SvgIconProps>> = {
  shoppingBag: ShoppingBagOutlinedIcon,
  accountBalance: AccountBalanceOutlinedIcon,
  monitorHeart: MonitorHeartOutlinedIcon,
  forum: ForumOutlinedIcon,
  insights: InsightsOutlinedIcon,
  viewKanban: ViewKanbanOutlinedIcon,
  sensors: SensorsOutlinedIcon,
  flightTakeoff: FlightTakeoffOutlinedIcon,
  movie: MovieOutlinedIcon,
  fitnessCenter: FitnessCenterOutlinedIcon,
};

export interface DomainIconProps extends SvgIconProps {
  /** Domain id, e.g. `ecommerce`. Unknown ids fall back to a neutral icon. */
  domain: string | undefined;
}

/**
 * Identifies a domain visually.
 *
 * Decorative by default: it always sits beside the domain's name, and a screen
 * reader announcing "shopping bag, E-commerce" is repetition, not information.
 * Pass an `aria-label` where it appears without its label.
 */
export function DomainIcon({ domain, ...props }: DomainIconProps) {
  const Icon = ICONS[resolveDomainVisuals(domain).icon];
  return <Icon fontSize="small" aria-hidden {...props} />;
}

/** Every icon the table can draw. Used by tests to check for gaps. */
export function domainIconIds(): DomainIconId[] {
  return Object.keys(ICONS) as DomainIconId[];
}
