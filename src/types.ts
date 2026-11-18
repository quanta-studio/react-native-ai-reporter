import type {ReactElement, ReactNode} from 'react';

export type HeaderMap = Record<string, string>;

export type NetworkState = 'pending' | 'done' | 'error' | 'timeout' | 'aborted';

export interface NetworkEntry {
  id: string;
  method: string;
  url: string;
  requestHeaders: HeaderMap;
  requestBody?: string;
  startTime: number;
  endTime?: number;
  duration?: number;
  status?: number;
  responseHeaders: HeaderMap;
  responseBody?: string;
  responseType?: string;
  responseSize?: number;
  state: NetworkState;
  /** What `getCurrentRoute()` returned when the request started. */
  route?: string;
  /** True when a request or response body was cut at `maxBodyBytes`. */
  truncated?: boolean;
}

export type LogKind = 'exception' | 'error' | 'warn';

export interface LogEntry {
  id: string;
  kind: LogKind;
  message: string;
  stack?: string;
  isFatal?: boolean;
  timestamp: number;
}

export type IgnorePattern = string | RegExp | ((url: string) => boolean);

export interface AiReporterOptions {
  /** Ring buffer size for network entries. Default 300. */
  maxNetworkEntries?: number;
  /** Ring buffer size for log entries. Default 200. */
  maxLogEntries?: number;
  /** Bodies longer than this are cut. Default 65536. */
  maxBodyBytes?: number;
  /** URLs to leave out, on top of the Metro/dev-server defaults. */
  ignore?: IgnorePattern[];
  /** Extra header names to mask, case-insensitive. */
  redactHeaders?: string[];
  /** Extra JSON body / query keys to mask, case-insensitive. */
  redactBodyKeys?: string[];
  /** Last-word hook over an entry, after the built-in masking. */
  redact?: (entry: NetworkEntry) => NetworkEntry | void;
  /** Returns the current screen name; recorded on each request. */
  getCurrentRoute?: () => string | undefined;
}

export interface Insets {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

export interface LauncherOptions {
  /** Hide the floating button; open the inspector with `AiReporter.open()`. */
  hidden?: boolean;
  /** Safe-area insets. There is no safe-area dependency. */
  insets?: Partial<Insets>;
  /** Starting vertical position in dp from the top. */
  initialTop?: number;
}

export interface AiReporterProviderProps {
  children?: ReactNode;
  options?: AiReporterOptions;
  launcher?: LauncherOptions;
  getCurrentRoute?: () => string | undefined;
}

export interface AiReporterApi {
  open(): void;
  close(): void;
  clear(): void;
  getNetworkEntries(): readonly NetworkEntry[];
  getLogEntries(): readonly LogEntry[];
}

export interface UseAiReporterResult extends AiReporterApi {
  isOpen: boolean;
  networkEntries: readonly NetworkEntry[];
  logEntries: readonly LogEntry[];
}

export interface InspectorTab {
  key: string;
  title: string;
  render: () => ReactElement;
}

export type AiReporterProviderComponent = (
  props: AiReporterProviderProps,
) => ReactElement;
