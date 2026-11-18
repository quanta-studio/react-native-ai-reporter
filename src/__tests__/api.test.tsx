import React from 'react';
import {Text} from 'react-native';
import {act, render} from '@testing-library/react-native';
import {
  AiReporter,
  installAiReporter,
  uninstallAiReporter,
  useAiReporter,
} from '../index';
import {REAL_BUNDLE_MARKER, isInstalled, store} from '../core/runtime';
import {uiState} from '../ui/uiState';

afterEach(() => {
  uninstallAiReporter();
  uiState.reset();
  store.clear();
});

describe('public API', () => {
  it('installs once and sets the bundle marker', () => {
    installAiReporter();
    installAiReporter();
    expect(isInstalled()).toBe(true);
    expect((globalThis as Record<string, unknown>).__aiReporterBundle).toBe(
      REAL_BUNDLE_MARKER,
    );
    uninstallAiReporter();
    expect(isInstalled()).toBe(false);
  });

  it('opens, closes and clears through AiReporter and the hook', () => {
    function Probe() {
      const api = useAiReporter();
      return <Text testID="probe">{String(api.isOpen)}</Text>;
    }
    const screen = render(<Probe />);
    expect(screen.getByTestId('probe').props.children).toBe('false');
    act(() => AiReporter.open());
    expect(screen.getByTestId('probe').props.children).toBe('true');
    act(() => AiReporter.close());
    expect(screen.getByTestId('probe').props.children).toBe('false');

    store.addLog({id: 'l', kind: 'warn', message: 'm', timestamp: 0});
    expect(AiReporter.getLogEntries()).toHaveLength(1);
    AiReporter.clear();
    expect(AiReporter.getLogEntries()).toHaveLength(0);
    expect(AiReporter.getNetworkEntries()).toHaveLength(0);
  });
});
