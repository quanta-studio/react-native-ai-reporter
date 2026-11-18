import type {NetworkEntry} from '../../types';
import {createStore} from '../store';

const entry = (id: string): NetworkEntry => ({
  id,
  method: 'GET',
  url: `https://a.test/${id}`,
  requestHeaders: {},
  responseHeaders: {},
  startTime: 0,
  state: 'done',
});

describe('T9 store', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  it('evicts the oldest entry past capacity and lists newest first', () => {
    const store = createStore({networkCapacity: 3});
    ['1', '2', '3', '4'].forEach(id => store.addNetwork(entry(id)));
    expect(store.getSnapshot().network.map(e => e.id)).toEqual(['4', '3', '2']);
  });

  it('clears', () => {
    const store = createStore();
    store.addNetwork(entry('1'));
    store.addLog({id: 'l', kind: 'warn', message: 'm', timestamp: 0});
    store.clear('network');
    expect(store.getSnapshot().network).toHaveLength(0);
    expect(store.getSnapshot().logs).toHaveLength(1);
    store.clear();
    expect(store.getSnapshot().logs).toHaveLength(0);
  });

  it('coalesces five updates in one tick into one notification', () => {
    const store = createStore();
    const listener = jest.fn();
    store.subscribe(listener);
    for (let i = 0; i < 5; i++) {
      store.addNetwork(entry(String(i)));
    }
    expect(listener).not.toHaveBeenCalled();
    jest.advanceTimersByTime(20);
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it('keeps the snapshot stable until something changes', () => {
    const store = createStore();
    store.addNetwork(entry('1'));
    const a = store.getSnapshot();
    expect(store.getSnapshot()).toBe(a);
    store.updateNetwork('1', {...entry('1'), status: 500});
    expect(store.getSnapshot()).not.toBe(a);
    expect(store.getSnapshot().network[0].status).toBe(500);
  });

  it('stops notifying after unsubscribe', () => {
    const store = createStore();
    const listener = jest.fn();
    const off = store.subscribe(listener);
    off();
    store.addNetwork(entry('1'));
    jest.advanceTimersByTime(20);
    expect(listener).not.toHaveBeenCalled();
  });
});
