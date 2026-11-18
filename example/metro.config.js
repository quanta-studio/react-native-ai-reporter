const path = require('path');
const {getDefaultConfig, mergeConfig} = require('@react-native/metro-config');
const {withAiReporter} = require('../metro');

const root = path.resolve(__dirname, '..');

/**
 * npm workspaces hoist `react` and `react-native` into the repo root, so
 * Metro sees one copy once the root is watched. The library is read from
 * `../src` through the "source" export condition, so no build step is needed.
 */
const config = mergeConfig(getDefaultConfig(__dirname), {
  watchFolders: [root],
  resolver: {
    unstable_conditionNames: ['source', 'require', 'import'],
    nodeModulesPaths: [path.join(root, 'node_modules')],
  },
});

// `enabled` comes from AI_REPORTER_ENABLED ("true" or "false"), else Metro's dev flag.
module.exports = withAiReporter(config);
