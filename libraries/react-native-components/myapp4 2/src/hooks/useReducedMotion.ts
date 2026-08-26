import { useEffect, useState } from 'react';
import { AccessibilityInfo } from 'react-native';

let cached = false;
const listeners = new Set<(value: boolean) => void>();
let subscribed = false;

const publish = (value: boolean) => {
  cached = value;
  listeners.forEach((l) => l(value));
};

/**
 * Single source of truth for "Reduce Motion". Every animation in the library
 * reads this; when it is on, durations collapse to 0 rather than each component
 * inventing its own opt-out.
 */
export function useReducedMotion(): boolean {
  const [enabled, setEnabled] = useState(cached);

  useEffect(() => {
    listeners.add(setEnabled);
    if (!subscribed) {
      subscribed = true;
      void AccessibilityInfo.isReduceMotionEnabled().then(publish);
      AccessibilityInfo.addEventListener('reduceMotionChanged', publish);
    } else {
      setEnabled(cached);
    }
    return () => {
      listeners.delete(setEnabled);
    };
  }, []);

  return enabled;
}
