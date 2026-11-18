'use strict';

/**
 * Metro helper. Plain CommonJS: Metro loads its config through Node `require`.
 *
 * While the library is disabled, every import of the package (except this
 * helper) resolves to an inert stub with the same exports, so a disabled
 * bundle contains none of the real code.
 */
const PACKAGE = '@quanta-studio/react-native-ai-reporter';
const NOOP = PACKAGE + '/noop';
const METRO = PACKAGE + '/metro';

function readEnabledFromEnv() {
  const value = process.env.AI_REPORTER_ENABLED;
  if (value === undefined || value === '') {
    return undefined;
  }
  if (value === 'true') {
    return true;
  }
  if (value === 'false') {
    return false;
  }
  throw new Error(
    'AI_REPORTER_ENABLED must be "true" or "false", got "' + value + '"',
  );
}

function isRedirected(moduleName) {
  return (
    (moduleName === PACKAGE || moduleName.startsWith(PACKAGE + '/')) &&
    moduleName !== METRO &&
    moduleName !== NOOP
  );
}

/**
 * @param {object} config Metro config.
 * @param {{enabled?: boolean}} [options] `enabled` defaults to the
 *   AI_REPORTER_ENABLED env var, then to Metro's own `dev` flag.
 */
function withAiReporter(config, options) {
  const enabledOption =
    options && options.enabled !== undefined
      ? options.enabled
      : readEnabledFromEnv();
  const resolver = (config && config.resolver) || {};
  const previous = resolver.resolveRequest;

  return Object.assign({}, config, {
    resolver: Object.assign({}, resolver, {
      resolveRequest(context, moduleName, platform) {
        const enabled =
          enabledOption === undefined ? Boolean(context.dev) : enabledOption;
        const resolve = previous || context.resolveRequest;
        if (!enabled && isRedirected(moduleName)) {
          return resolve(context, NOOP, platform);
        }
        return resolve(context, moduleName, platform);
      },
    }),
  });
}

module.exports = {withAiReporter};
