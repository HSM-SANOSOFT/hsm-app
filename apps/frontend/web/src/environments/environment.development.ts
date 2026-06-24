/**
 * Development environment.
 *
 * Talks to the API on host port 10001 with the default `/v1` URI version
 * (see repo-root CLAUDE.md port map and `@hsm/api` bootstrap).
 */
export const environment = {
  production: false,
  apiBaseUrl: 'http://localhost:10001/v1',
};
