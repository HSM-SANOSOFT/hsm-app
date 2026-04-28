import { envs } from '@hsm/config';
import { BullModule } from '@nestjs/bullmq';
import { Global, Module } from '@nestjs/common';
import { QueueEnum } from './queue.enum';
import { QueueService } from './queue.service';

@Global()
@Module({
  imports: [
    BullModule.forRoot({
      connection: {
        host: envs.DB_REDIS_HOST,
        port: envs.DB_REDIS_PORT,
        username: envs.DB_REDIS_USER,
        password: envs.DB_REDIS_PASSWORD,
      },
      prefix: 'hsm-app-be-queue',
      defaultJobOptions: {
        attempts: 3,
        delay: 1000,
        backoff: 2000,
      },
    }),
    BullModule.registerQueue(
      ...Object.values(QueueEnum).map(name => ({ name })),
    ),
  ],
  providers: [QueueService],
  exports: [BullModule, QueueService],
})
export class QueueModule {}
