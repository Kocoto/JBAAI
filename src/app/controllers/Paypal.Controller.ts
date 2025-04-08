import { Request, Response, NextFunction } from "express";
import CustomError from "../utils/Error.Util";
import PaypalService from "../services/Paypal.Service";
import PurchaseHistoryService from "../services/PurchaseHistory.Service";

class PaypalController {
  async createOrder(req: Request, res: Response, next: NextFunction) {
    try {
      const packageId = req.body.packageId;
      if (!packageId) {
        throw new CustomError(400, "PackageId không tồn tại");
      }
      const userId = req.user._id;
      const data = {
        packageId: packageId,
        userId: userId,
      };
      const order = await PaypalService.createOrder(data);
      res.status(200).json({
        success: true,
        message: "Tạo đơn hàng thành công",
        data: order,
      });
    } catch (error) {
      next(error);
    }
  }

  async captureOrder(req: Request, res: Response, next: NextFunction) {
    try {
      const orderId = req.body.orderId;
      if (!orderId) {
        throw new CustomError(400, "OrderId không tồn tại");
      }
      const userId = req.user._id;
      const purchaseHistory =
        await PurchaseHistoryService.getPurchaseHistoryByTransactionId(orderId);
      if (!purchaseHistory) {
        throw new CustomError(400, "Không tìm thấy lịch sử mua hàng");
      }
      const purchaseHistoryId = String(purchaseHistory._id);
      const captureData = await PaypalService.captureOrder(
        orderId,
        userId,
        purchaseHistoryId
      );
      res.status(200).json({
        success: true,
        message: "Capture đơn hàng thành công",
        data: captureData,
      });
    } catch (error) {
      next(error);
    }
  }
}

export default new PaypalController();
