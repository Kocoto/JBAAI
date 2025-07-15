import ExcelJS from "exceljs";
import { format } from "date-fns";
import { vi } from "date-fns/locale";

// export interface MonthlyHealthReportData {
//   summary: {
//     month: number;
//     year: number;
//     totalScans: number;
//     startDate: Date;
//     endDate: Date;
//     avgPulseRate: number;
//     avgBloodPressureSystolic: number;
//     avgBloodPressureDiastolic: number;
//     avgOxygenSaturation: number;
//     avgStressLevel: number;
//     avgWellnessIndex: number;
//   };
//   details: any[];
//   userInfo: {
//     username: string;
//     email: string;
//   };
// }

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

export async function exportHealthReportExcel(data: {
  month: number;
  year: number;
  healthData: any[];
  totalScans: number;
}): Promise<Buffer> {
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
    purple: "FF60497A", // Màu tím mới thêm
    lightBg: "FFF2F2F2", // Xám nhạt
    lighterBg: "FFF8F8F8", // Xám rất nhạt
    headerText: "FFFFFFFF", // Trắng
    darkText: "FF1F1F1F", // Đen
  };

  // // Set columns với width tối ưu
  // reportSheet.columns = [
  //   { header: "No.", key: "no", width: 24 },
  //   { header: "Time", key: "time", width: 24 },
  //   { header: "Pulse Rate (bpm)", key: "pulseRate", width: 16 },
  //   { header: "Blood Pressure (mmHg)", key: "bloodPressure", width: 22 },
  //   { header: "SpO2 (%)", key: "oxygenSaturation", width: 10 },
  //   { header: "Respiration Rate (bpm)", key: "respirationRate", width: 22 },
  //   { header: "Stress Level", key: "stressLevel", width: 13 },
  //   { header: "Wellness Index", key: "wellnessIndex", width: 16 },
  //   { header: "Hemoglobin (g/dL)", key: "hemoglobin", width: 18 },
  //   { header: "HbA1c (%)", key: "hemoglobinA1c", width: 11 },
  //   { header: "RMSSD (ms)", key: "rmssd", width: 13 },
  //   { header: "SDNN (ms)", key: "sdnn", width: 13 },
  //   { header: "Heart Age", key: "heartAge", width: 11 },
  //   { header: "ASCVD Risk (%)", key: "ascvdRisk", width: 16 },
  //   { header: "PNS Index", key: "pnsIndex", width: 11 },
  //   { header: "SNS Index", key: "snsIndex", width: 11 },
  //   { header: "PRQ", key: "prq", width: 10 },
  //   { header: "LFHF", key: "lfhf", width: 10 },
  //   { header: "SD1 (ms)", key: "sd1", width: 11 },
  //   { header: "SD2 (ms)", key: "sd2", width: 11 },
  //   { header: "Mean RRi (ms)", key: "meanRRi", width: 14 },
  //   {
  //     header: "Normalized Stress Index",
  //     key: "normalizedStressIndex",
  //     width: 23,
  //   },
  //   { header: "PNS Zone", key: "pnsZone", width: 11 },
  //   { header: "SNS Zone", key: "snsZone", width: 11 },
  //   { header: "Stress Index", key: "stressIndex", width: 14 },
  //   { header: "Wellness Level", key: "wellnessLevel", width: 16 },
  //   { header: "High BP Risk", key: "highBloodPressureRisk", width: 14 },
  //   { header: "High Glucose Risk", key: "highFastingGlucoseRisk", width: 17 },
  //   { header: "High HbA1c Risk", key: "highHemoglobinA1cRisk", width: 17 },
  //   {
  //     header: "High Cholesterol Risk",
  //     key: "highTotalCholesterolRisk",
  //     width: 20,
  //   },
  //   { header: "Low Hemoglobin Risk", key: "lowHemoglobinRisk", width: 19 },
  // ];

  const titleRow2 = reportSheet.insertRow(1, []);
  reportSheet.mergeCells("C1:F1");
  const mainTitleCell = reportSheet.getCell("C1");
  mainTitleCell.value = `HEALTH MONITORING REPORT`;
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
  reportSheet.getRow(1).height = 35;

  // Sub-title với tháng/năm
  const subtitleRow = reportSheet.insertRow(2, []);
  reportSheet.mergeCells("C2:F2");
  const subtitleCell = reportSheet.getCell("C2");
  subtitleCell.value = `${data.month}/${data.year}`;
  subtitleCell.font = {
    name: "Arial",
    size: 16,
    color: { argb: colors.secondary },
  };
  subtitleCell.alignment = {
    vertical: "middle",
    horizontal: "center",
  };
  reportSheet.getRow(2).height = 25;

  // Divider
  reportSheet.insertRow(3, []);
  reportSheet.getRow(3).height = 10;

  const infoHeaderRow = reportSheet.insertRow(4, []);
  infoHeaderRow.height = 30;

  // Tiêu đề "PATIENT INFORMATION"
  reportSheet.mergeCells("A4:B4");
  const infoHeaderCell = reportSheet.getCell("A4");
  infoHeaderCell.value = "PATIENT INFORMATION";
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
  infoHeaderCell.alignment = { vertical: "middle", horizontal: "center" };

  // Tiêu đề "SCAN STATISTICS"
  reportSheet.mergeCells("D4:F4");
  const statsHeaderCell = reportSheet.getCell("D4");
  statsHeaderCell.value = "SCAN STATISTICS";
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
  statsHeaderCell.alignment = { vertical: "middle", horizontal: "center" };

  // Tính toán thống kê
  const daysInMonth = new Date(data.year, data.month, 0).getDate();
  const scanDates = new Set(
    data.healthData.map((scan: any) =>
      format(new Date(scan.createdAt), "dd/MM/yyyy")
    )
  );
  const daysWithScans = scanDates.size;
  const scanPercentage =
    daysWithScans > 0
      ? ((daysWithScans / daysInMonth) * 100).toFixed(1)
      : "0.0";
  const avgScansPerDay =
    daysWithScans > 0 ? (data.totalScans / daysWithScans).toFixed(1) : "0.0";

  // Dữ liệu thông tin và thống kê
  const row5 = reportSheet.addRow([
    "Full Name:",
    data.healthData[0]?.userId.username || "N/A",
    null,
    "Total Scans:",
    data.totalScans,
  ]);

  const row6 = reportSheet.addRow([
    "Email:",
    data.healthData[0]?.userId.email || "N/A",
    null,
    "Days with Scans:",
    `${daysWithScans}/${daysInMonth} days (${scanPercentage}%)`,
  ]);
  const row7 = reportSheet.addRow([
    "Monitoring Period:",
    data.healthData.length > 0
      ? `${format(new Date(data.healthData[0].createdAt), "dd/MM/yyyy", {
          locale: vi,
        })} - ${format(
          new Date(data.healthData[data.healthData.length - 1].createdAt),
          "dd/MM/yyyy",
          { locale: vi }
        )}`
      : "N/A",
    null,
    "Avg Scans/Day:",
    avgScansPerDay,
  ]);

  // Tính toán chiều rộng cột B dựa trên giá trị của ô B6, bạn có thể sử dụng một trong các phương pháp sau:

  // Định dạng cho các dòng thông tin
  [row5, row6, row7].forEach((row, index) => {
    row.height = 22;

    // Cột A, D (Nhãn)
    [row.getCell(1), row.getCell(4)].forEach((cell) => {
      cell.font = {
        bold: true,
        color: { argb: colors.darkText },
        name: "Arial",
        size: 10,
      };
      cell.border = {
        top: { style: "thin" },
        left: { style: "thin" },
        bottom: { style: "thin" },
        right: { style: "thin" },
      };
    });

    // Cột B, E, F (Giá trị)
    [row.getCell(2), row.getCell(5), row.getCell(6)].forEach((cell) => {
      cell.font = { color: { argb: colors.darkText }, name: "Arial", size: 10 };
      cell.alignment = {
        vertical: "middle",
        horizontal: "center",
      };
      cell.border = {
        top: { style: "thin" },
        left: { style: "thin" },
        bottom: { style: "thin" },
        right: { style: "thin" },
      };
    });

    reportSheet.mergeCells(`E${row.number}:F${row.number}`); // Gộp cột cho giá trị thống kê

    // Màu nền xen kẽ
    if (index % 2 !== 0) {
      ["A", "B", "D", "E", "F"].forEach((col) => {
        row.getCell(col).fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: colors.lighterBg },
        };
      });
    }
  });

  // Spacing trước bảng chính
  reportSheet.insertRow(8, []);

  // DETAILED DATA SECTION HEADER - Bắt đầu từ ô C9
  const dataHeaderRow = reportSheet.insertRow(9, []);
  reportSheet.getRow(9).height = 35;

  reportSheet.mergeCells("A9:B9");
  const A9 = reportSheet.getCell("A9");
  A9.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: colors.primary },
  };

  // Merge cells từ C9 đến AE9 và set giá trị
  reportSheet.mergeCells("C9:AE9");
  const dataHeaderCell = reportSheet.getCell("C9");
  dataHeaderCell.value = "DETAILED HEALTH MEASUREMENTS";

  // Styling cho header
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
    horizontal: "left", // Căn trái như bạn muốn
  };

  // Thêm border cho header
  dataHeaderCell.border = {
    top: { style: "medium", color: { argb: colors.primary } },
    left: { style: "medium", color: { argb: colors.primary } },
    bottom: { style: "medium", color: { argb: colors.primary } },
    right: { style: "medium", color: { argb: colors.primary } },
  };
  reportSheet.getColumn(1).width = 23; // No.
  reportSheet.getColumn(2); // Time
  reportSheet.getColumn(3).width = 16; // Pulse Rate
  reportSheet.getColumn(4).width = 20; // Blood Pressure
  reportSheet.getColumn(5).width = 10; // SpO2
  reportSheet.getColumn(6).width = 15; // Respiration Rate
  reportSheet.getColumn(7).width = 10; // Stress Level
  reportSheet.getColumn(8).width = 12; // Wellness Index
  reportSheet.getColumn(9).width = 15; // Hemoglobin
  reportSheet.getColumn(10).width = 12; // HbA1c
  reportSheet.getColumn(11).width = 12; // RMSSD
  reportSheet.getColumn(12).width = 12; // SDNN
  reportSheet.getColumn(13).width = 11; // Heart Age
  reportSheet.getColumn(14).width = 14; // ASCVD Risk
  reportSheet.getColumn(15).width = 11; // PNS Index
  reportSheet.getColumn(16).width = 11; // SNS Index
  reportSheet.getColumn(17).width = 10; // PRQ
  reportSheet.getColumn(18).width = 10; // LFHF
  reportSheet.getColumn(19).width = 11; // SD1
  reportSheet.getColumn(20).width = 11; // SD2
  reportSheet.getColumn(21).width = 14; // Mean RRi
  reportSheet.getColumn(22).width = 20; // Normalized Stress Index
  reportSheet.getColumn(23).width = 11; // PNS Zone
  reportSheet.getColumn(24).width = 11; // SNS Zone
  reportSheet.getColumn(25).width = 14; // Stress Index
  reportSheet.getColumn(26).width = 14; // Wellness Level
  reportSheet.getColumn(27).width = 14; // High BP Risk
  reportSheet.getColumn(28).width = 16; // High Glucose Risk
  reportSheet.getColumn(29).width = 16; // High HbA1c Risk
  reportSheet.getColumn(30).width = 18; // High Cholesterol Risk
  reportSheet.getColumn(31).width = 17; // Low Hemoglobin Risk

  // Tại dòng 10, tự tạo header row
  const headerRow = reportSheet.getRow(10);
  headerRow.values = [
    "No.",
    "Time",
    "Pulse Rate (bpm)",
    "Blood Pressure (mmHg)",
    "SpO2 (%)",
    "Respiration Rate (bpm)",
    "Stress Level",
    "Wellness Index",
    "Hemoglobin (g/dL)",
    "HbA1c (%)",
    "RMSSD (ms)",
    "SDNN (ms)",
    "Heart Age",
    "ASCVD Risk (%)",
    "PNS Index",
    "SNS Index",
    "PRQ",
    "LFHF",
    "SD1 (ms)",
    "SD2 (ms)",
    "Mean RRi (ms)",
    "Normalized Stress Index",
    "PNS Zone",
    "SNS Zone",
    "Stress Index",
    "Wellness Level",
    "High BP Risk",
    "High Glucose Risk",
    "High HbA1c Risk",
    "High Cholesterol Risk",
    "Low Hemoglobin Risk",
  ];
  headerRow.height = 40;

  // Styling cho header (thay đổi tại dòng ~572)
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
      fgColor: { argb: colors.purple }, // Sử dụng màu tím thay vì colors.primary
    };
    cell.alignment = {
      horizontal: "center",
      vertical: "middle",
      wrapText: true,
    };
    cell.border = {
      top: { style: "medium", color: { argb: colors.purple } }, // Cập nhật border
      left: { style: "thin", color: { argb: colors.headerText } },
      bottom: { style: "medium", color: { argb: colors.purple } }, // Cập nhật border
      right: { style: "thin", color: { argb: colors.headerText } },
    };
  });

  const b6Value = reportSheet.getCell("B6").value?.toString() || "";
  const calculatedWidth = Math.max(15, Math.min(50, b6Value.length * 1.2)); // Min 15, Max 50
  reportSheet.getColumn(2).width = calculatedWidth;

  // Data rows với conditional formatting
  data.healthData.forEach((scan: any, index: number) => {
    const rowData = [
      index + 1,
      format(new Date(scan.createdAt), "dd/MM/yyyy HH:mm"),
      scan.pulseRate?.value || "N/A",
      scan.bpValue
        ? `${scan.bpValue.systolic}/${scan.bpValue.diastolic}`
        : "N/A",
      scan.oxygenSaturation?.value || "N/A",
      scan.respirationRate?.value || "N/A",
      getLevelText(scan.stressLevel?.value),
      scan.wellnessIndex?.value || "N/A",
      scan.hemoglobin?.value?.toFixed(1) || "N/A",
      scan.hemoglobinA1c?.value?.toFixed(2) || "N/A",
      scan.rmssd?.value || "N/A",
      scan.sdnn?.value || "N/A",
      scan.heartAge?.value || "N/A",
      scan.ascvdRisk?.value?.toFixed(1) || "N/A",
      scan.pnsIndex?.value || "N/A",
      scan.snsIndex?.value || "N/A",
      scan.prq?.value || "N/A",
      scan.lfhf?.value || "N/A",
      scan.sd1?.value || "N/A",
      scan.sd2?.value || "N/A",
      scan.meanRRi?.value || "N/A",
      scan.normalizedStressIndex?.value || "N/A",
      getLevelText(scan.pnsZone?.value),
      getLevelText(scan.snsZone?.value),
      scan.stressIndex?.value || "N/A",
      scan.wellnessLevel?.value || "N/A",
      getLevelText(scan.highBloodPressureRisk?.value),
      getLevelText(scan.highFastingGlucoseRisk?.value),
      getLevelText(scan.highHemoglobinA1cRisk?.value),
      getLevelText(scan.highTotalCholesterolRisk?.value),
      getLevelText(scan.lowHemoglobinRisk?.value),
    ];

    const row = reportSheet.addRow(rowData);
    row.height = 20;

    // Styling for each cell
    row.eachCell((cell, colNumber) => {
      // Light border
      cell.border = {
        top: { style: "thin", color: { argb: "FFE0E0E0" } },
        left: { style: "thin", color: { argb: "FFE0E0E0" } },
        bottom: { style: "thin", color: { argb: "FFE0E0E0" } },
        right: { style: "thin", color: { argb: "FFE0E0E0" } },
      };

      // Font and alignment
      cell.font = {
        name: "Arial",
        size: 10,
        color: { argb: colors.darkText },
      };

      // Center align for number columns, center for time
      if (colNumber === 2) {
        cell.alignment = { horizontal: "center", vertical: "middle" };
      } else {
        cell.alignment = { horizontal: "center", vertical: "middle" };
      }

      // Conditional formatting for abnormal values
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
        // Keep conditional formatting, only change background for normal cells
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

  // Footer with report generation info
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

  // Page setup for printing
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

  // Freeze panes at data table header
  reportSheet.views = [
    {
      state: "frozen",
      xSplit: 2, // Freeze first 2 columns (No. and Time)
      ySplit: 18, // Freeze to header row
      topLeftCell: "C19",
    },
  ];

  // Print area
  reportSheet.pageSetup.printArea = `A1:AE${lastDataRow + 3}`;

  // Return buffer
  const buffer = await workbook.xlsx.writeBuffer();
  return buffer as Buffer;
}
