import paypal from "@paypal/checkout-server-sdk";

// Kiểm tra biến môi trường
const clientId = process.env.PAYPAL_CLIENT_ID;
const clientSecret = process.env.PAYPAL_CLIENT_SECRET;

if (!clientId || !clientSecret) {
  throw new Error(
    "PAYPAL_CLIENT_ID hoặc PAYPAL_CLIENT_SECRET chưa được cấu hình trong file .env"
  );
}

// Chọn môi trường Sandbox hoặc Live
const isProduction = process.env.NODE_ENV === "production";
console.log(
  `[PayPal Config] Chế độ môi trường: ${
    isProduction ? "Production (Live)" : "Development (Sandbox)"
  }`
);

// Sử dụng paypal.core.SandboxEnvironment cho thử nghiệm
// Sử dụng paypal.core.LiveEnvironment cho ứng dụng thực tế
const environment = isProduction
  ? new paypal.core.LiveEnvironment(clientId, clientSecret)
  : new paypal.core.SandboxEnvironment(clientId, clientSecret);

console.log(`[PayPal Config] Đang khởi tạo PayPalHttpClient...`);
const client = new paypal.core.PayPalHttpClient(environment);

// Log thông báo thành công sau khi client được tạo
console.log(
  `[PayPal Config] PayPalHttpClient đã được khởi tạo thành công cho môi trường ${
    isProduction ? "Live" : "Sandbox"
  }.`
);

export default client;
export { paypal };
