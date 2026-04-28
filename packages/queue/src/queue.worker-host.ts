import { WorkerHost } from '@nestjs/bullmq';
import { Inject } from '@nestjs/common';
import { Job } from 'bullmq';
import { QueueService } from './queue.service';

export abstract class QueueWorkerHost extends WorkerHost {
  @Inject(QueueService)
  protected readonly queueService!: QueueService;

  async process(job: Job) {
    this.queueService.workerActive(job.queueName, job.id, job.name);

    try {
      const result = await this.handle(job);

      this.queueService.workerCompleted(job.queueName, job.id, job.name);
      return result;
    } catch (err) {
      this.queueService.workerFailed(
        job.queueName,
        job.id,
        job.name,
        err as Error,
      );
      throw err;
    }
  }

  protected abstract handle(job: Job);
}
