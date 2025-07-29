import e, { Request, Response, NextFunction } from "express";
import CustomError from "../utils/Error.Util";
import HealthDataService from "../services/HealthData.Service";
import { exportHealthReportExcel } from "../utils/HealthReport.Util";
import UserModel from "../models/User.Model";
import {
  IMonthlyReportJobData,
  monthlyReportQueue,
} from "../queues/MonthlyReport.Queue";
import { sendMail } from "../utils/Mail.Util";
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
      const glp = req.user.glp;
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
        optionEmail,
        glp
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

  async triggerMonthlyReportGeneration(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const { userId, month, year } = req.body;

      // 1. Validate input
      if (!userId) {
        return res.status(400).json({
          success: false,
          message: "User ID is required",
        });
      }

      if (!month || !year || isNaN(month) || isNaN(year)) {
        return res.status(400).json({
          success: false,
          message: "Vui lòng cung cấp tháng (month) và năm (year) hợp lệ.",
        });
      }

      // Validate month and year ranges
      const monthNum = Number(month);
      const yearNum = Number(year);

      if (monthNum < 1 || monthNum > 12) {
        return res.status(400).json({
          success: false,
          message: "Tháng phải từ 1 đến 12",
        });
      }

      if (yearNum < 2020 || yearNum > new Date().getFullYear()) {
        return res.status(400).json({
          success: false,
          message: "Năm không hợp lệ",
        });
      }

      console.log(
        `[API Trigger] Bắt đầu kích hoạt báo cáo cho tháng ${month}/${year}`
      );

      // 2. Get user data
      const user = await UserModel.findById(userId)
        .select("email username")
        .lean();

      if (!user) {
        console.log("[API Trigger] Không tìm thấy user để gửi báo cáo.");
        return res.status(404).json({
          success: false,
          message: "User không tồn tại",
          data: { queuedJobs: 0 },
        });
      }

      console.log(`[API Trigger] Tìm thấy user. Bắt đầu thêm job vào queue...`);

      // 3. Add job to queue
      const jobPayload: IMonthlyReportJobData = {
        userId: user._id.toString(),
        email: user.email,
        username: user.username,
        month: monthNum,
        year: yearNum,
      };

      const jobId = `manual-report-${user._id}-${yearNum}-${monthNum}`;
      await monthlyReportQueue.add("sendMonthlyReport", jobPayload, {
        jobId,
      });

      console.log(`[API Trigger] Đã thêm thành công job vào queue.`);

      res.status(200).json({
        success: true,
        message: `Đã thêm thành công job gửi báo cáo cho tháng ${monthNum}/${yearNum} vào hàng đợi.`,
        data: {
          queuedJobs: 1,
        },
      });
    } catch (error) {
      console.error("[API Trigger] Lỗi khi kích hoạt gửi báo cáo:", error);
      next(error);
    }
  }

  async getFileExcel(req: Request, res: Response, next: NextFunction) {
    try {
      const { month, year, userId } = req.body;

      // Validate required fields
      if (!month || !year || !userId) {
        throw new CustomError(400, "Month, year and userId are required");
      }

      // Validate month and year ranges
      const monthNum = Number(month);
      const yearNum = Number(year);

      if (isNaN(monthNum) || monthNum < 1 || monthNum > 12) {
        throw new CustomError(400, "Month must be between 1 and 12");
      }

      if (
        isNaN(yearNum) ||
        yearNum < 2020 ||
        yearNum > new Date().getFullYear()
      ) {
        throw new CustomError(400, "Invalid year value");
      }

      // Get report data
      const reportData =
        await HealthDataService.getMonthlyHealthReportDataForExcel(
          userId,
          monthNum,
          yearNum
        );

      if (!reportData || reportData.length === 0) {
        return res.status(200).json({
          success: true,
          message: `Không có dữ liệu quét sức khỏe trong tháng ${monthNum}/${yearNum}`,
          data: null,
        });
      }

      const totalScans = reportData.length;

      // Generate Excel file
      const fileExcel = await exportHealthReportExcel({
        month: monthNum,
        year: yearNum,
        healthData: reportData,
        totalScans,
      });

      if (!fileExcel) {
        throw new CustomError(500, "Failed to generate Excel file");
      }

      // Set response headers for file download
      const fileName = `BaoCaoSucKhoe_test_Thang${monthNum}_${yearNum}.xlsx`;
      res.setHeader(
        "Content-Type",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
      );
      res.setHeader(
        "Content-Disposition",
        `attachment; filename*=UTF-8''${encodeURIComponent(fileName)}`
      );
      res.setHeader("Content-Length", fileExcel.length.toString());

      res.send(fileExcel);
    } catch (error) {
      next(error);
    }
  }
  async sendMailHealthData(req: Request, res: Response, next: NextFunction) {
    try {
      const { month, year } = req.body;

      const userId = req.user._id;
      // Validate required fields
      if (!month || !year || !userId) {
        throw new CustomError(400, "Month, year and userId are required");
      }

      // Validate month and year ranges
      const monthNum = Number(month);
      const yearNum = Number(year);

      if (isNaN(monthNum) || monthNum < 1 || monthNum > 12) {
        throw new CustomError(400, "Month must be between 1 and 12");
      }

      if (
        isNaN(yearNum) ||
        yearNum < 2020 ||
        yearNum > new Date().getFullYear()
      ) {
        throw new CustomError(400, "Invalid year value");
      }

      // Get report data
      const reportData =
        await HealthDataService.getMonthlyHealthReportDataForExcel(
          userId,
          monthNum,
          yearNum
        );

      if (!reportData || reportData.length === 0) {
        return res.status(200).json({
          success: true,
          message: `Không có dữ liệu quét sức khỏe trong tháng ${monthNum}/${yearNum}`,
          data: null,
        });
      }

      const totalScans = reportData.length;

      // Generate Excel file
      const fileExcel = await exportHealthReportExcel({
        month: monthNum,
        year: yearNum,
        healthData: reportData,
        totalScans,
      });

      const email = req.user.email;
      const username = req.user.username;
      const fileName = `BaoCaoSucKhoe_Thang${monthNum}_${yearNum}.xlsx`;
      const excelBuffer = Buffer.from(fileExcel);

      const mailOptions = {
        from: "JBA AI",
        to: email,
        subject: `Báo cáo sức khỏe tháng ${month}/${year} của bạn`,
        html: `
<!DOCTYPE html>
<html lang="vi">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Báo cáo sức khỏe tháng ${month}/${year}</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f5f7fa;">
    <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f7fa; padding: 40px 0;">
        <tr>
            <td align="center">
                <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.08); overflow: hidden;">
                    <!-- Header -->
                    <tr>
                        <td style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 40px 30px 40px; text-align: center;">
                            <h1 style="color: #ffffff; margin: 0; font-size: 32px; font-weight: 700; letter-spacing: -0.5px;">JBA AI</h1>
                            <p style="color: #e0e7ff; margin: 10px 0 0 0; font-size: 16px;">Đồng hành cùng sức khỏe của bạn</p>
                        </td>
                    </tr>
                    
                    <!-- Content -->
                    <tr>
                        <td style="padding: 40px;">
                            <!-- Greeting -->
                            <h2 style="color: #2d3748; margin: 0 0 20px 0; font-size: 24px; font-weight: 600;">
                                Xin chào ${username}! 👋
                            </h2>
                            
                            <!-- Main message -->
                            <div style="background-color: #f7fafc; border-left: 4px solid #667eea; padding: 20px; margin: 0 0 30px 0; border-radius: 0 8px 8px 0;">
                                <p style="color: #4a5568; margin: 0; line-height: 1.6; font-size: 16px;">
                                    Chúng tôi vui mừng gửi đến bạn <strong>Báo cáo Phân tích Sức khỏe</strong> tháng <strong style="color: #667eea;">${month}/${year}</strong>.
                                </p>
                            </div>
                            
                            <!-- Info Box -->
                            <div style="background-color: #edf2f7; padding: 25px; border-radius: 8px; margin: 0 0 30px 0;">
                                <h3 style="color: #2d3748; margin: 0 0 15px 0; font-size: 18px; font-weight: 600;">
                                    📊 Nội dung báo cáo
                                </h3>
                                <ul style="color: #4a5568; margin: 0; padding-left: 20px; line-height: 1.8;">
                                    <li>Tổng quan các chỉ số sức khỏe</li>
                                    <li>Phân tích xu hướng và biến động</li>
                                    <li>Đánh giá và khuyến nghị</li>
                                    <li>So sánh với các tháng trước</li>
                                </ul>
                            </div>
                            
                            <!-- CTA -->
                            <div style="text-align: center; margin: 30px 0;">
                                <div style="display: inline-block; background-color: #667eea; padding: 14px 30px; border-radius: 8px;">
                                    <span style="color: #ffffff; text-decoration: none; font-size: 16px; font-weight: 600;">
                                        📎 File Excel đính kèm bên dưới
                                    </span>
                                </div>
                            </div>
                            
                            <!-- Additional message -->
                            <div style="background-color: #f0fff4; border: 1px solid #9ae6b4; padding: 20px; border-radius: 8px; margin: 30px 0;">
                                <p style="color: #22543d; margin: 0; line-height: 1.6; text-align: center;">
                                    <strong>💚 Lời khuyên:</strong> Hãy duy trì lối sống lành mạnh và theo dõi sức khỏe thường xuyên để có cuộc sống tốt hơn!
                                </p>
                            </div>
                            
                            <!-- Closing -->
                            <p style="color: #4a5568; line-height: 1.6; margin: 30px 0 10px 0;">
                                Cảm ơn bạn đã tin tưởng và sử dụng dịch vụ của chúng tôi. Nếu có bất kỳ thắc mắc nào, đừng ngần ngại liên hệ với chúng tôi.
                            </p>
                            
                            <p style="color: #4a5568; line-height: 1.6; margin: 0;">
                                Chúc bạn luôn dồi dào sức khỏe! 🌟
                            </p>
                            
                            <!-- Signature -->
                            <div style="margin-top: 40px; padding-top: 30px; border-top: 1px solid #e2e8f0;">
                                <p style="color: #2d3748; margin: 0; font-weight: 600;">Trân trọng,</p>
                                <p style="color: #667eea; margin: 5px 0; font-size: 18px; font-weight: 700;">Đội ngũ JBA AI</p>
                            </div>
                        </td>
                    </tr>
                    
                    <!-- Footer -->
                    <tr>
                        <td style="background-color: #2d3748; padding: 30px 40px; text-align: center;">
                            <p style="color: #a0aec0; margin: 0 0 10px 0; font-size: 14px;">
                                © 2024 JBA AI. Mọi quyền được bảo lưu.
                            </p>
                            <p style="color: #718096; margin: 0; font-size: 12px; line-height: 1.6;">
                                Email này được gửi tự động. Vui lòng không trả lời trực tiếp email này.
                            </p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>
  `,
        attachments: [
          {
            filename: fileName,
            content: excelBuffer,
            contentType:
              "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          },
        ],
      };
      await sendMail(mailOptions);
      res.status(200).json({
        success: true,
        message: `Đã gửi thành công báo cáo sức khỏe tháng ${monthNum}/${yearNum} cho ${username}`,
        data: null,
      });
    } catch (error) {
      next(error);
    }
  }
}
export default new HealthDataController();
