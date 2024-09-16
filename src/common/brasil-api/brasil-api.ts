import axios from "axios";
import { NotFoundError } from "../errors/not-found";

const client = axios.create({
  baseURL: "https://brasilapi.com.br/api",
});

export const BrasilApi = {
  async cep(postalCode: string) {
    const url = `/cep/v1/${postalCode}`;
    const res = await client.get(url).catch(() => {
      throw new NotFoundError("Postal Code");
    });
    return res.data as {
      street: string;
      neighborhood: string;
      city: string;
      state: string;
    };
  },

  async cnpj(document: string) {
    const url = `/cnpj/v1/${document}`;
    const res = await client.get(url).catch(() => {
      throw new NotFoundError("Document");
    });
    return res.data as {
      razao_social: string;
      ddd_telefone_1: number;
      logradouro: string;
      numero: string;
      bairro: string;
      municipio: string;
      uf: string;
      complemento: string;
      cep: number;
    };
  },
};
