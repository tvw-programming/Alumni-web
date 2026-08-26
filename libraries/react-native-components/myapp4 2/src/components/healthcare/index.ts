/**
 * HEALTHCARE COMPONENT LIBRARY
 *
 * Domain layer on top of the base library in `src/components/`. Same
 * portability rule as fintech and e-commerce: nothing here imports from
 * `src/features`, `src/store` or `src/services`.
 *
 * The governing rule is the three-layer separation the spec calls for —
 * UI presentation, structured health data, and clinical decision logic:
 *
 *   - `VitalsCard` renders an `interpretation` from a clinical rules service and
 *     contains no threshold table
 *   - `SymptomSelector` reads `clinicalPriority` from versioned clinical content
 *     and never infers urgency from a label
 *   - `MedicationReminderItem` authors no dosing advice; `safetyNotice` comes
 *     from the prescribing system
 *   - `ConsentDialog` never records consent from a view, a scroll, or a
 *     "Continue" — only from an explicit action
 *   - `BMICalculatorCard` refuses to categorise outside adult screening
 *   - `AppointmentCard` never decides a visit can be joined; `joinEligible` does
 *   - `EmergencyContactCard` never implies the app can dispatch help
 */

// Foundations
export * from './theme/healthcareTokens';
export * from './types';
export * from './primitives/ClinicalSafety';

// Components
export * from './DoctorCard';
export * from './AppointmentSlotGrid';
export * from './AppointmentCard';
export * from './SymptomSelector';
export * from './VitalsCard';
export * from './MedicationReminderItem';
export * from './HealthDocuments';
export * from './VideoCallControlsBar';
export * from './ChatBubble';
export * from './ConsentDialog';
export * from './HealthQuestionnaireForm';
export * from './BMICalculatorCard';
export * from './EmergencyContactCard';
