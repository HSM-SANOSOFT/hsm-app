import { Readable } from 'node:stream';
import { SendEmailPayloadDto } from '@hsm/common/dtos';
import { Inject, Injectable, Logger } from '@nestjs/common';
import nodemailer from 'nodemailer';
import { Attachment } from 'nodemailer/lib/mailer';
import { DocsService } from '../../docs/docs.service';
import { TemplatesService } from '../../templates/templates.service';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  constructor(
    @Inject('SMTP_CLIENT') private readonly smtpClient: nodemailer.Transporter,
    private readonly templateService: TemplatesService,
    private readonly docsService: DocsService,
  ) {}

  async sendEmail(payload: SendEmailPayloadDto) {
    const { subject, html } = await this.templateService.parseEmail(
      payload.emailTemplate,
      payload.data as Record<string, unknown>,
    );

    const { documents } = payload;
    const attachments: Attachment[] = [];

    if (documents?.length) {
      const documentStream = await this.docsService.getDocumentsStreams({
        documents,
      });

      for (const doc of documentStream) {
        for (const file of doc.files) {
          if (!file.fileStream) {
            this.logger.error(`File stream for ${file.fileId} is undefined`);
            throw new Error(`File stream for ${file.fileId} is undefined`);
          }

          const fileContent = Readable.from(
            file.fileStream.transformToWebStream(),
          );

          const attachment = {
            filename: file.fileId,
            content: fileContent,
            contentType: file.fileContentType,
          };

          this.logger.debug(
            `Attachment added: name: ${attachment.filename}, type: ${attachment.contentType}, content: `,
          );

          attachments.push(attachment);
        }
      }
    }

    const mailOptions: nodemailer.SendMailOptions = {
      from: payload.fromEmail,
      to: payload.toEmails,
      subject,
      html,
      attachments,
    };

    this.logger.log(
      `Sending email to: ${mailOptions.to}, subject: ${mailOptions.subject}, attachments: ${attachments.length}`,
    );

    return await this.smtpClient.sendMail(mailOptions);
  }
}
