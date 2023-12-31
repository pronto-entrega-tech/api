import { Processor, Queue, Worker } from 'bullmq';
import { ClassConstructor, plainToInstance } from 'class-transformer';
import { validateOrReject } from 'class-validator';

export const createQueueDefault = <
  DataSchema extends ClassConstructor<any>,
  ResultType = void,
>(
  queueName: string,
  dataSchema: DataSchema,
) => {
  type DataType = InstanceType<typeof dataSchema>;

  const queue = new Queue<DataType, ResultType>(queueName);

  let worker: Worker<DataType, ResultType>;

  const process = (processor: Processor<DataType, ResultType>) => {
    if (worker)
      throw new Error(`Processor already registered for queue ${queueName}`);

    return (worker = new Worker<DataType, ResultType>(
      queueName,
      async (job) => {
        job.data = plainToInstance(dataSchema, job.data);
        validateOrReject(job.data);

        return processor(job);
      },
      {
        autorun: false,
      },
    ));
  };

  return {
    add: queue.add.bind(queue, 'default'),
    getJob: queue.getJob.bind(queue),
    process,
  };
};

export const createQueueNamed =
  <NameType extends string = string>() =>
  <
    DataSchema extends { [x in NameType]: ClassConstructor<any> },
    ResultType = void,
  >(
    queueName: string,
    dataSchema: DataSchema,
  ) => {
    type DataType = InstanceType<DataSchema[NameType]>;

    const queue = new Queue<DataType, ResultType, NameType>(queueName);

    const processors: {
      [x in NameType]?: Processor<DataType, ResultType, NameType>;
    } = {};

    const worker = new Worker<DataType, ResultType, NameType>(
      queueName,
      async (job) => {
        const processor = processors[job.name];
        if (!processor) throw new Error(`Missing processor of "${job.name}"`);

        job.data = plainToInstance(dataSchema[job.name], job.data);
        validateOrReject(job.data);

        return processor(job);
      },
      { autorun: false },
    );

    const process = <Name extends NameType>(
      name: Name,
      processor: Processor<
        InstanceType<DataSchema[Name]>,
        ResultType,
        NameType
      >,
    ) => {
      processors[name] = processor;
      return worker;
    };

    return {
      add: queue.add.bind(queue),
      getJob: queue.getJob.bind(queue),
      process,
    };
  };
