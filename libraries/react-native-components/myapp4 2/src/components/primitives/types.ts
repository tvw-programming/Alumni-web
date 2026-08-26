import type { ReactNode } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';

/** Shared vocabulary. Every component in the library speaks these words. */
export type Size = 'sm' | 'md' | 'lg';

export interface StateProps {
  loading?: boolean;
  disabled?: boolean;
  error?: boolean;
}

/** Composition beats configuration — slots keep the prop count down. */
export interface SlotProps {
  left?: ReactNode;
  right?: ReactNode;
  children?: ReactNode;
}

/** Escape hatches. Always last in a prop type, always optional. */
export interface StyleEscapeHatches {
  /** Style for the component's own surface. */
  style?: StyleProp<ViewStyle>;
  /** Style for the outermost wrapper (margins, alignment, flex). */
  containerStyle?: StyleProp<ViewStyle>;
  /** Root test id. Children derive theirs from it (`${testID}-input`, …). */
  testID?: string;
}
