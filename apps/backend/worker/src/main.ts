import { envs } from '@hsm/config';
import { ConsoleLogger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';

import { WorkerModule } from './worker.module';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(WorkerModule, {
    logger: new ConsoleLogger({
      prefix: 'hsm-app-be-worker',
      json: envs.ENVIRONMENT !== 'dev',
      logLevels:
        envs.ENVIRONMENT === 'dev'
          ? ['log', 'error', 'warn', 'debug', 'verbose']
          : ['log', 'error', 'warn'],
    }),
  });
  app.enableShutdownHooks();
}
void bootstrap();
