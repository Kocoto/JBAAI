import * as mongoose from "mongoose";

export async function connect() {
  try {
    await mongoose.connect(process.env.MONGODB_URI as string);
    console.log(
      "Đây là log dòng số 6 của trang config DB để kiểm tra url mongodb: " +
        process.env.MONGODB_URI
    );
    console.log("Truy cập DB thành công!");
  } catch (error) {
    console.log("Truy cập DB thất bại!!!!");
  }
}
