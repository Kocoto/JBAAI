import { Request, Response, NextFunction } from "express";
import CustomError from "../utils/Error.Util";
import PurchaseHistoryService from "../services/PurchaseHistory.Service";
import { generateRevenueExcel, generateRevenuePdf } from "../utils/Report.Util"; // Import các hàm tiện ích đã tạo
import {
  endOfDay,
  format,
  isBefore,
  isEqual,
  isValid,
  parseISO,
  startOfDay,
} from "date-fns";
import HealthDataService from "../services/HealthData.Service";
import { exportExcel } from "../utils/HealthReport.Util";

class ReportController {
  /**
   * Xuất báo cáo doanh thu 2 tuần gần nhất dưới dạng Excel hoặc PDF.
   * Client cần truyền query parameter `format` (ví dụ: ?format=excel hoặc ?format=pdf).
   */
  async exportRevenueReport(req: Request, res: Response, next: NextFunction) {
    try {
      const requestedFormat = req.query.format as string;
      const startDateString = req.query.startDate as string | undefined;
      const endDateString = req.query.endDate as string | undefined;

      if (
        !requestedFormat ||
        (requestedFormat !== "excel" && requestedFormat !== "pdf")
      ) {
        throw new CustomError(
          400,
          'Định dạng file không hợp lệ. Chỉ chấp nhận "excel" hoặc "pdf".'
        );
      }

      let startDate: Date | undefined = undefined;
      let endDate: Date | undefined = undefined;
      let reportTitleDateRange = "2 Tuần Gần Nhất"; // Mặc định

      // Xử lý và validate startDate và endDate nếu được cung cấp
      if (startDateString && endDateString) {
        // Nên sử dụng parseISO nếu client gửi định dạng chuẩn YYYY-MM-DD
        // Hoặc parse với định dạng cụ thể nếu client gửi khác
        const parsedStartDate = parseISO(startDateString);
        const parsedEndDate = parseISO(endDateString);

        if (!isValid(parsedStartDate) || !isValid(parsedEndDate)) {
          throw new CustomError(
            400,
            "Ngày bắt đầu hoặc ngày kết thúc không hợp lệ. Sử dụng định dạng YYYY-MM-DD."
          );
        }
        if (
          isBefore(parsedEndDate, parsedStartDate) &&
          !isEqual(parsedEndDate, parsedStartDate)
        ) {
          throw new CustomError(
            400,
            "Ngày kết thúc phải sau hoặc bằng ngày bắt đầu."
          );
        }

        startDate = startOfDay(parsedStartDate); // Lấy thời điểm bắt đầu của ngày
        endDate = endOfDay(parsedEndDate); // Lấy thời điểm kết thúc của ngày
        reportTitleDateRange = `từ ${format(
          startDate,
          "dd/MM/yyyy"
        )} đến ${format(endDate, "dd/MM/yyyy")}`;
        console.log(
          `[ReportController] Xuất báo cáo cho khoảng tùy chỉnh: ${reportTitleDateRange}`
        );
      } else if (startDateString || endDateString) {
        // Nếu chỉ cung cấp một trong hai ngày
        throw new CustomError(
          400,
          "Cần cung cấp cả ngày bắt đầu và ngày kết thúc, hoặc không cung cấp cả hai để lấy mặc định 2 tuần."
        );
      } else {
        console.log(
          "[ReportController] Xuất báo cáo cho 2 tuần gần nhất (mặc định)."
        );
      }

      console.log(
        `[ReportController] Yêu cầu xuất báo cáo doanh thu với định dạng: ${requestedFormat}`
      );

      // 1. Lấy dữ liệu doanh thu
      // Giả sử PurchaseHistoryService.getRevenueForLastTwoWeeks() đã được cập nhật để nhận startDate và endDate
      // Hoặc bạn tạo một phương thức mới như getRevenueReportDataByDateRange
      const revenueData =
        await PurchaseHistoryService.getRevenueReportDataByDateRange(
          startDate, // Sẽ là undefined nếu không có query param, khi đó service dùng logic 2 tuần
          endDate // Sẽ là undefined nếu không có query param
        );
      console.log(
        `[ReportController] Đã lấy được ${revenueData.length} bản ghi doanh thu cho khoảng ${reportTitleDateRange}.`
      );

      if (revenueData.length === 0) {
        return res.status(200).json({
          success: true,
          message: `Không có dữ liệu doanh thu ${reportTitleDateRange} để xuất báo cáo.`,
          data: null,
        });
      }

      let fileBuffer: Buffer;
      let fileName: string;
      let contentType: string;

      const timestamp = format(new Date(), "yyyyMMdd_HHmmss");
      const baseFileName = `BaoCaoDoanhThu_JBAAI_${timestamp}`;

      // 2. Tạo file buffer dựa trên định dạng yêu cầu
      if (requestedFormat === "excel") {
        console.log(
          `[ReportController] Đang tạo file Excel cho khoảng ${reportTitleDateRange}...`
        );
        // Truyền reportTitleDateRange vào hàm generateRevenueExcel nếu bạn muốn tiêu đề file Excel động
        fileBuffer = await generateRevenueExcel(
          revenueData,
          reportTitleDateRange
        );
        fileName = `${baseFileName}.xlsx`;
        contentType =
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
        console.log(`[ReportController] Đã tạo xong file Excel: ${fileName}`);
      } else {
        // requestedFormat === 'pdf'
        console.log(
          `[ReportController] Đang tạo file PDF cho khoảng ${reportTitleDateRange}...`
        );
        // Truyền reportTitleDateRange vào hàm generateRevenuePdf nếu bạn muốn tiêu đề file PDF động
        fileBuffer = await generateRevenuePdf(
          revenueData,
          reportTitleDateRange
        );
        fileName = `${baseFileName}.pdf`;
        contentType = "application/pdf";
        console.log(`[ReportController] Đã tạo xong file PDF: ${fileName}`);
      }

      // 3. Thiết lập HTTP Headers
      res.setHeader("Content-Type", contentType);
      res.setHeader(
        "Content-Disposition",
        `attachment; filename*=UTF-8''${encodeURIComponent(fileName)}`
      );
      res.setHeader("Content-Length", fileBuffer.length.toString());

      console.log(`[ReportController] Đang gửi file ${fileName} cho client...`);
      // 4. Gửi buffer file
      res.send(fileBuffer);
    } catch (error) {
      console.error(
        "[ReportController] Lỗi khi xuất báo cáo doanh thu:",
        error
      );
      next(error);
    }
  }

  async test(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user._id;
      const test = await HealthDataService.testReport(userId, 2025, 6);

      const payload = {
        totalScans: test.length,
        healthData: test,
        month: 6,
        year: 2025,
      };
      const excel = await exportExcel(payload);
      const fileName = `BaoCaoSucKhoe_${test[0].userId}_Thang6_2025.xlsx`;
      res.setHeader(
        "Content-Type",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
      );
      res.setHeader(
        "Content-Disposition",
        `attachment; filename*=UTF-8''${encodeURIComponent(fileName)}`
      );
      res.setHeader("Content-Length", excel.length.toString());
      res.send(excel);
    } catch (error) {
      next(error);
    }
  }

  async exportExcel(req: Request, res: Response, next: NextFunction) {
    const userId = req.user._id;
  }
}

export default new ReportController();
