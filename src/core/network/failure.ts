import type {NetworkEntry} from '../../types';

/** Status 400+, a network error, a timeout or an abort. */
export function isFailure(entry: NetworkEntry): boolean {
  return (
    entry.state === 'error' ||
    entry.state === 'timeout' ||
    entry.state === 'aborted' ||
    (entry.status !== undefined && entry.status >= 400)
  );
}
