const path = require('path');
const {getDefaultConfig, mergeConfig} = require('@react-native/metro-config');
const {withAiReporter} = require('../metro');

const root = path.resolve(__dirname, '..');

/**
 * npm workspaces hoist `react` and `react-native` into the repo root, so
 * Metro sees one copy once the root is watched. The library is read from
 * `../src` through the "source" export condition, so no build step is needed.
 */
const PKG = '@quanta-studio/react-native-ai-reporter';
// The repo root is the package itself, so npm does not link it into
// node_modules. Map its two entries to the sources by hand.
const ENTRIES = {
  [PKG]: path.join(root, 'src/index.ts'),
  [`${PKG}/noop`]: path.join(root, 'src/noop/index.ts'),
};

const config = mergeConfig(getDefaultConfig(__dirname), {
  watchFolders: [root],
  resolver: {
    nodeModulesPaths: [path.join(root, 'node_modules')],
    resolveRequest(context, moduleName, platform) {
      const file = ENTRIES[moduleName];
      if (file) {
        return {type: 'sourceFile', filePath: file};
      }
      return context.resolveRequest(context, moduleName, platform);
    },
  },
});

// `enabled` comes from AI_REPORTER_ENABLED ("true" or "false"), else Metro's dev flag.
module.exports = withAiReporter(config);
