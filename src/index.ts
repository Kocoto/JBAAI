import * as dotenv from "dotenv";
dotenv.config();

import express from "express";
import bodyParser from "body-parser";
import { route } from "./app/routes";
import { connect } from "./app/config/db";
import errorHandler from "./app/middlewares/Error.Middleware";
import swaggerUi from "swagger-ui-express";
import { swaggerSpec } from "./app/config/swagger.config";
import { transporter } from "./app/config/nodemailer.config";
import multer from "multer";
import client from "./app/config/paypal.config";
import { transformIncomingData } from "./app/utils/FormatData.Util";
import UserHealthDataService from "./app/services/HealthData.Service";
import mongoose from "mongoose";
import path from "path";
import fs from "fs";
const port = process.env.PORT || 4000;
async function startApplication() {
  console.log("Bắt đầu khởi chạy ứng dụng...");
  try {
    // Hàm connect() sẽ throw lỗi nếu thất bại, ngăn ứng dụng tiếp tục
    // console.log("Đang kết nối đến cơ sở dữ liệu...");
    await connect(); // Đợi kết nối DB thành công

    // console.log("Đang khởi tạo Express...");
    const app = express();
    const upload = multer();

    // Middlewares
    app.use(express.json());
    app.use(express.urlencoded({ extended: true }));
    // Nếu bạn vẫn cần bodyParser cho mục đích khác, giữ lại:
    app.use(bodyParser.urlencoded({ extended: true }));
    app.use(bodyParser.json());
    app.use(upload.any()); // Middleware cho multipart/form-data

    app.get("/apple-app-site-association", (req, res, next) => {
      const filePath = path.join(__dirname, "..", "apple-app-site-association");

      fs.access(filePath, fs.constants.R_OK, (err) => {
        if (err) {
          // Nếu file không tồn tại hoặc không đọc được
          console.error("Lỗi truy cập file apple-app-site-association:", err);
          // Trả về 404 để iOS biết là không tìm thấy file tại đường dẫn này
          return res.status(404).type("text/plain").send("Not Found");
        }

        // Nếu file tồn tại và đọc được:
        // 1. Đặt Content-Type header là application/json (RẤT QUAN TRỌNG)
        res.setHeader("Content-Type", "application/json");

        // 2. Gửi nội dung file về cho client (iOS)
        res.sendFile(filePath, (errSend) => {
          // Xử lý lỗi nếu việc gửi file gặp vấn đề
          if (errSend) {
            console.error("Lỗi gửi file apple-app-site-association:", errSend);
            // Chỉ gửi lỗi 500 nếu chưa có header nào được gửi đi
            if (!res.headersSent) {
              res.status(500).send("Internal Server Error");
            }
          }
        });
      });
    });

    // Các cấu hình khác (Swagger, Nodemailer verify, PayPal client)
    // console.log("Đang cấu hình các dịch vụ khác...");
    app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));
    client; // Khởi tạo PayPal client (nếu cần)
    transporter.verify((error, success) => {
      if (error) {
        console.error("Lỗi kết nối Nodemailer:", error);
      } else {
        console.log("Nodemailer đã sẵn sàng gửi email.");
      }
    });

    // Routes
    // console.log("Đang đăng ký các routes...");
    route(app);

    // Error Handling Middleware (phải đặt cuối cùng)
    app.use(errorHandler);

    // --- Bước 5: Khởi động Express Server ---
    app.listen(port, () => {
      console.log(`Ứng dụng đang lắng nghe tại http://localhost:${port}`);
      // console.log(`API Docs tại http://localhost:${port}/api-docs`);
      console.log("Ứng dụng đã khởi động thành công!");
    });
  } catch (error) {
    // Bắt lỗi từ connect() hoặc setupAgenda()
    console.error("Không thể khởi tạo ứng dụng:", error);
    // Thoát ứng dụng với mã lỗi nếu không thể khởi tạo các thành phần cốt lõi
    process.exit(1);
  }
}
async function gracefulShutdown() {
  // console.log("Nhận tín hiệu tắt ứng dụng. Đang dừng một cách duyên dáng...");
  try {
    // console.log("Đang đóng kết nối MongoDB...");
    await mongoose.disconnect();
    // console.log("Kết nối MongoDB đã đóng.");

    // console.log("Ứng dụng đã tắt thành công.");
    process.exit(0);
  } catch (error) {
    console.error("Lỗi trong quá trình tắt ứng dụng:", error);
    // Thoát với mã lỗi
    process.exit(1);
  }
}

// --- Đăng ký bắt các tín hiệu shutdown ---
// SIGINT: Thường được gửi khi nhấn Ctrl+C trong terminal
process.on("SIGINT", gracefulShutdown);
// SIGTERM: Tín hiệu tắt chuẩn thường được gửi bởi hệ thống quản lý tiến trình (Docker, Kubernetes, PM2 stop)
process.on("SIGTERM", gracefulShutdown);

// --- Chạy hàm khởi động chính ---
startApplication();
