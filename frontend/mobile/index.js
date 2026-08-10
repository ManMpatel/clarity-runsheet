// Must be the first import in the app — react-native-gesture-handler (which
// @gorhom/bottom-sheet depends on) requires its native event handlers to be installed before
// anything else touches the RN bridge.
import 'react-native-gesture-handler';
import { registerRootComponent } from 'expo';

import App from './App';

// registerRootComponent calls AppRegistry.registerComponent('main', () => App);
// It also ensures that whether you load the app in Expo Go or in a native build,
// the environment is set up appropriately
registerRootComponent(App);
