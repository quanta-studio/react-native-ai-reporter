import React, {useEffect} from 'react';
import {install, setRouteGetter} from './core/runtime';
import type {AiReporterProviderProps} from './types';
import {Inspector} from './ui/Inspector';
import {Launcher} from './ui/Launcher';

export function AiReporterProvider({
  children,
  options,
  launcher,
  getCurrentRoute,
}: AiReporterProviderProps) {
  // Installs if `installAiReporter()` hasn't run; a no-op otherwise.
  // Done during render so requests fired by the children's first effects
  // are caught.
  install(options);
  setRouteGetter(getCurrentRoute);

  useEffect(() => {
    setRouteGetter(getCurrentRoute);
  }, [getCurrentRoute]);

  return (
    <>
      {children}
      <Launcher options={launcher} />
      <Inspector />
    </>
  );
}
