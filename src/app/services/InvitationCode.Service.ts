import mongoose from "mongoose";
import InvitationCodeModel from "../models/InvitationCode.Model";
import CustomError from "../utils/Error.Util";
import { generateInviteCode, generateOTP } from "../utils/OTP.Util";

class InvitationCodeService {
  async createInvitationCode(
    userId: string,
    code: string,
    codeType: string,
    session?: mongoose.ClientSession
  ) {
    const MAX_RETRIES = 3; // Số lần thử lại tối đa

    for (let i = 0; i < MAX_RETRIES; i++) {
      const otp = generateOTP(4); // Tăng độ dài OTP để giảm xác suất trùng
      const validCode = code + otp;

      try {
        // Cứ thử tạo luôn, không cần kiểm tra trước
        const newCode = await InvitationCodeModel.create(
          [
            {
              code: validCode,
              userId: userId,
              codeType,
            },
          ],
          { session }
        );
        // Nếu tạo thành công, thoát khỏi vòng lặp và trả về kết quả
        return newCode[0].code;
      } catch (error: any) {
        // Chỉ bắt lỗi vi phạm unique key (mã lỗi của MongoDB là 11000)
        if (error.code === 11000) {
          // Nếu đây là lần thử cuối cùng mà vẫn thất bại, hãy ném lỗi ra ngoài
          if (i === MAX_RETRIES - 1) {
            console.error(
              `Đã thử ${MAX_RETRIES} lần nhưng không thể tạo được mã mời duy nhất.`
            );
            throw new CustomError(
              500,
              "Không thể tạo mã mời duy nhất, vui lòng thử lại sau."
            );
          }
          // Nếu chưa phải lần cuối, vòng lặp sẽ tiếp tục để thử lại với mã mới
          console.warn(`Mã mời '${validCode}' bị trùng, đang thử lại...`);
        } else {
          // Nếu là lỗi khác, không phải lỗi trùng key, ném ra ngoài ngay lập tức
          throw error;
        }
      }
    }

    // Dòng này gần như không bao giờ được chạm tới, nhưng để đảm bảo hàm luôn trả về lỗi nếu vòng lặp kết thúc
    throw new CustomError(500, "Đã xảy ra lỗi không mong muốn khi tạo mã mời.");
  }
  async checkCode(code: string) {
    try {
      const checkCode = await InvitationCodeModel.findOne({ code: code });
      if (!checkCode && code !== "AQP FREE15") {
        throw new CustomError(400, "Mã mời không hợp lệ");
      }
      return checkCode;
    } catch (error) {
      if (error instanceof CustomError) throw error;
      throw new CustomError(500, error as string);
    }
  }
  async checkCodeIsInvalid(code: string) {
    try {
      const checkCode = await InvitationCodeModel.findOne({ code: code });
      if (checkCode) {
        throw new CustomError(400, "Mã mời đã tồn tại");
      }
      return true;
    } catch (error) {
      if (error instanceof CustomError) throw error;
      throw new CustomError(500, error as string);
    }
  }
  async getCodeByUserId(userId: string) {
    try {
      const code = await InvitationCodeModel.findOne({ userId: userId });
      return code;
    } catch (error) {
      if (error instanceof CustomError) throw error;
      throw new CustomError(500, error as string);
    }
  }
}

export default new InvitationCodeService();
