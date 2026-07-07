// Import the shipped config directly so this spec stays the single source of
// truth (esbuild bundles the JSON at its real repo-root path).
import ngswConfig from '../../../../ngsw-config.json';
import { TEST_API_BASE_URL } from '../../core/config/config-testing';

/**
 * Regression guard for R13 / KTD7: the service worker caches the app shell and
 * static assets ONLY — it must never cache authenticated patient/clinical API
 * responses. A stray `dataGroup`, or an `assetGroups` glob loose enough to
 * match a `/v1/...` path, would write PHI to disk. This spec reads the shipped
 * `ngsw-config.json` and asserts neither happens.
 */
describe('ngsw-config.json (PWA cache safety)', () => {
  const config = ngswConfig as {
    dataGroups?: unknown[];
    navigationUrls?: string[];
    assetGroups: { resources: { files?: string[] } }[];
  };

  /**
   * Translate an ngsw glob into a regex. ngsw globbing (see the service-worker
   * config schema) treats `**` as "any characters including `/`" and `*` as
   * "any characters except `/`"; `.` is a literal. We over-approximate (a glob
   * that matches is a real cache-hit risk) and assert NONE match an API path.
   */
  function globToRegExp(glob: string): RegExp {
    let out = '';
    for (let i = 0; i < glob.length; i++) {
      const ch = glob[i];
      if (ch === '*') {
        if (glob[i + 1] === '*') {
          out += '.*';
          i++;
        } else {
          out += '[^/]*';
        }
      } else if ('.+?^${}()|[]\\/'.includes(ch)) {
        out += `\\${ch}`;
      } else {
        out += ch;
      }
    }
    return new RegExp(`^${out}$`);
  }

  /** Representative authenticated/PHI-shaped API paths derived from the env. */
  const apiPaths = (() => {
    // TEST_API_BASE_URL is a full origin + version prefix, e.g.
    // 'http://localhost:10001/v1'. The SW sees same-origin request paths, so
    // build path-only candidates under that version prefix.
    const prefix = new URL(TEST_API_BASE_URL).pathname.replace(/\/$/, '');
    return [
      `${prefix}/auth/profile`,
      `${prefix}/auth/refresh`,
      `${prefix}/user`,
      `${prefix}/user/42`,
      `${prefix}/documents/7`,
      `${prefix}/health/version`,
    ];
  })();

  it('declares NO dataGroups (authenticated endpoints are never cached)', () => {
    expect(config.dataGroups ?? []).toEqual([]);
  });

  it('every assetGroup glob uses an explicit static path/extension', () => {
    const files = config.assetGroups.flatMap(g => g.resources.files ?? []);
    expect(files.length).toBeGreaterThan(0);
    for (const glob of files) {
      // No bare catch-all: a glob that is just `/**` (or matches an API path
      // below) would defeat the asset-only invariant.
      expect(glob).not.toBe('/**');
      expect(glob).not.toBe('/*');
    }
  });

  it('NO assetGroup glob matches any representative API/PHI path', () => {
    const files = config.assetGroups.flatMap(g => g.resources.files ?? []);
    for (const glob of files) {
      const re = globToRegExp(glob);
      for (const apiPath of apiPaths) {
        expect(
          re.test(apiPath),
          `asset glob "${glob}" must not match API path "${apiPath}"`,
        ).toBe(false);
      }
    }
  });

  it('navigationUrls serve the shell for SPA routes but exclude /v1 and files', () => {
    const nav = config.navigationUrls ?? [];
    expect(nav).toContain('/**');
    // The API version prefix is negated, so /v1/... never gets the shell.
    const prefix = new URL(TEST_API_BASE_URL).pathname.replace(/\/$/, '');
    expect(nav.some(n => n.startsWith('!') && n.includes(prefix))).toBe(true);
    // Files (anything with an extension) are excluded from the shell fallback.
    expect(nav).toContain('!/**/*.*');
  });
});
