import UserModel from "../models/User.Model";
import CustomError from "../utils/Error.Util";

class UserService {
  async getUserById(userId: string) {
    const user = await UserModel.findById(userId);
    if (!user) {
      throw new CustomError(404, "User not found");
    }
    return user;
  }
}

export default new UserService();
