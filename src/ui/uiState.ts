import {isFailure} from '../core/network/failure';
import {store} from '../core/runtime';

interface UiState {
  isOpen: boolean;
}

let state: UiState = {isOpen: false};
const listeners = new Set<() => void>();
/** Failed requests the user has already seen; the badge counts the rest. */
const seenFailures = new Set<string>();

function emit() {
  listeners.forEach(l => l());
}

function markSeen() {
  for (const e of store.getSnapshot().network) {
    if (isFailure(e)) {
      seenFailures.add(e.id);
    }
  }
}

export const uiState = {
  subscribe(listener: () => void) {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },
  getSnapshot(): UiState {
    return state;
  },
  open() {
    if (!state.isOpen) {
      markSeen();
      state = {isOpen: true};
      emit();
    }
  },
  close() {
    if (state.isOpen) {
      markSeen();
      state = {isOpen: false};
      emit();
    }
  },
  isSeen(id: string) {
    return seenFailures.has(id);
  },
  reset() {
    seenFailures.clear();
    state = {isOpen: false};
    emit();
  },
};
