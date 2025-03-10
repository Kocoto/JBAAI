import { hash, compareSync } from "bcrypt";

export const hashPassword = async (password: string): Promise<string> => {
  const saltRounds = 10;
  const hashedPassword = await hash(password, saltRounds);
  return hashedPassword;
};

export const comparePasswords = (
  password: string,
  hashedPassword: string
): boolean => {
  return compareSync(password, hashedPassword);
};
