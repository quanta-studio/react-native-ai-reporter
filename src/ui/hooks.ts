import {useSyncExternalStore} from 'react';
import {store} from '../core/runtime';
import {uiState} from './uiState';

export function useStoreSnapshot() {
  return useSyncExternalStore(store.subscribe, store.getSnapshot);
}

export function useUiState() {
  return useSyncExternalStore(uiState.subscribe, uiState.getSnapshot);
}
