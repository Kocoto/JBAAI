import Stripe from "stripe";
import dotenv from "dotenv";

// Tải các biến môi trường từ file .env
// Đảm bảo bạn đã gọi dotenv.config() ở đâu đó trong điểm khởi đầu ứng dụng của bạn
// Hoặc gọi lại ở đây nếu file này được load trước
dotenv.config();

// Lấy Secret Key từ biến môi trường
const stripeSecretKey = process.env.STRIPE_SECRET_KEY;

// Kiểm tra xem key đã được đặt chưa
if (!stripeSecretKey) {
  console.error(
    "FATAL ERROR: STRIPE_SECRET_KEY is not set in environment variables."
  );
  // Trong môi trường production, bạn có thể muốn dừng ứng dụng ở đây
  process.exit(1); // Thoát tiến trình nếu không có key
}

// Khởi tạo đối tượng Stripe với Secret Key và các tùy chọn
const stripe = new Stripe(stripeSecretKey, {
  typescript: true, // Bật hỗ trợ TypeScript
  // Bạn có thể thêm các cấu hình khác ở đây nếu cần
});

console.log("Stripe configuration loaded successfully."); // Log để xác nhận config đã load

// Export đối tượng stripe đã được khởi tạo
export default stripe;
