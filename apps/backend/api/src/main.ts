import { ApiErrorCode } from '@hsm/common/enums';
import { freePort } from '@hsm/common/utils';
import { envs } from '@hsm/config';
import {
  BadRequestException,
  ConsoleLogger,
  type ValidationError,
  ValidationPipe,
  VersioningType,
} from '@nestjs/common';
import { NestFactory, Reflector } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { HttpLoggingInterceptor } from './interceptors';
import { MainModule } from './main.module';

async function bootstrap() {
  const app = await NestFactory.create(MainModule, {
    rawBody: true,
    logger: new ConsoleLogger({
      prefix: 'hsm-app-be-main',
      json: envs.ENVIRONMENT !== 'dev',
      logLevels:
        envs.ENVIRONMENT === 'dev'
          ? ['log', 'error', 'warn', 'debug', 'verbose']
          : ['log', 'error', 'warn'],
    }),
  });

  const port = 3000;

  await freePort(port);

  const config = new DocumentBuilder()
    .setTitle('HSM App Backend')
    .setVersion('1.0')
    .addBearerAuth(undefined, 'access_token')
    .addBearerAuth(undefined, 'refresh_token')
    .build();

  const docs = () => SwaggerModule.createDocument(app, config);

  SwaggerModule.setup('api', app, docs, {
    customSiteTitle: envs.SWAGGER_SITE_TITLE,
    customfavIcon: envs.SWAGGER_FAVICON,
  });

  app.useGlobalGuards();
  app.useGlobalFilters();
  app.useGlobalInterceptors(new HttpLoggingInterceptor(app.get(Reflector)));

  app.enableShutdownHooks();
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
      disableErrorMessages: false,
      validationError: { target: false, value: false },
      // Throw our API-contract payload so the error envelope carries a stable
      // `code` and structured, per-field constraint keys the frontend maps to
      // localized copy (spec U7). The `ResponseFilter` trusts this `issue`.
      exceptionFactory: (errors: ValidationError[]) => {
        const details = errors.map(e => ({
          field: e.property,
          constraints: Object.keys(e.constraints ?? {}),
        }));
        const message = errors.flatMap(e => Object.values(e.constraints ?? {}));
        return new BadRequestException({
          issue: {
            code: ApiErrorCode.Validation,
            message,
            errors: details,
          },
        });
      },
    }),
  );

  app.enableVersioning({
    type: VersioningType.URI,
    defaultVersion: '1',
  });

  // The web frontend is served from a different origin (the containerized
  // `web` service / the dev server on :4200), so allow cross-origin requests —
  // but only from the configured web origin, not every origin. APP_BASE_URL
  // drives the allowlist so dev (:4200) and prod differ without code changes.
  app.enableCors({
    origin: envs.APP_BASE_URL,
    credentials: true,
  });

  app.enableShutdownHooks();

  await app.listen(port);
}

void bootstrap();
