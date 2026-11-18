import type {LogEntry, LogKind} from '../types';
import type {Store} from './store';

type GlobalHandler = (error: unknown, isFatal?: boolean) => void;

interface ErrorUtilsLike {
  getGlobalHandler?: () => GlobalHandler;
  setGlobalHandler: (handler: GlobalHandler) => void;
}

type ConsoleFn = (...args: unknown[]) => void;

export interface LogCapture {
  install(): void;
  uninstall(): void;
}

let counter = 0;

function stringify(arg: unknown): string {
  if (typeof arg === 'string') {
    return arg;
  }
  if (arg instanceof Error) {
    return arg.message;
  }
  try {
    const json = JSON.stringify(arg);
    return json === undefined ? String(arg) : json;
  } catch {
    return String(arg);
  }
}

function stackOf(arg: unknown): string | undefined {
  return arg instanceof Error ? arg.stack : undefined;
}

export function createLogCapture(
  store: Store,
  errorUtils?: ErrorUtilsLike,
  consoleObj: {error: ConsoleFn; warn: ConsoleFn} = console,
): LogCapture {
  const utils =
    errorUtils ??
    (globalThis as {ErrorUtils?: ErrorUtilsLike}).ErrorUtils ??
    undefined;
  let installed = false;
  let prevHandler: GlobalHandler | undefined;
  let origError: ConsoleFn | undefined;
  let origWarn: ConsoleFn | undefined;

  const add = (kind: LogKind, message: string, extra: Partial<LogEntry>) => {
    try {
      store.addLog({
        id: `log-${++counter}`,
        kind,
        message,
        timestamp: Date.now(),
        ...extra,
      });
    } catch {
      // never throw into the app
    }
  };

  return {
    install() {
      if (installed) {
        return;
      }
      installed = true;
      if (utils) {
        prevHandler = utils.getGlobalHandler?.();
        utils.setGlobalHandler((error, isFatal) => {
          add('exception', stringify(error), {
            stack: stackOf(error),
            isFatal: Boolean(isFatal),
          });
          prevHandler?.(error, isFatal);
        });
      }
      origError = consoleObj.error;
      origWarn = consoleObj.warn;
      const wrap = (kind: LogKind, orig: ConsoleFn): ConsoleFn =>
        function wrapped(this: unknown, ...args: unknown[]) {
          add(kind, args.map(stringify).join(' '), {
            stack: args.map(stackOf).find(s => s !== undefined),
          });
          orig.apply(this, args);
        };
      consoleObj.error = wrap('error', origError);
      consoleObj.warn = wrap('warn', origWarn);
    },
    uninstall() {
      if (!installed) {
        return;
      }
      installed = false;
      if (utils && prevHandler) {
        utils.setGlobalHandler(prevHandler);
      }
      if (origError) {
        consoleObj.error = origError;
      }
      if (origWarn) {
        consoleObj.warn = origWarn;
      }
      prevHandler = undefined;
    },
  };
}
