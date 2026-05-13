import {
  ListEmailBatchesQueryDto,
  ListEmailRecipientsQueryDto,
  SendEmailJobDto,
  SendEmailPayloadDto,
} from '@hsm/common/dtos';
import { EmailBatchStatusEnum, EmailRecipientStatusEnum } from '@hsm/common/enums';
import { validateAgainstTemplateSchema } from '@hsm/common/utils';
import { EmailBatchEntity, EmailRecipientEntity } from '@hsm/database/entities';
import { DatabasesEnum } from '@hsm/database/sources';
import { QueueEnum } from '@hsm/queue';
import { InjectQueue } from '@nestjs/bullmq';
import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { Queue } from 'bullmq';
import { Between, DataSource, Repository } from 'typeorm';
import { TemplatesService } from '../templates/templates.service';

@Injectable()
export class ComsService {
  constructor(
    @InjectRepository(EmailBatchEntity, DatabasesEnum.HsmDbPostgres)
    private readonly batchRepo: Repository<EmailBatchEntity>,
    @InjectRepository(EmailRecipientEntity, DatabasesEnum.HsmDbPostgres)
    private readonly recipientRepo: Repository<EmailRecipientEntity>,
    @InjectQueue(QueueEnum.Coms) private readonly comsQueue: Queue,
    @InjectDataSource(DatabasesEnum.HsmDbPostgres)
    private readonly dataSource: DataSource,
    private readonly templatesService: TemplatesService,
  ) {}

  async sendEmail(
    dto: SendEmailPayloadDto,
    userId?: string,
  ): Promise<{ batchId: string; jobId: string }> {
    // 1. Resolve template — TemplateNotFoundError extends NotFoundException, propagates as 404
    const templateResult = await this.templatesService.findByIdentifier(
      dto.emailTemplate,
    );

    // 2. Validate data against template schema
    const result = validateAgainstTemplateSchema(
      templateResult.template.schema,
      dto.data,
    );
    if (!result.valid) {
      throw new BadRequestException({
        message: 'Template data validation failed',
        issues: result.issues,
      });
    }

    // 3. Persist batch + recipients atomically
    const savedBatch = await this.dataSource.transaction(async manager => {
      const batch = manager.create(EmailBatchEntity, {
        templateId: templateResult.template.id,
        fromEmail: dto.fromEmail ?? null,
        fromName: dto.fromName ?? null,
        data: dto.data as object,
        documentIds: dto.documentIds ?? null,
        overallStatus: EmailBatchStatusEnum.PENDING,
        createdBy: userId ?? null,
      });
      const persistedBatch = await manager.save(EmailBatchEntity, batch);

      // TODO(U8): add suppression check once EmailSuppressionEntity is available
      for (const toEmail of dto.toEmails) {
        const recipient = manager.create(EmailRecipientEntity, {
          batch: persistedBatch,
          toEmail,
          status: EmailRecipientStatusEnum.PENDING,
        });
        await manager.save(EmailRecipientEntity, recipient);
      }

      return persistedBatch;
    });

    // 4. Enqueue job
    const job = await this.comsQueue.add(
      'send-email',
      { batchId: savedBatch.id } as SendEmailJobDto,
      { attempts: 5, backoff: { type: 'exponential', delay: 5000 } },
    );

    // 5. Persist jobId on batch
    await this.batchRepo.update(savedBatch.id, { jobId: String(job.id) });

    return { batchId: savedBatch.id, jobId: String(job.id) };
  }

  async resendBatch(batchId: string): Promise<{ jobId: string }> {
    // findOneOrFail throws EntityNotFoundError → TypeOrmExceptionFilter → 404
    await this.batchRepo.findOneOrFail({ where: { id: batchId } });

    const job = await this.comsQueue.add(
      'send-email',
      { batchId } as SendEmailJobDto,
      { attempts: 5, backoff: { type: 'exponential', delay: 5000 } },
    );

    await this.batchRepo.update(batchId, {
      jobId: String(job.id),
      overallStatus: EmailBatchStatusEnum.PENDING,
    });

    return { jobId: String(job.id) };
  }

  async resendRecipient(recipientId: string): Promise<{ jobId: string }> {
    const recipient = await this.recipientRepo.findOneOrFail({
      where: { id: recipientId },
      relations: { batch: true },
    });

    const job = await this.comsQueue.add(
      'send-email',
      { batchId: recipient.batch.id, recipientId } as SendEmailJobDto,
      { attempts: 5, backoff: { type: 'exponential', delay: 5000 } },
    );

    return { jobId: String(job.id) };
  }

  async listBatches(query: ListEmailBatchesQueryDto) {
    const { templateId, overallStatus, createdBy, fromDate, toDate } = query;
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: Record<string, any> = {};
    if (templateId) where.templateId = templateId;
    if (overallStatus) where.overallStatus = overallStatus;
    if (createdBy) where.createdBy = createdBy;
    if (fromDate && toDate) {
      where.createdAt = Between(new Date(fromDate), new Date(toDate));
    }

    const [data, total] = await this.batchRepo.findAndCount({
      where,
      skip: (page - 1) * limit,
      take: limit,
      order: { createdAt: 'DESC' },
    });

    return { data, total, page, limit };
  }

  async getBatch(id: string) {
    return this.batchRepo.findOneOrFail({
      where: { id },
      relations: { recipients: true },
    });
  }

  async listRecipients(query: ListEmailRecipientsQueryDto) {
    const { batchId, toEmail, status } = query;
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: Record<string, any> = {};
    if (batchId) where.batch = { id: batchId };
    if (toEmail) where.toEmail = toEmail;
    if (status) where.status = status;

    const [data, total] = await this.recipientRepo.findAndCount({
      where,
      skip: (page - 1) * limit,
      take: limit,
      order: { id: 'ASC' },
    });

    return { data, total, page, limit };
  }

  async getRecipient(id: string) {
    return this.recipientRepo.findOneOrFail({ where: { id } });
  }

  async sendSms() {
    // Implementation pending
  }
}
