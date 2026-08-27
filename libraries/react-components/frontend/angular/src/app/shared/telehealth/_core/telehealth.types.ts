/**
 * Domain models for the telehealth components.
 *
 * Two conventions run through the file, both of which exist because this is
 * health data rather than catalogue data:
 *
 * 1. **Nothing here is a free-form `string` where a union will do.** An
 *    appointment status typed as `string` is one typo away from a booking that
 *    silently never renders as cancelled.
 * 2. **PHI is marked.** Fields carrying protected health information are
 *    grouped so a logger, a cache key or an analytics payload can be audited
 *    against the type rather than against someone's memory.
 */

/** Opaque-ish id aliases: they document intent at call sites where three ids
 *  of the same shape would otherwise be interchangeable by accident. */
export type DoctorId = string;
export type AppointmentId = string;
export type SlotId = string;
export type PatientId = string;

export type Specialty = string;

export interface Doctor {
  readonly id: DoctorId;
  readonly displayName: string;
  readonly avatarUrl?: string;
  readonly specialties: readonly Specialty[];
  readonly qualifications?: readonly string[];
  readonly yearsOfExperience?: number;
  readonly languages?: readonly string[];
  readonly rating?: { readonly average: number; readonly count: number };
  /** Minor units, matching the commerce library's Money convention. */
  readonly consultationFeeMinor?: number;
  readonly currency?: string;
  readonly nextAvailable?: string;
  readonly modes: readonly ConsultationMode[];
  readonly verified: boolean;
}

export type ConsultationMode = 'video' | 'audio' | 'chat' | 'inPerson';

/**
 * Appointment lifecycle.
 *
 * `noShow` and `cancelled` are separate because they mean different things to
 * billing and to the patient's record, and collapsing them loses that.
 */
export type AppointmentStatus =
  | 'requested'
  | 'booked'
  | 'confirmed'
  | 'checkedIn'
  | 'inProgress'
  | 'completed'
  | 'cancelled'
  | 'noShow'
  | 'rescheduled';

export interface Appointment {
  readonly id: AppointmentId;
  readonly doctorId: DoctorId;
  readonly doctorName: string;
  readonly doctorAvatarUrl?: string;
  readonly specialty?: Specialty;
  readonly status: AppointmentStatus;
  readonly mode: ConsultationMode;
  /** ISO 8601 with offset. Never a locale-formatted string: the component
   *  formats for display, the server sends an instant. */
  readonly startsAt: string;
  readonly endsAt?: string;
  readonly locationLabel?: string;
  /** True once the video room is open — a "Join" button shown 40 minutes early
   *  is a support call. */
  readonly joinable?: boolean;
  readonly cancellable?: boolean;
  readonly reschedulable?: boolean;
  /** PHI. Present only where the caller has a clinical need to display it. */
  readonly reasonForVisit?: string;
}

export type SlotAvailability = 'available' | 'few' | 'full' | 'blocked' | 'past';

export interface AppointmentSlot {
  readonly id: SlotId;
  readonly startsAt: string;
  readonly endsAt: string;
  readonly availability: SlotAvailability;
  readonly mode?: ConsultationMode;
  readonly feeMinor?: number;
  /** Why it cannot be picked — "Fully booked", "Clinic closed". A disabled
   *  slot with no reason is the same complaint as a disabled stepper. */
  readonly disabledReason?: string;
}

/** Slots grouped by day, which is how every booking UI presents them. */
export interface SlotDay {
  readonly date: string;
  readonly label: string;
  readonly slots: readonly AppointmentSlot[];
}

export type ConsentKind =
  | 'telehealthTerms'
  | 'dataProcessing'
  | 'recording'
  | 'sharingWithProvider'
  | 'researchUse';

export interface ConsentClause {
  readonly id: string;
  readonly kind: ConsentKind;
  readonly title: string;
  readonly body: string;
  /** A consent the patient cannot decline and still proceed. Marked so the UI
   *  can say so honestly rather than pre-ticking a box. */
  readonly required: boolean;
  readonly moreInfoUrl?: string;
}

/**
 * What gets sent to the audit API. Deliberately a distinct type from the UI
 * state: an audit record is a legal artefact and must not drift with the
 * component's internal shape.
 */
export interface ConsentDecision {
  readonly clauseId: string;
  readonly kind: ConsentKind;
  readonly granted: boolean;
  /** ISO instant, recorded client-side and re-stamped server-side. */
  readonly decidedAt: string;
  readonly documentVersion: string;
}

export type MessageAuthor = 'patient' | 'clinician' | 'system';
export type MessageDelivery = 'sending' | 'sent' | 'delivered' | 'read' | 'failed';

export interface ChatMessage {
  readonly id: string;
  readonly author: MessageAuthor;
  readonly authorName?: string;
  /** PHI in a clinical conversation. Never logged, never cached unencrypted. */
  readonly body: string;
  readonly sentAt: string;
  readonly delivery: MessageDelivery;
  readonly attachments?: readonly ChatAttachment[];
  /** Set when a message failed moderation or was withdrawn. */
  readonly redacted?: boolean;
}

export interface ChatAttachment {
  readonly id: string;
  readonly name: string;
  readonly mimeType: string;
  readonly sizeBytes?: number;
  readonly url?: string;
  readonly scanStatus: 'pending' | 'clean' | 'blocked';
}

export interface CallDeviceState {
  readonly micEnabled: boolean;
  readonly cameraEnabled: boolean;
  readonly speakerEnabled: boolean;
  readonly screenSharing: boolean;
  /** Absent permission is not the same as a muted mic, and the button must say
   *  which one it is. */
  readonly micPermission: 'granted' | 'denied' | 'prompt';
  readonly cameraPermission: 'granted' | 'denied' | 'prompt';
}

export type CallQuality = 'good' | 'fair' | 'poor' | 'reconnecting' | 'disconnected';

export type QuestionKind =
  | 'singleChoice'
  | 'multiChoice'
  | 'scale'
  | 'number'
  | 'text'
  | 'date'
  | 'boolean';

export interface QuestionOption {
  readonly value: string;
  readonly label: string;
  /** Choosing this option reveals the questions it names. */
  readonly reveals?: readonly string[];
}

export interface Question {
  readonly id: string;
  readonly kind: QuestionKind;
  readonly label: string;
  readonly help?: string;
  readonly required: boolean;
  readonly options?: readonly QuestionOption[];
  readonly min?: number;
  readonly max?: number;
  readonly unit?: string;
  /** Shown only when another answer reveals it — the conditional-branching
   *  case every intake form has. */
  readonly dependsOn?: { readonly questionId: string; readonly equals: string };
  /** Answers that warrant escalation rather than a score. */
  readonly redFlagValues?: readonly string[];
}

export interface QuestionnaireSection {
  readonly id: string;
  readonly title: string;
  readonly description?: string;
  readonly questions: readonly Question[];
}

export interface Questionnaire {
  readonly id: string;
  readonly title: string;
  readonly version: string;
  readonly sections: readonly QuestionnaireSection[];
}

export type AnswerValue = string | number | boolean | readonly string[] | null;
export type QuestionnaireAnswers = Readonly<Record<string, AnswerValue>>;

/**
 * A selectable symptom.
 *
 * `synonyms` is the field that makes a symptom picker usable: patients search
 * "high temperature", not "pyrexia", and matching only the clinical label
 * returns nothing for the term most people actually type.
 */
export interface SymptomOption {
  readonly id: string;
  readonly label: string;
  readonly synonyms?: readonly string[];
  /** Clinical coding, carried through so downstream triage and billing do not
   *  have to re-map a free-text label. */
  readonly icd10Code?: string;
  readonly bodySystem?: string;
  /** Symptoms that warrant immediate escalation rather than a triage score. */
  readonly redFlag?: boolean;
}

/** A symptom the patient selected, with the detail triage asks for next. */
export interface ReportedSymptom {
  readonly option: SymptomOption;
  readonly severity?: number;
  readonly durationHours?: number;
  readonly onset?: 'sudden' | 'gradual';
}

/* ------------------------------------------------------------------------ *
 * Vitals, medication, prescriptions, reports
 * ------------------------------------------------------------------------ */

export type VitalKind =
  | 'bloodPressure'
  | 'heartRate'
  | 'temperature'
  | 'spo2'
  | 'bloodGlucose'
  | 'weight'
  | 'steps';

/**
 * A reading's clinical band.
 *
 * Deliberately not computed in the UI: reference ranges vary by age, pregnancy,
 * comorbidity and lab. A component that decides "140/90 is high" is practising
 * medicine with a hard-coded constant, so the band arrives from the server.
 */
export type VitalBand = 'low' | 'normal' | 'elevated' | 'high' | 'critical' | 'unknown';

export interface VitalReading {
  readonly at: string;
  /** Two numbers for blood pressure, one for everything else. */
  readonly value: number;
  readonly secondaryValue?: number;
  readonly band: VitalBand;
}

export interface Vital {
  readonly kind: VitalKind;
  readonly label: string;
  readonly unit: string;
  readonly latest: VitalReading;
  /** Oldest to newest, for the sparkline. */
  readonly history?: readonly VitalReading[];
  readonly targetLabel?: string;
  /** Set when the reading is patient-entered rather than device-measured —
   *  a distinction a clinician needs before acting on it. */
  readonly source?: 'device' | 'manual' | 'clinic';
}

export type DoseStatus = 'due' | 'upcoming' | 'taken' | 'skipped' | 'missed' | 'snoozed';

export interface MedicationDose {
  readonly id: string;
  readonly medicationName: string;
  readonly strength?: string;
  readonly form?: string;
  readonly instructions?: string;
  readonly scheduledAt: string;
  readonly status: DoseStatus;
  readonly takenAt?: string;
  readonly imageUrl?: string;
  /** Consecutive days adhered. Motivational, and never shown as a failure. */
  readonly streakDays?: number;
  /** Warnings the patient must see before taking — interactions, food rules. */
  readonly cautions?: readonly string[];
}

export type PrescriptionStatus = 'active' | 'expired' | 'cancelled' | 'pendingApproval';

export interface PrescriptionItem {
  readonly name: string;
  readonly strength?: string;
  readonly dosage: string;
  readonly durationLabel?: string;
  readonly quantity?: number;
}

export interface Prescription {
  readonly id: string;
  readonly prescribedBy: string;
  readonly prescribedAt: string;
  readonly status: PrescriptionStatus;
  readonly items: readonly PrescriptionItem[];
  readonly refillsRemaining?: number;
  readonly validUntil?: string;
  readonly notes?: string;
  readonly documentUrl?: string;
}

export type ReportStatus = 'pending' | 'ready' | 'reviewed' | 'amended' | 'cancelled';

export interface MedicalReport {
  readonly id: string;
  readonly title: string;
  readonly category: string;
  readonly collectedAt?: string;
  readonly reportedAt?: string;
  readonly status: ReportStatus;
  /** Set by the lab, not derived here — see VitalBand for why. */
  readonly hasAbnormalFindings?: boolean;
  readonly orderedBy?: string;
  readonly documentUrl?: string;
  readonly sizeBytes?: number;
  readonly mimeType?: string;
  /** True until a clinician has released the result to the patient. */
  readonly awaitingClinicianRelease?: boolean;
}
