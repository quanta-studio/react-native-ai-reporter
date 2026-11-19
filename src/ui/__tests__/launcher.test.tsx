import React from 'react';
import {Text} from 'react-native';
import {fireEvent, render} from '@testing-library/react-native';
import {AiReporterProvider, uninstallAiReporter} from '../../index';
import {store} from '../../core/runtime';
import {uiState} from '../uiState';

beforeEach(() => {
  jest.useFakeTimers();
  store.clear();
});

afterEach(() => {
  uninstallAiReporter();
  uiState.reset();
  jest.useRealTimers();
});

describe('T1 visible name', () => {
  it('shows a QA launcher and a Reporter title, with no AI wording', () => {
    const screen = render(
      <AiReporterProvider>
        <Text>app</Text>
      </AiReporterProvider>,
    );

    const old = ['A', 'I'].join('');
    const oldName = new RegExp(`${old}\\sReporter`);
    const noAiWording = () => {
      expect(screen.queryAllByText(oldName)).toHaveLength(0);
      expect(screen.queryByText(old)).toBeNull();
      expect(screen.queryAllByLabelText(oldName)).toHaveLength(0);
      expect(screen.queryByLabelText(old)).toBeNull();
    };

    const launcher = screen.getByTestId('ai-reporter-launcher');
    expect(launcher.props.accessibilityLabel).toBe('Open Reporter inspector');
    expect(screen.getByText('QA')).toBeTruthy();
    noAiWording();

    fireEvent.press(launcher);
    expect(screen.getByText('Reporter')).toBeTruthy();
    noAiWording();
  });
});
