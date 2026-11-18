import {Platform} from 'react-native';

/** Fixed light palette; the inspector doesn't follow the app's theme. */
export const colors = {
  background: '#FFFFFF',
  surface: '#F3F4F6',
  border: '#D1D5DB',
  text: '#111827',
  muted: '#4B5563',
  primary: '#1D4ED8',
  onPrimary: '#FFFFFF',
  success: '#166534',
  danger: '#B91C1C',
  warning: '#92400E',
};

export const mono = Platform.select({
  ios: 'Menlo',
  default: 'monospace',
});

export const LAUNCHER_SIZE = 48;
