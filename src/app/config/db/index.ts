import * as mongoose from "mongoose";

export async function connect() {
  try {
    await mongoose.connect(process.env.MONGODB_URI as string);

    console.log("Truy cập DB thành công!");
  } catch (error) {
    console.log("Truy cập DB thất bại!!!!");
  }
}
