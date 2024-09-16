import { fail } from 'assert';
import axios, { AxiosRequestConfig } from 'axios';
import { isDevOrTest } from '~/common/constants/is-dev';

export class AsaasRequests {
  private readonly ASAAS_KEY =
    process.env.ASAAS_KEY ?? fail('ASAAS_KEY must be defined');

  private readonly config: AxiosRequestConfig = {
    baseURL: `https://${isDevOrTest ? 'sandbox' : 'www'}.asaas.com/api/v3`,
    headers: { access_token: this.ASAAS_KEY },
  };

  async get<T>(url: string, key?: string) {
    const config = !key
      ? this.config
      : { ...this.config, headers: { access_token: key } };
    return (await axios.get<T>(url, config)).data;
  }

  async post<T>(url: string, params: any, key?: string) {
    const config = !key
      ? this.config
      : { ...this.config, headers: { access_token: key } };
    return (await axios.post<T>(url, params, config)).data;
  }

  async delete<T>(url: string) {
    return (await axios.delete<T>(url, this.config)).data;
  }
}
