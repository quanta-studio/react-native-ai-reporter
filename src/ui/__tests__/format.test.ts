import type {NetworkEntry} from '../../types';
import {pathOf, prettyBody, statusLabel, toCurl} from '../format';

const entry: NetworkEntry = {
  id: '1',
  method: 'POST',
  url: "https://a.test/it's?x=1",
  requestHeaders: {'X-A': "it's"},
  requestBody: '{"a":1}',
  startTime: 0,
  responseHeaders: {},
  state: 'pending',
};

describe('format helpers', () => {
  it('extracts the path', () => {
    expect(pathOf('https://a.test/x/y?z=1')).toBe('/x/y');
    expect(pathOf('https://a.test')).toBe('/');
  });

  it('labels pending, failed and done states', () => {
    expect(statusLabel(entry)).toBe('pending');
    expect(statusLabel({...entry, state: 'timeout'})).toBe('failed');
    expect(statusLabel({...entry, state: 'done', status: 404})).toBe('404');
  });

  it('pretty-prints JSON only', () => {
    expect(prettyBody('{"a":1}')).toBe('{\n  "a": 1\n}');
    expect(prettyBody('plain')).toBe('plain');
  });

  it('escapes single quotes in cURL', () => {
    expect(toCurl(entry)).toBe(
      "curl -X POST 'https://a.test/it'\\''s?x=1' -H 'X-A: it'\\''s' --data '{\"a\":1}'",
    );
  });
});
