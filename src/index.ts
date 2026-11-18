import {useMemo, useSyncExternalStore} from 'react';
import {install, store, uninstall} from './core/runtime';
import type {
  AiReporterApi,
  AiReporterOptions,
  UseAiReporterResult,
} from './types';
import {useUiState} from './ui/hooks';
import {uiState} from './ui/uiState';

export {AiReporterProvider} from './AiReporterProvider';

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
} from './types';

/** Call first thing in `index.js`, before `AppRegistry`. Idempotent. */
export function installAiReporter(options?: AiReporterOptions): void {
  install(options);
}

/** Restores `XMLHttpRequest`, the global error handler and `console`. */
export function uninstallAiReporter(): void {
  uninstall();
}

export const AiReporter: AiReporterApi = {
  open: () => uiState.open(),
  close: () => uiState.close(),
  clear: () => store.clear(),
  getNetworkEntries: () => store.getSnapshot().network,
  getLogEntries: () => store.getSnapshot().logs,
};

export function useAiReporter(): UseAiReporterResult {
  const snapshot = useSyncExternalStore(store.subscribe, store.getSnapshot);
  const {isOpen} = useUiState();
  return useMemo(
    () => ({
      ...AiReporter,
      isOpen,
      networkEntries: snapshot.network,
      logEntries: snapshot.logs,
    }),
    [isOpen, snapshot],
  );
}
