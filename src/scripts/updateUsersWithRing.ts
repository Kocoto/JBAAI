import mongoose from "mongoose";
import UserModel from "../app/models/User.Model"; // Đảm bảo bạn có model User

import RingModel from "../app/models/Ring.Model";

const updateUsersWithRing = async () => {
  try {
    // Kết nối tới MongoDB
    await mongoose.connect(
      "mongodb+srv://JBAAI:I08kTxvZbKvfl9@production.ti0uwda.mongodb.net/production?retryWrites=true&w=majority&appName=Production"
    );

    console.log("Đã kết nối tới MongoDB");

    // Lấy tất cả user
    const users = await UserModel.find();

    for (const user of users) {
      // Kiểm tra nếu user đã có Ring thì bỏ qua
      const existingRing = await RingModel.findOne({ userId: user._id });
      if (!existingRing) {
        // Tạo Ring mới với giá trị mặc định
        await RingModel.create({
          userId: user._id,
          calories: 0,
          steps: 0,
          step_length: 0,
          duration: 0,
        });
        console.log(`Đã tạo Ring cho user: ${user._id}`);
      }
    }

    console.log("Hoàn thành cập nhật Ring cho tất cả user");
  } catch (error) {
    console.error("Lỗi khi cập nhật Ring:", error);
  } finally {
    // Đóng kết nối MongoDB
    await mongoose.disconnect();
  }
};

updateUsersWithRing();
