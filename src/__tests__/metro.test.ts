import {withAiReporter} from '../../metro';

const PKG = '@quanta-studio/react-native-ai-reporter';
const NOOP = `${PKG}/noop`;

type Resolve = (ctx: unknown, name: string, platform: string | null) => unknown;
interface Config {
  projectRoot: string;
  resolver: {sourceExts: string[]; resolveRequest?: Resolve};
}

const ORIGINAL_ENV = process.env.AI_REPORTER_ENABLED;

afterEach(() => {
  if (ORIGINAL_ENV === undefined) {
    delete process.env.AI_REPORTER_ENABLED;
  } else {
    process.env.AI_REPORTER_ENABLED = ORIGINAL_ENV;
  }
});

function resolveWith(
  options: {enabled?: boolean} | undefined,
  name: string,
  dev = true,
  config?: Config,
) {
  const base = jest.fn((_c: unknown, n: string) => ({resolved: n}));
  const cfg: Config = config ?? {
    projectRoot: '/app',
    resolver: {sourceExts: ['ts'], resolveRequest: base},
  };
  const wrapped = withAiReporter(cfg, options);
  const context = {dev, resolveRequest: base};
  const result = wrapped.resolver.resolveRequest!(context, name, 'android');
  return {result, base, wrapped};
}

describe('T11 withAiReporter', () => {
  it('disabled: redirects the package and subpaths to the noop entry', () => {
    for (const name of [PKG, `${PKG}/anything`]) {
      const {result, base} = resolveWith({enabled: false}, name);
      expect(result).toEqual({resolved: NOOP});
      expect(base).toHaveBeenCalledTimes(1);
    }
  });

  it('disabled: /metro and other modules go through unchanged', () => {
    for (const name of [`${PKG}/metro`, 'react', './local', `${PKG}-other`]) {
      const {result} = resolveWith({enabled: false}, name);
      expect(result).toEqual({resolved: name});
    }
  });

  it('disabled: does not loop on the noop entry itself', () => {
    expect(resolveWith({enabled: false}, NOOP).result).toEqual({
      resolved: NOOP,
    });
  });

  it('enabled: passes everything through', () => {
    for (const name of [PKG, `${PKG}/anything`, 'react']) {
      expect(resolveWith({enabled: true}, name, false).result).toEqual({
        resolved: name,
      });
    }
  });

  it('reads AI_REPORTER_ENABLED when enabled is not passed', () => {
    process.env.AI_REPORTER_ENABLED = 'false';
    expect(resolveWith(undefined, PKG, true).result).toEqual({resolved: NOOP});
    process.env.AI_REPORTER_ENABLED = 'true';
    expect(resolveWith(undefined, PKG, false).result).toEqual({resolved: PKG});
  });

  it('falls back to context.dev when the variable is unset', () => {
    delete process.env.AI_REPORTER_ENABLED;
    expect(resolveWith(undefined, PKG, true).result).toEqual({resolved: PKG});
    expect(resolveWith(undefined, PKG, false).result).toEqual({
      resolved: NOOP,
    });
  });

  it('prefers the option over the variable', () => {
    process.env.AI_REPORTER_ENABLED = 'false';
    expect(resolveWith({enabled: true}, PKG).result).toEqual({resolved: PKG});
  });

  it('throws naming an invalid variable value', () => {
    process.env.AI_REPORTER_ENABLED = 'yes';
    expect(() => withAiReporter({}, undefined)).toThrow(/yes/);
  });

  it('wraps context.resolveRequest when there is no resolver', () => {
    const base = jest.fn((_c: unknown, n: string) => ({resolved: n}));
    const wrapped = withAiReporter({projectRoot: '/app'}, {enabled: false}) as {
      resolver: {resolveRequest: Resolve};
    };
    expect(
      wrapped.resolver.resolveRequest({resolveRequest: base}, PKG, null),
    ).toEqual({resolved: NOOP});
  });

  it('keeps the rest of the config and does not mutate the input', () => {
    const config: Config = {
      projectRoot: '/app',
      resolver: {sourceExts: ['ts']},
    };
    const wrapped = withAiReporter(config, {enabled: true});
    expect(wrapped.projectRoot).toBe('/app');
    expect(wrapped.resolver.sourceExts).toEqual(['ts']);
    expect(config.resolver.resolveRequest).toBeUndefined();
  });
});
