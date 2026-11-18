// Proves the on/off switch: bundles example/ for release twice and checks
// whether the real library's marker string is in the output.
import {spawnSync} from 'node:child_process';
import {existsSync, mkdirSync, readFileSync, rmSync} from 'node:fs';
import {createRequire} from 'node:module';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const MARKER = 'AI_REPORTER_REAL_BUNDLE_MARKER';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const example = path.join(root, 'example');
const outDir = path.join(root, '.bundle-check');

const requireFromExample = createRequire(path.join(example, 'package.json'));
const cli = requireFromExample.resolve('react-native/cli.js');

rmSync(outDir, {recursive: true, force: true});
mkdirSync(outDir, {recursive: true});

function bundle(enabled) {
  const out = path.join(outDir, `enabled-${enabled}.bundle`);
  const result = spawnSync(
    process.execPath,
    [
      cli,
      'bundle',
      '--platform',
      'android',
      '--dev',
      'false',
      '--minify',
      'true',
      '--entry-file',
      'index.js',
      '--bundle-output',
      out,
      '--assets-dest',
      path.join(outDir, `assets-${enabled}`),
      // Metro's cache key ignores env vars, so a stale cache would hide the switch.
      '--reset-cache',
    ],
    {
      cwd: example,
      env: {...process.env, AI_REPORTER_ENABLED: String(enabled)},
      stdio: 'inherit',
    },
  );
  if (result.status !== 0 || !existsSync(out)) {
    console.error(`check:bundle: react-native bundle failed (enabled=${enabled})`);
    process.exit(1);
  }
  return readFileSync(out, 'utf8').includes(MARKER);
}

let failed = false;

if (bundle(false)) {
  console.error(`FAIL: ${MARKER} found in the bundle with AI_REPORTER_ENABLED=false`);
  failed = true;
} else {
  console.log('ok: disabled bundle has no library code');
}

if (!bundle(true)) {
  console.error(`FAIL: ${MARKER} missing from the bundle with AI_REPORTER_ENABLED=true`);
  failed = true;
} else {
  console.log('ok: enabled bundle contains the library');
}

process.exit(failed ? 1 : 0);
