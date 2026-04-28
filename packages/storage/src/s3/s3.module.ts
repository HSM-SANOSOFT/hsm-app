import { Module } from '@nestjs/common';
import { S3Initializer } from './s3.initializer';
import { s3Client, s3ClientPresigned } from './s3.provider';
import { S3Service } from './s3.service';
import { S3_CLIENT, S3_CLIENT_PRESIGNED, S3_INIT } from './s3.symbols';

@Module({
  providers: [
    S3Service,
    S3Initializer,
    s3Client,
    s3ClientPresigned,
    {
      provide: S3_INIT,
      inject: [S3Initializer],
      useFactory: async (init: S3Initializer) => {
        await init.ensureBuckets();
        return true;
      },
    },
  ],
  exports: [S3Service, S3_CLIENT, S3_CLIENT_PRESIGNED],
})
export class S3Module {}
