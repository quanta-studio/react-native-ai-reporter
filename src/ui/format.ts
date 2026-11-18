import type {NetworkEntry} from '../types';

export function pathOf(url: string): string {
  const m = /^[a-z][a-z0-9+.-]*:\/\/[^/?#]*([^?#]*)/i.exec(url);
  const path = m ? m[1] : url.split(/[?#]/)[0];
  return path === '' ? '/' : path;
}

export function statusLabel(entry: NetworkEntry): string {
  switch (entry.state) {
    case 'pending':
      return 'pending';
    case 'done':
      return String(entry.status ?? '');
    default:
      return 'failed';
  }
}

export function formatDuration(ms?: number): string {
  if (ms === undefined) {
    return '…';
  }
  return ms >= 1000 ? `${(ms / 1000).toFixed(2)} s` : `${ms} ms`;
}

export function formatTime(ts: number): string {
  const d = new Date(ts);
  const p = (n: number, w = 2) => String(n).padStart(w, '0');
  return `${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}.${p(
    d.getMilliseconds(),
    3,
  )}`;
}

/** Pretty-prints JSON; anything else is returned as is. */
export function prettyBody(body: string | undefined): string {
  if (body === undefined || body === '') {
    return '';
  }
  const first = body.trimStart().charAt(0);
  if (first === '{' || first === '[') {
    try {
      return JSON.stringify(JSON.parse(body), null, 2);
    } catch {
      return body;
    }
  }
  return body;
}

function headerLines(headers: Record<string, string>): string {
  const lines = Object.keys(headers).map(k => `${k}: ${headers[k]}`);
  return lines.length ? lines.join('\n') : '(none)';
}

export function toShareText(entry: NetworkEntry): string {
  return [
    `${entry.method} ${entry.url}`,
    `Status: ${statusLabel(entry)}`,
    `State: ${entry.state}`,
    `Started: ${new Date(entry.startTime).toISOString()}`,
    `Duration: ${formatDuration(entry.duration)}`,
    entry.route ? `Screen: ${entry.route}` : '',
    '',
    'Request headers:',
    headerLines(entry.requestHeaders),
    '',
    'Request body:',
    prettyBody(entry.requestBody) || '(empty)',
    '',
    'Response headers:',
    headerLines(entry.responseHeaders),
    '',
    'Response body:',
    prettyBody(entry.responseBody) || '(empty)',
    entry.truncated ? '\n(a body was truncated)' : '',
  ]
    .filter((line, i, all) => !(line === '' && all[i - 1] === ''))
    .join('\n');
}

const shq = (s: string) => `'${s.replace(/'/g, "'\\''")}'`;

export function toCurl(entry: NetworkEntry): string {
  const parts = [`curl -X ${entry.method} ${shq(entry.url)}`];
  for (const name of Object.keys(entry.requestHeaders)) {
    parts.push(`-H ${shq(`${name}: ${entry.requestHeaders[name]}`)}`);
  }
  if (entry.requestBody) {
    parts.push(`--data ${shq(entry.requestBody)}`);
  }
  return parts.join(' ');
}
