/**
 * Telehealth component library — public surface.
 *
 * Import from here rather than a component's own path, so folders can be
 * reorganised without touching consumers.
 */
export * from './_core/telehealth.types';
export { AppointmentStore } from './_core/appointment-store';

export { DoctorCard } from './doctor-card/doctor-card';
export type { DoctorCardLayout } from './doctor-card/doctor-card';

export { AppointmentSlotGrid } from './appointment-slot-grid/appointment-slot-grid';

export { ConsentDialog } from './consent-dialog/consent-dialog';
export type {
  ConsentDialogData,
  ConsentDialogResult,
} from './consent-dialog/consent-dialog';

export { SymptomSelector } from './symptom-selector/symptom-selector';
export { AppointmentCard } from './appointment-card/appointment-card';

export { VitalsCard } from './vitals-card/vitals-card';
export { MedicationReminderItem } from './medication-reminder-item/medication-reminder-item';
export { PrescriptionCard } from './prescription-card/prescription-card';
export { ReportListItem } from './report-list-item/report-list-item';
export { ChatBubble } from './chat-bubble/chat-bubble';
export { VideoCallControls } from './video-call-controls/video-call-controls';
export { HealthQuestionnaireForm } from './health-questionnaire-form/health-questionnaire-form';
