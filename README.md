# JBAAI

Phiên bản: 1.0.0

## Mô tả

JBAAI là một ứng dụng web được xây dựng bằng Node.js và TypeScript. Dự án này sử dụng Express.js cho routing và middleware, Mongoose làm ODM để tương tác với MongoDB, và nhiều thư viện khác để hỗ trợ các chức năng như hàng đợi công việc, gửi email, thanh toán, và ghi log.

## Cấu trúc dự án

```
JBAAI/
├── .gitignore
├── README.md
├── apple-app-site-association
├── assetlinks.json
├── backup/                   # Chứa các tệp sao lưu
├── geoip-db/                 # Chứa cơ sở dữ liệu GeoIP
├── package-lock.json
├── package.json
├── public/                   # Chứa các tệp tĩnh công khai
│   └── .well-known/
├── src/                      # Chứa mã nguồn của ứng dụng
│   ├── app/
│   │   ├── config/           # Cấu hình ứng dụng
│   │   ├── controllers/      # Controllers xử lý request
│   │   ├── middlewares/      # Middlewares
│   │   ├── models/           # Định nghĩa Mongoose models
│   │   ├── queues/           # Hàng đợi công việc (BullMQ)
│   │   ├── routes/           # Định nghĩa routes API
│   │   ├── services/         # Logic nghiệp vụ
│   │   ├── utils/            # Các hàm tiện ích
│   │   └── workers/          # Workers xử lý công việc từ hàng đợi
│   └── index.ts              # Điểm vào chính của ứng dụng
├── templates/                # Chứa các mẫu (ví dụ: email templates)
│   ├── emails/
│   └── logo/
└── tsconfig.json             # Cấu hình TypeScript
```

## Công nghệ sử dụng

- **Backend:** Node.js, Express.js
- **Ngôn ngữ:** TypeScript
- **Cơ sở dữ liệu:** MongoDB (thông qua Mongoose)
- **Hàng đợi công việc:** BullMQ, Agenda
- **Xác thực:** JSON Web Tokens (JWT), bcrypt
- **Email:** Nodemailer
- **Thanh toán:** PayPal Checkout Server SDK
- **GeoIP:** MaxMind GeoIP2 Node
- **API Documentation:** Swagger (swagger-jsdoc, swagger-ui-express)
- **Logging:** Winston
- **Khác:** body-parser, cors, dotenv, date-fns, multer

## Hướng dẫn cài đặt

1.  **Clone repository:**
    ```bash
    git clone <repository_url>
    cd JBAAI
    ```
2.  **Cài đặt dependencies:**
    ```bash
    npm install
    ```
3.  **Cấu hình môi trường:**
    Tạo tệp `.env` ở thư mục gốc của dự án và cấu hình các biến môi trường cần thiết (ví dụ: `PORT`, `MONGODB_URI`, `JWT_SECRET`, thông tin PayPal, Nodemailer, v.v.).

## Hướng dẫn chạy dự án

- **Chế độ Development (với hot-reloading):**

  ```bash
  npm run dev
  ```

  Ứng dụng sẽ chạy trên cổng được cấu hình trong tệp `.env` (mặc định có thể là 3000 hoặc một cổng khác).

- **Chế độ Production:**
  1.  Build TypeScript sang JavaScript:
      ```bash
      npm run build
      ```
      Thao tác này sẽ tạo thư mục `dist` chứa các tệp JavaScript đã được biên dịch.
  2.  Chạy ứng dụng:
      ```bash
      npm start
      ```

## Scripts có sẵn

- `npm run build`: Biên dịch mã TypeScript sang JavaScript.
- `npm run start`: Chạy ứng dụng từ các tệp đã biên dịch (thường dùng cho production).
- `npm run dev`: Chạy ứng dụng ở chế độ development với ts-node và nodemon để tự động khởi động lại khi có thay đổi mã nguồn.
- `npm test`: (Hiện tại chưa có test cụ thể) `echo "Error: no test specified" && exit 1`
