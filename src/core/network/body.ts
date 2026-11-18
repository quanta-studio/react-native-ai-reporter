/** Helpers that turn request/response payloads into storable strings. */

interface FormDataPart {
  fieldName?: string;
  name?: string;
  type?: string;
  uri?: string;
}

interface FormDataLike {
  getParts(): FormDataPart[];
}

function isFormDataLike(body: unknown): body is FormDataLike {
  return (
    typeof body === 'object' &&
    body !== null &&
    typeof (body as {getParts?: unknown}).getParts === 'function'
  );
}

function isBlob(body: unknown): body is Blob {
  return typeof Blob !== 'undefined' && body instanceof Blob;
}

export function describeBlob(blob: {type?: string; size?: number}): string {
  return `[Blob type=${blob.type || 'unknown'} size=${blob.size ?? '?'}]`;
}

export function describeRequestBody(body: unknown): string | undefined {
  if (body === null || body === undefined) {
    return undefined;
  }
  if (typeof body === 'string') {
    return body;
  }
  if (isFormDataLike(body)) {
    const parts = body.getParts().map(part => {
      const field = part.fieldName ?? 'unknown';
      // Only a file part has a uri; its bytes are never read.
      return part.uri !== undefined
        ? `${field} (file: ${part.name ?? 'unnamed'}, ${part.type ?? 'unknown'})`
        : field;
    });
    return `[FormData] ${parts.join(', ')}`;
  }
  if (isBlob(body)) {
    return describeBlob(body);
  }
  if (body instanceof ArrayBuffer) {
    return `[ArrayBuffer size=${body.byteLength}]`;
  }
  if (ArrayBuffer.isView(body)) {
    return `[ArrayBuffer size=${body.byteLength}]`;
  }
  if (
    typeof URLSearchParams !== 'undefined' &&
    body instanceof URLSearchParams
  ) {
    return body.toString();
  }
  return '[unsupported body]';
}

export function truncate(
  text: string | undefined,
  max: number,
): {text: string | undefined; truncated: boolean} {
  if (text === undefined || text.length <= max) {
    return {text, truncated: false};
  }
  return {text: text.slice(0, max), truncated: true};
}

const BINARY_TYPE = /^(image|audio|video)\/|octet-stream|pdf|zip/i;

export function isBinaryBlob(blob: {type?: string}): boolean {
  return BINARY_TYPE.test(blob.type ?? '');
}

export function readBlobAsText(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ''));
    reader.onerror = () => reject(new Error('Could not read the blob'));
    reader.readAsText(blob);
  });
}

export function parseResponseHeaders(raw: string | null | undefined) {
  const headers: Record<string, string> = {};
  if (!raw) {
    return headers;
  }
  for (const line of raw.split(/\r?\n/)) {
    const idx = line.indexOf(':');
    if (idx > 0) {
      const name = line.slice(0, idx).trim().toLowerCase();
      const value = line.slice(idx + 1).trim();
      headers[name] = name in headers ? `${headers[name]}, ${value}` : value;
    }
  }
  return headers;
}
