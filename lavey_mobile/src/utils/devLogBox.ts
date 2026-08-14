import { LogBox } from 'react-native';

/** Suppress known harmless dev-only warnings that clutter the device LogBox banner. */
export function configureDevLogBox(): void {
  if (!__DEV__) return;

  LogBox.ignoreLogs([
    'Open debugger to view warnings.',
    'Attempted to import the module',
    'event-target-shim',
    'ExpoNavigationBar.setStyle',
    'The current activity is no longer available',
    'setVisibilityAsync',
    'requires main queue setup',
    'Non-serializable values were found in the navigation state',
  ]);
}
