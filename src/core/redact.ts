import type {HeaderMap, NetworkEntry} from '../types';

export const REDACTED = '[redacted]';

export const DEFAULT_REDACTED_HEADERS = [
  'authorization',
  'cookie',
  'set-cookie',
  'x-api-key',
];

export const DEFAULT_REDACTED_KEYS = [
  'password',
  'otp',
  'pin',
  'token',
  'accessToken',
  'refreshToken',
  'idToken',
  'secret',
  'apiKey',
];

export interface RedactionConfig {
  headers: string[];
  keys: string[];
  hook?: (entry: NetworkEntry) => NetworkEntry | void;
}

export function createRedactionConfig(
  extraHeaders: string[] = [],
  extraKeys: string[] = [],
  hook?: RedactionConfig['hook'],
): RedactionConfig {
  return {
    headers: [...DEFAULT_REDACTED_HEADERS, ...extraHeaders].map(h =>
      h.toLowerCase(),
    ),
    keys: [...DEFAULT_REDACTED_KEYS, ...extraKeys].map(k => k.toLowerCase()),
    hook,
  };
}

export function redactHeaders(headers: HeaderMap, names: string[]): HeaderMap {
  const out: HeaderMap = {};
  for (const name of Object.keys(headers)) {
    out[name] = names.includes(name.toLowerCase()) ? REDACTED : headers[name];
  }
  return out;
}

function maskValue(value: unknown, keys: string[]): unknown {
  if (Array.isArray(value)) {
    return value.map(item => maskValue(item, keys));
  }
  if (value !== null && typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value)) {
      out[k] = keys.includes(k.toLowerCase()) ? REDACTED : maskValue(v, keys);
    }
    return out;
  }
  return value;
}

/** Masks JSON bodies. Anything that doesn't parse as JSON is returned as is. */
export function redactJsonBody(body: string, keys: string[]): string {
  const first = body.trimStart().charAt(0);
  if (first !== '{' && first !== '[') {
    return body;
  }
  try {
    return JSON.stringify(maskValue(JSON.parse(body), keys));
  } catch {
    return body;
  }
}

function safeDecode(s: string): string {
  try {
    return decodeURIComponent(s);
  } catch {
    return s;
  }
}

export function redactUrl(url: string, keys: string[]): string {
  const q = url.indexOf('?');
  if (q === -1) {
    return url;
  }
  const hash = url.indexOf('#', q);
  const end = hash === -1 ? url.length : hash;
  const query = url
    .slice(q + 1, end)
    .split('&')
    .map(pair => {
      const eq = pair.indexOf('=');
      const name = eq === -1 ? pair : pair.slice(0, eq);
      if (eq !== -1 && keys.includes(safeDecode(name).toLowerCase())) {
        return `${name}=${REDACTED}`;
      }
      return pair;
    })
    .join('&');
  return url.slice(0, q + 1) + query + url.slice(end);
}

/**
 * Built-in masking, then the app's hook. If the hook throws, the built-in
 * result is kept: a faulty hook never leaks data or breaks the request.
 */
export function redactEntry(
  entry: NetworkEntry,
  config: RedactionConfig,
): NetworkEntry {
  const masked: NetworkEntry = {
    ...entry,
    url: redactUrl(entry.url, config.keys),
    requestHeaders: redactHeaders(entry.requestHeaders, config.headers),
    responseHeaders: redactHeaders(entry.responseHeaders, config.headers),
    requestBody:
      entry.requestBody === undefined
        ? undefined
        : redactJsonBody(entry.requestBody, config.keys),
    responseBody:
      entry.responseBody === undefined
        ? undefined
        : redactJsonBody(entry.responseBody, config.keys),
  };
  if (!config.hook) {
    return masked;
  }
  try {
    const result = config.hook({...masked});
    return result ?? masked;
  } catch {
    return masked;
  }
}
