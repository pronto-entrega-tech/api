import { describe, it, expect } from "vitest";
import { otpEmail } from "./otp-email";
import { format } from "util";
import { Role } from "../constants/roles";

type Params = Parameters<typeof otpEmail>[0];
type Return = Awaited<ReturnType<typeof otpEmail>>;

type Input = Pick<Params, "role"> & { adminExist?: boolean };
type Output = Return;

const email = "name@email.com";
const key = "key";
const fakeKey = "fakeKey";

const assert = (i: Input, o: Output) => async () => {
  const res = await otpEmail(
    { email, ...i },
    {
      fakeKey: () => fakeKey,
      adminExist: async () => !!i.adminExist,
      createOtpHash: async (otp) => otp,
      saveOtp: async () => ({ otp_id: key }),
      sendMail: async () => void 0,
    },
  );

  expect(res).toEqual(o);
};

const from = (i: Input) => ({
  to: (o: Output) => [format("%o => %o", i, o), assert(i, o)] as const,
});

describe(otpEmail.name, () => {
  it(...from({ role: Role.Admin, adminExist: true }).to({ key }));
  it(...from({ role: Role.Admin, adminExist: false }).to({ key: fakeKey }));
  it(...from({ role: Role.Customer }).to({ key }));
  it(...from({ role: Role.Market }).to({ key }));
});
