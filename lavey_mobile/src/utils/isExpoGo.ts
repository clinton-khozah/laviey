import Constants from 'expo-constants';

/** Expo Go cannot use remote push APIs from SDK 53+. */
export function isExpoGo(): boolean {
  return Constants.appOwnership === 'expo';
}
