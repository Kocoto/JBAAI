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
import cors from "cors";
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

    const wellKnownPath = path.join(__dirname, "..", "public", ".well-known");

    // Route cho apple-app-site-association (Không có đuôi)
    app.get("/.well-known/apple-app-site-association", (req, res) => {
      const filePath = path.join(wellKnownPath, "apple-app-site-association");
      fs.readFile(filePath, "utf8", (err, data) => {
        if (err) {
          console.error("Error reading apple-app-site-association file:", err);
          res.status(404).send("Not Found");
          return;
        }
        res.setHeader("Content-Type", "application/json"); // Đảm bảo đúng Content-Type
        // Thêm header Cache-Control để tránh cache quá lâu, giúp việc cập nhật có hiệu lực
        res.setHeader("Cache-Control", "public, max-age=0, must-revalidate");
        res.status(200).send(data);
      });
    });

    // Route cho assetlinks.json (Có đuôi .json)
    app.get("/.well-known/assetlinks.json", (req, res) => {
      const filePath = path.join(wellKnownPath, "assetlinks.json");
      fs.readFile(filePath, "utf8", (err, data) => {
        if (err) {
          console.error("Error reading assetlinks.json file:", err);
          res.status(404).send("Not Found");
          return;
        }
        res.setHeader("Content-Type", "application/json"); // Đảm bảo đúng Content-Type
        // Thêm header Cache-Control tương tự
        res.setHeader("Cache-Control", "public, max-age=0, must-revalidate");
        res.status(200).send(data);
      });
    });
    app.get("/api/payment-success-redirect", (req, res) => {
      const deepLinkUrl = `https://jbaai-y7mb.onrender.com/payment-success`;
      console.log(`Redirecting to Deep Link URL: ${deepLinkUrl}`);
      res.redirect(303, deepLinkUrl);
    });
    app.get("/api/payment-failed-redirect", (req, res) => {
      const deepLinkUrl = `https://jbaai-y7mb.onrender.com/payment-failed`;
      console.log(`Redirecting to Deep Link URL: ${deepLinkUrl}`);
      res.redirect(303, deepLinkUrl);
    });
    const upload = multer();

    app.use(cors());

    // Middlewares
    app.use(express.json());
    app.use(express.urlencoded({ extended: true }));
    // Nếu bạn vẫn cần bodyParser cho mục đích khác, giữ lại:
    app.use(bodyParser.urlencoded({ extended: true }));
    app.use(bodyParser.json());
    app.use(upload.any()); // Middleware cho multipart/form-data

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
