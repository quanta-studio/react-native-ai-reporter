import type {LogEntry, NetworkEntry} from '../types';

export interface StoreSnapshot {
  /** Newest first. */
  network: readonly NetworkEntry[];
  /** Newest first. */
  logs: readonly LogEntry[];
}

export interface StoreOptions {
  networkCapacity?: number;
  logCapacity?: number;
  /** Delay used to coalesce notifications. Default 16 ms (one frame). */
  flushDelayMs?: number;
}

export interface Store {
  addNetwork(entry: NetworkEntry): void;
  updateNetwork(id: string, entry: NetworkEntry): void;
  addLog(entry: LogEntry): void;
  clear(kind?: 'network' | 'logs'): void;
  setCapacity(capacity: {network?: number; logs?: number}): void;
  subscribe(listener: () => void): () => void;
  getSnapshot(): StoreSnapshot;
}

export function createStore(options: StoreOptions = {}): Store {
  let networkCap = options.networkCapacity ?? 300;
  let logCap = options.logCapacity ?? 200;
  const delay = options.flushDelayMs ?? 16;
  // Oldest first internally; the snapshot is reversed.
  let network: NetworkEntry[] = [];
  let logs: LogEntry[] = [];
  let snapshot: StoreSnapshot = {network: [], logs: []};
  let dirty = false;
  let timer: ReturnType<typeof setTimeout> | undefined;
  const listeners = new Set<() => void>();

  const flush = () => {
    timer = undefined;
    listeners.forEach(l => l());
  };
  const changed = () => {
    dirty = true;
    if (timer === undefined) {
      timer = setTimeout(flush, delay);
    }
  };

  return {
    addNetwork(entry) {
      network.push(entry);
      if (network.length > networkCap) {
        network = network.slice(network.length - networkCap);
      }
      changed();
    },
    updateNetwork(id, entry) {
      for (let i = network.length - 1; i >= 0; i--) {
        if (network[i].id === id) {
          network = network.slice();
          network[i] = entry;
          changed();
          return;
        }
      }
    },
    addLog(entry) {
      logs.push(entry);
      if (logs.length > logCap) {
        logs = logs.slice(logs.length - logCap);
      }
      changed();
    },
    clear(kind) {
      if (kind !== 'logs') {
        network = [];
      }
      if (kind !== 'network') {
        logs = [];
      }
      changed();
    },
    setCapacity(capacity) {
      networkCap = capacity.network ?? networkCap;
      logCap = capacity.logs ?? logCap;
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    getSnapshot() {
      if (dirty) {
        dirty = false;
        snapshot = {
          network: network.slice().reverse(),
          logs: logs.slice().reverse(),
        };
      }
      return snapshot;
    },
  };
}
