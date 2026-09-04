import 'react-native-gesture-handler';
import { registerRootComponent } from 'expo';

import App from './src/App';
import HarnessApp from './src/screenshotHarness/HarnessApp';

// Set only by scripts/capture-screenshots.js's `expo export --platform web` build —
// normal dev/prod builds are completely unaffected and still boot the real app.
const Root = process.env.EXPO_PUBLIC_SCREENSHOT_HARNESS === '1' ? HarnessApp : App;

registerRootComponent(Root);
