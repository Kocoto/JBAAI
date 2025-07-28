import { Request, Response, NextFunction } from "express";
import CustomError from "../utils/Error.Util";
import PurchaseHistoryService from "../services/PurchaseHistory.Service";
import { generateRevenueExcel, generateRevenuePdf } from "../utils/Report.Util"; // Import utility functions
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

class ReportController {
  /**
   * Export revenue report for the last 2 weeks in Excel or PDF format.
   * Client needs to pass query parameter `format` (example: ?format=excel or ?format=pdf).
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
          'Invalid file format. Only "excel" or "pdf" are accepted.'
        );
      }

      let startDate: Date | undefined = undefined;
      let endDate: Date | undefined = undefined;
      let reportTitleDateRange = "Last 2 Weeks"; // Default

      // Process and validate startDate and endDate if provided
      if (startDateString && endDateString) {
        const parsedStartDate = parseISO(startDateString);
        const parsedEndDate = parseISO(endDateString);

        if (!isValid(parsedStartDate) || !isValid(parsedEndDate)) {
          throw new CustomError(
            400,
            "Start date or end date is invalid. Use YYYY-MM-DD format."
          );
        }
        if (
          isBefore(parsedEndDate, parsedStartDate) &&
          !isEqual(parsedEndDate, parsedStartDate)
        ) {
          throw new CustomError(
            400,
            "End date must be after or equal to start date."
          );
        }

        startDate = startOfDay(parsedStartDate);
        endDate = endOfDay(parsedEndDate);
        reportTitleDateRange = `from ${format(
          startDate,
          "dd/MM/yyyy"
        )} to ${format(endDate, "dd/MM/yyyy")}`;
        console.log(
          `[ReportController] Exporting report for custom range: ${reportTitleDateRange}`
        );
      } else if (startDateString || endDateString) {
        throw new CustomError(
          400,
          "Must provide both start and end dates, or neither to use default 2 weeks range."
        );
      } else {
        console.log(
          "[ReportController] Exporting report for last 2 weeks (default)."
        );
      }

      console.log(
        `[ReportController] Request to export revenue report in format: ${requestedFormat}`
      );

      const revenueData =
        await PurchaseHistoryService.getRevenueReportDataByDateRange(
          startDate,
          endDate
        );
      console.log(
        `[ReportController] Retrieved ${revenueData.length} revenue records for range ${reportTitleDateRange}.`
      );

      if (revenueData.length === 0) {
        return res.status(200).json({
          success: true,
          message: `No revenue data available for ${reportTitleDateRange} to export.`,
          data: null,
        });
      }

      let fileBuffer: Buffer;
      let fileName: string;
      let contentType: string;

      const timestamp = format(new Date(), "yyyyMMdd_HHmmss");
      const baseFileName = `RevenueReport_JBAAI_${timestamp}`;

      if (requestedFormat === "excel") {
        console.log(
          `[ReportController] Creating Excel file for range ${reportTitleDateRange}...`
        );
        fileBuffer = await generateRevenueExcel(
          revenueData,
          reportTitleDateRange
        );
        fileName = `${baseFileName}.xlsx`;
        contentType =
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
        console.log(`[ReportController] Excel file created: ${fileName}`);
      } else {
        console.log(
          `[ReportController] Creating PDF file for range ${reportTitleDateRange}...`
        );
        fileBuffer = await generateRevenuePdf(
          revenueData,
          reportTitleDateRange
        );
        fileName = `${baseFileName}.pdf`;
        contentType = "application/pdf";
        console.log(`[ReportController] PDF file created: ${fileName}`);
      }

      res.setHeader("Content-Type", contentType);
      res.setHeader(
        "Content-Disposition",
        `attachment; filename*=UTF-8''${encodeURIComponent(fileName)}`
      );
      res.setHeader("Content-Length", fileBuffer.length.toString());

      console.log(`[ReportController] Sending file ${fileName} to client...`);
      res.send(fileBuffer);
    } catch (error) {
      console.error(
        "[ReportController] Error exporting revenue report:",
        error
      );
      next(error);
    }
  }
}

export default new ReportController();
