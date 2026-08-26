# PersonalRecordCard

## API

```ts
type PersonalRecordCardProps = {
  record: PersonalRecord; // exercise, valueLabel, achievedAt, previousValueLabel?, improvementLabel?, isNew?
};
```

## The previous value is kept

A record with nothing to compare against is a number. _"102.5 kg, up from
97.5 kg · +5 kg"_ is an achievement — and it is the version people screenshot.

## Values arrive pre-formatted

A PR can be a weight, a pace ("5:12 /km") or a rep count. A component that tried
to format all three would need to know about unit systems it has no business
knowing.
