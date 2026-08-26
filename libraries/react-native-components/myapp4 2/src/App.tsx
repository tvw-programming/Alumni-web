import React from 'react';
import { StatusBar } from 'expo-status-bar';

import { RootNavigator } from '@/navigation/RootNavigator';
import { AppProviders } from '@/providers/AppProviders';

export default function App() {
  return (
    <AppProviders>
      <StatusBar style="auto" />
      <RootNavigator />
    </AppProviders>
  );
}
