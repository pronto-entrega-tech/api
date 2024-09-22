import { Worker, Job } from "bullmq";
import { ClassConstructor, plainToInstance } from "class-transformer";
import { validateOrReject } from "class-validator";
import { QueueName } from "~/common/constants/queue-names";

export const createProcessor = <T extends object>(
  name: QueueName,
  opts: { dataSchema: ClassConstructor<T> },
  fn: (job: Job<T>) => unknown,
) => {
  new Worker<T>(name, async (job) => {
    job.data = plainToInstance(opts.dataSchema, job.data);
    await validateOrReject(job.data);

    await fn(job);
  });
};

/* createProcessor(
  QueueName.ConfirmInvoice,
  { dataSchema: ConfirmInvoiceJobDto },
  (job) => confirmInvoice(job.data),
); */
