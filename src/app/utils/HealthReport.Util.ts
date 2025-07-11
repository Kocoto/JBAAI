import ExcelJS from "exceljs";
import { format } from "date-fns";
import { vi } from "date-fns/locale";

export interface MonthlyHealthReportData {
  summary: {
    month: number;
    year: number;
    totalScans: number;
    startDate: Date;
    endDate: Date;
    avgPulseRate: number;
    avgBloodPressureSystolic: number;
    avgBloodPressureDiastolic: number;
    avgOxygenSaturation: number;
    avgStressLevel: number;
    avgWellnessIndex: number;
  };
  details: any[];
  userInfo: {
    username: string;
    email: string;
  };
}

// export async function generateMonthlyHealthExcel(
//   data: MonthlyHealthReportData
// ): Promise<Buffer> {
//   const workbook = new ExcelJS.Workbook();
//   workbook.creator = "JBAAI Health System";
//   workbook.lastModifiedBy = "JBAAI Health System";
//   workbook.created = new Date();
//   workbook.modified = new Date();

//   // Tạo sheet tổng quan
//   const summarySheet = workbook.addWorksheet("Tổng quan");

//   // Tiêu đề báo cáo
//   summarySheet.addRow([
//     `BÁO CÁO SỨC KHỎE THÁNG ${data.summary.month}/${data.summary.year}`,
//   ]);
//   summarySheet.mergeCells("A1:E1");
//   const titleCell = summarySheet.getCell("A1");
//   titleCell.font = {
//     name: "Arial",
//     size: 16,
//     bold: true,
//     color: { argb: "FF0070C0" },
//   };
//   titleCell.alignment = {
//     vertical: "middle",
//     horizontal: "center",
//   };

//   // Thông tin người dùng
//   summarySheet.addRow([]);
//   summarySheet.addRow(["Người dùng:", data.userInfo.username]);
//   summarySheet.addRow(["Email:", data.userInfo.email]);
//   summarySheet.addRow([
//     "Thời gian:",
//     `${format(data.summary.startDate, "dd/MM/yyyy", { locale: vi })} - ${format(
//       data.summary.endDate,
//       "dd/MM/yyyy",
//       { locale: vi }
//     )}`,
//   ]);
//   summarySheet.addRow([]);

//   // Thống kê tổng quan
//   summarySheet.addRow(["THỐNG KÊ TỔNG QUAN"]);
//   summarySheet.getCell(
//     `A${summarySheet.lastRow?.number ?? summarySheet.rowCount}`
//   ).font = {
//     bold: true,
//     size: 14,
//   };

//   summarySheet.addRow(["Tổng số lần quét:", data.summary.totalScans]);
//   summarySheet.addRow([]);

//   // Chỉ số trung bình
//   summarySheet.addRow(["CHỈ SỐ TRUNG BÌNH"]);
//   summarySheet.getCell(
//     `A${summarySheet.lastRow?.number ?? summarySheet.rowCount}`
//   ).font = {
//     bold: true,
//     size: 14,
//   };

//   const avgData = [
//     ["Nhịp tim:", `${data.summary.avgPulseRate} bpm`],
//     [
//       "Huyết áp:",
//       `${data.summary.avgBloodPressureSystolic}/${data.summary.avgBloodPressureDiastolic} mmHg`,
//     ],
//     ["Độ bão hòa oxy:", `${data.summary.avgOxygenSaturation}%`],
//     ["Mức độ stress:", getLevelText(data.summary.avgStressLevel)],
//     ["Chỉ số sức khỏe:", `${data.summary.avgWellnessIndex}/10`],
//   ];

//   avgData.forEach((row) => summarySheet.addRow(row));

//   // Điều chỉnh độ rộng cột
//   summarySheet.getColumn(1).width = 25;
//   summarySheet.getColumn(2).width = 30;

//   // Tạo sheet chi tiết
//   const detailSheet = workbook.addWorksheet("Chi tiết các lần quét");

//   // Header cho bảng chi tiết
//   const headers = [
//     "STT",
//     "Ngày giờ",
//     "Nhịp tim\n(bpm)",
//     "Huyết áp\n(mmHg)",
//     "SpO2\n(%)",
//     "Nhịp thở\n(lần/phút)",
//     "Stress",
//     "Wellness\nIndex",
//     "Hemoglobin\n(g/dL)",
//     "HbA1c\n(%)",
//     "RMSSD\n(ms)",
//     "SDNN\n(ms)",
//   ];

//   const headerRow = detailSheet.addRow(headers);

//   // Style cho header
//   headerRow.eachCell((cell, colNumber) => {
//     cell.font = { bold: true, size: 11, color: { argb: "FFFFFFFF" } };
//     cell.fill = {
//       type: "pattern",
//       pattern: "solid",
//       fgColor: { argb: "FF0070C0" },
//     };
//     cell.alignment = {
//       vertical: "middle",
//       horizontal: "center",
//       wrapText: true,
//     };
//     cell.border = {
//       top: { style: "thin" },
//       left: { style: "thin" },
//       bottom: { style: "thin" },
//       right: { style: "thin" },
//     };
//   });

//   // Thêm dữ liệu chi tiết
//   data.details.forEach((scan, index) => {
//     const row = detailSheet.addRow([
//       index + 1,
//       format(new Date(scan.createdAt), "dd/MM/yyyy HH:mm"),
//       scan.pulseRate?.value || "N/A",
//       scan.bpValue
//         ? `${scan.bpValue.systolic}/${scan.bpValue.diastolic}`
//         : "N/A",
//       scan.oxygenSaturation?.value || "N/A",
//       scan.respirationRate?.value || "N/A",
//       getLevelText(scan.stressLevel?.value),
//       scan.wellnessIndex?.value || "N/A",
//       scan.hemoglobin?.value?.toFixed(1) || "N/A",
//       scan.hemoglobinA1c?.value?.toFixed(2) || "N/A",
//       scan.rmssd?.value || "N/A",
//       scan.sdnn?.value || "N/A",
//     ]);

//     // Style cho các hàng dữ liệu
//     row.eachCell((cell, colNumber) => {
//       cell.border = {
//         top: { style: "thin" },
//         left: { style: "thin" },
//         bottom: { style: "thin" },
//         right: { style: "thin" },
//       };

//       // Căn giữa cho cột STT và các cột số
//       if ([1, 3, 5, 6, 8, 9, 10, 11, 12].includes(colNumber)) {
//         cell.alignment = { horizontal: "center" };
//       }

//       // Highlight các giá trị bất thường
//       if (colNumber === 3 && typeof cell.value === "number") {
//         // Nhịp tim
//         if (cell.value < 60 || cell.value > 100) {
//           cell.font = { color: { argb: "FFFF0000" } };
//         }
//       }

//       if (colNumber === 5 && typeof cell.value === "number") {
//         // SpO2
//         if (cell.value < 95) {
//           cell.font = { color: { argb: "FFFF0000" } };
//         }
//       }
//     });

//     // Tô màu xen kẽ các hàng
//     if (index % 2 === 1) {
//       row.eachCell((cell) => {
//         cell.fill = {
//           type: "pattern",
//           pattern: "solid",
//           fgColor: { argb: "FFF0F0F0" },
//         };
//       });
//     }
//   });

//   // Set độ rộng cột cho sheet chi tiết
//   detailSheet.getColumn(1).width = 8; // STT
//   detailSheet.getColumn(2).width = 20; // Ngày giờ
//   detailSheet.getColumn(3).width = 12; // Nhịp tim
//   detailSheet.getColumn(4).width = 15; // Huyết áp
//   detailSheet.getColumn(5).width = 10; // SpO2
//   detailSheet.getColumn(6).width = 15; // Nhịp thở
//   detailSheet.getColumn(7).width = 10; // Stress
//   detailSheet.getColumn(8).width = 12; // Wellness
//   detailSheet.getColumn(9).width = 15; // Hemoglobin
//   detailSheet.getColumn(10).width = 12; // HbA1c
//   detailSheet.getColumn(11).width = 12; // RMSSD
//   detailSheet.getColumn(12).width = 12; // SDNN

//   // Set chiều cao cho header row
//   headerRow.height = 35;

//   // Freeze panes
//   detailSheet.views = [
//     { state: "frozen", xSplit: 0, ySplit: 1, topLeftCell: "A2" },
//   ];

//   const buffer = await workbook.xlsx.writeBuffer();
//   return buffer as Buffer;
// }

// Helper function
function getLevelText(value: number | undefined): string {
  if (!value) return "N/A";
  switch (value) {
    case 1:
      return "Low";
    case 2:
      return "Normal";
    case 3:
      return "High";
    default:
      return "N/A";
  }
}

export async function exportHealthReportExcel(data: any): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "JBAAI Health System";
  workbook.lastModifiedBy = "JBAAI Health System";
  workbook.created = new Date();
  workbook.modified = new Date();

  const reportSheet = workbook.addWorksheet("Health Report");

  // Color scheme cho thiết kế chuyên nghiệp
  const colors = {
    primary: "FF2B579A", // Xanh dương đậm
    secondary: "FF4472C4", // Xanh dương nhạt
    accent: "FF70AD47", // Xanh lá
    warning: "FFE74C3C", // Đỏ
    lightBg: "FFF2F2F2", // Xám nhạt
    lighterBg: "FFF8F8F8", // Xám rất nhạt
    headerText: "FFFFFFFF", // Trắng
    darkText: "FF1F1F1F", // Đen
  };

  // Set columns với width tối ưu
  reportSheet.columns = [
    { header: "No.", key: "no", width: 6 },
    { header: "Time", key: "time", width: 18 },
    { header: "Pulse Rate (bpm)", key: "pulseRate", width: 16 },
    { header: "Blood Pressure (mmHg)", key: "bloodPressure", width: 22 },
    { header: "SpO2 (%)", key: "oxygenSaturation", width: 10 },
    { header: "Respiration Rate (bpm)", key: "respirationRate", width: 22 },
    { header: "Stress Level", key: "stressLevel", width: 13 },
    { header: "Wellness Index", key: "wellnessIndex", width: 16 },
    { header: "Hemoglobin (g/dL)", key: "hemoglobin", width: 18 },
    { header: "HbA1c (%)", key: "hemoglobinA1c", width: 11 },
    { header: "RMSSD (ms)", key: "rmssd", width: 13 },
    { header: "SDNN (ms)", key: "sdnn", width: 13 },
    { header: "Heart Age", key: "heartAge", width: 11 },
    { header: "ASCVD Risk (%)", key: "ascvdRisk", width: 16 },
    { header: "PNS Index", key: "pnsIndex", width: 11 },
    { header: "SNS Index", key: "snsIndex", width: 11 },
    { header: "PRQ", key: "prq", width: 10 },
    { header: "LFHF", key: "lfhf", width: 10 },
    { header: "SD1 (ms)", key: "sd1", width: 11 },
    { header: "SD2 (ms)", key: "sd2", width: 11 },
    { header: "Mean RRi (ms)", key: "meanRRi", width: 14 },
    {
      header: "Normalized Stress Index",
      key: "normalizedStressIndex",
      width: 23,
    },
    { header: "PNS Zone", key: "pnsZone", width: 11 },
    { header: "SNS Zone", key: "snsZone", width: 11 },
    { header: "Stress Index", key: "stressIndex", width: 14 },
    { header: "Wellness Level", key: "wellnessLevel", width: 16 },
    { header: "High BP Risk", key: "highBloodPressureRisk", width: 14 },
    { header: "High Glucose Risk", key: "highFastingGlucoseRisk", width: 17 },
    { header: "High HbA1c Risk", key: "highHemoglobinA1cRisk", width: 17 },
    {
      header: "High Cholesterol Risk",
      key: "highTotalCholesterolRisk",
      width: 20,
    },
    { header: "Low Hemoglobin Risk", key: "lowHemoglobinRisk", width: 19 },
  ];

  // HEADER SECTION - Logo space và tiêu đề chính
  const titleRow = reportSheet.insertRow(1, []);
  reportSheet.mergeCells("A1:AE1");
  reportSheet.getRow(1).height = 45;

  const titleRow2 = reportSheet.insertRow(2, [`HEALTH MONITORING REPORT`]);
  reportSheet.mergeCells("A2:AE2");
  const mainTitleCell = reportSheet.getCell("A2");
  mainTitleCell.font = {
    name: "Arial",
    size: 20,
    bold: true,
    color: { argb: colors.primary },
  };
  mainTitleCell.alignment = {
    vertical: "middle",
    horizontal: "center",
  };
  reportSheet.getRow(2).height = 35;

  // Sub-title với tháng/năm
  const subtitleRow = reportSheet.insertRow(3, [`${data.month}/${data.year}`]);
  reportSheet.mergeCells("A3:AE3");
  const subtitleCell = reportSheet.getCell("A3");
  subtitleCell.font = {
    name: "Arial",
    size: 16,
    color: { argb: colors.secondary },
  };
  subtitleCell.alignment = {
    vertical: "middle",
    horizontal: "center",
  };
  reportSheet.getRow(3).height = 25;

  // Divider
  reportSheet.insertRow(4, []);
  reportSheet.getRow(4).height = 10;

  // PATIENT INFORMATION SECTION
  const infoHeaderRow = reportSheet.insertRow(5, ["PATIENT INFORMATION"]);
  reportSheet.mergeCells("A5:E5");
  const infoHeaderCell = reportSheet.getCell("A5");
  infoHeaderCell.font = {
    name: "Arial",
    size: 14,
    bold: true,
    color: { argb: colors.headerText },
  };
  infoHeaderCell.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: colors.secondary },
  };
  infoHeaderCell.alignment = {
    vertical: "middle",
    horizontal: "left",
    indent: 1,
  };
  reportSheet.getRow(5).height = 30;

  // Patient details với styling
  const patientDetails = [
    ["Patient Name:", data.healthData[0].userId.username],
    ["Email:", data.healthData[0].userId.email],
    [
      "Monitoring Period:",
      `${format(data.healthData[0].createdAt, "dd/MM/yyyy", {
        locale: vi,
      })} - ${format(
        data.healthData[data.healthData.length - 1].createdAt,
        "dd/MM/yyyy",
        { locale: vi }
      )}`,
    ],
  ];

  patientDetails.forEach((detail, index) => {
    const row = reportSheet.insertRow(6 + index, detail);
    row.getCell(1).font = { bold: true, color: { argb: colors.darkText } };
    row.getCell(2).font = { color: { argb: colors.darkText } };
    row.height = 22;

    // Background màu xen kẽ
    if (index % 2 === 0) {
      for (let i = 1; i <= 5; i++) {
        row.getCell(i).fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: colors.lighterBg },
        };
      }
    }
  });

  // STATISTICS SECTION
  reportSheet.insertRow(9, []);
  const statsHeaderRow = reportSheet.insertRow(10, ["SCANNING STATISTICS"]);
  reportSheet.mergeCells("A10:E10");
  const statsHeaderCell = reportSheet.getCell("A10");
  statsHeaderCell.font = {
    name: "Arial",
    size: 14,
    bold: true,
    color: { argb: colors.headerText },
  };
  statsHeaderCell.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: colors.accent },
  };
  statsHeaderCell.alignment = {
    vertical: "middle",
    horizontal: "left",
    indent: 1,
  };
  reportSheet.getRow(10).height = 30;

  // Tính toán thống kê
  const daysInMonth = new Date(data.year, data.month, 0).getDate();
  const scanDates = new Set(
    data.healthData.map((scan: any) =>
      format(new Date(scan.createdAt), "dd/MM/yyyy")
    )
  );
  const daysWithScans = scanDates.size;
  const scanPercentage = ((daysWithScans / daysInMonth) * 100).toFixed(1);

  const statistics = [
    ["Total Scans:", data.totalScans],
    [
      "Days with Scans:",
      `${daysWithScans} / ${daysInMonth} days (${scanPercentage}%)`,
    ],
    ["Average Scans per Day:", (data.totalScans / daysWithScans).toFixed(1)],
  ];

  statistics.forEach((stat, index) => {
    const row = reportSheet.insertRow(11 + index, stat);
    row.getCell(1).font = { bold: true, color: { argb: colors.darkText } };
    row.getCell(2).font = {
      color: { argb: colors.darkText },
      bold: index === 1, // Bold cho dòng Days with Scans
    };
    row.height = 22;

    // Background màu xen kẽ
    if (index % 2 === 0) {
      for (let i = 1; i <= 5; i++) {
        row.getCell(i).fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: colors.lighterBg },
        };
      }
    }
  });

  // Spacing trước bảng chính
  reportSheet.insertRow(14, []);
  reportSheet.insertRow(15, []);

  // DETAILED DATA SECTION HEADER
  const dataHeaderRow = reportSheet.insertRow(16, [
    "DETAILED HEALTH MEASUREMENTS",
  ]);
  reportSheet.mergeCells("A16:AE16");
  const dataHeaderCell = reportSheet.getCell("A16");
  dataHeaderCell.font = {
    name: "Arial",
    size: 14,
    bold: true,
    color: { argb: colors.headerText },
  };
  dataHeaderCell.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: colors.primary },
  };
  dataHeaderCell.alignment = {
    vertical: "middle",
    horizontal: "center",
  };
  reportSheet.getRow(16).height = 35;

  reportSheet.insertRow(17, []); // Spacing

  // Table header với styling cao cấp
  const headerRow = reportSheet.getRow(18);
  headerRow.height = 40;

  headerRow.eachCell((cell, colNumber) => {
    cell.font = {
      name: "Arial",
      size: 10,
      bold: true,
      color: { argb: colors.headerText },
    };
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: colors.primary },
    };
    cell.alignment = {
      horizontal: "center",
      vertical: "middle",
      wrapText: true,
    };
    cell.border = {
      top: { style: "medium", color: { argb: colors.primary } },
      left: { style: "thin", color: { argb: colors.headerText } },
      bottom: { style: "medium", color: { argb: colors.primary } },
      right: { style: "thin", color: { argb: colors.headerText } },
    };
  });

  // Data rows với conditional formatting
  data.healthData.forEach((scan: any, index: number) => {
    const rowData = {
      no: index + 1,
      time: format(new Date(scan.createdAt), "dd/MM/yyyy HH:mm"),
      pulseRate: scan.pulseRate?.value || "N/A",
      bloodPressure: scan.bpValue
        ? `${scan.bpValue.systolic}/${scan.bpValue.diastolic}`
        : "N/A",
      oxygenSaturation: scan.oxygenSaturation?.value || "N/A",
      respirationRate: scan.respirationRate?.value || "N/A",
      stressLevel: getLevelText(scan.stressLevel?.value),
      wellnessIndex: scan.wellnessIndex?.value || "N/A",
      hemoglobin: scan.hemoglobin?.value?.toFixed(1) || "N/A",
      hemoglobinA1c: scan.hemoglobinA1c?.value?.toFixed(2) || "N/A",
      rmssd: scan.rmssd?.value || "N/A",
      sdnn: scan.sdnn?.value || "N/A",
      heartAge: scan.heartAge?.value || "N/A",
      ascvdRisk: scan.ascvdRisk?.value?.toFixed(1) || "N/A",
      pnsIndex: scan.pnsIndex?.value || "N/A",
      snsIndex: scan.snsIndex?.value || "N/A",
      prq: scan.prq?.value || "N/A",
      lfhf: scan.lfhf?.value || "N/A",
      sd1: scan.sd1?.value || "N/A",
      sd2: scan.sd2?.value || "N/A",
      meanRRi: scan.meanRRi?.value || "N/A",
      normalizedStressIndex: scan.normalizedStressIndex?.value || "N/A",
      pnsZone: getLevelText(scan.pnsZone?.value),
      snsZone: getLevelText(scan.snsZone?.value),
      stressIndex: scan.stressIndex?.value || "N/A",
      wellnessLevel: scan.wellnessLevel?.value || "N/A",
      highBloodPressureRisk: getLevelText(scan.highBloodPressureRisk?.value),
      highFastingGlucoseRisk: getLevelText(scan.highFastingGlucoseRisk?.value),
      highHemoglobinA1cRisk: getLevelText(scan.highHemoglobinA1cRisk?.value),
      highTotalCholesterolRisk: getLevelText(
        scan.highTotalCholesterolRisk?.value
      ),
      lowHemoglobinRisk: getLevelText(scan.lowHemoglobinRisk?.value),
    };

    const row = reportSheet.addRow(rowData);
    row.height = 20;

    // Styling cho từng cell
    row.eachCell((cell, colNumber) => {
      // Border nhẹ
      cell.border = {
        top: { style: "thin", color: { argb: "FFE0E0E0" } },
        left: { style: "thin", color: { argb: "FFE0E0E0" } },
        bottom: { style: "thin", color: { argb: "FFE0E0E0" } },
        right: { style: "thin", color: { argb: "FFE0E0E0" } },
      };

      // Font và alignment
      cell.font = {
        name: "Arial",
        size: 10,
        color: { argb: colors.darkText },
      };

      // Căn giữa cho các cột số, trái cho time
      if (colNumber === 2) {
        cell.alignment = { horizontal: "left", vertical: "middle" };
      } else {
        cell.alignment = { horizontal: "center", vertical: "middle" };
      }

      // Conditional formatting cho các giá trị bất thường
      // Pulse rate
      if (colNumber === 3 && typeof cell.value === "number") {
        if (cell.value < 60 || cell.value > 100) {
          cell.font = {
            color: { argb: colors.warning },
            bold: true,
            size: 10,
            name: "Arial",
          };
          cell.fill = {
            type: "pattern",
            pattern: "solid",
            fgColor: { argb: "FFFFEAA7" },
          };
        }
      }

      // SpO2
      if (colNumber === 5 && typeof cell.value === "number") {
        if (cell.value < 95) {
          cell.font = {
            color: { argb: colors.warning },
            bold: true,
            size: 10,
            name: "Arial",
          };
          cell.fill = {
            type: "pattern",
            pattern: "solid",
            fgColor: { argb: "FFFFEAA7" },
          };
        }
      }

      // Blood pressure
      if (
        colNumber === 4 &&
        typeof cell.value === "string" &&
        cell.value !== "N/A"
      ) {
        const [systolic, diastolic] = cell.value.split("/").map(Number);
        if (systolic > 130 || diastolic > 80) {
          cell.font = {
            color: { argb: colors.warning },
            bold: true,
            size: 10,
            name: "Arial",
          };
          cell.fill = {
            type: "pattern",
            pattern: "solid",
            fgColor: { argb: "FFFFEAA7" },
          };
        }
      }

      // Stress Level highlighting
      if (colNumber === 7 && typeof cell.value === "string") {
        if (cell.value === "High" || cell.value === "Very High") {
          cell.font = {
            color: { argb: colors.warning },
            bold: true,
            size: 10,
            name: "Arial",
          };
        } else if (cell.value === "Low") {
          cell.font = {
            color: { argb: colors.accent },
            bold: true,
            size: 10,
            name: "Arial",
          };
        }
      }
    });

    // Alternating row colors
    if (index % 2 === 1) {
      row.eachCell((cell) => {
        // Giữ nguyên conditional formatting, chỉ đổi màu nền cho cells bình thường
        if (
          !cell.fill ||
          (cell.fill.type === "pattern" &&
            (cell.fill as ExcelJS.FillPattern).fgColor?.argb !== "FFFFEAA7")
        ) {
          cell.fill = {
            type: "pattern",
            pattern: "solid",
            fgColor: { argb: colors.lightBg },
          };
        }
      });
    }
  });

  // Footer với thông tin tạo báo cáo
  const lastDataRow = reportSheet.lastRow?.number ?? reportSheet.rowCount;
  reportSheet.insertRow(lastDataRow + 2, []);
  const footerRow = reportSheet.insertRow(lastDataRow + 3, [
    `Report generated on ${format(new Date(), "dd/MM/yyyy HH:mm:ss", {
      locale: vi,
    })} by JBAAI Health System`,
  ]);
  reportSheet.mergeCells(`A${lastDataRow + 3}:AE${lastDataRow + 3}`);
  const footerCell = reportSheet.getCell(`A${lastDataRow + 3}`);
  footerCell.font = {
    name: "Arial",
    size: 9,
    italic: true,
    color: { argb: "FF666666" },
  };
  footerCell.alignment = {
    horizontal: "center",
    vertical: "middle",
  };

  // Page setup cho in ấn
  reportSheet.pageSetup = {
    paperSize: 9, // A4
    orientation: "landscape",
    fitToPage: true,
    fitToWidth: 1,
    fitToHeight: 0,
    margins: {
      left: 0.25,
      right: 0.25,
      top: 0.75,
      bottom: 0.75,
      header: 0.3,
      footer: 0.3,
    },
  };

  // Freeze panes tại header của bảng dữ liệu
  reportSheet.views = [
    {
      state: "frozen",
      xSplit: 2, // Freeze 2 cột đầu (No. và Time)
      ySplit: 18, // Freeze đến header row
      topLeftCell: "C19",
    },
  ];

  // Print area
  reportSheet.pageSetup.printArea = `A1:AE${lastDataRow + 3}`;

  // Trả về buffer
  const buffer = await workbook.xlsx.writeBuffer();
  return buffer as Buffer;
}
