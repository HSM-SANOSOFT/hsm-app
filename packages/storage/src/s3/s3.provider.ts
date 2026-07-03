import { S3Client, S3ServiceException } from '@aws-sdk/client-s3';
import { SettingsAccessorService } from '@hsm/database/settings';
import { Logger } from '@nestjs/common';
import { S3_CLIENT, S3_CLIENT_PRESIGNED } from './s3.symbols';

/** Storage setting keys whose change must rebuild the S3 client. */
const S3_KEYS = [
  'STRG_S3_ACCESS_KEY',
  'STRG_S3_SECRET_KEY',
  'STRG_S3_HOST',
  'STRG_S3_HOST_EXTERNAL',
  'STRG_S3_REGION',
  'STRG_S3_FORCE_PATH_STYLE',
];

interface S3EffectiveConfig {
  accessKeyId: string;
  secretAccessKey: string;
  region: string;
  forcePathStyle: boolean;
  /** Endpoint to use when forcePathStyle is on (RustFS/self-hosted). */
  endpoint: string | undefined;
}

function buildS3Client(cfg: S3EffectiveConfig): S3Client {
  const logger = new Logger('S3Module');
  try {
    return new S3Client({
      region: cfg.region,
      endpoint: cfg.forcePathStyle ? cfg.endpoint : undefined,
      forcePathStyle: cfg.forcePathStyle,
      credentials: {
        accessKeyId: cfg.accessKeyId,
        secretAccessKey: cfg.secretAccessKey,
      },
    });
  } catch (err: unknown) {
    if (err instanceof S3ServiceException) {
      logger.error(
        `Failed to create S3 client: ${err.name} - ${err.message} - ${err.$fault}`,
      );
    } else {
      logger.error(
        `Failed to create S3 client: ${
          err instanceof Error ? err.message : String(err)
        }`,
      );
    }
    throw err;
  }
}

/**
 * Live-config S3 client (U4). Replaces the boot-time `S3Client` singleton: the
 * underlying client is rebuilt lazily whenever the effective storage settings
 * change. Change detection is a version hash of the storage keys read through the
 * short-TTL {@link SettingsAccessorService}.
 *
 * Implemented as a `Proxy` over a delegate `S3Client` so it stays a drop-in for
 * the `S3_CLIENT` / `S3_CLIENT_PRESIGNED` DI tokens — `S3Service` and
 * `getSignedUrl` keep using it unchanged. Both ultimately call `.send(...)`, so
 * `send` is wrapped to refresh the delegate first (within the TTL window); every
 * other property/method forwards to the current delegate.
 *
 * `useExternalHost` selects the externally-reachable endpoint for the presigned
 * client (so URLs handed to clients resolve outside Docker), mirroring the prior
 * `STRG_S3_HOST_EXTERNAL ?? STRG_S3_HOST` behavior.
 */
class LazyS3Client {
  private readonly logger = new Logger('S3Module');
  private delegate: S3Client | null = null;
  private builtHash: string | null = null;
  private refreshing: Promise<void> | null = null;

  constructor(
    private readonly settingsAccessor: SettingsAccessorService,
    private readonly useExternalHost: boolean,
  ) {}

  private async resolveConfig(): Promise<S3EffectiveConfig> {
    const v = this.settingsAccessor;
    const host = (await v.getValue('STRG_S3_HOST')) ?? undefined;
    const external = (await v.getValue('STRG_S3_HOST_EXTERNAL')) ?? undefined;
    const forceRaw = await v.getValue('STRG_S3_FORCE_PATH_STYLE');
    return {
      accessKeyId: (await v.getValue('STRG_S3_ACCESS_KEY')) ?? '',
      secretAccessKey: (await v.getValue('STRG_S3_SECRET_KEY')) ?? '',
      region: (await v.getValue('STRG_S3_REGION')) ?? '',
      forcePathStyle: forceRaw === 'true' || forceRaw === '1',
      endpoint: this.useExternalHost ? (external ?? host) : host,
    };
  }

  private async ensureDelegate(): Promise<S3Client> {
    const hash = await this.settingsAccessor.getVersionHash(S3_KEYS);
    if (this.delegate && this.builtHash === hash) return this.delegate;
    if (this.refreshing) {
      await this.refreshing;
      if (this.delegate) return this.delegate;
    }
    this.refreshing = (async () => {
      const cfg = await this.resolveConfig();
      this.delegate = buildS3Client(cfg);
      this.builtHash = hash;
      this.logger.log(
        `S3 client (re)built from current settings (external=${this.useExternalHost})`,
      );
    })().finally(() => {
      this.refreshing = null;
    });
    await this.refreshing;
    // delegate is set by the refresh above.
    return this.delegate as S3Client;
  }

  /**
   * A Proxy that masquerades as an S3Client. `send` refreshes the delegate
   * first (rebuilding on a settings change within the TTL window); every other
   * property/method (config, middlewareStack, …) forwards to the CURRENT
   * delegate. An initial delegate is built eagerly in the async factory so those
   * synchronous reads — used by `getSignedUrl` — always have a backing client.
   */
  async asProxy(): Promise<S3Client> {
    // Eagerly build the first delegate so getSignedUrl's synchronous config /
    // middlewareStack reads never hit a null delegate.
    await this.ensureDelegate();
    const lazy = this;
    const handler: ProxyHandler<S3Client> = {
      get(_target, prop, receiver) {
        if (prop === 'send') {
          return async (...args: unknown[]) => {
            const client = await lazy.ensureDelegate();
            // biome-ignore lint/suspicious/noExplicitAny: variadic AWS SDK send.
            return (client.send as any)(...args);
          };
        }
        // delegate is guaranteed: asProxy() awaits ensureDelegate() first.
        const client = lazy.delegate as S3Client;
        const value = Reflect.get(client, prop, receiver);
        return typeof value === 'function' ? value.bind(client) : value;
      },
    };
    return new Proxy({} as S3Client, handler);
  }
}

function makeLazyS3Provider(name: symbol, useExternalHost: boolean) {
  return {
    provide: name,
    inject: [SettingsAccessorService],
    useFactory: (
      settingsAccessor: SettingsAccessorService,
    ): Promise<S3Client> =>
      new LazyS3Client(settingsAccessor, useExternalHost).asProxy(),
  };
}

export const s3Client = makeLazyS3Provider(S3_CLIENT, false);

export const s3ClientPresigned = makeLazyS3Provider(S3_CLIENT_PRESIGNED, true);
