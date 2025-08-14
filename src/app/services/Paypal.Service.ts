import client, { paypal } from "../config/paypal.config";
import PackageModel from "../models/Package.Model";
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
      const [user, packageData] = await Promise.all([
        UserService.getUserById(userId),
        PackageService.getPackageById(packageId),
      ]);
      const originalPackagePrice = packageData.price; // Original price

      // Calculate discount amount based on user eligibility and package discount
      let discountAmount = 0;
      if (user.discount === true && packageData.discount != null) {
        discountAmount = packageData.discount;
      }
      const finalPrice = Math.max(0, originalPackagePrice - discountAmount);
      const request = new paypal.orders.OrdersCreateRequest();
      const packagePrice = String(packageData.price);
      request.prefer("return=representation");

      request.requestBody({
        intent: "CAPTURE",
        purchase_units: [
          {
            description: `Purchase ${packageData.name}`, // Description shown to user

            amount: {
              currency_code: "USD",
              value: String(finalPrice.toFixed(2)),
              breakdown: {
                handling: {
                  currency_code: "USD",
                  value: "0.00",
                },
                insurance: {
                  currency_code: "USD",
                  value: "0.00",
                },
                shipping_discount: {
                  currency_code: "USD",
                  value: "0.00",
                },
                shipping: {
                  currency_code: "USD",
                  value: "0.00",
                },
                tax_total: {
                  currency_code: "USD",
                  value: "0.00",
                },
                item_total: {
                  // Original total value
                  currency_code: "USD",
                  value: String(originalPackagePrice.toFixed(2)),
                },
                discount: {
                  // Specific discount amount
                  currency_code: "USD",
                  value: String(discountAmount.toFixed(2)),
                },
              },
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
          return_url: `https://jbaai-y7mb.onrender.com/payment-success`, // Success URL on API backend domain
          cancel_url: `https://jbaai-y7mb.onrender.com/payment-fail`,
        },
      });
      console.log("[PayPal Create Order] Sending order creation request...");
      const order = await client.execute(request);
      console.log(
        "[PayPal Create Order] Order created successfully. Order ID:",
        order.result.id
      );
      console.log("Order details:", JSON.stringify(order.result, null, 2));
      const purchase: Partial<IPurchaseHistoryInput> = {};
      purchase.packageId = packageId;
      purchase.userId = userId;
      purchase.paymentMethod = "paypal";
      purchase.transactionId = order.result.id;
      purchase.status = "pending";
      purchase.price = Number(packagePrice);
      purchase.type = packageData.type;
      purchase.discount = discountAmount; // Save discount amount to purchase

      const newPurchase = await PurchaseHistoryService.createPurchaseHistory(
        purchase
      );
      return { order, newPurchase };
    } catch (err: any) {
      console.error(
        "[PayPal Create Order] Error when creating PayPal order:",
        err.message
      );
      if (err.statusCode && err.message) {
        // Seems to be a PayPal HTTP error
        console.error(
          "[PayPal Create Order] PayPal error details (if available in err.details or err.response):",
          // Try logging these properties or the entire err object
          err.details || err.response?.data || err
        );
        // You may not need JSON.parse anymore
        const errorDetailsPayload =
          err.details ||
          (typeof err.message === "string"
            ? { message: err.message }
            : err.message); // Get details if available, or message

        throw new CustomError(
          err.statusCode,
          "Cannot create PayPal order.",
          errorDetailsPayload // Truyền chi tiết lỗi tìm được
        );
      } else if (err instanceof Error) {
        // Javascript error or other error without statusCode
        console.error("[PayPal Create Order] Undefined error:", err);
        throw new CustomError(
          500,
          "System error when creating PayPal order.",
          false,
          err.message // Only send original error message
        );
      } else {
        // Very rare case
        console.error("[PayPal Create Order] Undefined error object:", err);
        throw new CustomError(
          500,
          "Cannot create PayPal order.",
          false,
          "An undefined error occurred."
        );
      }
    }
  }

  async captureOrder(
    orderId: string,
    userId: string, // userId được truyền vào hàm
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
        // 400 error if IDs don't match
        throw new CustomError(400, `Order information mismatch.`);
      }

      // Check order status
      if (purchaseRecord.status !== "pending") {
        console.warn(
          `[PayPal Capture Order] Purchase ${purchaseHistoryId} is not in pending status (current: ${purchaseRecord.status}). Skipping capture.`
        );
        // If previously completed, return old information
        if (
          purchaseRecord.status === "completed" ||
          purchaseRecord.status === "success"
        ) {
          return {
            message: "Order has been processed previously.",
            purchaseHistory: purchaseRecord,
          };
        } else {
          // 400 error if status is invalid for capture
          throw new CustomError(
            400,
            `Order cannot be captured in ${purchaseRecord.status} status.`
          );
        }
      }

      // Create capture request to PayPal
      const request = new paypal.orders.OrdersCaptureRequest(orderId);

      console.log(
        `[PayPal Capture Order] Sending capture request for order ${orderId}...`
      );
      const capture = await client.execute(request); // Call PayPal API
      const captureResult = capture.result;
      console.log(
        `[PayPal Capture Order] Capture successful for order ${orderId}. Response:`,
        JSON.stringify(captureResult, null, 2)
      );

      // Get status from PayPal response
      const paymentStatus = captureResult.status;
      const captureDetails =
        captureResult.purchase_units?.[0]?.payments?.captures?.[0];
      const captureStatus = captureDetails?.status;

      console.log(
        `[PayPal Capture Order] Order status: ${paymentStatus}, Capture status: ${captureStatus}`
      );

      // Xử lý khi thanh toán và capture thành công
      if (paymentStatus === "COMPLETED" && captureStatus === "COMPLETED") {
        if (!captureDetails) {
          // 500 error if capture details not found in valid response
          throw new CustomError(
            500,
            "Transaction details not found in PayPal response despite COMPLETED status."
          );
        }

        const capturedAmount = captureDetails.amount.value;
        const capturedCurrency = captureDetails.amount.currency_code;
        const finalPaypalTxnId = captureDetails.id; // Final transaction ID from PayPal

        // --- Start changes ---
        // Get user and package info to recalculate final price (after discount)
        const [user, packageData] = await Promise.all([
          UserService.getUserById(userId), // Use provided userId
          PackageService.getPackageById(String(purchaseRecord.packageId)),
        ]);

        if (!user || !packageData) {
          throw new CustomError(
            404,
            "User or package information not found for price verification."
          );
        }

        const originalPackagePrice = packageData.price; // Original price from DB
        let discountAmount = 0;
        if (user.discount === true && packageData.discount != null) {
          discountAmount = packageData.discount;
        } // Get discount amount from purchaseRecord
        const expectedFinalPrice = Math.max(
          0,
          originalPackagePrice - discountAmount
        ); // Expected final price
        const expectedCurrency = "USD"; // Or get from config/DB
        // --- End changes ---

        // Check if amount and currency match (using expectedFinalPrice)
        // Compare with small tolerance to avoid floating point rounding errors
        const priceDifference = Math.abs(
          Number(capturedAmount) - expectedFinalPrice
        );
        const tolerance = 0.01; // Accept 0.01 USD tolerance

        if (
          priceDifference > tolerance || // Compare expected final price
          capturedCurrency !== expectedCurrency
        ) {
          console.error(
            `[PayPal Capture Order] !!AMOUNT MISMATCH!! Order ${orderId}, Purchase ${purchaseHistoryId}. Expected: ${expectedFinalPrice.toFixed(
              2
            )} ${expectedCurrency}. Actual: ${capturedAmount} ${capturedCurrency}`
          );
          // !! CRITICAL HANDLING: Update DB with error status and may need refund !!
          await PurchaseHistoryService.updatePurchaseHistory(
            purchaseHistoryId,
            "amount_mismatch", // New status for amount mismatch error
            finalPaypalTxnId
          );
          // 400 error to inform client about amount mismatch
          throw new CustomError(
            400,
            "Payment amount does not match order amount after applying discount." // Update error message
          );
        }

        console.log(
          `[PayPal Capture Order] Payment successfully completed for order ${orderId} with transaction ID: ${finalPaypalTxnId}`
        );

        // Update success status in DB
        const updatedPurchaseHistory =
          await PurchaseHistoryService.updatePurchaseHistory(
            purchaseHistoryId,
            "completed", // Or 'success' depending on your convention
            finalPaypalTxnId
          );

        // Create subscription and update user

        const newActiveSubscription =
          await SubscriptionService.handleSuccessfulPaymentAndActivateSubscription(
            String(userId), // userId đã được truyền vào captureOrder
            String(purchaseRecord.packageId)
            // Bạn có thể truyền thêm thông tin thanh toán vào đây nếu cần lưu trong SubscriptionModel
            // { transactionId: finalPaypalTxnId, amount: capturedAmount, currency: capturedCurrency }
          );
        const updatedUser = await UserService.updateUser(String(userId), {
          isSubscription:
            newActiveSubscription.isActive &&
            newActiveSubscription.endDate > new Date(),
          type: newActiveSubscription.isActive
            ? (
                await PackageModel.findById(newActiveSubscription.packageId)
              )?.type
            : user.type, // Cập nhật type nếu cần
        });
        return {
          purchaseHistory: updatedPurchaseHistory,
          subscription: newActiveSubscription,
          user: updatedUser, // Trả về user đã được cập nhật
          captureResult,
        };
      } else {
        // Handle when status is not COMPLETED
        console.warn(
          `[PayPal Capture Order] Payment status not completed for order ${orderId}. Payment: ${paymentStatus}, Capture: ${captureStatus}`
        );
        // Update failed/incomplete status in DB
        const finalPaypalTxnId = captureDetails?.id; // May or may not have transaction ID
        const updatedPurchaseHistory =
          await PurchaseHistoryService.updatePurchaseHistory(
            purchaseHistoryId,
            captureStatus || paymentStatus || "failed", // Use available status or 'failed'
            finalPaypalTxnId // Save ID if available
          );

        // Return error to client indicating capture was not successful as expected
        // Use 400 because capture request was sent but result was not as expected
        throw new CustomError(
          400,
          `PayPal payment not completed. Status: ${
            captureStatus || paymentStatus
          }`
        );
        // Or you can return update information if you don't want to report an error:
        // return { purchaseHistory: updatedPurchaseHistory, captureResult };
      }
    } catch (err: any) {
      console.error(
        `[PayPal Capture Order] Error during order capture ${orderId} (PurchaseID: ${purchaseHistoryId}):`,
        err // Log entire error for debugging
      );

      // === IMPORTANT: Error Handling ===

      // 1. Check if it's a CustomError thrown from business logic
      if (err instanceof CustomError) {
        console.log(
          `[PayPal Capture Order] Business error (${err.status}): ${err.message}`
        );
        // If it's a CustomError, rethrow it to maintain status code (400, 404, etc.)
        throw err;
      }

      // 2. If not CustomError, handle as PayPal error or other system error
      // Check error structure similar to PayPal (has statusCode and message)
      // Note: Errors from @paypal/checkout-server-sdk usually have this structure
      if (err.statusCode && err.message) {
        try {
          // Try to parse message as JSON (this is where 500 errors could occur before)
          const errorDetails = JSON.parse(err.message);
          const issue = errorDetails.details?.[0]?.issue;
          const description = errorDetails.details?.[0]?.description;

          console.error(
            `[PayPal Capture Order] PayPal error details (${orderId}): Issue: ${issue}, Description: ${description}`,
            JSON.stringify(errorDetails, null, 2)
          );

          // Handle specific PayPal error codes
          if (issue === "ORDER_ALREADY_CAPTURED") {
            console.warn(
              `[PayPal Capture Order] Order ${orderId} has been captured before (PayPal error).`
            );
            // Can update DB if status is not correct and return simulated success
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
                ); // Assume transactionId is correct
                console.log(
                  `[PayPal Capture Order] Updated DB status for previously captured order ${purchaseHistoryId}`
                );
              }
            } catch (dbError: any) {
              console.error(
                `[PayPal Capture Order] Error updating DB for captured order (${purchaseHistoryId}):`,
                dbError.message
              );
            }
            // Return message to client, can include code 200 or 409 (Conflict)
            // Use 409 to indicate action cannot be performed due to current state
            throw new CustomError(409, "This order has been paid previously.");
            // return { message: "This order has been paid previously." };
          } else if (issue === "ORDER_NOT_APPROVED") {
            console.warn(
              `[PayPal Capture Order] Order ${orderId} not approved or has been cancelled (PayPal error).`
            );
            try {
              // Update status in DB to 'cancelled' or 'failed'
              await PurchaseHistoryService.updatePurchaseHistory(
                purchaseHistoryId,
                "cancelled" // Or 'failed'
                // No transactionId needed here
              );
            } catch (dbError: any) {
              console.error(
                `[PayPal Capture Order] Error updating DB (${purchaseHistoryId}) after ORDER_NOT_APPROVED error:`,
                dbError.message
              );
            }
            // Throw 400 (Bad Request) or 422 (Unprocessable Entity) for client
            throw new CustomError(
              400, // Or 422
              "The order has not been approved or has been canceled by the user."
            );
          } else {
            // Other PayPal errors that have been parsed but not specially handled
            await PurchaseHistoryService.updatePurchaseHistory(
              purchaseHistoryId,
              "failed"
            ); // Update general error status
            throw new CustomError(
              500, // Or err.statusCode if you want to keep the original error code from PayPal
              `Error from PayPal when confirming payment: ${
                issue || errorDetails.message || "Unknown PayPal Error"
              }`
            );
          }
        } catch (parseError: any) {
          // Error when parsing JSON from err.message (message is not valid JSON)

          if (parseError instanceof CustomError) {
            console.log(
              `[PayPal Capture Order] Business error (${parseError.status}): ${parseError.message}`
            );
            // If it's a CustomError, rethrow it to keep the original status code (400, 404, etc.)
            throw parseError;
          }
          console.error(
            `[PayPal Capture Order] Cannot parse JSON error from PayPal (${orderId}), Raw message:`,
            err.message
          );
          await PurchaseHistoryService.updatePurchaseHistory(
            purchaseHistoryId,
            "failed"
          ); // Update general error status
          // Throw a 500 error because the error response from PayPal is not understood
          throw new CustomError(
            500,
            "Unknown error when processing error response from PayPal. Raw: " +
              err.message
          );
        }
      } else {
        // 3. Error without PayPal error structure (e.g., network error, other code error in try)
        console.error(
          `[PayPal Capture Order] Unknown system error (${orderId}):`,
          err.message,
          err.stack // Log stack trace if available
        );
        // Update general error status in DB if possible
        try {
          await PurchaseHistoryService.updatePurchaseHistory(
            purchaseHistoryId,
            "system_error"
          );
        } catch (dbError: any) {
          console.error(
            `[PayPal Capture Order] DB update error (${purchaseHistoryId}) after system error:`,
            dbError.message
          );
        }
        // Throw a default 500 error for unexpected errors
        throw new CustomError(
          500,
          "System error when confirming PayPal payment. Message: " + err.message
        );
      }
    }
  }
}

export default new PaypalService();
