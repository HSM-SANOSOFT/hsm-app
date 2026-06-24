import { Injectable } from '@nestjs/common';

@Injectable()
export class MainService {
  getHello(): string {
    return `Hello World!`;
  }

  /**
   * Returns the running API's semantic version for the UI footer. Resolves an
   * explicit build-injected `API_VERSION` (set in the Docker image / CI) first,
   * then the `npm_package_version` exposed when the app runs via pnpm in dev,
   * and finally a static fallback. Deliberately exposes ONLY the version — no
   * git SHA, branch, or build timestamp — so anonymous callers get no
   * exact-build reconnaissance.
   */
  getVersion(): { version: string } {
    const version =
      process.env.API_VERSION ?? process.env.npm_package_version ?? '0.0.0';
    return { version };
  }
}
