import * as jwt from "jsonwebtoken";

export const accessTokenGenerator = (userId: string, clientId: string) => {
  return jwt.sign({ userId, clientId }, process.env.ACCESS_TOKEN_SECRET!, {
    expiresIn: "1h",
  });
};

export const refreshTokenGenerator = (userId: string, clientId: string) => {
  return jwt.sign({ userId, clientId }, process.env.REFRESH_TOKEN_SECRET!, {
    expiresIn: "7d",
  });
};

export const verifyToken = (token: string) => {
  return jwt.verify(token, process.env.ACCESS_TOKEN_SECRET!);
};
