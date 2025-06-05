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
  currency: string; // Thêm tiền tệ
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
          "Khônh tìm thấy lịch sử mua hàng bằng TransactionId: " + transactionId
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
        "[PurchaseHistoryService] Bắt đầu lấy dữ liệu doanh thu 2 tuần gần nhất."
      );
      const today = new Date();
      const twoWeeksAgo = startDate
        ? startDate
        : startOfDay(subDays(today, 14)); // 14 ngày trước, bắt đầu từ 00:00:00
      const endOfToday = endDate ? endDate : endOfDay(today); // Đến cuối ngày hôm nay 23:59:59

      console.log(
        `[PurchaseHistoryService] Khoảng thời gian truy vấn: ${twoWeeksAgo.toISOString()} - ${endOfToday.toISOString()}`
      );

      const successfulStatuses = ["success", "completed"]; // Các trạng thái được coi là thành công

      const purchaseRecords = await PurchaseHistoryModel.find({
        purchaseDate: {
          $gte: twoWeeksAgo,
          $lte: endOfToday,
        },
        status: { $in: successfulStatuses }, // Chỉ lấy các giao dịch thành công
      })
        .populate({
          path: "userId",
          select: "username email", // Chọn các trường cần thiết từ User model
        })
        .populate({
          path: "packageId",
          select: "name type currency", // Chọn các trường cần thiết từ Package model và thêm currency
        })
        .sort({ purchaseDate: -1 }) // Sắp xếp theo ngày mua mới nhất trước
        .lean(); // Sử dụng .lean() để tăng hiệu suất và trả về plain JavaScript objects

      if (!purchaseRecords) {
        console.log(
          "[PurchaseHistoryService] Không tìm thấy bản ghi giao dịch nào trong 2 tuần."
        );
        return [];
      }

      console.log(
        `[PurchaseHistoryService] Tìm thấy ${purchaseRecords.length} bản ghi giao dịch.`
      );

      const revenueReportItems: RevenueReportItem[] = purchaseRecords.map(
        (record) => {
          // Type assertion để TypeScript hiểu cấu trúc của populated fields
          const user = record.userId as any; // Hoặc định nghĩa interface chi tiết hơn cho populated user
          const pkg = record.packageId as any; // Hoặc định nghĩa interface chi tiết hơn cho populated package

          const price = record.price || 0;
          const discount = record.discount || 0;
          const finalAmount = price - discount;

          return {
            purchaseDate: record.purchaseDate,
            transactionId: record.transactionId,
            userName: user?.username || "N/A",
            userEmail: user?.email || "N/A",
            packageName: pkg?.name || "N/A",
            packageType: pkg?.type || "standard", // Mặc định là standard nếu không có
            price: price,
            discount: discount,
            finalAmount: finalAmount,
            paymentMethod: record.paymentMethod,
            currency: pkg?.currency || "USD", // Lấy tiền tệ từ gói, mặc định là USD
          };
        }
      );
      console.log(
        "[PurchaseHistoryService] Đã xử lý xong dữ liệu báo cáo doanh thu."
      );
      return revenueReportItems;
    } catch (error) {
      console.error(
        "[PurchaseHistoryService] Lỗi khi lấy dữ liệu doanh thu:",
        error
      );
      if (error instanceof CustomError) {
        throw error;
      }
      // Ném lỗi chung nếu không phải CustomError đã xử lý
      throw new CustomError(
        500,
        "Lỗi máy chủ khi lấy dữ liệu báo cáo doanh thu."
      );
    }
  }
}
export default new PurchaseHistoryService();
