import { envs } from '@hsm/config';
import { InternalServerErrorException, Module } from '@nestjs/common';
import nodemailer from 'nodemailer';
import { DocsModule } from '../../docs/docs.module';
import { TemplateModule } from '../template/template.module';
import { EmailService } from './email.service';
@Module({
  imports: [TemplateModule, DocsModule],
  providers: [
    EmailService,
    {
      provide: 'SMTP_CLIENT',
      useFactory: async () => {
        const transporter = nodemailer.createTransport({
          host: envs.SMTP_ADDRESS,
          port: envs.SMTP_PORT,
          auth: {
            user: envs.SMTP_USERNAME,
            pass: envs.SMTP_PASSWORD,
          },
          secure: envs.SMTP_SECURE,
        });

        await transporter.verify().catch(error => {
          throw new InternalServerErrorException('Email Module', error);
        });
        return transporter;
      },
    },
  ],
  exports: [EmailService],
})
export class EmailModule {}
