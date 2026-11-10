import { registerRootComponent } from 'expo';
import { Platform } from 'react-native';

import App from './App';

if (Platform.OS === 'web') {
  document.documentElement.lang = 'zh-CN';
  const style = document.createElement('style');
  style.textContent = 'html, body { margin: 0; background: #FFF8EC; }';
  document.head.appendChild(style);
}

// registerRootComponent calls AppRegistry.registerComponent('main', () => App);
// It also ensures that whether you load the app in Expo Go or in a native build,
// the environment is set up appropriately
registerRootComponent(App);
