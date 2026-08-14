import { registerRootComponent } from 'expo';

import { isExpoGo } from './src/utils/isExpoGo';
import { configureDevLogBox } from './src/utils/devLogBox';
import App from './App';

if (!isExpoGo()) {
  require('./src/notifications/setupNotifications');
}

configureDevLogBox();

// registerRootComponent calls AppRegistry.registerComponent('main', () => App);
// It also ensures that whether you load the app in Expo Go or in a native build,
// the environment is set up appropriately
registerRootComponent(App);
