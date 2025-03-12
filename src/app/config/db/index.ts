import * as mongoose from "mongoose";

console.log(
  ("đây là log dòng số 4 trong file config của mongodb để kiếm tra biến env " +
    process.env.MONGODB_URI) as string
);
export async function connect() {
  try {
    await mongoose.connect(process.env.MONGODB_URI as string);
    console.log("Truy cập DB thành công!");
  } catch (error) {
    console.log("Truy cập DB thất bại!!!!");
  }
}
