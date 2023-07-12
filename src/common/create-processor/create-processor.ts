import { Worker, Job } from 'bullmq';
import { ClassConstructor, plainToInstance } from 'class-transformer';
import { validateOrReject } from 'class-validator';
import { QueueName } from '~/common/constants/queue-names';

export const createProcessor = <T extends ClassConstructor<any>>(
  name: QueueName,
  opts: { dataSchema: T },
  fn: (job: Job<InstanceType<T>>) => any,
) => {
  new Worker(name, async (job: Job) => {
    job.data = plainToInstance(opts.dataSchema, job.data);
    validateOrReject(job.data);

    await fn(job);
  });
};

/* createProcessor(
  QueueName.ConfirmInvoice,
  { dataSchema: ConfirmInvoiceJobDto },
  (job) => confirmInvoice(job.data),
); */
