import { envs } from '@hsm/config';
import {
  EmailBatchEntity,
  EmailRecipientEntity,
} from '@hsm/database/entities';
import { DatabasesEnum } from '@hsm/database/sources';
import { InternalServerErrorException, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import nodemailer from 'nodemailer';
import { DocumentsEntity } from '@hsm/database/entities';
import { DocsModule } from '../../docs/docs.module';
import { TemplatesModule } from '../../templates/templates.module';
import { EmailService } from './email.service';

@Module({
  imports: [
    TemplatesModule,
    DocsModule,
    TypeOrmModule.forFeature(
      [EmailBatchEntity, EmailRecipientEntity, DocumentsEntity],
      DatabasesEnum.HsmDbPostgres,
    ),
  ],
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
