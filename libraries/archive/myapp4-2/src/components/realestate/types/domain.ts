import type { ImageAsset } from '@ui/primitives/media';
import type { Money } from '@ui/primitives/money';

/** Every listing/price/insight reading carries its own freshness. */
export interface DataFreshness {
  lastUpdatedAt?: string;
  source?: string;
  status: 'fresh' | 'stale' | 'unknown';
}

// ---------------------------------------------------------------------------
// 10. PropertyStatusChip (built first — reused by PropertyCard)
// ---------------------------------------------------------------------------

export type PropertyStatus = 'ready' | 'underConstruction' | 'sold' | 'rented' | 'priceReduced' | 'newLaunch' | 'pending' | 'verified';

// ---------------------------------------------------------------------------
// 1. PropertyCard
// ---------------------------------------------------------------------------

export type PropertyListingType = 'buy' | 'rent' | 'newProject';
export type PropertyCardVariant = 'grid' | 'list' | 'map' | 'featured';
export type ListedBy = 'owner' | 'agent' | 'builder';

export interface PropertySummary {
  id: string;
  title: string;
  images: ImageAsset[];
  locality: string;
  city: string;
  price: Money;
  priceUnit?: 'total' | 'perMonth';
  listingType: PropertyListingType;
  bhk?: string;
  areaLabel?: string;
  propertyType: string;
  amenityHighlights?: string[];
  status?: PropertyStatus;
  verified?: boolean;
  listedBy?: ListedBy;
  sponsored?: boolean;
  freshness?: DataFreshness;
}

// ---------------------------------------------------------------------------
// 2. PropertyFilterSheet
// ---------------------------------------------------------------------------

export interface PropertyFilterState {
  minPrice?: number;
  maxPrice?: number;
  bhk?: string[];
  propertyTypes?: string[];
  minArea?: number;
  maxArea?: number;
  statuses?: string[];
  amenities?: string[];
  verifiedOnly?: boolean;
  furnished?: string[];
}

// ---------------------------------------------------------------------------
// 3. AmenityGrid
// ---------------------------------------------------------------------------

export type AmenityStatus = 'included' | 'paid' | 'unavailable' | 'unknown';
export type AmenityScope = 'property' | 'unit' | 'project';

export interface PropertyAmenity {
  id: string;
  label: string;
  icon: string;
  status?: AmenityStatus;
  scope?: AmenityScope;
  description?: string;
}

// ---------------------------------------------------------------------------
// 4. FloorPlanViewer / ImageGalleryGrid
// ---------------------------------------------------------------------------

export interface FloorRoom {
  id: string;
  label: string;
}

export interface Floor {
  id: string;
  label: string;
  image?: ImageAsset;
  rooms?: FloorRoom[];
}

export type GalleryMediaType = 'image' | 'video' | 'tour';

export interface GalleryImage {
  id: string;
  image: ImageAsset;
  room?: string;
  type?: GalleryMediaType;
}

// ---------------------------------------------------------------------------
// 5. AgentContactCard
// ---------------------------------------------------------------------------

export type ContactRole = 'agent' | 'owner' | 'builder' | 'propertyManager';

export interface PropertyAgent {
  id: string;
  name: string;
  avatar?: ImageAsset;
  agency?: string;
  role?: ContactRole;
  verified?: boolean;
  ratingLabel?: string;
  responseTimeLabel?: string;
  phoneAvailable?: boolean;
  whatsappAvailable?: boolean;
}

// ---------------------------------------------------------------------------
// 6. EMICalculatorCard
// ---------------------------------------------------------------------------

export interface EmiInputs {
  loanAmount: number;
  annualRate: number;
  tenureMonths: number;
  processingFee?: number;
}

export type EmiStatus = 'idle' | 'calculating' | 'invalid' | 'ready';

// ---------------------------------------------------------------------------
// 7. LocalityInsightsCard
// ---------------------------------------------------------------------------

export type InsightCategory = 'school' | 'transit' | 'hospital' | 'price' | 'safety' | 'commute';

export interface LocalityInsight {
  id: string;
  label: string;
  value: string;
  category: InsightCategory;
  distance?: string;
  source?: string;
  freshness?: string;
}

export type PriceTrendDirection = 'up' | 'down' | 'flat';

export interface PriceTrendSummary {
  changePercent: number;
  direction: PriceTrendDirection;
  periodLabel: string;
}

// ---------------------------------------------------------------------------
// 8. SiteVisitSchedulerSheet
// ---------------------------------------------------------------------------

export type VisitMode = 'inPerson' | 'virtual';
export type VisitSlotStatus = 'available' | 'held' | 'booked' | 'expired';

export interface CalendarDate {
  date: string;
  availableCount: number;
}

export interface TimeSlot {
  id: string;
  startsAt: string;
  endsAt: string;
  status: VisitSlotStatus;
}

export interface VisitRequest {
  propertyId: string;
  date: string;
  slotId: string;
  mode: VisitMode;
  visitorCount: number;
  contactName: string;
  contactPhone: string;
  instructions?: string;
}

export type VisitRequestStatus = 'idle' | 'submitting' | 'pending' | 'confirmed' | 'error';

// ---------------------------------------------------------------------------
// 9. ComparePropertiesTable
// ---------------------------------------------------------------------------

export type CompareRowType = 'text' | 'money' | 'number' | 'status' | 'rating';

export interface CompareRow {
  id: string;
  label: string;
  values: Record<string, string | number | boolean | null>;
  type?: CompareRowType;
  group?: string;
}

// ---------------------------------------------------------------------------
// 11. SavedSearchItem / PriceTrendChart
// ---------------------------------------------------------------------------

export interface SavedSearchAlerts {
  newListings: boolean;
  priceChanges: boolean;
  statusChanges: boolean;
}

export interface SavedSearch {
  id: string;
  name: string;
  locationLabel: string;
  filterSummary: string[];
  resultCount?: number;
  newMatchCount?: number;
  alerts: SavedSearchAlerts;
  paused?: boolean;
}

export type TrendRange = '3m' | '6m' | '1y' | '5y';

export interface PriceTrendPoint {
  date: string;
  value: number;
  unit: string;
}

// ---------------------------------------------------------------------------
// 12. DocumentChecklistItem
// ---------------------------------------------------------------------------

export type DocumentStatus = 'notStarted' | 'uploaded' | 'uploading' | 'verified' | 'rejected' | 'notApplicable' | 'expired' | 'error';

export interface DocumentChecklistData {
  id: string;
  title: string;
  description?: string;
  required?: boolean;
  status: DocumentStatus;
  fileName?: string;
  reviewerNote?: string;
  updatedAtLabel?: string;
}
