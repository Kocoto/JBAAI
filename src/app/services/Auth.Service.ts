// Authentication related models
import UserModel, { IUser } from "../models/User.Model";
import TokenModel from "../models/Token.Model";
import OtpModel from "../models/OTP.Model";
import SubscriptionModel from "../models/Subscription.Model";

// Error handling and utilities
import CustomError from "../utils/Error.Util";
import { sendMail } from "../utils/Mail.Util";

// Authentication utilities
import { compareOtp, generateOTP, hashOtp } from "../utils/OTP.Util";
import { hashPassword, comparePasswords } from "../utils/Password.Util";
import {
  accessTokenGenerator,
  refreshTokenGenerator,
  TokenPayload,
  verifyToken,
  verifyTokenToLogout,
} from "../utils/Token.Util";

// Date handling
import { parseISO } from "date-fns";

// Related services
import InvitationService from "./Invitation.Service";
import InvitationCodeService from "./InvitationCode.Service";
import ProfileService from "./Profile.Service";
import SubscriptionService from "./Subscription.Service";
import mongoose from "mongoose";
import { FranchiseDetailsModel } from "../models/FranchiseDetails.Model";
import axios from "axios";
import RingService from "./Ring.Service";

class AuthService {
  /**
   * Handle invitation code logic within a transaction
   * @private
   */
  private async _handleInvitationFlow(
    invitationCode: string,
    newUser: any, // Should define an interface for User document
    session: mongoose.ClientSession
  ) {
    // 1. Check and get invitation code info
    const invitationCodeInfo = await InvitationCodeService.checkCode(
      invitationCode,
      session
    );

    if (!invitationCodeInfo) {
      throw new CustomError(400, "Invalid or expired invitation code.");
    }

    // 2. Create invitation record
    await InvitationService.createInvitation(
      invitationCode,
      newUser._id,
      session
    );

    // 3. Activate gift package/subscription
    if (!invitationCodeInfo.packageId) {
      throw new CustomError(400, "Invitation code missing packageId");
    }
    await SubscriptionService.handleSuccessfulPaymentAndActivateSubscription(
      newUser._id,
      invitationCodeInfo.packageId.toString(),
      session
    );

    // 4. Update new user status
    newUser.isSubscription = true;
    newUser.discount = true;
    newUser.type = "standard"; // Or based on package info

    // 5. Handle franchise hierarchy logic
    if (invitationCodeInfo.codeType === "FRANCHISE_HIERARCHY") {
      const parentFranchiseDetails = await FranchiseDetailsModel.findOne({
        // _id field is clearer than userId on invitation code
        _id: invitationCodeInfo.userId,
      }).session(session);

      const parentFranchiseLevel = parentFranchiseDetails?.franchiseLevel ?? 0;
      const newFranchiseLevel = parentFranchiseLevel + 1;
      console.log("parentFranchiseId", invitationCodeInfo.userId);
      const newFranchiseDetails = await FranchiseDetailsModel.create(
        [
          {
            userId: newUser._id,
            parentId: invitationCodeInfo.userId,
            franchiseLevel: newFranchiseLevel,
            // Need to build complete ancestorPath if needed
            ancestorPath: [
              ...(parentFranchiseDetails?.ancestorPath || []),
              invitationCodeInfo.userId,
            ],
          },
        ],
        { new: true, session }
      );
      await newFranchiseDetails[0].save({ session });
    }

    // 6. Update invitation code info (important: use session)
    if (invitationCodeInfo.totalCumulativeUses !== undefined) {
      invitationCodeInfo.totalCumulativeUses += 1;
    }
    await UserModel.findByIdAndUpdate(
      newUser._id,
      { role: "franchise" },
      { new: true, session }
    );
    // **MOST IMPORTANT FIX:** Must pass session to save()
    await invitationCodeInfo.save({ session });
  }

  /**
   * Register new user
   */
  async register(
    email: string,
    password: string,
    username: string,
    phone: string,
    role?: string,
    address?: string,
    invitationCode?: string,
    optionEmail?: string
  ) {
    // 1. Hash password before transaction
    const hashedPassword = await hashPassword(password);

    const session = await mongoose.startSession();
    try {
      const result = await session.withTransaction(async (ses) => {
        // 2. Check if User exists (optimized)
        let existingUser;
        if (phone) {
          existingUser = await UserModel.findOne({
            $or: [{ email }, { username }, { phone }],
          }).session(ses);
        } else {
          existingUser = await UserModel.findOne({
            $or: [{ email }, { username }],
          }).session(ses);
        }
        if (existingUser) {
          let message = "Registration information already exists.";
          if (existingUser.email === email)
            message = "This email is already in use.";
          if (existingUser.username === username)
            message = "This username is already in use.";
          if (phone && existingUser.phone === phone)
            message = "This phone number is already in use.";
          throw new CustomError(409, message, true);
        }

        // 3. Create userData object
        const userData: any = {
          username,
          email,
          phone: !phone || phone === "" ? null : phone,
          role: role || "user",
          password: hashedPassword,
          ...(optionEmail && { optionEmail }), // Cleaner syntax
          ...(address && { address }),
        };

        // 4. Create new User
        const createdUsers = await UserModel.create([userData], {
          session: ses,
        });
        const newUser = createdUsers[0];

        // 5. Handle invitation flow if exists (separate function)
        if (invitationCode) {
          await this._handleInvitationFlow(invitationCode, newUser, ses);
        }

        console.log("newUser", newUser);

        // 6. Create Profile (always execute)
        await ProfileService.createProfile(
          newUser._id.toString(),
          {
            height: 0,
            weight: 0,
            age: 0,
            gender: "",
            smokingStatus: 0,
          },
          ses
        );

        // 7. Save all changes on newUser once at the end
        // This ensures changes from _handleInvitationFlow are also saved
        await newUser.save({ session: ses });
        if (!newUser || !newUser._id) {
          throw new CustomError(
            500,
            "Failed to create user or userId is missing"
          );
        }
        await RingService.createRing(
          {
            userId: newUser._id,
            calories: 0,
            steps: 0,
            step_length: 0,
            duration: 0,
          },
          ses
        );

        return newUser;
      });

      return result;
    } catch (error) {
      // Throw handled errors
      if (error instanceof CustomError) throw error;

      // Catch other errors and wrap them
      const message = error instanceof Error ? error.message : String(error);
      console.error("Registration Error:", message, error); // Log error for debugging
      throw new CustomError(
        500,
        `System error during registration: ${message}`
      );
    } finally {
      // Always close session after completion
      await session.endSession();
    }
  }

  async login(email: string, password: string, clientId: string) {
    // Start a transaction to ensure integrity
    const session = await mongoose.startSession();
    try {
      const result = await session.withTransaction(async (ses) => {
        // 1. Find user
        const user = await UserModel.findOne({
          $or: [
            { email: { $regex: new RegExp(`^${email}$`, "i") } },
            { username: { $regex: new RegExp(`^${email}$`, "i") } },
          ],
        }).session(ses); // Add session to query

        if (!user) {
          throw new CustomError(400, "Invalid email or password");
        }

        // 2. Validate password
        const isPasswordValid = await comparePasswords(password, user.password);
        if (!isPasswordValid) {
          throw new CustomError(400, "Invalid email or password");
        }

        // 3. Sync status with JBA if needed
        if (user.typeLogin?.type === "jba" && user.typeLogin?.id) {
          try {
            // Call JBA API to get latest status
            const response = await axios.get(
              `https://jbabrands.com/wp-json/jba/v1/member-info/${user.typeLogin.id}`,
              { timeout: 5000 } // Set timeout to avoid long waits
            );

            const jbaData = response.data;
            const isJbaPremium =
              jbaData?.role === "silver" || jbaData?.role === "gold";

            // FIXED LOGIC: Only UPGRADE, never DOWNGRADE
            // Only upgrade if JBA is premium AND current user is not premium
            if (isJbaPremium && !user.isSubscription) {
              console.log(
                `Upgrading user ${user.email} to premium based on JBA status.`
              );
              user.isSubscription = true;
              user.type = "premium";

              // Save changes to DB. Need AWAIT!
              await user.save({ session: ses });
            }
          } catch (apiError: any) {
            // If JBA API fails, just log and allow user to login normally
            // Don't disrupt user experience
            console.error(
              `Failed to sync status for user ${user.email} from JBA. Error:`,
              apiError.message
            );
          }
        }

        // 4. Generate tokens
        const [refreshToken, accessToken] = await Promise.all([
          refreshTokenGenerator(String(user._id), clientId),
          accessTokenGenerator(String(user._id), clientId),
        ]);

        // 5. Save token to DB
        await TokenModel.findOneAndUpdate(
          { userId: user._id, clientId: clientId },
          {
            token: refreshToken,
            status: "active",
            expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          },
          { new: true, upsert: true, session: ses } // Add session
        );

        // 6. Get profile and return result
        const profile = await ProfileService.getProfile(
          user._id.toString(),
          ses
        );

        // Use lean() to get plain object, avoid returning Mongoose methods
        const finalUser = await UserModel.findById(user._id).session(ses);
        const ring = await RingService.getRing(user._id, ses);
        return { user: finalUser, accessToken, refreshToken, profile, ring };
      });

      return result;
    } catch (error) {
      if (error instanceof CustomError) throw error;
      console.error("Login failed:", error);
      throw new CustomError(500, "An error occurred during login.");
    } finally {
      // Always end session
      await session.endSession();
    }
  }

  async refreshAccessToken(refreshToken: string, clientId: string) {
    try {
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
        throw new CustomError(401, "Invalid or expired refresh token");
      }

      // Generate new tokens
      const accessToken = accessTokenGenerator(decoded.userId, clientId);
      const refreshTokenNew = refreshTokenGenerator(decoded.userId, clientId);

      // Update refresh token in database
      await TokenModel.findOneAndUpdate(
        { userId: decoded.userId, clientId: clientId },
        {
          token: refreshTokenNew,
          status: "active",
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        },
        { upsert: true, new: true }
      );

      return {
        accessToken,
        refreshToken: refreshTokenNew,
      };
    } catch (error) {
      if (error instanceof CustomError) throw error;
      throw new CustomError(401, "Invalid or expired refresh token");
    }
  }

  async logout(refreshToken: string, clientId: string) {
    try {
      const decoded = verifyTokenToLogout(refreshToken, true) as TokenPayload;
      await TokenModel.deleteOne({
        userId: decoded.userId,
        token: refreshToken,
        clientId: clientId,
      });
      return { message: "Logout successful" };
    } catch (error) {
      if (error instanceof CustomError) throw error;
      throw new CustomError(500, error as string);
    }
  }

  async resetPassword(email: string, password: string) {
    try {
      // Validate input
      if (!email || !password) {
        throw new CustomError(400, "Email and password are required");
      }

      // Find user and verify OTP status
      const [user] = await Promise.all([UserModel.findOne({ email: email })]);

      if (!user) {
        throw new CustomError(400, "User not found");
      }

      // Hash new password
      const hashedPassword = await hashPassword(password);

      const updatedUser = await UserModel.findOneAndUpdate(
        { email: email },
        { password: hashedPassword },
        { new: true }
      );

      if (!updatedUser) {
        throw new CustomError(500, "Password update failed");
      }

      await TokenModel.deleteMany({ userId: user._id });

      return {
        message: "Password reset successful",
        email: updatedUser.email,
      };
    } catch (error) {
      if (error instanceof CustomError) throw error;
      throw new CustomError(500, error as string);
    }
  }

  async changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string
  ) {
    try {
      const user = await UserModel.findById(userId);

      if (!user) {
        throw new CustomError(404, "User not found");
      }
      const isPasswordValid = await comparePasswords(
        currentPassword,
        user.password
      );

      if (!isPasswordValid) {
        throw new CustomError(400, "Current password is incorrect");
      }

      const hashedPassword = await hashPassword(newPassword);

      const updatedUser = await UserModel.findOneAndUpdate(
        { _id: userId },
        { password: hashedPassword },
        { new: true }
      );

      if (!updatedUser) {
        throw new CustomError(500, "Password update failed");
      }

      return {
        message: "Password changed successfully",
      };
    } catch (error) {
      if (error instanceof CustomError) throw error;
      throw new CustomError(500, error as string);
    }
  }

  async loginWithJba(data: any, clientId: string) {
    // Expected data: { id, email, displayName, role }
    const session = await mongoose.startSession();
    try {
      const result = await session.withTransaction(async (ses) => {
        // Find user in your system
        let user = await UserModel.findOne({ email: data.email }).session(ses);
        let profile;

        // Determine if user has premium benefits from JBA
        const isJbaPremium = data.role === "silver" || data.role === "gold";

        if (!user) {
          // SCENARIO 1 & 2: User does NOT exist in system
          console.log(
            `User with email ${data.email} not found. Creating new user.`
          );

          // 1. Prepare data for new user creation
          const newUserPayload = {
            email: data.email,
            username: data.displayName,
            password: await hashPassword(Math.random().toString(36).slice(-8)),
            typeLogin: {
              type: "jba",
              id: data.id,
            },
            // Assign premium status based on JBA role
            type: isJbaPremium ? "premium" : "normal", // or 'regular'
            isSubscription: isJbaPremium,
          };

          // 2. Create new user
          const createdUsers = await UserModel.create([newUserPayload], {
            session: ses,
          });
          user = createdUsers[0];

          // 3. Create profile for new user
          profile = await ProfileService.createProfile(
            user._id.toString(),
            { height: 0, weight: 0, age: 0, gender: "", smokingStatus: 0 },
            ses
          );

          // 4. If premium, call service to create subscription record
          if (isJbaPremium) {
            console.log(
              `Activating premium subscription for new user ${user.email}.`
            );
            // await SubscriptionService.activateJbaSubscription(
            //   user._id.toString(),
            //   data.role,
            //   ses
            // );
          }
        } else {
          // SCENARIO 3, 4, 5, 6: User ALREADY exists in system
          console.log(`User with email ${data.email} found. Processing login.`);

          // SCENARIO 3: Upgrade account
          // Condition: JBA is premium AND current user account is NOT premium
          if (isJbaPremium && !user.isSubscription) {
            console.log(`Upgrading user ${user.email} to premium.`);
            user.type = "premium";
            user.isSubscription = true;

            // Call service to create subscription record
            // await SubscriptionService.activateJbaSubscription(
            //   user._id.toString(),
            //   data.role,
            //   ses
            // );

            // Save changes to DB
            await user.save({ session: ses });
          }

          // Update JBA login info if needed
          user.typeLogin = { type: "jba", id: data.id };
          await user.save({ session: ses });

          // Get existing profile info
          profile = await ProfileService.getProfile(user._id.toString(), ses);
        }

        // --- COMMON STEPS FOR BOTH CASES ---

        // 5. Generate Access Token and Refresh Token
        const [refreshToken, accessToken] = await Promise.all([
          refreshTokenGenerator(String(user._id), clientId),
          accessTokenGenerator(String(user._id), clientId),
        ]);

        // 6. Save (or update) Refresh Token to DB
        await TokenModel.findOneAndUpdate(
          { userId: user._id, clientId: clientId },
          {
            token: refreshToken,
            status: "active",
            expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          },
          { new: true, upsert: true, session: ses }
        );

        // 7. Return necessary data
        // Get user from DB again to ensure data is latest after all operations
        const finalUser = await UserModel.findById(user._id)
          .lean()
          .session(ses);

        return { user: finalUser, accessToken, refreshToken, profile };
      });

      return result;
    } catch (error) {
      console.error("Login with JBA failed:", error);
      if (error instanceof CustomError) throw error;
      throw new CustomError(
        500,
        "An unexpected error occurred during JBA login."
      );
    } finally {
      await session.endSession();
    }
  }
}
export default new AuthService();
