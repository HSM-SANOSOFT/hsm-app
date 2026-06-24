import { S3Client } from '@aws-sdk/client-s3';
import { s3Client, s3ClientPresigned } from '@hsm/storage/s3/s3.provider';

jest.mock('@aws-sdk/client-s3', () => {
  const actual = jest.requireActual('@aws-sdk/client-s3');
  return {
    ...actual,
    S3Client: jest.fn().mockImplementation((cfg: unknown) => ({
      __cfg: cfg,
      send: jest.fn().mockResolvedValue({ ok: true }),
    })),
  };
});

const buildAccessor = () => {
  const store: Record<string, string | null> = {
    STRG_S3_ACCESS_KEY: 'ak',
    STRG_S3_SECRET_KEY: 'sk',
    STRG_S3_HOST: 'http://minio:9000',
    STRG_S3_HOST_EXTERNAL: 'http://localhost:9000',
    STRG_S3_REGION: 'us-east-1',
    STRG_S3_FORCE_PATH_STYLE: 'true',
  };
  const S3_KEYS = [
    'STRG_S3_ACCESS_KEY',
    'STRG_S3_SECRET_KEY',
    'STRG_S3_HOST',
    'STRG_S3_HOST_EXTERNAL',
    'STRG_S3_REGION',
    'STRG_S3_FORCE_PATH_STYLE',
  ];
  return {
    store,
    getValue: jest.fn(async (k: string) => store[k] ?? null),
    getVersionHash: jest.fn(async (keys: string[]) =>
      keys
        .slice()
        .sort()
        .map(k => `${k}=${store[k] ?? ''}`)
        .join(' '),
    ),
    _keys: S3_KEYS,
  };
};

describe('Lazy S3 client provider (live config)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('builds the internal client from current storage settings', async () => {
    const accessor = buildAccessor();
    // biome-ignore lint/suspicious/noExplicitAny: provider factory accepts the accessor.
    const proxy = await (s3Client.useFactory as any)(accessor);

    expect(S3Client).toHaveBeenCalledTimes(1);
    expect(S3Client).toHaveBeenCalledWith(
      expect.objectContaining({
        region: 'us-east-1',
        forcePathStyle: true,
        endpoint: 'http://minio:9000',
        credentials: { accessKeyId: 'ak', secretAccessKey: 'sk' },
      }),
    );
    expect(proxy).toBeDefined();
  });

  it('uses the external host for the presigned client', async () => {
    const accessor = buildAccessor();
    // biome-ignore lint/suspicious/noExplicitAny: provider factory accepts the accessor.
    await (s3ClientPresigned.useFactory as any)(accessor);

    expect(S3Client).toHaveBeenCalledWith(
      expect.objectContaining({ endpoint: 'http://localhost:9000' }),
    );
  });

  it('rebuilds the client on the next send after a storage setting changes', async () => {
    const accessor = buildAccessor();
    // biome-ignore lint/suspicious/noExplicitAny: provider factory accepts the accessor.
    const proxy = await (s3Client.useFactory as any)(accessor);
    expect(S3Client).toHaveBeenCalledTimes(1);

    // No change -> send reuses the same delegate (no rebuild).
    await proxy.send({});
    expect(S3Client).toHaveBeenCalledTimes(1);

    // Storage setting changes -> version hash changes -> rebuild on next send.
    accessor.store.STRG_S3_REGION = 'eu-west-1';
    await proxy.send({});
    expect(S3Client).toHaveBeenCalledTimes(2);
    expect(S3Client).toHaveBeenLastCalledWith(
      expect.objectContaining({ region: 'eu-west-1' }),
    );
  });
});
