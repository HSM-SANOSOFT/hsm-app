import { Readable } from 'node:stream';
import { SendEmailJobDto } from '@hsm/common/dtos';
import {
  DocumentStatusEnum,
  EmailBatchStatusEnum,
  EmailRecipientStatusEnum,
} from '@hsm/common/enums';
import {
  DocumentsEntity,
  EmailBatchEntity,
  EmailRecipientEntity,
} from '@hsm/database/entities';
import { DatabasesEnum } from '@hsm/database/sources';
import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Attachment } from 'nodemailer/lib/mailer';
import { In, Repository } from 'typeorm';
import { DocsService } from '../../docs/docs.service';
import { TemplatesService } from '../../templates/templates.service';
import { SmtpTransportProvider } from './smtp-transport.provider';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);

  constructor(
    private readonly smtpTransport: SmtpTransportProvider,
    private readonly templateService: TemplatesService,
    private readonly docsService: DocsService,
    @InjectRepository(EmailBatchEntity, DatabasesEnum.HsmDbPostgres)
    private readonly batchRepo: Repository<EmailBatchEntity>,
    @InjectRepository(EmailRecipientEntity, DatabasesEnum.HsmDbPostgres)
    private readonly recipientRepo: Repository<EmailRecipientEntity>,
    @InjectRepository(DocumentsEntity, DatabasesEnum.HsmDbPostgres)
    private readonly docsRepo: Repository<DocumentsEntity>,
  ) {}

  async sendEmail(payload: SendEmailJobDto): Promise<void> {
    // Load batch with recipients
    const batch = await this.batchRepo.findOne({
      where: { id: payload.batchId },
      relations: { recipients: true },
    });
    if (!batch) throw new Error(`EmailBatch ${payload.batchId} not found`);

    // Mark batch as PROCESSING
    await this.batchRepo.update(payload.batchId, {
      overallStatus: EmailBatchStatusEnum.PROCESSING,
    });

    // Select recipients: single (resend) or all PENDING/FAILED
    let recipients = batch.recipients;
    if (payload.recipientId) {
      recipients = recipients.filter(r => r.id === payload.recipientId);
    } else {
      recipients = recipients.filter(
        r =>
          r.status === EmailRecipientStatusEnum.PENDING ||
          r.status === EmailRecipientStatusEnum.FAILED,
      );
    }

    if (recipients.length === 0) {
      this.logger.warn(`No targetable recipients for batch ${payload.batchId}`);
      return;
    }

    // Resolve document attachments
    const attachments = await this.resolveDocumentAttachments(
      batch.documentIds ?? [],
    );

    // Parse template
    const { subject, html } = await this.templateService.parseEmail(
      batch.templateId!,
      batch.data as Record<string, unknown>,
    );

    try {
      // Send — resolve the transporter from the live-config provider, which
      // rebuilds it when SMTP settings have changed.
      const smtpClient = await this.smtpTransport.getTransporter();
      const result = await smtpClient.sendMail({
        from: batch.fromEmail,
        to: recipients.map(r => r.toEmail),
        subject,
        html,
        attachments,
      });

      // Update recipient rows to SENT in a single bulk UPDATE
      const now = new Date();
      await this.recipientRepo.update(
        { id: In(recipients.map(r => r.id)) },
        { status: EmailRecipientStatusEnum.SENT, sentAt: now },
      );

      // Update batch providerMessageId and aggregate overallStatus
      const allRecipients = await this.recipientRepo.find({
        where: { batch: { id: payload.batchId } },
      });
      const overallStatus = this.computeOverallStatus(allRecipients);
      await this.batchRepo.update(payload.batchId, {
        overallStatus,
        providerMessageId: result.messageId,
      });

      this.logger.log(
        `Email sent to ${recipients.map(r => r.toEmail).join(', ')}, messageId: ${result.messageId}`,
      );
    } catch (err) {
      // Update failed recipients in a single bulk UPDATE
      const errorMessage = err instanceof Error ? err.message : String(err);
      await this.recipientRepo.update(
        { id: In(recipients.map(r => r.id)) },
        { status: EmailRecipientStatusEnum.FAILED, errorMessage },
      );

      // Recompute batch status
      const allRecipients = await this.recipientRepo.find({
        where: { batch: { id: payload.batchId } },
      });
      await this.batchRepo.update(payload.batchId, {
        overallStatus: this.computeOverallStatus(allRecipients),
      });

      throw err; // BullMQ will retry
    }
  }

  private computeOverallStatus(
    recipients: EmailRecipientEntity[],
  ): EmailBatchStatusEnum {
    const sentCount = recipients.filter(
      r =>
        r.status === EmailRecipientStatusEnum.SENT ||
        r.status === EmailRecipientStatusEnum.DELIVERED,
    ).length;
    const failedCount = recipients.filter(
      r => r.status === EmailRecipientStatusEnum.FAILED,
    ).length;
    const total = recipients.length;

    if (sentCount === total) return EmailBatchStatusEnum.SENT;
    if (failedCount === total) return EmailBatchStatusEnum.FAILED;
    if (sentCount > 0) return EmailBatchStatusEnum.PARTIAL;
    return EmailBatchStatusEnum.PENDING;
  }

  private async resolveDocumentAttachments(
    documentIds: string[],
  ): Promise<Attachment[]> {
    if (!documentIds.length) return [];

    // Fetch every requested document in one query, then resolve attachments
    // from the in-memory map (avoids an N+1 findOne per document id).
    const docs = await this.docsRepo.find({
      where: { id: In(documentIds) },
      relations: { versions: { storage: true } },
    });
    const docsById = new Map(docs.map(d => [d.id, d]));

    const attachments: Attachment[] = [];
    for (const docId of documentIds) {
      const doc = docsById.get(docId);

      if (!doc) {
        throw new Error(`Document ${docId} not found`);
      }

      if (doc.status !== DocumentStatusEnum.COMPLETED) {
        throw new Error(
          `Document ${docId} is not ready (status: ${doc.status})`,
        );
      }

      const latestVersion = doc.versions
        ?.slice()
        .sort((a, b) => b.version - a.version)[0];
      if (!latestVersion?.storage) {
        throw new Error(`No storage found for document ${docId}`);
      }

      const { folderName, fileId } = this.splitStoragePath(
        latestVersion.storage.path,
      );
      const streams = await this.docsService.getDocumentsStreams({
        documents: [
          {
            bucket: latestVersion.storage.bucket,
            files: [{ folderName, fileInfo: { fileId } }],
          },
        ],
      });

      for (const docStream of streams) {
        for (const file of docStream.files) {
          if (!file.fileStream) continue;
          attachments.push({
            filename: doc.title ?? file.fileId,
            content: Readable.from(file.fileStream.transformToWebStream()),
            contentType: latestVersion.mimeType ?? file.fileContentType,
          });
        }
      }
    }
    return attachments;
  }

  private splitStoragePath(path: string): {
    folderName: string;
    fileId: string;
  } {
    const parts = path.split('/');
    const fileId = parts[parts.length - 1];
    const folderName = parts.slice(0, -1).join('/');
    return { folderName, fileId };
  }
}
