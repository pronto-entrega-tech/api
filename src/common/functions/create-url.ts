import { PRONTO_ENTREGA } from '../constants/urls';

export const CreateUrl = {
  verificationCode: (id: string, code: string) =>
    `${PRONTO_ENTREGA}/entrar/validar-codigo?key=${id}&authCode=${code}`,
};
