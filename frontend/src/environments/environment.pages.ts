import { inject } from '@angular/core';
import { LocalBackend, localBackendInterceptor } from '../app/core/local/local-backend';
import type { Environment } from './types';

/**
 * GitHub Pages build (swapped in by angular.json's "pages" configuration). Pages
 * serves static files only, so the Go API is replaced by an in-browser backend with
 * the same routes, rules and events. Only this build bundles it.
 */
export const environment: Environment = {
  browserBackend: true,
  interceptors: [localBackendInterceptor],
  localEvents: () => inject(LocalBackend).events$,
};
