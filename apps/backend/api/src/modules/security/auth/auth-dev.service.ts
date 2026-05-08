import { RolesSystemEnum } from '@hsm/common/enums';
import { envs } from '@hsm/config';
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class AuthDevService implements OnModuleInit {
  private readonly logger = new Logger(AuthDevService.name);

  constructor(private readonly jwtService: JwtService) {}

  async onModuleInit(): Promise<void> {
    if (envs.ENVIRONMENT !== 'dev') {
      return;
    }

    const payload = {
      sub: 'dev',
      username: 'dev',
      email: 'dev@localhost',
      firstName: 'Dev',
      firstLastName: 'User',
      roles: [RolesSystemEnum.Developer],
    };

    const [at_token, rt_token] = await Promise.all([
      this.jwtService.signAsync(payload, {
        expiresIn: '30d',
        secret: envs.JWT_AT_SECRET,
      }),
      this.jwtService.signAsync(payload, {
        expiresIn: '30d',
        secret: envs.JWT_RT_SECRET,
      }),
    ]);

    if (process.stdout.isTTY) {
      this.logger.log(`DEV_AT=${at_token}`);
      this.logger.log(`DEV_RT=${rt_token}`);
    }

    const settingsDir = path.join(process.cwd(), '.vscode');
    const settingsPath = path.join(settingsDir, 'settings.local.json');
    fs.mkdirSync(settingsDir, { recursive: true });
    fs.writeFileSync(
      settingsPath,
      JSON.stringify({ at_token, rt_token }, null, 2),
    );

    this.logger.log('Dev tokens written to .vscode/settings.local.json');
  }
}
