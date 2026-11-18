import type {AiReporterOptions} from '../types';
import {createLogCapture, type LogCapture} from './logs';
import {
  createNetworkInterceptor,
  type NetworkInterceptor,
} from './network/interceptor';
import {createRedactionConfig} from './redact';
import {createStore} from './store';

/**
 * Present only in the real bundle. `check:bundle` looks for it to prove a
 * disabled build contains none of this library.
 */
export const REAL_BUNDLE_MARKER = 'AI_REPORTER_REAL_BUNDLE_MARKER';

export const store = createStore();

let interceptor: NetworkInterceptor | undefined;
let logCapture: LogCapture | undefined;
let routeGetter: (() => string | undefined) | undefined;

export function setRouteGetter(getter?: () => string | undefined) {
  if (getter) {
    routeGetter = getter;
  }
}

export function isInstalled(): boolean {
  return interceptor !== undefined;
}

export function install(options: AiReporterOptions = {}): void {
  if (interceptor) {
    return;
  }
  try {
    (globalThis as Record<string, unknown>).__aiReporterBundle =
      REAL_BUNDLE_MARKER;
    store.setCapacity({
      network: options.maxNetworkEntries,
      logs: options.maxLogEntries,
    });
    routeGetter = options.getCurrentRoute ?? routeGetter;
    interceptor = createNetworkInterceptor({
      store,
      redaction: createRedactionConfig(
        options.redactHeaders,
        options.redactBodyKeys,
        options.redact,
      ),
      getCurrentRoute: () => routeGetter?.(),
      ignore: options.ignore,
      maxBodyBytes: options.maxBodyBytes,
    });
    interceptor.install();
    logCapture = createLogCapture(store);
    logCapture.install();
  } catch {
    // The library must never break the app.
  }
}

export function uninstall(): void {
  interceptor?.uninstall();
  logCapture?.uninstall();
  interceptor = undefined;
  logCapture = undefined;
}
