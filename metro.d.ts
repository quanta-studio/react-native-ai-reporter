export interface WithAiReporterOptions {
  /**
   * Whether the library is bundled. Defaults to the AI_REPORTER_ENABLED
   * environment variable ("true" or "false"), then to Metro's `dev` flag.
   */
  enabled?: boolean;
}

/** Returns a copy of the Metro config with the on/off switch applied. */
export function withAiReporter<T extends object>(
  config: T,
  options?: WithAiReporterOptions,
): T;
