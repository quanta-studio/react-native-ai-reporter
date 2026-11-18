# Conventions

- **npm only.** No Yarn or pnpm. `example/` is an npm workspace.
- **Strict TypeScript, no `any`.** Use `unknown` and narrow it.
- **Tests.** Every exported function and component ships with a test.
  Write the test first and watch it fail. No test may touch the network.
- **Worktrees** go under `.worktrees/` (gitignored).
- **Commits** follow Conventional Commits, for example `feat(network): ...`.
- **No `version` bump in a PR.** The version is set at release.
- **Public repo, public npm package.** No client names, ticket text, backend
  hosts or screenshots in code, comments, tests, commits or PR text. Say "the
  consuming app".
- **No native code and no runtime dependencies** beyond `react` and
  `react-native`. The UI uses React Native core components only.
- `src/index.ts` and `src/noop/index.ts` must export the same names (a test
  checks it) and take their types from `src/types.ts`. `src/noop` must never
  import from `src/core` or `src/ui`.

## Verify

```sh
npm run lint && npm run typecheck && npm test && npm run build && npm run check:bundle
```

`npm run check:bundle` bundles `example/` for Android in release mode twice.
With `AI_REPORTER_ENABLED=false` the string `AI_REPORTER_REAL_BUNDLE_MARKER`
must be absent; with `true` it must be present. It proves that the Metro
redirect in `metro.js` really keeps the library out of a disabled bundle.
It needs only the JS dependencies, not Gradle or CocoaPods.
