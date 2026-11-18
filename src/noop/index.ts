import {createElement, Fragment, type ReactElement} from 'react';
import type {
  AiReporterApi,
  AiReporterOptions,
  AiReporterProviderProps,
  UseAiReporterResult,
} from '../types';

export type {
  AiReporterApi,
  AiReporterOptions,
  AiReporterProviderProps,
  HeaderMap,
  IgnorePattern,
  Insets,
  LauncherOptions,
  LogEntry,
  LogKind,
  NetworkEntry,
  NetworkState,
  UseAiReporterResult,
} from '../types';

/**
 * The inert stand-in Metro swaps in when the library is disabled. It has the
 * same exports as the real entry and does nothing. It must not import
 * anything from `../core` or `../ui`.
 */
export function installAiReporter(_options?: AiReporterOptions): void {}

export function uninstallAiReporter(): void {}

export function AiReporterProvider({
  children,
}: AiReporterProviderProps): ReactElement {
  return createElement(Fragment, null, children);
}

const EMPTY: readonly never[] = Object.freeze([]);

export const AiReporter: AiReporterApi = {
  open() {},
  close() {},
  clear() {},
  getNetworkEntries: () => EMPTY,
  getLogEntries: () => EMPTY,
};

const STABLE_RESULT: UseAiReporterResult = Object.freeze({
  ...AiReporter,
  isOpen: false,
  networkEntries: EMPTY,
  logEntries: EMPTY,
});

export function useAiReporter(): UseAiReporterResult {
  return STABLE_RESULT;
}
