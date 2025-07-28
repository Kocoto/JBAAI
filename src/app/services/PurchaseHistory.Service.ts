import e from "express";
import PurchaseHistoryModel, {
  IPurchaseHistoryInput,
} from "../models/PurchaseHistory.Model";
import { subDays, startOfDay, endOfDay } from "date-fns";
import CustomError from "../utils/Error.Util";

export interface RevenueReportItem {
  purchaseDate: Date;
  transactionId: string;
  userName: string;
  userEmail: string;
  packageName: string;
  packageType: "premium" | "standard";
  price: number;
  discount: number;
  finalAmount: number;
  paymentMethod: string;
  currency: string; // Add currency
}

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

  async updatePurchaseHistory(
    purchaseHistoryId: string,
    status: string,
    transactionId?: string
  ) {
    try {
      const updatedPurchaseHistory =
        await PurchaseHistoryModel.findByIdAndUpdate(
          purchaseHistoryId,
          { status: status, transactionId: transactionId },
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

  async getPurchaseHistoryById(purchaseHistoryId: string) {
    try {
      const purchaseHistory = await PurchaseHistoryModel.findById(
        purchaseHistoryId
      );
      if (!purchaseHistory) {
        throw new CustomError(404, "Purchase history not found");
      }
      return purchaseHistory;
    } catch (error) {
      if (error instanceof CustomError) {
        throw error;
      }
      throw new CustomError(500, error as string);
    }
  }

  async getPurchaseHistoryByTransactionId(transactionId: string) {
    try {
      const purchaseHistory = await PurchaseHistoryModel.findOne({
        transactionId: transactionId,
      });
      if (!purchaseHistory) {
        throw new CustomError(
          404,
          "Purchase history not found with TransactionId: " + transactionId
        );
      }
      return purchaseHistory;
    } catch (error) {
      if (error instanceof CustomError) {
        throw error;
      }
      throw new CustomError(500, error as string);
    }
  }

  async getRevenueReportDataByDateRange(
    startDate?: Date,
    endDate?: Date
  ): Promise<RevenueReportItem[]> {
    try {
      console.log(
        "[PurchaseHistoryService] Starting to fetch revenue data for the last 2 weeks."
      );
      const today = new Date();
      const twoWeeksAgo = startDate
        ? startDate
        : startOfDay(subDays(today, 14)); // 14 days ago, starting from 00:00:00
      const endOfToday = endDate ? endDate : endOfDay(today); // Until end of today 23:59:59

      console.log(
        `[PurchaseHistoryService] Query time range: ${twoWeeksAgo.toISOString()} - ${endOfToday.toISOString()}`
      );

      const successfulStatuses = ["success", "completed"]; // Statuses considered as successful

      const purchaseRecords = await PurchaseHistoryModel.find({
        purchaseDate: {
          $gte: twoWeeksAgo,
          $lte: endOfToday,
        },
        status: { $in: successfulStatuses }, // Only get successful transactions
      })
        .populate({
          path: "userId",
          select: "username email", // Select required fields from User model
        })
        .populate({
          path: "packageId",
          select: "name type currency", // Select required fields from Package model and add currency
        })
        .sort({ purchaseDate: -1 }) // Sort by newest purchase date first
        .lean(); // Use .lean() to improve performance and return plain JavaScript objects

      if (!purchaseRecords) {
        console.log(
          "[PurchaseHistoryService] No transaction records found in the last 2 weeks."
        );
        return [];
      }

      console.log(
        `[PurchaseHistoryService] Found ${purchaseRecords.length} transaction records.`
      );

      const revenueReportItems: RevenueReportItem[] = purchaseRecords.map(
        (record) => {
          // Type assertion for TypeScript to understand populated fields structure
          const user = record.userId as any; // Or define more detailed interface for populated user
          const pkg = record.packageId as any; // Or define more detailed interface for populated package

          const price = record.price || 0;
          const discount = record.discount || 0;
          const finalAmount = price - discount;

          return {
            purchaseDate: record.purchaseDate,
            transactionId: record.transactionId,
            userName: user?.username || "N/A",
            userEmail: user?.email || "N/A",
            packageName: pkg?.name || "N/A",
            packageType: pkg?.type || "standard", // Default to standard if not present
            price: price,
            discount: discount,
            finalAmount: finalAmount,
            paymentMethod: record.paymentMethod,
            currency: pkg?.currency || "USD", // Get currency from package, default to USD
          };
        }
      );
      console.log(
        "[PurchaseHistoryService] Revenue report data processing completed."
      );
      return revenueReportItems;
    } catch (error) {
      console.error(
        "[PurchaseHistoryService] Error while fetching revenue data:",
        error
      );
      if (error instanceof CustomError) {
        throw error;
      }
      // Throw general error if not a handled CustomError
      throw new CustomError(
        500,
        "Server error while fetching revenue report data."
      );
    }
  }
}
export default new PurchaseHistoryService();
