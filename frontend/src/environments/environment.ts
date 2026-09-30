import type { Environment } from './types';

/** Default build: the app talks to the Go server. */
export const environment: Environment = {
  browserBackend: false,
  interceptors: [],
};
