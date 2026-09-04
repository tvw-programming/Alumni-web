import React from 'react';
import { View } from 'react-native';
import { Text } from 'react-native-paper';

interface Props {
  componentKey: string;
  children: React.ReactNode;
}

interface State {
  error: Error | null;
}

/**
 * Some usage examples depend on native-only modules (a slider, a barcode
 * scanner) that don't have a web implementation. Rather than let one bad
 * render take down the whole capture run, this boundary swaps in a labeled
 * placeholder so `capture-screenshots.js` still produces a file — and
 * still reports the failure — for every component.
 */
export class ScreenshotErrorBoundary extends React.Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error) {
    // Surfaced in the headless browser console; capture-screenshots.js reads it.
    // eslint-disable-next-line no-console
    console.error(`[screenshot:render-error] ${this.props.componentKey}: ${error.message}`);
  }

  render() {
    if (this.state.error) {
      return (
        <View
          testID="screenshot-target"
          style={{ width: 390, minHeight: 160, alignItems: 'center', justifyContent: 'center', padding: 24, backgroundColor: '#2a1414' }}
        >
          <Text variant="titleSmall" style={{ color: '#ffb4ab', textAlign: 'center' }}>
            Render failed
          </Text>
          <Text variant="labelSmall" style={{ color: '#ffb4ab', textAlign: 'center', marginTop: 6 }}>
            {this.props.componentKey}
          </Text>
          <Text variant="labelSmall" style={{ color: '#e2a8a3', textAlign: 'center', marginTop: 10 }} numberOfLines={4}>
            {this.state.error.message}
          </Text>
        </View>
      );
    }
    return this.props.children;
  }
}
