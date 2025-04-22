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
          return_url: `https://jbaai-y7mb.onrender.com/payment-success`, // URL thành công trên tên miền API backend
          cancel_url: `https://jbaai-y7mb.onrender.com/payment-fail`,
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
      console.log(
        `[PayPal Capture Order] Bắt đầu capture cho purchaseHistoryId: ${purchaseHistoryId}, orderId: ${orderId}`
      );
      const purchaseRecord =
        await PurchaseHistoryService.getPurchaseHistoryById(purchaseHistoryId);

      if (!purchaseRecord) {
        // Lỗi 404 nếu không tìm thấy bản ghi
        throw new CustomError(
          404,
          `Không tìm thấy lịch sử mua hàng bằng purchaseHistoryId: ${purchaseHistoryId}`
        );
      }

      // Kiểm tra khớp orderId (quan trọng)
      if (purchaseRecord.transactionId !== orderId) {
        console.error(
          `[PayPal Capture Order] Lệch Order ID! Input: ${orderId}, DB: ${purchaseRecord.transactionId}. PurchaseID: ${purchaseHistoryId}`
        );
        // Lỗi 400 nếu ID không khớp
        throw new CustomError(400, `Lệch thông tin đơn hàng.`);
      }

      // Kiểm tra trạng thái đơn hàng
      if (purchaseRecord.status !== "pending") {
        console.warn(
          `[PayPal Capture Order] Purchase ${purchaseHistoryId} không ở trạng thái pending (hiện tại: ${purchaseRecord.status}). Bỏ qua capture.`
        );
        // Nếu đã hoàn thành trước đó, trả về thông tin cũ
        if (
          purchaseRecord.status === "completed" ||
          purchaseRecord.status === "success"
        ) {
          return {
            message: "Đơn hàng đã được xử lý trước đó.",
            purchaseHistory: purchaseRecord,
          };
        } else {
          // Lỗi 400 nếu trạng thái không hợp lệ để capture
          throw new CustomError(
            400,
            `Đơn hàng không thể capture ở trạng thái ${purchaseRecord.status}.`
          );
        }
      }

      // Tạo yêu cầu capture tới PayPal
      const request = new paypal.orders.OrdersCaptureRequest(orderId);

      console.log(
        `[PayPal Capture Order] Đang gửi yêu cầu capture cho đơn hàng ${orderId}...`
      );
      const capture = await client.execute(request); // Gọi API PayPal
      const captureResult = capture.result;
      console.log(
        `[PayPal Capture Order] Capture thành công cho đơn hàng ${orderId}. Phản hồi:`,
        JSON.stringify(captureResult, null, 2)
      );

      // Lấy trạng thái từ phản hồi PayPal
      const paymentStatus = captureResult.status;
      const captureDetails =
        captureResult.purchase_units?.[0]?.payments?.captures?.[0];
      const captureStatus = captureDetails?.status;

      console.log(
        `[PayPal Capture Order] Trạng thái đơn hàng: ${paymentStatus}, Trạng thái capture: ${captureStatus}`
      );

      // Xử lý khi thanh toán và capture thành công
      if (paymentStatus === "COMPLETED" && captureStatus === "COMPLETED") {
        if (!captureDetails) {
          // Lỗi 500 nếu không tìm thấy chi tiết capture trong phản hồi hợp lệ
          throw new CustomError(
            500,
            "Không tìm thấy chi tiết transaction trong phản hồi PayPal dù trạng thái là COMPLETED."
          );
        }

        const capturedAmount = captureDetails.amount.value;
        const capturedCurrency = captureDetails.amount.currency_code;
        const finalPaypalTxnId = captureDetails.id; // ID transaction cuối cùng từ PayPal

        // Lấy giá và tiền tệ mong đợi từ bản ghi purchase
        const expectedPrice = purchaseRecord.price;
        const expectedCurrency = "USD"; // Hoặc lấy từ cấu hình/DB

        // Kiểm tra số tiền và loại tiền tệ có khớp không
        if (
          Number(capturedAmount) !== expectedPrice ||
          capturedCurrency !== expectedCurrency
        ) {
          console.error(
            `[PayPal Capture Order] !!SAI LỆCH SỐ TIỀN!! Đơn hàng ${orderId}, Purchase ${purchaseHistoryId}. Mong đợi: ${expectedPrice} ${expectedCurrency}. Thực tế: ${capturedAmount} ${capturedCurrency}`
          );
          // !! XỬ LÝ NGHIÊM TRỌNG: Cập nhật DB với trạng thái lỗi và có thể cần hoàn tiền !!
          await PurchaseHistoryService.updatePurchaseHistory(
            purchaseHistoryId,
            "amount_mismatch", // Trạng thái mới cho lỗi không khớp số tiền
            finalPaypalTxnId
          );
          // Lỗi 400 báo cho client biết số tiền không khớp
          throw new CustomError(
            400,
            "Số tiền thanh toán không khớp với đơn hàng."
          );
        }

        console.log(
          `[PayPal Capture Order] Thanh toán thành công hoàn tất cho đơn hàng ${orderId} với transaction ID: ${finalPaypalTxnId}`
        );

        // Cập nhật trạng thái thành công vào DB
        const updatedPurchaseHistory =
          await PurchaseHistoryService.updatePurchaseHistory(
            purchaseHistoryId,
            "completed", // Hoặc 'success' tùy theo quy ước của bạn
            finalPaypalTxnId
          );

        // Tạo subscription và cập nhật user
        const [subscription, user] = await Promise.all([
          SubscriptionService.createSubscription(
            String(userId),
            String(purchaseRecord.packageId)
          ),
          UserService.updateUser(String(userId), { isSubscription: true }),
        ]);

        return {
          purchaseHistory: updatedPurchaseHistory,
          subscription,
          user,
          captureResult,
        };
      } else {
        // Xử lý khi trạng thái không phải là COMPLETED
        console.warn(
          `[PayPal Capture Order] Trạng thái thanh toán không hoàn tất cho đơn hàng ${orderId}. Payment: ${paymentStatus}, Capture: ${captureStatus}`
        );
        // Cập nhật trạng thái thất bại/chưa hoàn tất vào DB
        const finalPaypalTxnId = captureDetails?.id; // Có thể có hoặc không có ID transaction
        const updatedPurchaseHistory =
          await PurchaseHistoryService.updatePurchaseHistory(
            purchaseHistoryId,
            captureStatus || paymentStatus || "failed", // Sử dụng trạng thái có sẵn hoặc 'failed'
            finalPaypalTxnId // Lưu ID nếu có
          );

        // Trả về lỗi cho client biết capture không thành công như mong đợi
        // Sử dụng 400 vì yêu cầu capture đã được gửi nhưng kết quả không như ý
        throw new CustomError(
          400,
          `Thanh toán PayPal không hoàn tất. Trạng thái: ${
            captureStatus || paymentStatus
          }`
        );
        // Hoặc bạn có thể trả về thông tin cập nhật nếu không muốn báo lỗi:
        // return { purchaseHistory: updatedPurchaseHistory, captureResult };
      }
    } catch (err: any) {
      console.error(
        `[PayPal Capture Order] Lỗi trong quá trình capture đơn hàng ${orderId} (PurchaseID: ${purchaseHistoryId}):`,
        err // Log toàn bộ lỗi để debug
      );

      // === PHẦN QUAN TRỌNG: Xử lý lỗi ===

      // 1. Kiểm tra xem có phải là CustomError đã được throw từ logic nghiệp vụ không
      if (err instanceof CustomError) {
        console.log(
          `[PayPal Capture Order] Lỗi nghiệp vụ (${err.status}): ${err.message}`
        );
        // Nếu là CustomError, ném lại lỗi đó để giữ nguyên status code (400, 404, etc.)
        throw err;
      }

      // 2. Nếu không phải CustomError, xử lý như lỗi từ PayPal hoặc lỗi hệ thống khác
      // Kiểm tra cấu trúc lỗi giống PayPal (có statusCode và message)
      // Lưu ý: Lỗi từ SDK @paypal/checkout-server-sdk thường có dạng này
      if (err.statusCode && err.message) {
        try {
          // Thử parse message như JSON (đây là nơi có thể gây lỗi 500 trước đây)
          const errorDetails = JSON.parse(err.message);
          const issue = errorDetails.details?.[0]?.issue;
          const description = errorDetails.details?.[0]?.description;

          console.error(
            `[PayPal Capture Order] Chi tiết lỗi PayPal (${orderId}): Issue: ${issue}, Description: ${description}`,
            JSON.stringify(errorDetails, null, 2)
          );

          // Xử lý các mã lỗi cụ thể của PayPal
          if (issue === "ORDER_ALREADY_CAPTURED") {
            console.warn(
              `[PayPal Capture Order] Đơn hàng ${orderId} đã được capture trước đó (lỗi từ PayPal).`
            );
            // Có thể cập nhật lại DB nếu trạng thái chưa đúng và trả về thành công giả lập
            try {
              const existingPurchase =
                await PurchaseHistoryService.getPurchaseHistoryById(
                  purchaseHistoryId
                );
              if (
                existingPurchase &&
                existingPurchase.status !== "completed" &&
                existingPurchase.status !== "success"
              ) {
                await PurchaseHistoryService.updatePurchaseHistory(
                  purchaseHistoryId,
                  "completed",
                  existingPurchase.transactionId
                ); // Giả sử transactionId đã đúng
                console.log(
                  `[PayPal Capture Order] Cập nhật trạng thái DB cho đơn hàng đã capture trước đó ${purchaseHistoryId}`
                );
              }
            } catch (dbError: any) {
              console.error(
                `[PayPal Capture Order] Lỗi cập nhật DB cho đơn hàng đã capture (${purchaseHistoryId}):`,
                dbError.message
              );
            }
            // Trả về thông báo cho client, có thể kèm mã 200 hoặc 409 (Conflict)
            // Sử dụng 409 để báo rằng hành động không thể thực hiện vì trạng thái hiện tại
            throw new CustomError(
              409,
              "Đơn hàng này đã được thanh toán trước đó."
            );
            // return { message: "Đơn hàng này đã được thanh toán trước đó." };
          } else if (issue === "ORDER_NOT_APPROVED") {
            console.warn(
              `[PayPal Capture Order] Đơn hàng ${orderId} chưa được phê duyệt hoặc đã bị hủy (lỗi từ PayPal).`
            );
            try {
              // Cập nhật trạng thái trong DB thành 'cancelled' hoặc 'failed'
              await PurchaseHistoryService.updatePurchaseHistory(
                purchaseHistoryId,
                "cancelled" // Hoặc 'failed'
                // Không cần transactionId ở đây
              );
            } catch (dbError: any) {
              console.error(
                `[PayPal Capture Order] Lỗi cập nhật DB (${purchaseHistoryId}) sau lỗi ORDER_NOT_APPROVED:`,
                dbError.message
              );
            }
            // Ném lỗi 400 (Bad Request) hoặc 422 (Unprocessable Entity) cho client
            throw new CustomError(
              400, // Hoặc 422
              "Đơn hàng chưa được phê duyệt hoặc đã bị hủy bởi người dùng."
            );
          } else {
            // Các lỗi PayPal khác đã được parse nhưng không xử lý đặc biệt
            await PurchaseHistoryService.updatePurchaseHistory(
              purchaseHistoryId,
              "failed"
            ); // Cập nhật trạng thái lỗi chung
            throw new CustomError(
              500, // Hoặc err.statusCode nếu muốn giữ mã lỗi gốc từ PayPal
              `Lỗi từ PayPal khi xác nhận thanh toán: ${
                issue || errorDetails.message || "Unknown PayPal Error"
              }`
            );
          }
        } catch (parseError) {
          console.log(
            "đã tới dòng số 383 trang paypal.service đâyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyy"
          );
          // Lỗi khi parse JSON từ err.message (message không phải JSON hợp lệ)

          if (parseError instanceof CustomError) {
            console.log(
              `[PayPal Capture Order] Lỗi nghiệp vụ (${err.status}): ${err.message}`
            );
            // Nếu là CustomError, ném lại lỗi đó để giữ nguyên status code (400, 404, etc.)
            throw parseError;
          }
          console.error(
            `[PayPal Capture Order] Không thể parse lỗi JSON từ PayPal (${orderId}), Raw message:`,
            err.message
          );
          await PurchaseHistoryService.updatePurchaseHistory(
            purchaseHistoryId,
            "failed"
          ); // Cập nhật trạng thái lỗi chung
          // Ném lỗi 500 vì không hiểu rõ phản hồi lỗi từ PayPal
          throw new CustomError(
            500,
            "Lỗi không xác định khi xử lý phản hồi lỗi từ PayPal. Raw: " +
              err.message
          );
        }
      } else {
        // 3. Lỗi không có cấu trúc như lỗi PayPal (ví dụ: lỗi mạng, lỗi code khác trong try)
        console.error(
          `[PayPal Capture Order] Lỗi hệ thống không xác định (${orderId}):`,
          err.message,
          err.stack // Log stack trace nếu có
        );
        // Cập nhật trạng thái lỗi chung vào DB nếu có thể
        try {
          await PurchaseHistoryService.updatePurchaseHistory(
            purchaseHistoryId,
            "system_error"
          );
        } catch (dbError: any) {
          console.error(
            `[PayPal Capture Order] Lỗi cập nhật DB (${purchaseHistoryId}) sau lỗi hệ thống:`,
            dbError.message
          );
        }
        // Ném lỗi 500 mặc định cho các lỗi không mong muốn
        throw new CustomError(
          500,
          "Lỗi hệ thống khi xác nhận thanh toán PayPal. Message: " + err.message
        );
      }
    }
  }
}

export default new PaypalService();
