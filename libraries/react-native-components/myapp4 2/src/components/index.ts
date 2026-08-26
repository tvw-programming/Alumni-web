/**
 * Public surface of the component library.
 *
 * Everything below is decoupled from app business logic — no store imports, no
 * navigation, no API types. Copy this folder into another project and it works.
 * Publishable as `@myorg/ui` with only `src/theme`, `src/hooks` and `src/utils`
 * as internal dependencies.
 */

// Primitives — shared prop vocabulary
export * from './primitives';

// Atoms
export * from './atoms/AppButton';
export * from './atoms/AppTextInput';
export * from './atoms/AvatarStack';
export * from './atoms/RatingStars';
export * from './atoms/Skeleton';
export * from './atoms/StatusBadge';

// Molecules
export * from './molecules/AppCard';
export * from './molecules/CurrencyInput';
export * from './molecules/DateRangePicker';
export * from './molecules/FilterChipGroup';
export * from './molecules/ListItemRow';
export * from './molecules/MoneyRow';
export * from './molecules/OTPInput';
export * from './molecules/PermissionPrompt';
export * from './molecules/PhoneInput';
export * from './molecules/SegmentedTabs';
export * from './molecules/StateView';
export * from './molecules/StepperIndicator';

// Organisms
export * from './organisms/AppFAB';
export * from './organisms/AppSheet';
export * from './organisms/FormField';
export * from './organisms/FormWrapper';
export * from './organisms/PaginatedList';
export * from './organisms/SearchHeader';

// Providers — imperative APIs
export * from './providers/ConfirmProvider';
export * from './providers/SheetProvider';
export * from './providers/ToastProvider';
