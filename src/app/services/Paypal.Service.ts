import client, { paypal } from "../config/paypal.config";
import { IPurchaseHistoryInput } from "../models/PurchaseHistory.Model";
import CustomError from "../utils/Error.Util";
import PackageService from "./Package.Service";
import PurchaseHistoryService from "./PurchaseHistory.Service";

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
          return_url: `${process.env.CLIENT_URL}/success`,
          cancel_url: `${process.env.CLIENT_URL}/cancel`,
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
      if (err instanceof Error) {
        throw err;
      }
      if (err.statusCode && err.message) {
        try {
          const errorDetails = JSON.parse(err.message);
          console.error(
            "[PayPal Create Order] Chi tiết lỗi PayPal:",
            JSON.stringify(errorDetails, null, 2)
          );
          throw new CustomError(
            err.statusCode,
            "Không thể tạo đơn hàng PayPal.",
            errorDetails
          );
        } catch (parseError) {
          // Nếu message không phải JSON hợp lệ
          console.error(
            "[PayPal Create Order] Không thể parse lỗi JSON:",
            err.message
          );
          throw new CustomError(
            err.statusCode,
            "Không thể tạo đơn hàng PayPal.",
            err.message
          );
        }
      } else {
        throw new CustomError(
          500,
          "Không thể tạo đơn hàng PayPal.",
          "Đã xảy ra lỗi không xác định."
        );
      }
    }
  }

  async captureOrder(orderId: string, purchaseHistoryId: string) {
    try {
      const request = new paypal.orders.OrdersCaptureRequest(orderId);
    } catch (Error) {}
  }
}
