# @quanta-studio/react-native-ai-reporter

An in-app inspector for React Native. A floating button opens a full-screen
view of every HTTP request the JS has made (payloads and responses) and the
JS errors and `console.error` / `console.warn` calls, all on the device.

Bug reports and an on-device AI helper are planned for later releases.

No native code, no dependencies beyond `react` and `react-native` (>= 0.79).
Works in bare React Native apps on the New Architecture.

## Install

```sh
npm install @quanta-studio/react-native-ai-reporter
```

## Set up

1. **Metro helper**, in `metro.config.js`:

   ```js
   const {withAiReporter} = require('@quanta-studio/react-native-ai-reporter/metro');

   module.exports = withAiReporter(mergeConfig(getDefaultConfig(__dirname), {}), {
     // enabled: appEnv !== 'production',  // optional, see "The on/off switch"
   });
   ```

2. **Install first thing in `index.js`**, before `AppRegistry`, so early
   requests are caught:

   ```js
   import {installAiReporter} from '@quanta-studio/react-native-ai-reporter';
   installAiReporter();
   ```

3. **Wrap the app root**:

   ```jsx
   import {AiReporterProvider} from '@quanta-studio/react-native-ai-reporter';

   <AiReporterProvider getCurrentRoute={() => currentScreenName}>
     <App />
   </AiReporterProvider>;
   ```

Imperative API: `AiReporter.open()`, `.close()`, `.clear()`,
`.getNetworkEntries()`, `.getLogEntries()`; hook: `useAiReporter()`.

## Options

Passed to `installAiReporter(options)` or `<AiReporterProvider options>`.

| Option              | Default | Description                                                                 |
| ------------------- | ------- | --------------------------------------------------------------------------- |
| `maxNetworkEntries` | `300`   | Network ring buffer size.                                                   |
| `maxLogEntries`     | `200`   | Log ring buffer size.                                                       |
| `maxBodyBytes`      | `65536` | Bodies longer than this are cut and flagged `truncated`.                    |
| `ignore`            | Metro and dev-server URLs | Extra URLs to skip: string (substring), `RegExp` or `(url) => boolean`. |
| `redactHeaders`     | `[]`    | Extra header names to mask, on top of the defaults.                         |
| `redactBodyKeys`    | `[]`    | Extra JSON body and query keys to mask, on top of the defaults.             |
| `redact`            | none    | `(entry) => entry` hook, run after the built-in masking.                    |
| `getCurrentRoute`   | none    | Returns the screen name, stored on each request.                            |

Provider props: `launcher` (`hidden`, `insets`, `initialTop`) and
`getCurrentRoute`.

### Safe-area insets

The library has no safe-area dependency, so the launcher can't know the
device's real insets. Its defaults are a guess (iOS top 59 and bottom 34,
Android top from `StatusBar.currentHeight`). Pass the real values through
`launcher.insets`, for example from `react-native-safe-area-context`:

```tsx
const insets = useSafeAreaInsets();

<AiReporterProvider launcher={{insets}}>{children}</AiReporterProvider>;
```

Call `useSafeAreaInsets` from a component inside the app's
`SafeAreaProvider`.

## Redaction defaults

Masked as `[redacted]` before anything is stored:

- Header values: `Authorization`, `Cookie`, `Set-Cookie`, `X-Api-Key`
- JSON body fields at any depth, and URL query parameters, whose key matches
  case-insensitively: `password`, `otp`, `pin`, `token`, `accessToken`,
  `refreshToken`, `idToken`, `secret`, `apiKey`

Bodies that aren't JSON are stored as they are. If your `redact` hook throws,
the built-in masking still applies.

## The on/off switch

The library is kept out of a build by Metro, not by app code. With
`withAiReporter`, a disabled build resolves the package to an inert stub with
the same exports: the provider renders its children and the functions do
nothing.

`enabled` is decided in this order:

1. the `enabled` option, any boolean (for example `appEnv !== 'production'`)
2. the `AI_REPORTER_ENABLED` environment variable, `true` or `false`, read
   when Metro starts (any other value is an error)
3. Metro's own `dev` flag: on in debug bundles, off in release bundles

**Release builds have `__DEV__` false**, so the default alone turns the
library off in a release build. To keep it on in a release build, such as a
staging or test build, pass `enabled` or set `AI_REPORTER_ENABLED=true`.

Metro's cache doesn't know about environment variables. Run `react-native
start --reset-cache` after changing `AI_REPORTER_ENABLED`.

## Development

```sh
npm ci
npm run lint && npm run typecheck && npm test && npm run build && npm run check:bundle
```

`example/` is a bare React Native app that uses the library from `../src`.
