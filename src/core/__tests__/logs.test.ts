import {createLogCapture} from '../logs';
import {createStore} from '../store';

describe('T10 logs', () => {
  it('chains the global handler and wraps console.error/warn', () => {
    const store = createStore();
    const previous = jest.fn();
    let handler: (error: unknown, isFatal?: boolean) => void = previous;
    const errorUtils = {
      getGlobalHandler: () => handler,
      setGlobalHandler: (h: typeof handler) => {
        handler = h;
      },
    };
    const originalError = jest.fn();
    const originalWarn = jest.fn();
    const fakeConsole = {error: originalError, warn: originalWarn};

    const capture = createLogCapture(store, errorUtils, fakeConsole);
    capture.install();
    expect(handler).not.toBe(previous);

    const boom = new Error('boom');
    handler(boom, true);
    expect(previous).toHaveBeenCalledWith(boom, true);

    fakeConsole.error('a', 1);
    fakeConsole.warn('b');
    expect(originalError).toHaveBeenCalledWith('a', 1);
    expect(originalWarn).toHaveBeenCalledWith('b');

    const logs = store.getSnapshot().logs;
    expect(logs.map(l => l.message)).toEqual(['b', 'a 1', 'boom']);
    expect(logs[2].kind).toBe('exception');
    expect(logs[2].isFatal).toBe(true);
    expect(logs[2].stack).toContain('boom');

    capture.uninstall();
    expect(handler).toBe(previous);
    expect(fakeConsole.error).toBe(originalError);
    expect(fakeConsole.warn).toBe(originalWarn);
  });

  it('still calls the previous handler when recording fails', () => {
    const store = createStore();
    jest.spyOn(store, 'addLog').mockImplementation(() => {
      throw new Error('store broke');
    });
    const previous = jest.fn();
    let handler: (error: unknown, isFatal?: boolean) => void = previous;
    const capture = createLogCapture(
      store,
      {
        getGlobalHandler: () => handler,
        setGlobalHandler: h => {
          handler = h;
        },
      },
      {error: jest.fn(), warn: jest.fn()},
    );
    capture.install();
    handler('x', false);
    expect(previous).toHaveBeenCalledWith('x', false);
  });
});
