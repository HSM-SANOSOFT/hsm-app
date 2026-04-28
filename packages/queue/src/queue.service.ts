import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class QueueService {
  private readonly logger = new Logger('BullMQ');

  private normalizeJobId(jobId: string | number | undefined): string {
    return jobId === undefined ? 'unassigned' : jobId.toString();
  }

  workerActive(
    queue: string,
    jobId: string | number | undefined,
    name?: string,
  ) {
    this.logger.log(
      `[${queue}] active jobId=${this.normalizeJobId(jobId)} name=${name ?? '-'}`,
    );
  }

  workerCompleted(
    queue: string,
    jobId: string | number | undefined,
    name?: string,
  ) {
    this.logger.log(
      `[${queue}] completed jobId=${this.normalizeJobId(jobId)} name=${name ?? '-'}`,
    );
  }

  workerFailed(
    queue: string,
    jobId: string | number | undefined,
    name?: string,
    err?: Error,
  ) {
    this.logger.error(
      `[${queue}] failed jobId=${this.normalizeJobId(jobId)} name=${name ?? '-'} err=${err?.message ?? '-'}`,
      err?.stack,
    );
  }

  queueActive(
    queue: string,
    jobId: string | number | undefined,
    prev?: string,
  ) {
    this.logger.log(
      `[${queue}] queue-event active jobId=${this.normalizeJobId(jobId)} prev=${prev ?? '-'}`,
    );
  }

  queueCompleted(
    queue: string,
    jobId: string | number | undefined,
    prev?: string,
  ) {
    this.logger.log(
      `[${queue}] queue-event completed jobId=${this.normalizeJobId(jobId)} prev=${prev ?? '-'}`,
    );
  }

  queueFailed(
    queue: string,
    jobId: string | number | undefined,
    prev?: string,
    failedReason?: string,
  ) {
    this.logger.error(
      `[${queue}] queue-event failed jobId=${this.normalizeJobId(jobId)} prev=${prev ?? '-'} reason=${failedReason ?? '-'}`,
    );
  }
}
