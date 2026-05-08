import { freePort } from '@hsm/common/utils';
import { envs } from '@hsm/config';
import { RolesSystemEnum } from '@hsm/common/enums';
import { ConsoleLogger, ValidationPipe, VersioningType } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import * as fs from 'fs';
import * as path from 'path';
import { HttpLoggingInterceptor } from './interceptors';
import { MainModule } from './main.module';

async function bootstrap() {
  const app = await NestFactory.create(MainModule, {
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
  app.useGlobalInterceptors(new HttpLoggingInterceptor());

  app.enableShutdownHooks();
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
      disableErrorMessages: false,
      validationError: { target: false, value: false },
    }),
  );

  app.enableVersioning({
    type: VersioningType.URI,
    defaultVersion: '1',
  });

  app.enableShutdownHooks();

  await app.listen(port);

  if (envs.ENVIRONMENT === 'dev') {
    await generateDevTokens(app.get(JwtService));
  }
}

async function generateDevTokens(jwtService: JwtService): Promise<void> {
  const payload = {
    sub: 'dev',
    id: 'dev',
    email: 'dev@localhost',
    roles: [RolesSystemEnum.Developer],
  };

  const thirtyDays = '30d';
  const [at_token, rt_token] = await Promise.all([
    jwtService.signAsync(payload, {
      expiresIn: thirtyDays,
      secret: envs.JWT_AT_SECRET,
    }),
    jwtService.signAsync(payload, {
      expiresIn: thirtyDays,
      secret: envs.JWT_RT_SECRET,
    }),
  ]);

  if (process.stdout.isTTY) {
    console.log('\n--- DEV TOKENS ---');
    console.log(`DEV_AT=${at_token}`);
    console.log(`DEV_RT=${rt_token}`);
    console.log('------------------\n');
  }

  const settingsDir = path.join(process.cwd(), '.vscode');
  const settingsPath = path.join(settingsDir, 'settings.local.json');
  fs.mkdirSync(settingsDir, { recursive: true });
  fs.writeFileSync(settingsPath, JSON.stringify({ at_token, rt_token }, null, 2));
}

void bootstrap();
