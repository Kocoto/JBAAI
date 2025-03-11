import TokenModel from "../models/Token.Model";
import UserModel, { IUser } from "../models/User.Model";
import CustomError from "../utils/Error.Util";
import { hashPassword, comparePasswords } from "../utils/Password.Util";
import {
  accessTokenGenerator,
  refreshTokenGenerator,
  TokenPayload,
  verifyToken,
} from "../utils/Token.Util";

class AuthService {
  async register(data: IUser) {
    const checkEmail = await UserModel.findOne({ email: data.email });
    if (checkEmail) {
      throw new CustomError(400, "Email already exists");
    }
    const checkUsername = await UserModel.findOne({ username: data.username });
    if (checkUsername) {
      throw new CustomError(400, "Username already exists");
    }
    const hashedPassword = await hashPassword(data.password);
    const user = await UserModel.create({
      ...data,
      password: hashedPassword,
    });
    return user;
  }

  async login(email: string, password: string, clientId: string) {
    const user = await UserModel.findOne({
      $or: [{ email: email }, { username: email }],
    });
    if (!user) {
      throw new CustomError(400, "User or email not found");
    }
    const isPasswordValid = comparePasswords(password, user.password);
    if (!isPasswordValid) {
      throw new CustomError(400, "Invalid password");
    }

    const checkRefreshToken = await TokenModel.findOne({
      userId: user._id,
      clientId: clientId,
    });
    const refreshToken = refreshTokenGenerator(String(user._id), clientId);
    const accessToken = accessTokenGenerator(String(user._id), clientId);
    if (!checkRefreshToken) {
      const token = await TokenModel.create({
        userId: user._id,
        token: refreshToken,
        status: "active",
        clientId: clientId,
      });
      return { user, accessToken, refreshToken };
    }
    const updateRefreshToken = await TokenModel.findOneAndUpdate(
      { userId: user._id, clientId: clientId },
      { token: refreshToken, status: "active" },
      { new: true }
    );

    return { user, accessToken, refreshToken };
  }

  async refreshAccessToken(refreshToken: string, clientId: string) {
    // Verify refresh token
    const decoded = verifyToken(refreshToken, true) as TokenPayload;

    // Check if refresh token exists and is active in database
    const tokenDoc = await TokenModel.findOne({
      userId: decoded.userId,
      clientId: clientId,
      token: refreshToken,
      status: "active",
    });

    if (!tokenDoc) {
      throw new CustomError(401, "Refresh token không hợp lệ hoặc đã hết hạn");
    }

    // Generate new access token
    const accessToken = accessTokenGenerator(decoded.userId, clientId);
    const refreshTokenNew = refreshTokenGenerator(decoded.userId, clientId);

    // Update refresh token in database
    await TokenModel.findOneAndUpdate(
      { userId: decoded.userId, clientId: clientId },
      { token: refreshTokenNew }
    );

    return {
      accessToken,
      refreshToken: refreshTokenNew, // Return existing refresh token
    };
  }

  async logout(userId: string, clientId: string) {
    const token = await TokenModel.findOneAndUpdate(
      { userId: userId, clientId: clientId },
      { status: "inactive" },
      { new: true }
    );
    return token;
  }
}
export default new AuthService();
