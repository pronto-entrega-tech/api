import { fail } from "assert";
import axios, { AxiosRequestConfig } from "axios";
import { isDevOrTest } from "~/common/constants/is-dev";

export class AsaasRequests {
  private readonly ASAAS_KEY = () =>
    process.env.ASAAS_KEY ?? fail("ASAAS_KEY must be defined");

  private readonly config = (key?: string): AxiosRequestConfig => ({
    baseURL: `https://${isDevOrTest ? "sandbox" : "www"}.asaas.com/api/v3`,
    headers: { access_token: key ?? this.ASAAS_KEY() },
  });

  async get<T>(url: string, key?: string) {
    return (await axios.get<T>(url, this.config(key))).data;
  }

  async post<T>(url: string, params: unknown, key?: string) {
    return (await axios.post<T>(url, params, this.config(key))).data;
  }

  async delete<T>(url: string) {
    return (await axios.delete<T>(url, this.config())).data;
  }
}
