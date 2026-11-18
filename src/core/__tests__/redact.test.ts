import {
  createRedactionConfig,
  redactEntry,
  redactJsonBody,
  redactUrl,
} from '../redact';
import type {NetworkEntry} from '../../types';

const base: NetworkEntry = {
  id: '1',
  method: 'GET',
  url: 'https://a.test/x',
  requestHeaders: {},
  responseHeaders: {},
  startTime: 0,
  state: 'done',
};

describe('redact', () => {
  const keys = createRedactionConfig().keys;

  it('masks nested keys case-insensitively and leaves other data', () => {
    expect(
      JSON.parse(redactJsonBody('{"a":{"API_KEY":1,"apiKey":2,"b":[{"PIN":"1"}]}}', keys)),
    ).toEqual({a: {API_KEY: 1, apiKey: '[redacted]', b: [{PIN: '[redacted]'}]}});
  });

  it('returns invalid JSON unchanged', () => {
    expect(redactJsonBody('{not json', keys)).toBe('{not json');
    expect(redactJsonBody('plain', keys)).toBe('plain');
  });

  it('masks query params and keeps the hash', () => {
    expect(redactUrl('https://a.test/p?Token=1&x=2#frag', keys)).toBe(
      'https://a.test/p?Token=[redacted]&x=2#frag',
    );
    expect(redactUrl('https://a.test/p', keys)).toBe('https://a.test/p');
  });

  it('masks the default headers, including set-cookie in responses', () => {
    const out = redactEntry(
      {
        ...base,
        requestHeaders: {Cookie: 'a=b', Accept: 'x'},
        responseHeaders: {'set-cookie': 's', 'x-api-key': 'k'},
      },
      createRedactionConfig(),
    );
    expect(out.requestHeaders).toEqual({Cookie: '[redacted]', Accept: 'x'});
    expect(out.responseHeaders).toEqual({
      'set-cookie': '[redacted]',
      'x-api-key': '[redacted]',
    });
  });
});
