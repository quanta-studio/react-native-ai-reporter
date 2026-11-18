import React from 'react';
import {Text} from 'react-native';
import {render} from '@testing-library/react-native';
import * as real from '../index';
import * as stub from '../noop';

describe('T12 stub parity', () => {
  it('exports the same names as the real entry', () => {
    expect(Object.keys(stub).sort()).toEqual(Object.keys(real).sort());
  });

  it('renders children and no ai-reporter elements', () => {
    const {getByText, queryByTestId, toJSON} = render(
      <stub.AiReporterProvider>
        <Text>child</Text>
      </stub.AiReporterProvider>,
    );
    expect(getByText('child')).toBeTruthy();
    expect(queryByTestId('ai-reporter-launcher')).toBeNull();
    expect(JSON.stringify(toJSON())).not.toContain('ai-reporter-');
  });

  it('does nothing when installed and returns stable values', () => {
    const globalXhr = (globalThis as {XMLHttpRequest?: {prototype: {open: unknown}}})
      .XMLHttpRequest;
    const openBefore = globalXhr?.prototype.open;
    stub.installAiReporter();
    stub.uninstallAiReporter();
    expect(globalXhr?.prototype.open).toBe(openBefore);
    expect(stub.useAiReporter()).toBe(stub.useAiReporter());
    expect(stub.AiReporter.getNetworkEntries()).toEqual([]);
    expect(stub.AiReporter.getLogEntries()).toEqual([]);
    expect(() => {
      stub.AiReporter.open();
      stub.AiReporter.close();
      stub.AiReporter.clear();
    }).not.toThrow();
  });
});
