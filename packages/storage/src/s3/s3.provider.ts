import { S3Client, S3ServiceException } from '@aws-sdk/client-s3';
import { envs } from '@hsm/config';
import { Logger } from '@nestjs/common';
import { S3_CLIENT, S3_CLIENT_PRESIGNED } from './s3.symbols';

function makeS3Client(host?: string) {
  const endpoint = envs.STRG_S3_FORCE_PATH_STYLE ? host : undefined;
  return new S3Client({
    region: envs.STRG_S3_REGION,
    endpoint: endpoint,
    forcePathStyle: envs.STRG_S3_FORCE_PATH_STYLE,
    credentials: {
      accessKeyId: envs.STRG_S3_ACCESS_KEY,
      secretAccessKey: envs.STRG_S3_SECRET_KEY,
    },
  });
}

function makeS3Provider(name: symbol, host?: string) {
  return {
    provide: name,
    useFactory: () => {
      const logger = new Logger('S3Module');
      try {
        return makeS3Client(host);
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
    },
  };
}

export const s3Client = makeS3Provider(S3_CLIENT, envs.STRG_S3_HOST);

export const s3ClientPresigned = makeS3Provider(
  S3_CLIENT_PRESIGNED,
  envs.STRG_S3_HOST_EXTERNAL ?? envs.STRG_S3_HOST,
);
