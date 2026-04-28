import {
  CreateBucketCommand,
  HeadBucketCommand,
  S3Client,
  S3ServiceException,
} from '@aws-sdk/client-s3';
import { Inject, Injectable, Logger } from '@nestjs/common';
import { APP_S3_BUCKETS } from './s3.buckets';
import { S3_CLIENT } from './s3.symbols';

@Injectable()
export class S3Initializer {
  private readonly logger = new Logger(S3Initializer.name);

  constructor(@Inject(S3_CLIENT) private readonly s3: S3Client) {}

  async ensureBuckets(): Promise<void> {
    for (const bucket of APP_S3_BUCKETS) {
      const exists = await this.exists(bucket);
      if (exists) {
        this.logger.log(`Bucket OK: ${bucket}`);
        continue;
      }

      this.logger.warn(`Bucket missing, creating: ${bucket}`);
      await this.create(bucket);
      this.logger.log(`Bucket created: ${bucket}`);
    }
  }

  private async create(bucket: string): Promise<void> {
    try {
      await this.s3.send(new CreateBucketCommand({ Bucket: bucket }));
    } catch (err: unknown) {
      if (err instanceof S3ServiceException) {
        const status = err.$metadata?.httpStatusCode;
        if (status === 409) {
          this.logger.warn(`Bucket already exists (409): ${bucket}`);
          return;
        }
        this.logger.error(
          `CreateBucket failed for "${bucket}" (${status ?? 'no-status'}): ${err.name} - ${err.message}`,
        );
      } else {
        this.logger.error(
          `CreateBucket failed for "${bucket}": ${
            err instanceof Error ? err.message : String(err)
          }`,
        );
      }

      throw err;
    }
  }

  private async exists(bucket: string): Promise<boolean> {
    try {
      await this.s3.send(new HeadBucketCommand({ Bucket: bucket }));
      return true;
    } catch (err: unknown) {
      if (err instanceof S3ServiceException) {
        const status = err.$metadata?.httpStatusCode;

        if (status === 404) {
          this.logger.warn(
            `Bucket does not exist: ${bucket}-> name: ${err.name} - message: ${err.message} - status: ${status} - fault: ${err.$fault}`,
          );
          return false;
        }

        if (status === 403) {
          this.logger.error(
            `Bucket "${bucket}" exists but access denied-> name: ${err.name} - message: ${err.message} - status: ${status} - fault: ${err.$fault}`,
          );
        } else {
          this.logger.debug(
            `HeadBucket failed for "${bucket}" (${status ?? 'no-status'})-> name: ${err.name} - message: ${err.message} - fault: ${err.$fault}`,
          );
        }
      } else {
        this.logger.debug(
          `HeadBucket failed for "${bucket}": ${
            err instanceof Error ? err.message : String(err)
          }`,
        );
      }
      throw err;
    }
  }
}
