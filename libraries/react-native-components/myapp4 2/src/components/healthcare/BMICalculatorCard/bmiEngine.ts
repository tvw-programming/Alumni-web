import type { BMIInput, BMIResult } from '../types/domain';

/**
 * BMI calculation engine — pure, unit-tested, and deliberately conservative
 * about interpretation.
 *
 * The engine will happily compute a number for anyone, but it refuses to
 * *categorise* outside the narrow case where adult screening categories apply.
 * Children, pregnancy and (per guidance) very different body compositions need
 * age- and context-specific clinical interpretation that a formula cannot give.
 */

const DISCLAIMER =
  'BMI is a screening measure. It does not directly measure body fat or overall health, and it is not appropriate for everyone.';

const PEDIATRIC_DISCLAIMER =
  'For children and teenagers, BMI is interpreted against age and sex percentiles by a clinician. The number below is not a category.';

const PREGNANCY_DISCLAIMER =
  'BMI is not a meaningful screening measure during pregnancy. Please talk to your midwife or clinician.';

export const toKilograms = (weight: number, unit: BMIInput['weightUnit']): number =>
  unit === 'kg' ? weight : weight * 0.45359237;

export const toMetres = (height: number, unit: BMIInput['heightUnit']): number => {
  if (unit === 'm') return height;
  if (unit === 'cm') return height / 100;
  return height * 0.0254;
};

export interface BMIValidationError {
  field: 'weight' | 'height';
  message: string;
}

export const validateBMIInput = (input: BMIInput): BMIValidationError[] => {
  const errors: BMIValidationError[] = [];
  const kg = toKilograms(input.weight, input.weightUnit);
  const m = toMetres(input.height, input.heightUnit);

  if (!Number.isFinite(input.weight) || input.weight <= 0) {
    errors.push({ field: 'weight', message: 'Enter a weight greater than zero' });
  } else if (kg < 2 || kg > 400) {
    errors.push({ field: 'weight', message: 'Please check this weight' });
  }

  if (!Number.isFinite(input.height) || input.height <= 0) {
    errors.push({ field: 'height', message: 'Enter a height greater than zero' });
  } else if (m < 0.4 || m > 2.5) {
    errors.push({ field: 'height', message: 'Please check this height' });
  }

  return errors;
};

/**
 * BMI = weight(kg) / height(m)²
 *
 * Rounded to one decimal — more precision than that implies an accuracy the
 * inputs do not have.
 */
export const calculateBMI = (input: BMIInput): BMIResult | null => {
  if (validateBMIInput(input).length > 0) return null;

  const kg = toKilograms(input.weight, input.weightUnit);
  const m = toMetres(input.height, input.heightUnit);
  const value = Math.round((kg / (m * m)) * 10) / 10;

  if (input.pregnancyStatus === 'pregnant') {
    return { value, interpretationMode: 'notInterpretable', disclaimer: PREGNANCY_DISCLAIMER };
  }

  if (input.age != null && input.age < 20) {
    return { value, interpretationMode: 'pediatricPercentile', disclaimer: PEDIATRIC_DISCLAIMER };
  }

  if (input.age == null) {
    // Without an age we cannot know which interpretation applies.
    return { value, interpretationMode: 'notInterpretable', disclaimer: DISCLAIMER };
  }

  const category =
    value < 18.5 ? 'Underweight' : value < 25 ? 'Healthy weight' : value < 30 ? 'Overweight' : 'Obese';

  return { value, category, interpretationMode: 'adultScreening', disclaimer: DISCLAIMER };
};
