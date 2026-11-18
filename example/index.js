import {installAiReporter} from '@quanta-studio/react-native-ai-reporter';
// Must run before AppRegistry so early requests are caught.
installAiReporter();

import {AppRegistry} from 'react-native';
import App from './src/App';
import {name as appName} from './app.json';

AppRegistry.registerComponent(appName, () => App);
