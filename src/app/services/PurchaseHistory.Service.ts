import e from "express";
import PurchaseHistoryModel, {
  IPurchaseHistoryInput,
} from "../models/PurchaseHistory.Model";
import CustomError from "../utils/Error.Util";

class PurchaseHistoryService {
  async createPurchaseHistory(data: Partial<IPurchaseHistoryInput>) {
    try {
      const purchaseHistory = await PurchaseHistoryModel.create(data);
      return purchaseHistory;
    } catch (err: any) {
      console.error(
        "[PurchaseHistory Service] Error creating purchase history:",
        err.message
      );
      throw new CustomError(500, "Internal Server Error");
    }
  }

  async updatePurchaseHistory(purchaseHistoryId: string, status: string) {
    try {
      const updatedPurchaseHistory =
        await PurchaseHistoryModel.findByIdAndUpdate(
          purchaseHistoryId,
          { status: status },
          { new: true }
        );
      if (!updatedPurchaseHistory) {
        throw new CustomError(404, "Purchase history not found");
      }
      return updatedPurchaseHistory;
    } catch (error) {
      if (error instanceof CustomError) {
        throw error;
      }
      throw new CustomError(500, error as string);
    }
  }
}
export default new PurchaseHistoryService();
