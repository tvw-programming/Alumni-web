import type { Money } from '@ui/primitives/money';
import type { Attachment, ImageAsset, Rating } from '@ui/primitives/media';

export type { Money, ImageAsset, Rating, Attachment };

/**
 * Healthcare domain models.
 *
 * The single most important idea encoded here is the separation of three
 * layers: UI presentation, structured health data, and clinical decision
 * logic. Every field that carries clinical meaning — `interpretation`,
 * `clinicalPriority`, `urgency` — is *supplied* to these components by a
 * governed service. Nothing in this folder derives one.
 */

/** Library-wide async/clinical state vocabulary. */
export type HealthState =
  | 'default'
  | 'loading'
  | 'empty'
  | 'partial'
  | 'offline'
  | 'error'
  | 'restricted'
  | 'pending'
  | 'success'
  | 'requiresAction'
  | 'urgent';

/**
 * Data provenance. A patient-entered reading, a device-synced reading and a
 * clinician-reviewed result must never look identical — this drives that.
 */
export type Provenance = 'patientReported' | 'deviceSynced' | 'clinicianReviewed' | 'sourceUnknown';

export type ConsultationMode = 'video' | 'audio' | 'inPerson';

export interface ClinicLocation {
  id: string;
  name: string;
  addressLines: string[];
  city?: string;
  distanceLabel?: string;
}

export interface Doctor {
  id: string;
  name: string;
  credentials?: string;
  specialty: string;
  subSpecialty?: string;
  avatar?: ImageAsset;
  /** Patient feedback — explicitly NOT a clinical quality measure. */
  rating?: Rating;
  experienceYears?: number;
  fee?: Money;
  consultationModes: ConsultationMode[];
  /** ISO timestamp of the earliest free slot, or undefined when none. */
  nextAvailable?: string;
  verification?: 'verified' | 'unverified' | 'unknown';
  locations?: ClinicLocation[];
  languages?: string[];
  insuranceStatus?: 'accepted' | 'notAccepted' | 'checking' | 'unknown';
  acceptingNewPatients?: boolean;
  /** Live presence, only meaningful when it reflects real availability. */
  online?: boolean;
  bio?: string;
  education?: string[];
}

export interface AppointmentSlot {
  id: string;
  /** ISO 8601 with offset. */
  start: string;
  end: string;
  timezone: string;
  mode: ConsultationMode;
  status: 'available' | 'held' | 'booked' | 'expired' | 'unavailable';
  fee?: Money;
}

export type SlotGridState = 'loading' | 'ready' | 'empty' | 'error' | 'booking' | 'conflict';

export type AppointmentStatus =
  | 'upcoming'
  | 'checkInRequired'
  | 'ready'
  | 'inProgress'
  | 'completed'
  | 'canceled'
  | 'rescheduled'
  | 'noShow';

export interface AppointmentAction {
  key: string;
  label: string;
  icon?: string;
  onPress: () => void;
  destructive?: boolean;
  disabled?: boolean;
}

export interface Appointment {
  id: string;
  clinician: Doctor;
  /** Set when booking for a dependant — the card must say whose visit it is. */
  patientName?: string;
  start: string;
  end: string;
  timezone?: string;
  mode: ConsultationMode;
  status: AppointmentStatus;
  location?: ClinicLocation;
  reason?: string;
  /** Whether the join control should be live. Computed by a visit service. */
  joinEligible?: boolean;
  /** "Dr Shah is running about 15 minutes late." */
  delayNotice?: string;
  cancellationReason?: string;
  paymentPending?: boolean;
}

export interface SeverityOption {
  id: string;
  label: string;
}

export interface Symptom {
  id: string;
  label: string;
  synonyms?: string[];
  bodyRegion?: string;
  severityOptions?: SeverityOption[];
  /**
   * Supplied by clinical content, never inferred from the label. `urgent`
   * triggers the escalation pattern rather than styling.
   */
  clinicalPriority?: 'routine' | 'attention' | 'urgent';
  /** Flags categories that need extra privacy care in the UI. */
  sensitive?: boolean;
}

export interface SymptomSelection {
  symptomId: string;
  severity?: string;
  onset?: string;
  duration?: string;
  pattern?: 'constant' | 'intermittent' | 'unknown';
  notes?: string;
}

export type VitalType = 'bloodPressure' | 'glucose' | 'heartRate' | 'temperature' | 'spo2' | 'weight';

export interface ReferenceRange {
  label: string;
  low?: number;
  high?: number;
  /** "Adults, at rest" — ranges vary by age, context and guidance. */
  basis?: string;
}

export interface VitalReading {
  id: string;
  type: VitalType;
  /** Keyed values so blood pressure stays a pair, not a flattened number. */
  values: Record<string, number>;
  unit: string;
  measuredAt: string;
  source?: string;
  provenance: Provenance;
  /** "Fasting", "Post-meal", "After exercise". */
  context?: string;
  trend?: 'up' | 'down' | 'stable' | 'unknown';
  /**
   * Comes from a clinical rules service. The UI renders it; it never computes
   * it from the raw value.
   */
  interpretation?: 'usual' | 'outsideUsualRange' | 'reviewRequired';
  interpretationNote?: string;
  referenceRange?: ReferenceRange;
  stale?: boolean;
}

export type MedicationStatus = 'upcoming' | 'due' | 'taken' | 'missed' | 'skipped' | 'snoozed';

export interface MedicationSchedule {
  medicationId: string;
  name: string;
  dose: string;
  form?: string;
  route?: string;
  /** ISO timestamp for this specific dose occurrence. */
  scheduledAt: string;
  takenAt?: string;
  instructions?: string;
  status: MedicationStatus;
  refillStatus?: 'ok' | 'low' | 'needed';
  refillDaysLeft?: number;
  asNeeded?: boolean;
  /** Clinically approved safety text only. Never authored in the component. */
  safetyNotice?: string;
  managedByCaregiver?: boolean;
  discontinued?: boolean;
}

export type DocumentType = 'prescription' | 'labReport' | 'imaging' | 'consultNote' | 'insurance' | 'other';

export type DocumentStatus = 'processing' | 'available' | 'reviewed' | 'restricted' | 'expired' | 'new';

export interface DocumentAction {
  key: string;
  label: string;
  icon?: string;
  onPress: () => void;
  disabled?: boolean;
}

export interface HealthDocument {
  id: string;
  type: DocumentType;
  title: string;
  date: string;
  provider?: string;
  status: DocumentStatus;
  file?: {
    /** Short-lived signed URL. Never logged, never sent to analytics. */
    url?: string;
    mimeType: string;
    size?: number;
    expiresAt?: string;
  };
  /**
   * Abnormal is separate from urgent. Only a clinician sets `requiresFollowUp`.
   */
  abnormal?: boolean;
  requiresFollowUp?: boolean;
  clinicianNote?: string;
  restrictedReason?: string;
}

export interface PrescriptionMedication {
  name: string;
  dose: string;
  frequency: string;
  duration?: string;
  instructions?: string;
}

export interface Prescription {
  id: string;
  prescribedBy: string;
  prescribedAt: string;
  medications: PrescriptionMedication[];
  status: 'active' | 'completed' | 'expired' | 'refillAvailable' | 'refillRequested';
  refillsRemaining?: number;
  pharmacy?: { name: string; available: boolean };
  expiresAt?: string;
}

export type CallControlType = 'microphone' | 'camera' | 'speaker' | 'chat' | 'captions' | 'more' | 'end';

export interface CallControl {
  id: string;
  type: CallControlType;
  /** Whether the control can be operated at all. */
  enabled: boolean;
  /** Whether the underlying feature is currently ON. */
  active?: boolean;
  permission?: 'granted' | 'denied' | 'unknown';
  label: string;
  badgeCount?: number;
}

export type CallQuality = 'good' | 'fair' | 'poor' | 'reconnecting' | 'unknown';

export type MessageSender = 'patient' | 'clinician' | 'system';

export type MessageStatus = 'draft' | 'sending' | 'sent' | 'delivered' | 'read' | 'failed';

export interface ChatMessage {
  id: string;
  sender: MessageSender;
  senderName?: string;
  body?: string;
  createdAt: string;
  status: MessageStatus;
  attachments?: Attachment[];
  replyTo?: string;
  language?: string;
  translatedFrom?: string;
}

export interface ConsentItem {
  id: string;
  title: string;
  summary: string;
  /** Required consents block the flow; optional ones never do. */
  required: boolean;
  scope: string;
  detail?: string;
  policyUrl?: string;
  version: string;
}

export type ConsentState =
  | 'notPresented'
  | 'presented'
  | 'accepted'
  | 'partiallyAccepted'
  | 'declined'
  | 'expired';

/** What gets written to the audit record — never inferred from a screen view. */
export interface ConsentRecord {
  itemId: string;
  version: string;
  accepted: boolean;
  subject: string;
  actor: string;
  method: 'explicitButton' | 'checkbox';
  recordedAt: string;
}

export type QuestionType =
  | 'text'
  | 'longText'
  | 'singleSelect'
  | 'multiSelect'
  | 'date'
  | 'number'
  | 'medication'
  | 'allergy'
  | 'boolean';

export interface QuestionOption {
  id: string;
  label: string;
  /** Marks "None" / "Not sure" / "Prefer not to say" as escape answers. */
  isEscapeAnswer?: boolean;
}

export interface ValidationRule {
  type: 'required' | 'min' | 'max' | 'minLength' | 'maxLength';
  value?: number;
  message?: string;
}

export interface VisibilityCondition {
  questionId: string;
  equals?: unknown;
  includes?: string;
}

export interface Question {
  id: string;
  type: QuestionType;
  label: string;
  helpText?: string;
  required?: boolean;
  options?: QuestionOption[];
  validation?: ValidationRule[];
  visibility?: VisibilityCondition[];
  unit?: string;
  placeholder?: string;
  /** An answer here pauses the flow and escalates. */
  urgentIf?: { equals?: unknown; includes?: string };
}

export interface QuestionnaireSection {
  id: string;
  title: string;
  description?: string;
  questions: Question[];
}

export interface QuestionnaireSchema {
  id: string;
  version: string;
  title: string;
  sections: QuestionnaireSection[];
  /** False when branching makes the total question count unknowable. */
  progressIsReliable?: boolean;
  privacyNote?: string;
}

export interface BMIInput {
  weight: number;
  height: number;
  weightUnit: 'kg' | 'lb';
  heightUnit: 'cm' | 'm' | 'in';
  age?: number;
  pregnancyStatus?: 'pregnant' | 'notPregnant' | 'unknown';
}

export interface BMIResult {
  value: number;
  category?: string;
  /** Pediatric and pregnancy cases are explicitly not interpretable here. */
  interpretationMode: 'adultScreening' | 'pediatricPercentile' | 'notInterpretable';
  disclaimer: string;
}

export interface EmergencyContact {
  id: string;
  name: string;
  relationship?: string;
  phone: string;
  countryCode?: string;
  isPrimary?: boolean;
  lastConfirmedAt?: string;
  status: 'valid' | 'needsVerification' | 'invalid';
}

export interface EmergencyServices {
  /** Locale-aware. 112 in the EU, 911 in the US, 108/112 in India. */
  number: string;
  label: string;
  locale: string;
}
