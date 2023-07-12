import { HttpService } from '@nestjs/axios';
import { fail } from 'assert';
import { AxiosRequestConfig, AxiosResponse } from 'axios';
import { Observable } from 'rxjs';
import { lastValueFrom } from 'rxjs';
import { isDevOrTest } from '~/common/constants/is-dev';

export class AsaasRequests {
  constructor(private readonly http: HttpService) {}
  private readonly ASAAS_KEY =
    process.env.ASAAS_KEY ?? fail('ASAAS_KEY must be defined');
  private readonly config: AxiosRequestConfig = {
    baseURL: `https://${isDevOrTest ? 'sandbox' : 'www'}.asaas.com/api/v3`,
    headers: { access_token: this.ASAAS_KEY },
  };

  private async unwrapData<T>(res: Observable<AxiosResponse<T>>) {
    return (await lastValueFrom(res)).data;
  }

  get<T>(url: string, key?: string) {
    const config = !key
      ? this.config
      : { ...this.config, headers: { access_token: key } };
    return this.unwrapData(this.http.get<T>(url, config));
  }

  post<T>(url: string, params: any, key?: string) {
    const config = !key
      ? this.config
      : { ...this.config, headers: { access_token: key } };
    return this.unwrapData(this.http.post<T>(url, params, config));
  }

  delete<T>(url: string) {
    return this.unwrapData(this.http.delete<T>(url, this.config));
  }
}
