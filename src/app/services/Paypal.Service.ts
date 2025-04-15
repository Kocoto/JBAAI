import client, { paypal } from "../config/paypal.config";
import { IPurchaseHistoryInput } from "../models/PurchaseHistory.Model";
import CustomError from "../utils/Error.Util";
import PackageService from "./Package.Service";
import PurchaseHistoryService from "./PurchaseHistory.Service";
import SubscriptionService from "./Subscription.Service";
import UserService from "./User.Service";

class PaypalService {
  async createOrder(data: any) {
    try {
      const packageId = data.packageId;
      const userId = data.userId;
      const packageData = await PackageService.getPackageById(packageId);
      const packagePrice = String(packageData.price);
      const request = new paypal.orders.OrdersCreateRequest();
      request.prefer("return=representation");

      request.requestBody({
        intent: "CAPTURE",
        purchase_units: [
          {
            description: `Mua ${packageData.name}`, // Mô tả hiển thị cho người dùng

            amount: {
              currency_code: "USD",
              value: packagePrice,
              // breakdown: {
              //   item_total: {
              //     currency_code: "USD",
              //     value: data.price,
              //   },
              // },
            },
          },
        ],
        application_context: {
          brand_name: "JBAAI",
          landing_page: "LOGIN",
          user_action: "PAY_NOW",
          return_url: `${process.env.CLIENT_URL}`,
          cancel_url: `${process.env.CLIENT_URL}`,
        },
      });
      console.log("[PayPal Create Order] Đang gửi yêu cầu tạo đơn hàng...");
      const order = await client.execute(request);
      console.log(
        "[PayPal Create Order] Tạo đơn hàng thành công. Order ID:",
        order.result.id
      );
      console.log("Chi tiết đơn hàng:", JSON.stringify(order.result, null, 2));
      const purchase: Partial<IPurchaseHistoryInput> = {};
      purchase.packageId = packageId;
      purchase.userId = userId;
      purchase.paymentMethod = "paypal";
      purchase.transactionId = order.result.id;
      purchase.status = "pending";
      purchase.price = Number(packagePrice);
      const newPurchase = await PurchaseHistoryService.createPurchaseHistory(
        purchase
      );
      return { order, newPurchase };
    } catch (err: any) {
      console.error(
        "[PayPal Create Order] Lỗi khi tạo đơn hàng PayPal:",
        err.message
      );
      if (err.statusCode && err.message) {
        throw new CustomError(err.statusCode, err.message);
        // Lỗi có vẻ từ PayPal HTTP
        console.error(
          "[PayPal Create Order] Chi tiết lỗi PayPal (nếu có trong err.details hoặc err.response):",
          // Thử log các thuộc tính này hoặc cả đối tượng err
          err.details || err.response?.data || err
        );
        // Có thể bạn không cần JSON.parse nữa
        const errorDetailsPayload =
          err.details ||
          (typeof err.message === "string"
            ? { message: err.message }
            : err.message); // Lấy details nếu có, hoặc message

        throw new CustomError(
          err.statusCode,
          "Không thể tạo đơn hàng PayPal.",
          errorDetailsPayload // Truyền chi tiết lỗi tìm được
        );
      } else if (err instanceof Error) {
        // Lỗi Javascript hoặc lỗi khác không có statusCode
        console.error("[PayPal Create Order] Lỗi không xác định:", err);
        throw new CustomError(
          500,
          "Lỗi hệ thống khi tạo đơn hàng PayPal.",
          err.message // Chỉ gửi message của lỗi gốc
        );
      } else {
        // Trường hợp rất hiếm
        console.error(
          "[PayPal Create Order] Đối tượng lỗi không xác định:",
          err
        );
        throw new CustomError(
          500,
          "Không thể tạo đơn hàng PayPal.",
          "Đã xảy ra lỗi không xác định."
        );
      }
    }
  }

  async captureOrder(
    orderId: string,
    userId: string,
    purchaseHistoryId: string
  ) {
    try {
      const purchaseRecord =
        await PurchaseHistoryService.getPurchaseHistoryById(purchaseHistoryId); // Cần hàm này
      if (!purchaseRecord) {
        throw new CustomError(
          404,
          `Không tìm thấy lịch sử mua hàng: ${purchaseHistoryId}`
        );
      }
      // Kiểm tra xem paypal orderId có khớp không (tùy chọn nhưng nên có)
      if (purchaseRecord.transactionId !== orderId) {
        // Giả sử bạn lưu orderId vào trường transactionId
        console.error(
          `[PayPal Capture Order] Lệch Order ID! Input: ${orderId}, DB: ${purchaseRecord.transactionId}. PurchaseID: ${purchaseHistoryId}`
        );
        throw new CustomError(400, `Lệch thông tin đơn hàng.`);
      }
      if (purchaseRecord.status !== "pending") {
        console.warn(
          `[PayPal Capture Order] Purchase ${purchaseHistoryId} không ở trạng thái pending (hiện tại: ${purchaseRecord.status}). Bỏ qua capture.`
        );
        if (
          purchaseRecord.status === "completed" ||
          purchaseRecord.status === "success"
        ) {
          // Trả về thông tin cũ nếu cần
          return {
            message: "Đơn hàng đã được xử lý trước đó.",
            purchaseHistory: purchaseRecord,
          };
        } else {
          throw new CustomError(
            400,
            `Đơn hàng không thể capture ở trạng thái ${purchaseRecord.status}.`
          );
        }
      }
      const request = new paypal.orders.OrdersCaptureRequest(orderId);
      console.log(
        `[PayPal Capture Order] Đang gửi yêu cầu capture cho đơn hàng ${orderId}...`
      );
      const capture = await client.execute(request);
      const captureResult = capture.result;
      console.log(
        `[PayPal Capture Order] Capture thành công cho đơn hàng ${orderId}.`
      );

      const paymentStatus = captureResult.status;
      const captureStatus =
        captureResult.purchase_units?.[0]?.payments?.captures?.[0]?.status;
      console.log(
        `[PayPal Capture Order] Trạng thái đơn hàng: ${paymentStatus}, Trạng thái capture: ${captureStatus}`
      );
      if (paymentStatus === "COMPLETED" && captureStatus === "COMPLETED") {
        const paypalTransaction =
          captureResult.purchase_units?.[0]?.payments?.captures?.[0];
        if (!paypalTransaction) {
          // ... xử lý lỗi không tìm thấy transaction ...
          throw new CustomError(
            500,
            "Không tìm thấy chi tiết transaction trong phản hồi PayPal."
          );
        }

        const capturedAmount = paypalTransaction.amount.value;
        const capturedCurrency = paypalTransaction.amount.currency_code;
        var finalPaypalTxnId = paypalTransaction.id; // Lấy ID transaction cuối cùng

        // Lấy giá gốc từ bản ghi purchase (cần fetch trước đó hoặc ở đây nếu chưa)
        // const purchaseRecord = await PurchaseHistoryService.getPurchaseHistoryById(purchaseHistoryId);
        const expectedPrice = purchaseRecord.price; // Giả sử đã fetch purchaseRecord ở trên
        const expectedCurrency = "USD"; // Hoặc lấy từ cấu hình/DB

        if (
          Number(capturedAmount) !== expectedPrice ||
          capturedCurrency !== expectedCurrency
        ) {
          console.error(
            `[PayPal Capture Order] !!SAI LỆCH SỐ TIỀN!! Đơn hàng ${orderId}, Purchase ${purchaseHistoryId}. Mong đợi: ${expectedPrice} ${expectedCurrency}. Thực tế: ${capturedAmount} ${capturedCurrency}`
          );
          // !! XỬ LÝ NGHIÊM TRỌNG: Có thể cần hoàn tiền (refund) ngay lập tức và báo lỗi !!
          // await tryRefundPayPal(finalPaypalTxnId); // Hàm xử lý hoàn tiền
          // Cập nhật DB với trạng thái lỗi tiền không khớp
          await PurchaseHistoryService.updatePurchaseHistory(
            purchaseHistoryId,
            "amount_mismatch",
            finalPaypalTxnId
          ); // Thêm trạng thái mới
          throw new CustomError(
            400,
            "Số tiền thanh toán không khớp với đơn hàng."
          );
        }

        console.log(
          `[PayPal Capture Order] Thanh toán thành công hoàn tất cho đơn hàng ${orderId}`
        );
        const purchaseHistory =
          await PurchaseHistoryService.updatePurchaseHistory(
            purchaseHistoryId,
            captureStatus,
            finalPaypalTxnId
          );
        const [subscription, user] = await Promise.all([
          SubscriptionService.createSubscription(
            String(purchaseHistory.userId),
            String(purchaseHistory.packageId)
          ),
          UserService.updateUser(String(userId), { isSubscription: true }),
        ]);

        return { purchaseHistory, subscription, user };
      } else {
        console.warn(
          `[PayPal Capture Order] Trạng thái thanh toán không hoàn tất cho đơn hàng ${orderId}:`,
          paymentStatus,
          captureStatus
        );
        const purchaseHistory =
          await PurchaseHistoryService.updatePurchaseHistory(
            purchaseHistoryId,
            finalPaypalTxnId,
            captureStatus
          );
        throw new CustomError(400, "Thanh toán không thành công");
      }
    } catch (err: any) {
      console.error(
        `[PayPal Capture Order] Lỗi khi capture đơn hàng ${orderId}:`,
        err.message
      );
      if (err.statusCode && err.message) {
        try {
          const errorDetails = JSON.parse(err.message);
          console.error(
            `[PayPal Capture Order] Chi tiết lỗi PayPal (${orderId}):`,
            JSON.stringify(errorDetails, null, 2)
          );
          if (errorDetails.details?.[0]?.issue === "ORDER_ALREADY_CAPTURED") {
            console.warn(
              `[PayPal Capture Order] Đơn hàng ${orderId} đã được capture trước đó.`
            );
            // Có thể trả về 200 OK và thông tin giao dịch cũ nếu bạn lưu nó
            return { message: "Đơn hàng này đã được thanh toán trước đó." };
          }
        } catch (error) {
          console.error(
            `[PayPal Capture Order] Không thể parse lỗi JSON (${orderId}):`,
            err.message
          );
          throw new CustomError(
            500,
            "Lỗi không xác định khi xác nhận thanh toán PayPal." +
              "rawError: " +
              err.message // Chỉ gửi message của lỗi gốc
          );
        }
      } else {
        throw new CustomError(
          500,
          "Lỗi không xác định khi xác nhận thanh toán PayPal." +
            "rawError: " +
            err.message // Chỉ gửi message của lỗi gốc
        );
      }
    }
  }
}

export default new PaypalService();
