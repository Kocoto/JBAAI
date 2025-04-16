import * as mongoose from "mongoose";
import { Mongoose } from "mongoose";

export async function connect() {
  const mongoUri = process.env.MONGODB_URI;
  if (!mongoUri) {
    console.error("Lỗi: Biến môi trường MONGODB_URI chưa được định nghĩa.");
    throw new Error("MONGODB_URI is not defined in environment variables.");
  }
  try {
    const mongooseInstance: Mongoose = await mongoose.connect(mongoUri, {
      serverSelectionTimeoutMS: 5000, // Timeout sau 5s nếu không chọn được server
      // Thêm các options khác nếu cần
    });
    // await mongoose.connect(mongoUri, {
    //   serverSelectionTimeoutMS: 5000, // Timeout sau 5s nếu không chọn được server
    // });
    const connection = mongooseInstance.connection;

    if (!connection) {
      console.error(
        "Đối tượng Mongoose connection không xác định một cách bất thường sau khi kết nối."
      );
      throw new Error("Mongoose connection object is undefined post-connect.");
    }
    connection.on("error", (err) => {
      console.error("Lỗi kết nối MongoDB sau khi đã kết nối:", err);
    });

    connection.on("disconnected", () => {
      console.log("Mất kết nối đến MongoDB.");
    });
    console.log(
      `Truy cập DB thành công tại: ${connection.host}:${connection.port}/${connection.name}`
    );
    return connection;
  } catch (error) {
    console.error("Truy cập DB thất bại ban đầu!!!!", error);
    // Ném lỗi ra ngoài để dừng tiến trình nếu cần
    throw error;
  }
}
