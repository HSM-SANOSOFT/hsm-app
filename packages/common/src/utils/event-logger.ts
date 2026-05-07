import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class BullEventLogger {
  private readonly logger = new Logger('BullMQ');

  workerActive(queue: string, jobId: string | number, name?: string) {
    this.logger.log(`[${queue}] active jobId=${jobId} name=${name ?? '-'}`);
  }

  workerCompleted(queue: string, jobId: string | number, name?: string) {
    this.logger.log(`[${queue}] completed jobId=${jobId} name=${name ?? '-'}`);
  }

  workerFailed(
    queue: string,
    jobId: string | number,
    name?: string,
    err?: Error,
  ) {
    this.logger.error(
      `[${queue}] failed jobId=${jobId} name=${name ?? '-'} err=${err?.message ?? '-'}`,
      err?.stack,
    );
  }

  queueActive(queue: string, jobId: string, prev?: string) {
    this.logger.log(
      `[${queue}] queue-event active jobId=${jobId} prev=${prev ?? '-'}`,
    );
  }

  queueCompleted(queue: string, jobId: string, prev?: string) {
    this.logger.log(
      `[${queue}] queue-event completed jobId=${jobId} prev=${prev ?? '-'}`,
    );
  }

  queueFailed(
    queue: string,
    jobId: string,
    prev?: string,
    failedReason?: string,
  ) {
    this.logger.error(
      `[${queue}] queue-event failed jobId=${jobId} prev=${prev ?? '-'} reason=${failedReason ?? '-'}`,
    );
  }
}
