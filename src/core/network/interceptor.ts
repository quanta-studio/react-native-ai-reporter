import type {HeaderMap, IgnorePattern, NetworkEntry} from '../../types';
import {redactEntry, type RedactionConfig} from '../redact';
import type {Store} from '../store';
import {
  describeBlob,
  describeRequestBody,
  isBinaryBlob,
  parseResponseHeaders,
  readBlobAsText,
  truncate,
} from './body';

export const DEFAULT_IGNORE: IgnorePattern[] = [
  /^https?:\/\/[^/]+\/(symbolicate|logs|status)(\?|#|$)/,
  ':8081/',
];

export interface InterceptorOptions {
  store: Store;
  redaction: RedactionConfig;
  /** Defaults to the global `XMLHttpRequest`. */
  xhr?: {prototype: object};
  getCurrentRoute?: () => string | undefined;
  ignore?: IgnorePattern[];
  maxBodyBytes?: number;
}

export interface NetworkInterceptor {
  install(): void;
  uninstall(): void;
}

interface XhrLike {
  readyState?: number;
  status: number;
  responseType: string;
  responseText?: string;
  response?: unknown;
  getAllResponseHeaders(): string | null;
  addEventListener(type: string, listener: () => void): void;
}

interface Pending {
  method: string;
  url: string;
  headers: HeaderMap;
}

type Fn = (...args: unknown[]) => unknown;

const MARK = Symbol.for('ai-reporter.network-patched');

let counter = 0;

function matches(url: string, pattern: IgnorePattern): boolean {
  try {
    if (typeof pattern === 'string') {
      return url.includes(pattern);
    }
    if (typeof pattern === 'function') {
      return pattern(url);
    }
    pattern.lastIndex = 0;
    return pattern.test(url);
  } catch {
    return false;
  }
}

export function createNetworkInterceptor(
  options: InterceptorOptions,
): NetworkInterceptor {
  const patterns = [...DEFAULT_IGNORE, ...(options.ignore ?? [])];
  const maxBytes = options.maxBodyBytes ?? 64 * 1024;
  const pending = new WeakMap<object, Pending>();
  let originals: {open: Fn; send: Fn; setRequestHeader: Fn} | undefined;
  let proto: Record<string | symbol, unknown> | undefined;

  /** Redact first, then cut, so a cut body can't hide a key from masking. */
  const commit = (raw: NetworkEntry, isNew: boolean) => {
    try {
      const entry = redactEntry(raw, options.redaction);
      const req = truncate(entry.requestBody, maxBytes);
      const res = truncate(entry.responseBody, maxBytes);
      const stored: NetworkEntry = {
        ...entry,
        requestBody: req.text,
        responseBody: res.text,
        truncated: req.truncated || res.truncated || undefined,
      };
      if (isNew) {
        options.store.addNetwork(stored);
      } else {
        options.store.updateNetwork(raw.id, stored);
      }
    } catch {
      // Never throw into the app; fall back to not capturing.
    }
  };

  const record = (xhr: XhrLike, info: Pending, body: unknown) => {
    if (patterns.some(p => matches(info.url, p))) {
      return;
    }
    let route: string | undefined;
    try {
      route = options.getCurrentRoute?.();
    } catch {
      route = undefined;
    }
    let entry: NetworkEntry = {
      id: `req-${++counter}`,
      method: info.method,
      url: info.url,
      requestHeaders: {...info.headers},
      requestBody: describeRequestBody(body),
      startTime: Date.now(),
      responseHeaders: {},
      state: 'pending',
      route,
    };
    commit(entry, true);

    let reason: 'error' | 'timeout' | 'aborted' | undefined;
    xhr.addEventListener('error', () => {
      reason = 'error';
    });
    xhr.addEventListener('timeout', () => {
      reason = 'timeout';
    });
    xhr.addEventListener('abort', () => {
      reason = 'aborted';
    });
    xhr.addEventListener('loadend', () => {
      try {
        const endTime = Date.now();
        entry = {
          ...entry,
          endTime,
          duration: Math.max(0, endTime - entry.startTime),
          status: xhr.status,
          responseHeaders: safeHeaders(xhr),
          responseType: xhr.responseType || 'text',
          state: reason ?? 'done',
        };
        const pendingBlob = readResponse(xhr, patch => {
          entry = {...entry, ...patch};
        });
        commit(entry, false);
        if (pendingBlob) {
          pendingBlob.then(
            patch => {
              entry = {...entry, ...patch};
              commit(entry, false);
            },
            () => undefined,
          );
        }
      } catch {
        // ignore
      }
    });
  };

  return {
    install() {
      try {
        const target = (options.xhr ??
          (globalThis as {XMLHttpRequest?: {prototype: object}})
            .XMLHttpRequest) as {prototype: object} | undefined;
        if (!target || originals) {
          return;
        }
        const p = target.prototype as Record<string | symbol, unknown>;
        if (p[MARK]) {
          return;
        }
        const open = p.open as Fn;
        const send = p.send as Fn;
        const setRequestHeader = p.setRequestHeader as Fn;
        originals = {open, send, setRequestHeader};
        proto = p;
        p[MARK] = true;

        p.open = function patchedOpen(this: object, ...args: unknown[]) {
          try {
            pending.set(this, {
              method: String(args[0] ?? 'GET').toUpperCase(),
              url: String(args[1] ?? ''),
              headers: {},
            });
          } catch {
            // ignore
          }
          return open.apply(this, args);
        };
        p.setRequestHeader = function patchedSetHeader(
          this: object,
          ...args: unknown[]
        ) {
          try {
            const info = pending.get(this);
            if (info) {
              const name = String(args[0]);
              const value = String(args[1]);
              info.headers[name] =
                name in info.headers
                  ? `${info.headers[name]}, ${value}`
                  : value;
            }
          } catch {
            // ignore
          }
          return setRequestHeader.apply(this, args);
        };
        p.send = function patchedSend(this: object, ...args: unknown[]) {
          try {
            const info = pending.get(this);
            if (info) {
              record(this as unknown as XhrLike, info, args[0]);
            }
          } catch {
            // ignore
          }
          return send.apply(this, args);
        };
      } catch {
        // fall back to not capturing
      }
    },
    uninstall() {
      if (originals && proto) {
        proto.open = originals.open;
        proto.send = originals.send;
        proto.setRequestHeader = originals.setRequestHeader;
        delete proto[MARK];
      }
      originals = undefined;
      proto = undefined;
    },
  };
}

function safeHeaders(xhr: XhrLike): HeaderMap {
  try {
    return parseResponseHeaders(xhr.getAllResponseHeaders());
  } catch {
    return {};
  }
}

type Patch = Partial<NetworkEntry>;

/**
 * Reads the response body. Returns a promise only when it has to be read
 * asynchronously (blob responses, which is what `fetch` produces).
 */
function readResponse(
  xhr: XhrLike,
  apply: (patch: Patch) => void,
): Promise<Patch> | undefined {
  try {
    const type = xhr.responseType;
    if (type === '' || type === 'text') {
      const text = xhr.responseText ?? '';
      apply({responseBody: text, responseSize: text.length});
    } else if (type === 'json') {
      const text =
        xhr.response === null || xhr.response === undefined
          ? ''
          : JSON.stringify(xhr.response);
      apply({responseBody: text, responseSize: text.length});
    } else if (type === 'blob') {
      const blob = xhr.response as Blob | null;
      if (!blob) {
        return undefined;
      }
      if (isBinaryBlob(blob)) {
        apply({responseBody: describeBlob(blob), responseSize: blob.size});
        return undefined;
      }
      return readBlobAsText(blob).then(text => ({
        responseBody: text,
        responseSize: blob.size ?? text.length,
      }));
    } else if (type === 'arraybuffer') {
      const buf = xhr.response as ArrayBuffer | null;
      apply({
        responseBody: buf ? `[ArrayBuffer size=${buf.byteLength}]` : '',
        responseSize: buf?.byteLength,
      });
    }
  } catch {
    // leave the body empty
  }
  return undefined;
}
