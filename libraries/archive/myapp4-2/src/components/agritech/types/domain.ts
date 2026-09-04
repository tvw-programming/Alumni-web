import type { ImageAsset } from '@ui/primitives/media';
import type { Money } from '@ui/primitives/money';

/** Shared operational metadata — mirrors the pattern used across every domain in this library. */
export interface OperationMeta {
  requestId?: string;
  lastUpdatedAt?: string;
  source?: string;
  connection: 'online' | 'reconnecting' | 'offline';
  queuedOffline?: boolean;
}

export interface Coordinates {
  latitude: number;
  longitude: number;
}

// ---------- CropCard ----------
export type CropStageStatus = 'confirmed' | 'inferred' | 'unknown';

export interface Crop {
  id: string;
  name: string;
  variety?: string;
  imageUri?: ImageAsset;
  fieldName?: string;
  sowingDate?: string;
  stage?: string;
  stageStatus?: CropStageStatus;
  stageOverdue?: boolean;
  daysSinceSowing?: number;
  nextAction?: string;
  alertCount?: number;
}

// ---------- WeatherForecastStrip ----------
export type WeatherAlertLevel = 'none' | 'watch' | 'warning' | 'severe';

export interface WeatherDay {
  date: string;
  label: string;
  icon: string;
  high?: number;
  low?: number;
  precipitationChance?: number;
  humidity?: number;
  alert?: WeatherAlertLevel;
}

// ---------- MandiPriceListItem ----------
export type PriceDeltaDirection = 'up' | 'down' | 'flat';

export interface MandiPrice {
  id: string;
  commodity: string;
  variety?: string;
  mandi: string;
  currentPrice: Money;
  previousPrice?: Money;
  unitLabel: string;
  delta?: number;
  deltaDirection?: PriceDeltaDirection;
  updatedAt?: string;
  stale?: boolean;
}

// ---------- SoilHealthCard ----------
export type NutrientStatus = 'low' | 'optimal' | 'high' | 'unknown';

export interface NutrientReading {
  id: string;
  label: string;
  value: number;
  unit: string;
  min?: number;
  max?: number;
  status: NutrientStatus;
}

export type SoilReportStatus = 'available' | 'processing' | 'missing' | 'stale';

export interface SoilReport {
  fieldName: string;
  sampleDate?: string;
  nutrients: NutrientReading[];
  source?: string;
  status: SoilReportStatus;
}

// ---------- AdvisoryAlertBanner ----------
export type AdvisorySeverity = 'info' | 'watch' | 'warning' | 'urgent';

export interface AdvisoryAlert {
  id: string;
  severity: AdvisorySeverity;
  title: string;
  message: string;
  cropName?: string;
  fieldName?: string;
  issuedAt?: string;
  expiresAt?: string;
  source?: string;
  actionLabel?: string;
}

// ---------- FieldMapCard ----------
export type FieldMapStatus = 'available' | 'missing' | 'stale' | 'error';
export type FieldStressLevel = 'none' | 'low' | 'medium' | 'high';

export interface Field {
  id: string;
  name: string;
  area: number;
  areaUnit: 'acre' | 'hectare' | 'sqft';
  cropName?: string;
  boundary?: Coordinates[];
  mapStatus: FieldMapStatus;
  stressLevel?: FieldStressLevel;
  lastMappedAt?: string;
}

// ---------- InputOrderCard ----------
export type InputAvailability = 'available' | 'lowStock' | 'outOfStock' | 'locationRestricted';

export interface InputProduct {
  id: string;
  name: string;
  brand?: string;
  imageUri?: ImageAsset;
  packSize: string;
  price: Money;
  availability: InputAvailability;
  deliveryLabel?: string;
  cropSuitability?: string[];
  verified?: boolean;
}

// ---------- ShipmentCard / ShipmentStatusTimeline ----------
export type ShipmentStatus =
  | 'pending'
  | 'readyToShip'
  | 'readyForPickup'
  | 'inTransit'
  | 'outForDelivery'
  | 'delivered'
  | 'rto'
  | 'lost'
  | 'cancelled';

export interface Shipment {
  id: string;
  consignmentId: string;
  origin: string;
  destination: string;
  status: ShipmentStatus;
  eta?: string;
  lastLocation?: string;
  lastUpdatedAt?: string;
  carrier?: string;
  exception?: string;
}

export type ShipmentEventState = 'completed' | 'current' | 'upcoming' | 'exception';

export interface ShipmentEvent {
  id: string;
  status: string;
  label: string;
  timestamp?: string;
  location?: string;
  description?: string;
  state: ShipmentEventState;
}

// ---------- VehicleTrackingCard ----------
export type VehicleTrackingStatus = 'live' | 'stale' | 'offline' | 'ended';

export interface VehicleTracking {
  id: string;
  driverName?: string;
  driverAvatarUri?: ImageAsset;
  vehicleNumber: string;
  vehicleType?: string;
  currentLocation?: Coordinates;
  destination?: Coordinates;
  eta?: string;
  trackingStatus: VehicleTrackingStatus;
  lastUpdatedAt?: string;
}

// ---------- InventoryStockRow ----------
export type InventoryStatus = 'healthy' | 'low' | 'outOfStock' | 'overstock' | 'syncError';

export interface InventoryStockItem {
  sku: string;
  productName: string;
  quantity: number;
  reservedQuantity?: number;
  reorderPoint?: number;
  unitLabel?: string;
  warehouseName?: string;
  status: InventoryStatus;
  updatedAt?: string;
}

// ---------- WarehouseSelector ----------
export type Serviceability = 'available' | 'unavailable' | 'checking';

export interface Warehouse {
  id: string;
  name: string;
  code?: string;
  address?: string;
  city?: string;
  stockCount?: number;
  shipmentCount?: number;
  serviceability: Serviceability;
  isDefault?: boolean;
}

// ---------- PODCaptureSheet ----------
export type PODRequirementType = 'photo' | 'signature' | 'barcode' | 'recipientName' | 'note';

export interface PODRequirement {
  type: PODRequirementType;
  required: boolean;
  completed: boolean;
}

export type PODMode = 'delivery' | 'pickup' | 'partialDelivery' | 'failedDelivery';

export interface EvidenceSubmission {
  shipmentId: string;
  stopId: string;
  mode: PODMode;
  recipientName?: string;
  note?: string;
  photoCaptured?: boolean;
  signatureCaptured?: boolean;
  barcode?: string;
}

// ---------- BarcodeScannerOverlay ----------
export interface BarcodeResult {
  code: string;
  format: string;
  timestamp: string;
}

// ---------- RouteStopListItem ----------
export type RouteStopType = 'pickup' | 'delivery' | 'return' | 'hub';
export type RouteStopStatus = 'upcoming' | 'current' | 'completed' | 'failed' | 'skipped' | 'rescheduled';
export type ProofStatus = 'notRequired' | 'pending' | 'complete' | 'error';

export interface RouteStop {
  id: string;
  sequence: number;
  type: RouteStopType;
  title: string;
  address: string;
  shipmentCount?: number;
  eta?: string;
  timeWindow?: string;
  status: RouteStopStatus;
  distance?: string;
  proofStatus?: ProofStatus;
}
