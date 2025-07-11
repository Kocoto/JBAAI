import e, { Request, Response, NextFunction } from "express";
import CustomError from "../utils/Error.Util";
import HealthDataService from "../services/HealthData.Service";
import { MonthlyHealthReportData } from "../utils/HealthReport.Util";
class HealthDataController {
  async getHealthDataByDate(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user.id;
      const date = req.body.date;
      const language = req.headers["accept-language"];

      console.log(
        "[HealthDataController] getHealthDataByDateeeeeee: ",
        language
      );
      if (!date) {
        const healthData = await HealthDataService.getOneHealthData(userId);

        return res.status(200).json({
          success: true,
          message: "Lấy dữ liệu sức khỏe thành công",
          data: healthData,
        });
      }
      const healthData = await HealthDataService.getHealthDataByDate(
        userId,
        date
      );
      return res.status(200).json({
        success: true,
        message: "Lấy dữ liệu sức khỏe thành công",
        data: healthData,
      });
    } catch (error) {
      next(error);
    }
  }

  async createHealthData(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user.id;
      const rawData = req.body.healthData;
      if (!rawData) {
        throw new CustomError(400, "Dữ liệu sức khỏe là bắt buộc");
      }
      const healthData = await HealthDataService.createHealthData(
        userId,
        rawData
      );
      return res.status(201).json({
        success: true,
        message: "Tạo dữ liệu sức khỏe thành công",
        data: healthData,
      });
    } catch (error) {
      next(error);
    }
  }

  async deleteHealthData(req: Request, res: Response, next: NextFunction) {
    try {
      const healthDataId = req.body.healthDataId;
      if (!healthDataId) {
        throw new CustomError(400, "Id dữ liệu sức khỏe là bắt buộc");
      }
      const healthData = await HealthDataService.deleteHealthDate(healthDataId);
      return res.status(200).json({
        success: true,
        message: "Xóa dữ liệu sức khỏe thành công",
        data: healthData,
      });
    } catch (error) {
      next(error);
    }
  }

  async senMailHealthData(req: Request, res: Response, next: NextFunction) {
    try {
      const email = req.user.email;
      const rawData = req.body.healthData;
      const optionEmail = req.user.optionEmail;
      const language = req.headers["accept-language"]
        ? req.headers["accept-language"]
        : "en"; // Get language from accept-language header
      if (!email || !rawData) {
        throw new CustomError(400, "Email và dữ liệu sức khỏe là bắt buộc");
      }
      const user = req.user;
      if (!user) {
        throw new CustomError(400, "Người dùng không tồn tại");
      }
      if (user.emailNotificationsEnabled === false) {
        return res.status(200).json({
          success: true,
          message: "Người dùng không cho phép nhận email",
          data: null,
        });
      }
      const username = req.user.username;
      const type = user.type;
      const languageCode = language === "system" ? "en" : language || "vi";
      // Send health data email with or without optional email settings
      const healthData = await HealthDataService.sentMailHealthData(
        email,
        username,
        rawData,
        languageCode,
        type,
        optionEmail
      );

      return res.status(200).json({
        success: true,
        message: "Gửi email thành công",
        data: healthData,
      });
    } catch (error) {
      next(error);
    }
  }

  async getHealthDataByDateRange(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const userId = req.user.id;
      const { type, data } = req.body;
      if (!type || !data) {
        throw new CustomError(400, "Thiếu thông tin");
      }
      const healthData = await HealthDataService.getHealthDataByDateRange(
        userId,
        type,
        data
      );
      return res.status(200).json({
        success: true,
        message: "Lấy dữ liệu sức khỏe thành công",
        data: healthData,
      });
    } catch (error) {
      next(error);
    }
  }

  // async exportMonthlyReport(req: Request, res: Response, next: NextFunction) {
  //   try {
  //     const userId = req.user.id;
  //     const { month, year } = req.query;

  //     // Validate input
  //     const monthNum = parseInt(month as string);
  //     const yearNum = parseInt(year as string);

  //     if (!month || !year || isNaN(monthNum) || isNaN(yearNum)) {
  //       throw new CustomError(400, "Tháng và năm phải là số hợp lệ");
  //     }

  //     if (monthNum < 1 || monthNum > 12) {
  //       throw new CustomError(400, "Tháng phải từ 1 đến 12");
  //     }

  //     if (yearNum < 2020 || yearNum > new Date().getFullYear()) {
  //       throw new CustomError(400, "Năm không hợp lệ");
  //     }

  //     // Lấy dữ liệu báo cáo
  //     const reportData = await HealthDataService.getMonthlyHealthDataReport(
  //       userId,
  //       monthNum,
  //       yearNum
  //     );

  //     if (reportData.details.length === 0) {
  //       return res.status(200).json({
  //         success: true,
  //         message: `Không có dữ liệu quét sức khỏe trong tháng ${monthNum}/${yearNum}`,
  //         data: null,
  //       });
  //     }

  //     // Lấy thông tin user
  //     const user = req.user;

  //     // Chuẩn bị dữ liệu cho Excel
  //     const excelData: MonthlyHealthReportData = {
  //       summary: reportData.summary,
  //       details: reportData.details,
  //       userInfo: {
  //         username: user.username,
  //         email: user.email,
  //       },
  //     };

  //     // Generate Excel file
  //     const excelBuffer = await generateMonthlyHealthExcel(excelData);

  //     // Set response headers
  //     const fileName = `BaoCaoSucKhoe_${user.username}_Thang${monthNum}_${yearNum}.xlsx`;
  //     res.setHeader(
  //       "Content-Type",
  //       "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
  //     );
  //     res.setHeader(
  //       "Content-Disposition",
  //       `attachment; filename*=UTF-8''${encodeURIComponent(fileName)}`
  //     );
  //     res.setHeader("Content-Length", excelBuffer.length.toString());

  //     // Send file
  //     res.send(excelBuffer);
  //   } catch (error) {
  //     console.error(
  //       "[HealthDataController] Lỗi khi xuất báo cáo tháng:",
  //       error
  //     );
  //     next(error);
  //   }
  // }
}
export default new HealthDataController();
