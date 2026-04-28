import { DatabaseModule } from '@hsm/database';
import { QueueModule } from '@hsm/queue';
import { Module } from '@nestjs/common';
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { TerminusModule } from '@nestjs/terminus';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { ResponseFilter } from './filters';
import { ResponseInterceptor } from './interceptors';
import { MainController } from './main.controller';
import { MainService } from './main.service';
import { ClinicalModule, CoreModule, SecurityModule } from './modules';
import { EmailTemplateDataValidator } from './validators';

@Module({
  imports: [
    ThrottlerModule.forRoot({
      throttlers: [
        {
          name: 'short',
          ttl: 1000,
          limit: 3,
        },
        {
          name: 'medium',
          ttl: 10000,
          limit: 20,
        },
        {
          name: 'long',
          ttl: 60000,
          limit: 100,
        },
      ],
    }),
    DatabaseModule,
    QueueModule,
    CoreModule,
    SecurityModule,
    ClinicalModule,
    TerminusModule,
  ],
  controllers: [MainController],
  providers: [
    MainService,
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
    {
      provide: APP_FILTER,
      useClass: ResponseFilter,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: ResponseInterceptor,
    },
    EmailTemplateDataValidator,
  ],
  exports: [EmailTemplateDataValidator],
})
export class MainModule {}
