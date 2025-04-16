// file: src/index.ts

import * as dotenv from "dotenv";
dotenv.config(); // Load biến môi trường sớm nhất có thể

import express from "express";
import bodyParser from "body-parser"; // Bạn vẫn có thể dùng nếu cần cho việc khác express.json/urlencoded
import mongoose from "mongoose"; // Import mongoose để dùng disconnect
import { route } from "./app/routes";
// Đảm bảo import đúng hàm connect từ file db config của bạn
import { connect } from "./app/config/db"; // Sử dụng hàm connect đã sửa ở Bước 2
import errorHandler from "./app/middlewares/Error.Middleware";
import swaggerUi from "swagger-ui-express";
import { swaggerSpec } from "./app/config/swagger.config";
import { transporter } from "./app/config/nodemailer.config";
import multer from "multer";
import client from "./app/config/paypal.config";

// --- Import các thành phần Agenda ---
import setupAgenda from "./app/config/agenda.config"; // Import hàm setup Agenda từ Bước 3
// Import hàm lên lịch (sẽ tạo ở bước sau, nhưng import sẵn)
import scheduleJobs from "./app/jobs/scheduler";
import { Agenda } from "agenda"; // Import kiểu dữ liệu Agenda

const port = process.env.PORT || 4000;

// Khai báo biến agendaInstance ở scope ngoài để các hàm khác (như gracefulShutdown) có thể truy cập
let agendaInstance: Agenda | null = null;

// --- Hàm Khởi động Chính của Ứng dụng ---
// Đưa logic khởi động vào hàm async để dùng await
async function startApplication() {
  console.log("Bắt đầu khởi chạy ứng dụng...");
  try {
    // --- Bước 1: Kết nối Database ---
    // Hàm connect() sẽ throw lỗi nếu thất bại, ngăn ứng dụng tiếp tục
    console.log("Đang kết nối đến cơ sở dữ liệu...");
    await connect(); // Đợi kết nối DB thành công

    // --- Bước 2: Khởi tạo và Bắt đầu Agenda ---
    // Chỉ chạy sau khi kết nối DB thành công
    console.log("Đang thiết lập Agenda...");
    // Gọi hàm setupAgenda từ file config và lưu lại instance
    agendaInstance = await setupAgenda();

    // --- Bước 3: Lên lịch cho các Jobs định kỳ ---
    // Chỉ chạy sau khi Agenda đã được thiết lập và bắt đầu
    console.log("Đang lên lịch các công việc định kỳ...");
    // Gọi hàm scheduleJobs (sẽ tạo ở bước sau) để đặt lịch
    await scheduleJobs(agendaInstance);

    // --- Bước 4: Khởi tạo và Cấu hình Express App ---
    console.log("Đang khởi tạo Express...");
    const app = express();
    const upload = multer();

    // Middlewares
    app.use(express.json());
    app.use(express.urlencoded({ extended: true }));
    // Nếu bạn vẫn cần bodyParser cho mục đích khác, giữ lại:
    app.use(bodyParser.urlencoded({ extended: true }));
    app.use(bodyParser.json());
    app.use(upload.any()); // Middleware cho multipart/form-data

    // Các cấu hình khác (Swagger, Nodemailer verify, PayPal client)
    console.log("Đang cấu hình các dịch vụ khác...");
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
    console.log("Đang đăng ký các routes...");
    route(app);

    // Error Handling Middleware (phải đặt cuối cùng)
    app.use(errorHandler);

    // --- Bước 5: Khởi động Express Server ---
    app.listen(port, () => {
      console.log(`Ứng dụng đang lắng nghe tại http://localhost:${port}`);
      console.log(`API Docs tại http://localhost:${port}/api-docs`);
      console.log("Ứng dụng đã khởi động thành công!");
    });
  } catch (error) {
    // Bắt lỗi từ connect() hoặc setupAgenda()
    console.error("Không thể khởi tạo ứng dụng:", error);
    // Thoát ứng dụng với mã lỗi nếu không thể khởi tạo các thành phần cốt lõi
    process.exit(1);
  }
}

// --- Hàm Xử lý Tắt Ứng dụng Duyên dáng (Graceful Shutdown) ---
async function gracefulShutdown() {
  console.log("Nhận tín hiệu tắt ứng dụng. Đang dừng một cách duyên dáng...");
  try {
    // Dừng Agenda trước để nó có thời gian hoàn thành job đang chạy
    if (agendaInstance) {
      console.log("Đang dừng Agenda...");
      await agendaInstance.stop(); // Chờ Agenda dừng hẳn
      console.log("Agenda đã dừng thành công.");
    } else {
      console.log("Không tìm thấy Agenda instance để dừng.");
    }

    // Ngắt kết nối Mongoose
    console.log("Đang đóng kết nối MongoDB...");
    await mongoose.disconnect();
    console.log("Kết nối MongoDB đã đóng.");

    // Thoát tiến trình thành công
    console.log("Ứng dụng đã tắt thành công.");
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
