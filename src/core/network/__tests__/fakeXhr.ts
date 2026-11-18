type Handler = ((event?: unknown) => void) | null;

export interface Reply {
  status?: number;
  headers?: string;
  text?: string;
  json?: unknown;
  blob?: Blob;
}

/** A tiny XMLHttpRequest stand-in with the same prototype methods. */
export class FakeXHR {
  static instances: FakeXHR[] = [];

  readyState = 0;
  status = 0;
  statusText = '';
  responseType = '';
  responseText = '';
  response: unknown = null;
  responseURL = '';
  method = '';
  url = '';
  sentBody: unknown;
  requestHeaders: Record<string, string> = {};
  rawHeaders = '';

  onload: Handler = null;
  onerror: Handler = null;
  ontimeout: Handler = null;
  onabort: Handler = null;
  onloadend: Handler = null;
  onreadystatechange: Handler = null;

  private listeners: Record<string, Array<() => void>> = {};

  open(method: string, url: string) {
    this.method = method;
    this.url = url;
    this.readyState = 1;
  }

  setRequestHeader(name: string, value: string) {
    this.requestHeaders[name] = value;
  }

  send(body?: unknown) {
    this.sentBody = body;
    FakeXHR.instances.push(this);
  }

  addEventListener(type: string, listener: () => void) {
    (this.listeners[type] ??= []).push(listener);
  }

  removeEventListener() {}

  getAllResponseHeaders() {
    return this.rawHeaders;
  }

  abort() {
    this.fail('abort');
  }

  fire(type: string) {
    const handler = (this as unknown as Record<string, Handler>)[`on${type}`];
    handler?.call(this);
    (this.listeners[type] ?? []).forEach(l => l());
  }

  respond(reply: Reply) {
    this.status = reply.status ?? 200;
    this.rawHeaders = reply.headers ?? '';
    this.readyState = 4;
    if (reply.blob) {
      this.response = reply.blob;
    } else if (reply.json !== undefined) {
      this.response = reply.json;
    } else {
      this.responseText = reply.text ?? '';
      this.response = this.responseText;
    }
    this.fire('readystatechange');
    this.fire('load');
    this.fire('loadend');
  }

  fail(type: 'error' | 'timeout' | 'abort') {
    this.status = 0;
    this.readyState = 4;
    this.fire(type);
    this.fire('loadend');
  }
}
