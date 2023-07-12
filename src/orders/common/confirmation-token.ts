import { JWT } from '~/common/jwt/jwt';
import { CreateConfirmationTokenDto } from '../dto/update.dto';
import { ConfirmationTokenPayload } from '../orders.service';
import { OrdersCommonRepo as Repo } from './orders-common.repo';

export async function confirmationToken(dto: CreateConfirmationTokenDto) {
  const payload: ConfirmationTokenPayload = {
    iss: 'ProntoEntrega',
    sub: `${dto.order_id}`,
    type: 'confirm_delivery',
    items: dto.missing_items,
    ...(await Repo.confirmTokenData(dto)),
  };
  return JWT.signAsync(payload, { expiresIn: '1d' });
}
