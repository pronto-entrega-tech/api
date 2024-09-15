import { readFile } from 'fs/promises';
import { join } from 'path';
import { Role } from '~/auth/constants/roles';
import { STATIC_URL } from '../constants/urls';

async function otp(code: string, time: number, link: string, role: Role) {
  const type = {
    [Role.Admin]: 'admin',
    [Role.Market]: 'mercado',
    [Role.MarketSub]: 'secundária de mercado',
  }[role];

  const emailPath = join(__dirname, './otp.html');
  const file = await readFile(emailPath, 'utf8');

  return file
    .replace('$CODE', code)
    .replace('$TYPE', type ? ` ${type}` : '')
    .replace('$TIME', time.toString())
    .replace('$LINK', link)
    .replace('$STATIC_URL', STATIC_URL)
    .replace('$YEAR', new Date().getFullYear().toString());
}

export const EmailHtml = { otp };
