import React from 'react';
import {Share, Text} from 'react-native';
import {act, fireEvent, render} from '@testing-library/react-native';
import {AiReporterProvider, uninstallAiReporter} from '../../index';
import {store} from '../../core/runtime';
import type {NetworkEntry} from '../../types';
import {uiState} from '../uiState';

const post: NetworkEntry = {
  id: 'req-post',
  method: 'POST',
  url: 'https://api.example.test/orders',
  requestHeaders: {Authorization: '[redacted]', 'Content-Type': 'application/json'},
  requestBody: '{"a":1}',
  startTime: 1000,
  endTime: 1100,
  duration: 100,
  status: 200,
  responseHeaders: {},
  responseBody: '{"ok":true}',
  state: 'done',
};
const get500: NetworkEntry = {
  id: 'req-500',
  method: 'GET',
  url: 'https://api.example.test/items',
  requestHeaders: {},
  startTime: 2000,
  endTime: 2050,
  duration: 50,
  status: 500,
  responseHeaders: {},
  state: 'done',
};

beforeEach(() => {
  jest.useFakeTimers();
  store.clear();
  store.addNetwork(post);
  store.addNetwork(get500);
  store.addLog({
    id: 'seeded-log',
    kind: 'exception',
    message: 'seeded failure',
    stack: 'at foo',
    timestamp: 3000,
  });
  jest.advanceTimersByTime(20);
});

afterEach(() => {
  uninstallAiReporter();
  uiState.reset();
  jest.useRealTimers();
});

const flush = () => act(() => {
    jest.advanceTimersByTime(20);
  });

describe('T13 inspector UI', () => {
  it('walks through badge, list, filters, detail, share, logs and close', () => {
    const share = jest.spyOn(Share, 'share').mockResolvedValue({
      action: Share.sharedAction,
    });
    const screen = render(
      <AiReporterProvider>
        <Text>app</Text>
      </AiReporterProvider>,
    );

    expect(screen.getByLabelText('1 failed requests')).toBeTruthy();
    expect(screen.getByText('1')).toBeTruthy();
    fireEvent.press(screen.getByTestId('ai-reporter-launcher'));

    const rows = screen.getAllByTestId(/^ai-reporter-row-/);
    expect(rows.map(r => r.props.testID)).toEqual([
      'ai-reporter-row-req-500',
      'ai-reporter-row-req-post',
    ]);

    fireEvent(screen.getByTestId('ai-reporter-failures-toggle'), 'valueChange', true);
    expect(screen.getAllByTestId(/^ai-reporter-row-/)).toHaveLength(1);
    expect(screen.getByTestId('ai-reporter-row-req-500')).toBeTruthy();
    fireEvent(screen.getByTestId('ai-reporter-failures-toggle'), 'valueChange', false);

    fireEvent.changeText(screen.getByTestId('ai-reporter-search'), 'orders');
    expect(screen.getAllByTestId(/^ai-reporter-row-/)).toHaveLength(1);
    fireEvent.press(screen.getByTestId('ai-reporter-row-req-post'));

    expect(screen.getByText(/Authorization: \[redacted\]/)).toBeTruthy();
    expect(screen.getByText(/"a": 1/)).toBeTruthy();

    fireEvent.press(screen.getByTestId('ai-reporter-share-curl'));
    expect(share).toHaveBeenCalledWith({
      message:
        "curl -X POST 'https://api.example.test/orders' -H 'Authorization: [redacted]' -H 'Content-Type: application/json' --data '{\"a\":1}'",
    });

    fireEvent.press(screen.getByTestId('ai-reporter-detail-back'));
    fireEvent.press(screen.getByTestId('ai-reporter-tab-logs'));
    expect(screen.getByText('seeded failure')).toBeTruthy();
    fireEvent.press(screen.getByTestId('ai-reporter-clear'));
    flush();
    expect(screen.queryByText('seeded failure')).toBeNull();
    expect(store.getSnapshot().network).toHaveLength(2);

    fireEvent.press(screen.getByTestId('ai-reporter-close'));
    expect(screen.getByTestId('ai-reporter-launcher')).toBeTruthy();
    expect(screen.queryByTestId('ai-reporter-launcher-badge')).toBeNull();
    expect(screen.getByText('app')).toBeTruthy();
  });
});
