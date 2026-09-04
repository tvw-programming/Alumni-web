# myapp4 — React Native component library + reference app

A production-shaped React Native application built around a **decoupled, themeable,
animated component library**. The library knows nothing about the app; the app
composes the library.

Stack: Expo SDK 52 · React Native 0.76 · React Native Paper 5 (MD3) ·
Reanimated 3 · Gesture Handler · FlashList · React Hook Form · Zod ·
TanStack Query · Zustand · React Navigation 7 · TypeScript (strict).

---

## Folder structure

```
myapp4/
├── design-tokens/
│   └── base.tokens.json          # LAYER 1: the only place raw values exist
├── index.ts                      # entry — gesture-handler import must be first
├── src/
│   ├── App.tsx
│   ├── providers/AppProviders.tsx  # provider stack (order matters — see file)
│   │
│   ├── theme/                    # tokens → typed MD3 theme
│   │   ├── tokens.ts             #   loads + types the JSON
│   │   ├── theme.ts              #   MD3 + spacing/radii/motion/intents
│   │   └── ThemeProvider.tsx     #   useAppTheme(), useThemeControl()
│   │
│   ├── hooks/                    # the shared behaviour every component reuses
│   │   ├── useControllableState.ts  # controlled + uncontrolled, written once
│   │   ├── useMotion.ts             # named presets → theme motion tokens
│   │   ├── usePressAnimation.ts     # UI-thread press feedback
│   │   ├── useReducedMotion.ts      # single a11y source of truth
│   │   ├── useShake.ts              # imperative error shake
│   │   └── useDebounced.ts          # debounce + leading-edge throttle
│   │
│   ├── components/               # ← THE LIBRARY. No app imports. Portable.
│   │   ├── primitives/           #   shared prop vocabulary (Size, Slots, …)
│   │   ├── atoms/                #   AppButton, AppTextInput, StatusBadge,
│   │   │                         #   Skeleton, RatingStars, AvatarStack
│   │   ├── molecules/            #   AppCard, ListItemRow, StateView,
│   │   │                         #   FilterChipGroup, SegmentedTabs, OTPInput,
│   │   │                         #   CurrencyInput, PhoneInput, DateRangePicker,
│   │   │                         #   StepperIndicator, PermissionPrompt
│   │   ├── organisms/            #   AppSheet, PaginatedList, SearchHeader,
│   │   │                         #   FormWrapper, FormField, AppFAB
│   │   ├── providers/            #   Toast / Sheet / Confirm imperative APIs
│   │   ├── fintech/              #   DOMAIN LIBRARY — 12 payments/cards/KYC/lending
│   │   │                         #   components. See fintech/README.md
│   │   ├── ecommerce/            #   DOMAIN LIBRARY — 12 catalogue/cart/checkout/
│   │   │                         #   fulfilment components. See ecommerce/README.md
│   │   ├── healthcare/           #   DOMAIN LIBRARY — 13 scheduling/records/visit/
│   │   │                         #   intake components. See healthcare/README.md
│   │   ├── education/            #   DOMAIN LIBRARY — 13 course/lesson/assessment/
│   │   │                         #   progress components. See education/README.md
│   │   ├── social/               #   DOMAIN LIBRARY — 13 feed/stories/messaging/
│   │   │                         #   moderation components. See social/README.md
│   │   ├── ondemand/             #   DOMAIN LIBRARY — 11 booking/tracking/agent/
│   │   │                         #   cancellation components. See ondemand/README.md
│   │   ├── travel/               #   DOMAIN LIBRARY — 13 search/results/room/itinerary/
│   │   │                         #   ticket components. See travel/README.md
│   │   ├── transportation/       #   DOMAIN LIBRARY — 13 ride search/match/status/safety/
│   │   │                         #   history components. See transportation/README.md
│   │   ├── gaming/               #   DOMAIN LIBRARY — 12 library/leaderboard/achievement/
│   │   │                         #   commerce components. See gaming/README.md
│   │   ├── media/                #   DOMAIN LIBRARY — 12 discovery/player/episode/download
│   │   │                         #   components. See media/README.md
│   │   ├── fitness/              #   DOMAIN LIBRARY — 12 workout/nutrition/sleep/habit
│   │   │                         #   components. See fitness/README.md
│   │   ├── realestate/           #   DOMAIN LIBRARY — 12 listing/filter/agent/document
│   │   │                         #   components. See realestate/README.md
│   │   ├── enterprise/           #   DOMAIN LIBRARY — 14 table/dashboard/kanban/approval
│   │   │                         #   components. See enterprise/README.md
│   │   └── index.ts              #   public surface (`import { … } from '@ui'`)
│   │
│   ├── schema/                   # LAYER 3: server-driven UI, validated
│   │   ├── types.ts              #   zod schemas + version gate
│   │   ├── rules.ts              #   rule NAMES → validators (never regex on the wire)
│   │   ├── runtime.tsx           #   action + data-source resolution
│   │   ├── FormRenderer.tsx      #   field-array JSON → FormField composition
│   │   ├── SchemaRenderer.tsx    #   whitelisted component registry
│   │   └── fallback/*.json       #   bundled offline/first-launch schemas
│   │
│   ├── services/                 # API boundary + domain types (mocked)
│   ├── store/                    # Zustand: client state only
│   ├── navigation/
│   └── features/                 # ← THE APP. Imports the library, never vice versa.
│       ├── catalog/{screens,components,hooks}
│       ├── orders/{screens,components,hooks}
│       ├── checkout/screens
│       ├── wallet/screens        #   live gallery for the fintech library
│       ├── shop/screens          #   live gallery for the e-commerce library
│       ├── health/screens        #   live gallery for the healthcare library
│       ├── learn/screens         #   live gallery for the education library
│       ├── social/screens        #   live gallery for the social library
│       ├── ondemand/screens      #   live gallery for the on-demand service library
│       ├── travel/screens        #   live gallery for the travel & booking library
│       ├── transportation/screens #  live gallery for the ride-hailing library
│       ├── gaming/screens        #   live gallery for the gaming library
│       ├── media/screens         #   live gallery for the media & OTT library
│       ├── fitness/screens       #   live gallery for the fitness & wellness library
│       ├── realestate/screens    #   live gallery for the real estate & PropTech library
│       ├── enterprise/screens    #   live gallery for the enterprise / B2B / productivity library
│       └── profile/screens
```

**The one architectural rule:** `features/*` imports from `components/*`.
Nothing in `components/*` imports from `features/*`, `store/*`, or `services/*`.
That is what makes the library liftable into the next project.

---

## The four cross-cutting contracts

**1. Prop order: variant → state → slots → escape hatches → `...rest`.**
No component takes a raw color. `variant="danger"` resolves through
`resolveIntent(theme, 'error')`. Every component spreads `...rest` to its Paper
primitive so consumers are never blocked.

**2. Theme tokens, never literals.** `useAppTheme()` returns MD3 colors *plus*
`spacing`, `radii`, `sizing`, `typography`, `motion`, `opacity`.

**3. Controlled and uncontrolled.** Every input-like component accepts
`value`/`onChange` **and** `defaultValue`, via one `useControllableState` hook.

**4. Animation is a prop with named presets.**
```tsx
<AppCard entering="slideUp" index={3} pressAnimation="scale" animationDuration="fast" />
```
Consumers cannot pass an easing curve or a Reanimated config — only names that
map to theme motion tokens. Swap the animation engine later without touching a
single call site.

Non-negotiables enforced throughout: `forwardRef` everywhere, `useReducedMotion()`
collapsing durations to 0, `React.memo` + stable callbacks on list rows,
`accessibilityRole`/`Label`/`State` on everything interactive, and `testID`
that generates child ids (`${testID}-input`, `-error`, `-clear`).

---

## Usage examples

**Buttons** — variant maps to Paper's `mode` internally; the label stays mounted
while loading so the width never jumps:
```tsx
<AppButton variant="primary" size="lg" fullWidth loading={submitting} debounceMs={1200}>
  Pay ₹2,499
</AppButton>
```

**Lists** — the screen has no loading/empty/error branches at all:
```tsx
<PaginatedList<Product>
  data={products} estimatedItemSize={168} renderItem={…}
  loading={isLoading} loadingMore={isFetchingNextPage} hasMore={hasNextPage}
  onEndReached={fetchNextPage} onRefresh={refetch} error={error} onRetry={refetch}
  emptyState={{ preset: 'noResults' }} skeletonShape="card" trackScroll
/>
```

**Imperative surfaces** — no boolean state anywhere:
```tsx
toast.success('Saved', { action: { label: 'Undo', onPress: undo } });
sheet.open(<Filters />, { variant: 'bottom', title: 'Filters' });
const ok = await confirm({ title: 'Cancel order?', destructive: true });
```

**Forms** — consumers never touch RHF's `control`:
```tsx
<FormWrapper form={form} onSubmit={submit} showErrorOn="blur" footer={(submit) => …}>
  <FormField name="email" as={AppTextInput} rules={{ required: 'Required' }} label="Email" />
  <FormField name="phone" as={PhoneInput} defaultCountry="IN" />
  <FormField name="gstin" as={AppTextInput} dependsOn={{ field: 'isBusiness', equals: true }} />
</FormWrapper>
```

**Domain statuses are configuration, not code:**
```tsx
<StatusBadgeProvider map={{ paid: 'success', pending: 'warning', failed: 'error' }}>
```

---

## The JSON question — three layers, never one blob

| Layer | What | Where | Runtime? |
|---|---|---|---|
| 1. Design tokens | colors, spacing, motion | `design-tokens/base.tokens.json` | build-time → Paper theme |
| 2. Component metadata | props, slots, a11y | **skipped** — TS types + JSDoc already do this | no |
| 3. Screen / form schema | SDUI payloads | `src/schema/` | yes, validated |

The library itself is **plain typed React components** — no JSON. JSON enters
only at the app layer, and only where surfaces change without a release.

Layer 3 rules, as implemented:
- One schema **per screen**, versioned; `SUPPORTED_SCHEMA_VERSION` rejects anything newer.
- Actions are **named IDs** (`NAVIGATE`, `ADD_TO_CART`) resolved client-side in `runtime.tsx`.
- Animations are **preset names** (`"entering": "slideUp"`), never curves or durations.
- Validation is **rule names** (`["required", "email"]`), never regex on the wire.
- Zod validates every payload before render; a **bundled fallback** ships in-app.
- Unknown node types degrade gracefully — flagged in `__DEV__`, skipped in release.

**Where SDUI is used here:** the KYC form (`FormRenderer`) and a promo/home feed
(`SchemaRenderer`), both on the Profile tab.
**Where it deliberately is not:** checkout — regulated, gesture-heavy, release-tested.
`CheckoutScreen` is hand-written for exactly that reason.

`FormRenderer` is the piece that pays for itself first: one code path collapses
the KYC form, a health questionnaire, a property listing and a passenger form.

---

## Fintech domain library

`src/components/fintech/` layers a payments/cards/verification/lending library on
top of the base one — 12 components, each in its own folder with a dummy
`*.sample.json` and a compiling `*.usage.tsx`:

`BalanceCard` · `TransactionListItem` · `AmountKeypad` · `PinPad` ·
`PaymentMethodSelector` · `CardVisual` · `PayeeSelector` ·
`TransactionStatusSheet` · `KYCUploader` · `SpendingCategoryChart` ·
`EMICalculator` · `StatementFilterSheet`

It reuses the base library rather than duplicating it, and keeps financial logic
outside the visual layer: `PinPad` never validates a PIN, `CardVisual` has no
prop that accepts a card number, `KYCUploader` never opens a camera, and
`EMICalculator` delegates to a swappable `LoanAdapter`.

Full details in [src/components/fintech/README.md](src/components/fintech/README.md).
The **Wallet** tab in the running app renders every usage file live.

## E-commerce domain library

`src/components/ecommerce/` layers a catalogue/cart/checkout/fulfilment library
on the same foundation — 12 components, same folder shape (`Component.tsx` +
`*.sample.json` + `*.usage.tsx`):

`ProductCard` · `PriceTag` · `QuantityStepper` · `AddToCartButton` ·
`CartLineItem` + `CartSummaryCard` · `ImageCarousel` + `ThumbnailStrip` ·
`VariantSelector` · `FilterSortSheet` · `ReviewCard` + `RatingBreakdown` ·
`AddressCard` + `AddressPicker` · `CouponInput` ·
`DeliverySlotPicker` + `OrderTrackerTimeline`

Adding it promoted `Money` from the fintech folder into `@ui/primitives/money`
so both domains share one implementation. Commerce rules stay outside the visual
layer: `PriceTag` never recomputes a discount, `AddToCartButton` never infers
success from a tap, `CartSummaryCard` never hides a mandatory fee.

Full details in [src/components/ecommerce/README.md](src/components/ecommerce/README.md).
The **Shop UI** tab renders every usage file live.

## Healthcare domain library

`src/components/healthcare/` layers a scheduling/records/virtual-visit/intake
library on the same foundation — 13 components, same folder shape:

`DoctorCard` · `AppointmentSlotGrid` · `AppointmentCard` · `SymptomSelector` ·
`VitalsCard` · `MedicationReminderItem` · `PrescriptionCard` + `ReportListItem` ·
`VideoCallControlsBar` · `ChatBubble` · `ConsentDialog` ·
`HealthQuestionnaireForm` · `BMICalculatorCard` · `EmergencyContactCard`

It also promoted `ImageAsset`/`MediaAsset`/`Rating` into `@ui/primitives/media`
so the e-commerce and healthcare libraries share one definition. The governing
rule is the separation of UI, health data and clinical decision logic:
`VitalsCard` contains no threshold table, `SymptomSelector` never infers urgency,
`ConsentDialog` never records consent from a screen view, and
`BMICalculatorCard` refuses to categorise outside adult screening.

Full details in [src/components/healthcare/README.md](src/components/healthcare/README.md).
The **Health UI** tab renders every usage file live.

## Education domain library

`src/components/education/` layers a course/lesson/assessment/progress library on
the same foundation — 13 components, same folder shape:

`CourseCard` · `LessonListItem` · `VideoPlayerControls` + `PlaybackSpeedMenu` ·
`QuizQuestionCard` · `QuizResultCard` · `ProgressRing` + `CourseProgressBar` ·
`CertificateCard` + `StreakCounter` + `BadgeGrid` · `FlashCard` ·
`LeaderboardRow` · `AssignmentSubmissionCard` · `LiveClassBanner` ·
`NoteTakerSheet` · `DiscussionThreadItem`

Adding it promoted `Attachment` and `RichText` into `@ui/primitives/media`, since
healthcare chat and education assignments need the same file model. The governing
rule is that a learner always knows where they stand: `CourseProgressBar` refuses
to show 100% before completion, `LessonListItem` never marks a lesson done just
because it was opened, `QuizQuestionCard` holds no answer key in graded mode, and
`QuizResultCard` never congratulates a failed attempt.

Full details in [src/components/education/README.md](src/components/education/README.md).
The **Learn UI** tab renders every usage file live.

## Social & messaging domain library

`src/components/social/` layers a feed/stories/messaging/moderation library on
the same foundation — 13 components, same folder shape:

`PostCard` · `ReactionBar` · `CommentItem` + `CommentInputBar` ·
`StoryRing` + `StoryTray` + `StoryViewer` · `UserProfileHeader` · `FollowButton` ·
`MessageBubble` · `ChatInputBar` · `ConversationListItem` ·
`TypingIndicator` + `MessageStatusIcon` · `MentionTextInput` ·
`MediaGridViewer` · `ReportBlockSheet`

The governing rule is that interaction state is never ambiguous: `PostCard` is
not one giant tap target, `MessageStatusIcon` refuses to show "Read" when
receipts are off, failed messages and comments stay put with a retry, removed
content renders a tombstone rather than vanishing, and `ReportBlockSheet`
promises no moderation outcome.

Full details in [src/components/social/README.md](src/components/social/README.md).
The **Social UI** tab renders every usage file live.

## Delivery & home service domain library

`src/components/ondemand/` layers a booking/tracking/agent-handoff library on
the same foundation — 11 components, same folder shape:

`ServiceCategoryTile` · `ServiceProviderCard` · `SlotBookingCalendar` ·
`AddOnServiceList` · `PriceBreakdownSheet` · `BookingSummaryCard` ·
`OrderStatusTimeline` · `LiveTrackingCard` · `AgentInfoCard` ·
`RatingFeedbackDialog` · `CancelReasonSheet`

Adding it promoted the ecommerce-local `MoneyRow` into `@ui/molecules/MoneyRow`
(with a new `onExplain` affordance for expandable fee lines), since on-demand
pricing needed the same row for `PriceBreakdownSheet` and `BookingSummaryCard`.
The governing rule is transparency at every commitment point: a user can always
answer what/who/when/where/how-much before confirming, `OrderStatusTimeline`
replaces a stale ETA with an honest timestamp instead of a dead countdown,
`LiveTrackingCard` drops all location detail once a trip ends, `AgentInfoCard`
never auto-reveals or auto-announces a handoff code, and `CancelReasonSheet`
gives "Keep booking" the same visual weight as the cancel action.

Full details in [src/components/ondemand/README.md](src/components/ondemand/README.md).
The **Services UI** tab renders every usage file live.

## Travel, hospitality & booking domain library

`src/components/travel/` layers a flight/stay search, results, room-selection
and itinerary library on the same foundation — 13 components, same folder
shape:

`SearchWidget` · `FlightResultCard` · `HotelCard` · `RoomTypeCard` ·
`GuestRoomSelector` · `FareBreakdownAccordion` · `AmenityIconGrid` ·
`ItineraryTimeline` · `TravellerDetailsForm` · `BookingTicketCard` ·
`PriceCalendarStrip` · `CancellationPolicyCard` · `ReviewSummaryCard`

`FareBreakdownAccordion` reuses `@ui/molecules/MoneyRow` as-is (the same row
promoted for on-demand pricing) for every line item, and `GuestRoomSelector`
is both a standalone component and the traveler/room editor embedded inside
`SearchWidget`. The governing rule is decision transparency: a traveler can
always see destination, dates, occupancy, total cost, and cancellation
consequences before committing — `SearchWidget` only ever emits a normalized
query and never validates inventory itself, `HotelCard` never shows "Free
cancellation" without its deadline, `FareBreakdownAccordion` never conceals a
mandatory fee until after payment, and `BookingTicketCard` keeps the
confirmation code legible even when its barcode can't render.

Full details in [src/components/travel/README.md](src/components/travel/README.md).
The **Travel UI** tab renders every usage file live.

## Transportation & ride-hailing domain library

`src/components/transportation/` layers a request/match/complete ride-hailing
library on the same foundation — 13 components, same folder shape:

`LocationSearchSheet` · `RideTypeSelector` · `FareEstimateCard` · `DriverCard` ·
`RideStatusBottomSheet` · `MapMarkerCallout` (+ route legend) ·
`OTPDisplayCard` · `SOSButton` · `TripSummaryCard` · `SavedPlaceItem` ·
`ScheduleRideSheet` · `TipSelector` · `RideHistoryListItem`

`FareEstimateCard`, `TripSummaryCard`, and `ScheduleRideSheet` all reuse
`@ui/molecules/MoneyRow` for fare/fee/tip lines, and `DriverCard` is composed
inside both `RideStatusBottomSheet` (live trip) and `TripSummaryCard`
(completed trip) so driver presentation never drifts between the two. The
governing rule is operational clarity: a rider always knows where pickup is,
what they're paying, who's arriving, and what state the trip is in —
`RideStatusBottomSheet` renders status from a real trip-service value rather
than inferring it from a moving marker, `OTPDisplayCard` never auto-reveals
or auto-announces the pickup code, and `SOSButton` puts a real confirmation
step between any tap and an actual emergency call.

Full details in [src/components/transportation/README.md](src/components/transportation/README.md).
The **Rides UI** tab renders every usage file live.

## Gaming domain library

`src/components/gaming/` layers a library/leaderboard/achievement/commerce
library on the same foundation, built directly on React Native Paper
primitives (`Card`, `Surface`, `Chip`, `Badge`, `ProgressBar`,
`ActivityIndicator`, `Dialog`/`Portal`) per its spec — 12 components, same
folder shape:

`GameCard` · `Leaderboard` (+ `LeaderboardRow`/`Podium`) · `PlayerProfileCard` ·
`AchievementBadge` + `AchievementGrid` · `MatchmakingDialog` ·
`ResourcePill` (Lives/Energy/Currency) · `RewardClaimDialog` +
`DailyStreakCalendar` · `InAppPurchaseCard` · `GameControlsOverlay` ·
`ScoreCounter` + `CountdownTimer` · `TournamentCard` · `SpinWheelWidget`

`CountdownTimer` is composed inside `TournamentCard`, and `AppSheet` backs
every dialog-shaped component here the same way it backs dialogs in every
other domain. The governing rule is explicit game state: `GameCard` uses
`ProgressBar` only for a known download percentage and never fakes progress
with an indeterminate spinner, `RewardClaimDialog` and `InAppPurchaseCard`
never show a claim or entitlement as successful before the backend confirms
it, `AchievementBadge` never leaks a hidden achievement's title, and
`SpinWheelWidget` only ever visualizes an outcome the server already chose.

Full details in [src/components/gaming/README.md](src/components/gaming/README.md).
The **Gaming UI** tab renders every usage file live.

## Media & OTT domain library

`src/components/media/` layers a discovery/player/episode/download library on
the same foundation, built directly on React Native Paper 5.x primitives
(`Card`, `Surface`, `ProgressBar`, `Menu`, `Dialog`/`Portal`,
`SegmentedButtons`, `Avatar`) per its spec — 12 components, same folder
shape:

`ContentPosterCard` · `HeroBanner` · `ContentCarousel` ·
`ContinueWatchingCard` · `PlayerControlsOverlay` · `EpisodeListItem` ·
`SeasonSelector` · `DownloadStatusButton` · `WatchlistToggle` +
`MaturityRatingChip` · `CastCrewStrip` · `SubscriptionPlanCard` ·
`MiniPlayerBar`

`DownloadStatusButton` is composed inside `EpisodeListItem`, and
`WatchlistToggle`/`MaturityRatingChip` are shared by both `ContentPosterCard`
and `HeroBanner`. The governing rule is continuity with honest state:
`ContentPosterCard` never hides a restricted or region-locked title, it
explains why the title can't play; `ContinueWatchingCard` always pairs its
progress bar with real "Watched X of Y min" text rather than an implied
percentage; `PlayerControlsOverlay` renders state and emits intent without
ever owning buffering or DRM; and `SubscriptionPlanCard` never calls a trial
"free" without disclosing when billing begins. No component hard-codes a
brand colour — every accent is a semantic token a consuming app re-themes
through `PaperProvider`.

Full details in [src/components/media/README.md](src/components/media/README.md).
The **Media UI** tab renders every usage file live.

## Fitness & wellness domain library

`src/components/fitness/` layers a workout/nutrition/sleep/habit library on
the same foundation, built directly on React Native Paper primitives
(`Card`, `Chip`, `ProgressBar`, `Checkbox`, `List.Accordion`,
`SegmentedButtons`) per its spec — 12 components, same folder shape:

`WorkoutCard` · `ExerciseListItem` · `RestTimerCircle` · `ActivityRings` +
`StepCounterRing` · `WaterIntakeTracker` · `MealCard` +
`MacroBreakdownBar` · `WeightLogChart` + `LogEntrySheet` · `HabitCheckRow` ·
`SleepSummaryCard` · `WorkoutPlanTimeline` · `PersonalRecordCard` +
`StreakFlame` · `MeditationPlayerCard`

Since Paper has no dedicated circular-progress primitive, a shared SVG
`RingProgress` renderer (`src/components/fitness/primitives`) backs both
`RestTimerCircle` and `ActivityRings`/`StepCounterRing`. The governing rule
is supportive clarity: `WorkoutCard` always labels a calorie figure as an
estimate, `WeightLogChart` never uses value-judgement language and lists
every plotted point as an exact value, `HabitCheckRow` never uses
shame-based copy for a missed day and never erases a longest streak on
reset, and `SleepSummaryCard` never presents a sleep score as a diagnosis.

Full details in [src/components/fitness/README.md](src/components/fitness/README.md).
The **Fitness UI** tab renders every usage file live.

## Real estate & PropTech domain library

`src/components/realestate/` layers a listing/filter/agent/document library
on the same foundation, built directly on React Native Paper primitives
(`Card`, `Chip`, `Checkbox`, `RadioButton`, `List.Accordion`, `Menu`,
`SegmentedButtons`) plus `@react-native-community/slider` per its spec — 12
components, same folder shape:

`PropertyCard` · `PropertyFilterSheet` · `AmenityGrid` · `FloorPlanViewer` +
`ImageGalleryGrid` · `AgentContactCard` · `EMICalculatorCard` ·
`LocalityInsightsCard` · `SiteVisitSchedulerSheet` ·
`ComparePropertiesTable` · `PropertyStatusChip` · `SavedSearchItem` +
`PriceTrendChart` · `DocumentChecklistItem`

`EMICalculatorCard` reuses `@ui/molecules/MoneyRow` for its principal/
interest/fee/total breakdown, and `PropertyStatusChip` is composed inside
`PropertyCard`'s status overlay. The governing rule is trust through
explicit evidence: `PropertyCard` never hides a sold or unavailable listing,
`ComparePropertiesTable` renders missing data as "Not provided" rather than
"No," `DocumentChecklistItem` never shows a verified checkmark for a
merely-uploaded file, and `EMICalculatorCard` never implies loan approval
from an estimate.

Full details in [src/components/realestate/README.md](src/components/realestate/README.md).
The **Property UI** tab renders every usage file live.

## Enterprise / B2B / productivity domain library

`src/components/enterprise/` layers a table/dashboard/kanban/approval
library on the same foundation, built directly on React Native Paper
primitives (`DataTable`, `Chip`, `Checkbox`, `RadioButton`, `Menu`,
`SegmentedButtons`) per its spec — 14 components, same folder shape:

`DataTableWrapper` · `KPIStatCard` · `DashboardChartCard` · `FilterToolbar` ·
`TaskListItem` · `KanbanColumn` + `KanbanCard` · `ApprovalRequestCard` ·
`TimelineActivityFeed` · `UserRoleChip` + `TeamMemberRow` ·
`NotificationListItem` · `FileAttachmentItem` · `ExportSheet` ·
`AuditLogRow` · `MultiStepFormWizard`

`UserRoleChip`/`TeamMemberRow` are composed wherever a person needs to
render — task assignees, kanban card avatars, approval requesters — and
`AppSheet` backs every dialog-shaped component here. The governing rule is
actionable transparency: `KPIStatCard` never assumes "up" is good (a
semantic status drives colour, not trend direction), `ApprovalRequestCard`
always requires a reason to reject, `FilterToolbar` always shows active
filters as removable chips rather than hiding them behind a menu, and
`AuditLogRow` marks a redacted field "Hidden" in text rather than leaving a
blank cell.

Full details in [src/components/enterprise/README.md](src/components/enterprise/README.md).
The **Workspace UI** tab renders every usage file live.

---

## IoT & smart home / wearables domain library

`src/components/iot/` layers a device-control library on the same
foundation, built directly on React Native Paper primitives (`Card`,
`Switch`, `IconButton`, `ActivityIndicator`, `SegmentedButtons`, `Menu`,
`ProgressBar`, `Chip`, `Badge`) plus SVG for the thermostat dial and colour
wheel per its spec — 13 components, same folder shape:

`DeviceCard` · `DeviceToggleTile` · `SliderControl` · `ThermostatDial` ·
`ColorPickerWheel` + `ColorPresetChips` · `RoomTabs` · `SceneCard` ·
`AutomationRuleCard` · `DevicePairingWizard` · `SensorReadingCard` ·
`BatteryIndicator` + `SignalStrengthIcon` · `FirmwareUpdateCard` ·
`ScheduleTimerRow`

The governing rule is state honesty: the interface always distinguishes
what the user requested, what the device acknowledged, what it actually
applied, and what the system can't currently verify. `DeviceCard` drives
its controls entirely from a device's own capability list and never
renders "offline" as "off"; `SceneCard` never reports "completed" when
only some devices in a scene responded; `FirmwareUpdateCard` never
declares success from a completed download alone — install and restart
must both finish; and `DevicePairingWizard` keeps every failure
recoverable with a real manual setup-code fallback next to the QR scan.

Full details in [src/components/iot/README.md](src/components/iot/README.md).
The **Smart Home UI** tab renders every usage file live.

---

## AgriTech & logistics / supply chain domain library

`src/components/agritech/` layers a crop-advisory and logistics-execution
library on the same foundation, built directly on React Native Paper
primitives (`Card`, `List.Item`, `Chip`, `Badge`, `RadioButton.Group`,
`ProgressBar`, `Menu`, `TextInput`) plus custom map/scanner adapters per
its spec — 15 components, same folder shape:

`CropCard` · `WeatherForecastStrip` · `MandiPriceListItem` ·
`SoilHealthCard` · `AdvisoryAlertBanner` · `FieldMapCard` ·
`InputOrderCard` · `ShipmentCard` · `ShipmentStatusTimeline` ·
`VehicleTrackingCard` · `InventoryStockRow` · `WarehouseSelector` ·
`PODCaptureSheet` · `BarcodeScannerOverlay` · `RouteStopListItem`

The governing rule is operational truth in difficult conditions: farmers
and field operators always know what data is current, what's recommended,
what shipment state is verified, and what happens when connectivity, GPS,
scanning, or hardware fails. `CropCard` never presents a system-inferred
stage as farmer-confirmed; `AdvisoryAlertBanner` never generates its own
agronomic guidance — only a validated advisory engine's output; `ShipmentCard`
never infers "delivered" from a single scan; and `PODCaptureSheet` never
marks a delivery complete locally until every required proof is captured
and the server accepts it.

Full details in [src/components/agritech/README.md](src/components/agritech/README.md).
The **AgriTech UI** tab renders every usage file live.

---

## Running it

```bash
npm install
npx expo start
```

Typecheck (strict, `noUncheckedIndexedAccess`):

```bash
npm run typecheck
```
