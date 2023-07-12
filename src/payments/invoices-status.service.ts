import { ConflictException, HttpStatus, Injectable } from '@nestjs/common';
import { LockedAction } from '~/common/constants/locked-actions';
import { newStateMachine } from '~/common/functions/state-machine';
import { MutexService } from '~/common/mutex/mutex.service';
import { FullInvoiceId } from '~/markets/dto/full-invoice-id';
import { MarketsRepository } from '~/repositories/markets/markets.repository';
import {
  InvoiceAction as Action,
  InvoiceStatus as Status,
} from './constants/invoice-status';

@Injectable()
export class InvoicesStatusService {
  constructor(
    private readonly mutex: MutexService,
    private readonly marketsRepo: MarketsRepository,
  ) {}

  private readonly machine = {
    [Status.Processing]: {
      [Action.ConfirmProcessing]: Status.Pending,
    },
    [Status.Pending]: {
      [Action.ConfirmPayment]: Status.Paid,
    },
    [Status.Paid]: {},
  };
  private readonly stateMachine = newStateMachine(this.machine);

  update(
    fullId: FullInvoiceId,
    action: Action,
    fn: (nextStatus: Status) => any,
  ) {
    return this.mutex.exec(
      LockedAction.UpdateInvoiceStatus,
      `${fullId.invoice_id}`,
      () => this._update(fullId, action, fn),
    );
  }

  private async _update(
    fullId: FullInvoiceId,
    action: Action,
    fn: (nextStatus: Status) => any,
  ) {
    const status = await this.marketsRepo.invoices.status(fullId);

    const nextStatus = this.stateMachine.reduce(status as Status, action);
    if (!nextStatus)
      throw new ConflictException({
        statusCode: HttpStatus.CONFLICT,
        message: `Action ${action} isn't valid, status: ${status}`,
        status,
      });

    await fn(nextStatus);
  }
}
