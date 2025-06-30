import { compareSync, hash, compare } from "bcrypt";

export const generateOTP = (length = 6) => {
  const characters = "0123456789";
  let otp = "";
  for (let i = 0; i < length; i++) {
    otp += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  return otp;
};

export const hashOtp = async (otp: string): Promise<string> => {
  const saltRounds = 10;
  const hashedOtp = await hash(otp, saltRounds);
  return hashedOtp;
};

export const compareOtp = async (
  otp: string,
  hashedOtp: string
): Promise<boolean> => {
  const isMatch = await compare(otp, hashedOtp);
  return isMatch;
};

export const generateInviteCode = () => {
  const characters = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let inviteCode = "";
  for (let i = 0; i < 6; i++) {
    inviteCode += characters.charAt(
      Math.floor(Math.random() * characters.length)
    );
  }
  return inviteCode;
};
