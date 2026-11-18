import {createRedactionConfig} from '../../redact';
import {createStore, type Store} from '../../store';
import {isFailure} from '../failure';
import {createNetworkInterceptor, type InterceptorOptions} from '../interceptor';
import {FakeXHR} from './fakeXhr';

const g = globalThis as unknown as Record<string, unknown>;

let store: Store;
let interceptor: ReturnType<typeof createNetworkInterceptor>;

function setup(extra: Partial<InterceptorOptions> = {}) {
  store = createStore();
  interceptor = createNetworkInterceptor({
    store,
    redaction: createRedactionConfig(),
    xhr: FakeXHR,
    ...extra,
  });
  interceptor.install();
}

function request(
  method: string,
  url: string,
  body?: unknown,
  headers: Record<string, string> = {},
) {
  const xhr = new FakeXHR();
  xhr.open(method, url);
  Object.keys(headers).forEach(k => xhr.setRequestHeader(k, headers[k]));
  xhr.send(body);
  return xhr;
}

const entries = () => store.getSnapshot().network;

beforeEach(() => {
  FakeXHR.instances = [];
});

afterEach(() => {
  interceptor?.uninstall();
});

describe('T1 basic capture', () => {
  it('stores one done entry with request and response data', () => {
    setup({getCurrentRoute: () => 'Home'});
    const xhr = request('get', 'https://api.example.test/items?id=1', null, {
      Accept: 'application/json',
    });
    xhr.respond({
      status: 200,
      headers: 'Content-Type: application/json\r\nX-Id: 7\r\n',
      text: '{"ok":true}',
    });

    expect(entries()).toHaveLength(1);
    const e = entries()[0];
    expect(e.method).toBe('GET');
    expect(e.url).toBe('https://api.example.test/items?id=1');
    expect(e.requestHeaders).toEqual({Accept: 'application/json'});
    expect(e.status).toBe(200);
    expect(e.responseHeaders).toEqual({
      'content-type': 'application/json',
      'x-id': '7',
    });
    expect(e.responseBody).toBe('{"ok":true}');
    expect(e.state).toBe('done');
    expect(e.route).toBe('Home');
    expect(e.duration).toBeGreaterThanOrEqual(0);
  });

  it('reads responseType json from `response`', () => {
    setup();
    const xhr = new FakeXHR();
    xhr.open('GET', 'https://api.example.test/j');
    xhr.responseType = 'json';
    xhr.send();
    xhr.respond({json: {a: 1}});
    expect(entries()[0].responseBody).toBe('{"a":1}');
  });
});

describe('T2 fetch on whatwg-fetch with blob responses', () => {
  const saved = {xhr: g.XMLHttpRequest, fr: g.FileReader};

  afterEach(() => {
    g.XMLHttpRequest = saved.xhr;
    g.FileReader = saved.fr;
  });

  it('records the body and leaves response.json() working', async () => {
    g.FileReader = class {
      result: string | null = null;
      onload: (() => void) | null = null;
      onerror: (() => void) | null = null;
      readAsText(blob: Blob) {
        blob.text().then(
          t => {
            this.result = t;
            this.onload?.();
          },
          () => this.onerror?.(),
        );
      }
    };
    g.XMLHttpRequest = FakeXHR;
    let whatwg: {fetch: typeof fetch} | undefined;
    jest.isolateModules(() => {
      whatwg = require('whatwg-fetch');
    });
    setup();

    const pending = whatwg!.fetch('https://api.example.test/items', {
      method: 'POST',
      body: JSON.stringify({a: 1}),
    });
    const xhr = FakeXHR.instances[0];
    expect(xhr.responseType).toBe('blob');
    xhr.respond({
      status: 200,
      headers: 'content-type: application/json\r\n',
      blob: new Blob(['{"b":2}'], {type: 'application/json'}),
    });
    const res = await pending;
    expect(await res.json()).toEqual({b: 2});
    await new Promise(r => setTimeout(r, 20));

    expect(entries()).toHaveLength(1);
    expect(entries()[0].requestBody).toBe('{"a":1}');
    expect(entries()[0].responseBody).toBe('{"b":2}');
    expect(entries()[0].state).toBe('done');
  });
});

describe('T3 redaction while recording', () => {
  it('masks headers, body keys at any depth and query params', () => {
    setup({
      redaction: createRedactionConfig(['X-Custom'], ['nickname']),
    });
    request(
      'POST',
      'https://api.example.test/a?token=abc&page=2',
      '{"user":{"Password":"x","otp":"1","nickname":"n"},"items":[{"token":"t"}]}',
      {authorization: 'Bearer secret', 'X-Custom': 'v'},
    ).respond({text: '{"accessToken":"zzz","name":"ok"}'});

    const e = entries()[0];
    expect(e.requestHeaders.authorization).toBe('[redacted]');
    expect(e.requestHeaders['X-Custom']).toBe('[redacted]');
    expect(e.url).toBe('https://api.example.test/a?token=[redacted]&page=2');
    expect(JSON.parse(e.requestBody!)).toEqual({
      user: {Password: '[redacted]', otp: '[redacted]', nickname: '[redacted]'},
      items: [{token: '[redacted]'}],
    });
    expect(JSON.parse(e.responseBody!)).toEqual({
      accessToken: '[redacted]',
      name: 'ok',
    });
  });

  it('applies the redact hook and keeps non-JSON bodies unchanged', () => {
    setup({
      redaction: createRedactionConfig([], [], entry => ({
        ...entry,
        route: 'hooked',
      })),
    });
    request('POST', 'https://api.example.test/a', 'password=plain text');
    expect(entries()[0].requestBody).toBe('password=plain text');
    expect(entries()[0].route).toBe('hooked');
  });
});

describe('T4 states', () => {
  it('maps error, timeout, abort and a 404 to states', () => {
    setup();
    request('GET', 'https://api.example.test/1').fail('error');
    request('GET', 'https://api.example.test/2').fail('timeout');
    request('GET', 'https://api.example.test/3').fail('abort');
    request('GET', 'https://api.example.test/4').respond({status: 404});
    const byUrl = (n: number) =>
      entries().find(e => e.url.endsWith(`/${n}`))!;

    expect(byUrl(1).state).toBe('error');
    expect(byUrl(1).status).toBe(0);
    expect(byUrl(2).state).toBe('timeout');
    expect(byUrl(3).state).toBe('aborted');
    expect(byUrl(4).state).toBe('done');
    expect(byUrl(4).status).toBe(404);
    expect(entries().every(isFailure)).toBe(true);
  });

  it('does not count a 200 as a failure', () => {
    setup();
    request('GET', 'https://api.example.test/ok').respond({status: 200});
    expect(isFailure(entries()[0])).toBe(false);
  });
});

describe('T5 bodies', () => {
  it('cuts large responses and summarises FormData and ArrayBuffer', () => {
    setup();
    request('GET', 'https://api.example.test/big').respond({
      text: 'x'.repeat(200 * 1024),
    });
    expect(entries()[0].responseBody).toHaveLength(64 * 1024);
    expect(entries()[0].truncated).toBe(true);

    const form = {
      getParts: () => [
        {fieldName: 'text', string: 'hello-secret'},
        {
          fieldName: 'file',
          uri: 'file:///tmp/a.png',
          name: 'a.png',
          type: 'image/png',
        },
      ],
    };
    request('POST', 'https://api.example.test/form', form).respond({});
    const body = entries()[0].requestBody!;
    expect(body).toContain('text');
    expect(body).toContain('a.png');
    expect(body).toContain('image/png');
    expect(body).not.toContain('hello-secret');

    request(
      'POST',
      'https://api.example.test/bin',
      new ArrayBuffer(12),
    ).respond({});
    expect(entries()[0].requestBody).toBe('[ArrayBuffer size=12]');
  });
});

describe('T6 transparency', () => {
  function run() {
    const log: string[] = [];
    const xhr = new FakeXHR();
    xhr.onreadystatechange = () => log.push(`rsc:${xhr.readyState}`);
    xhr.onload = () => log.push(`load:${xhr.status}`);
    xhr.open('GET', 'https://api.example.test/t');
    xhr.send();
    xhr.respond({status: 201, text: 'body'});
    log.push(`text:${xhr.responseText}`, `status:${xhr.status}`);
    return log;
  }

  it('gives the caller the same events with and without it', () => {
    const without = run();
    setup();
    const withIt = run();
    expect(withIt).toEqual(without);
    expect(entries()).toHaveLength(1);
  });

  it('survives a throwing redact hook', () => {
    setup({
      redaction: createRedactionConfig([], [], () => {
        throw new Error('boom');
      }),
    });
    const log: string[] = [];
    const xhr = new FakeXHR();
    xhr.onload = () => log.push('load');
    expect(() => {
      xhr.open('GET', 'https://api.example.test/t');
      xhr.send();
      xhr.respond({text: 'ok'});
    }).not.toThrow();
    expect(log).toEqual(['load']);
    expect(entries()).toHaveLength(1);
  });
});

describe('T7 ignore', () => {
  it('skips Metro and dev-server traffic by default', () => {
    setup();
    request('GET', 'http://localhost:8081/symbolicate').respond({});
    request('POST', 'http://localhost:8081/logs').respond({});
    request('GET', 'https://api.example.test/status-page').respond({});
    expect(entries()).toHaveLength(1);
  });

  it('respects custom RegExp, string and function patterns', () => {
    setup({
      ignore: [/analytics/, 'telemetry', url => url.endsWith('/skip')],
    });
    request('GET', 'https://a.test/analytics/x').respond({});
    request('GET', 'https://a.test/telemetry').respond({});
    request('GET', 'https://a.test/skip').respond({});
    request('GET', 'https://a.test/keep').respond({});
    expect(entries().map(e => e.url)).toEqual(['https://a.test/keep']);
  });
});

describe('T8 install and uninstall', () => {
  it('records once even when installed twice, and restores originals', () => {
    const {open, send, setRequestHeader} = FakeXHR.prototype;
    setup();
    interceptor.install();
    expect(FakeXHR.prototype.open).not.toBe(open);
    request('GET', 'https://api.example.test/once').respond({});
    expect(entries()).toHaveLength(1);

    interceptor.uninstall();
    expect(FakeXHR.prototype.open).toBe(open);
    expect(FakeXHR.prototype.send).toBe(send);
    expect(FakeXHR.prototype.setRequestHeader).toBe(setRequestHeader);
  });
});
