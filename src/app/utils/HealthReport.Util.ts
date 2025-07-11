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

export async function generateMonthlyHealthExcel(
  data: MonthlyHealthReportData
): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "JBAAI Health System";
  workbook.lastModifiedBy = "JBAAI Health System";
  workbook.created = new Date();
  workbook.modified = new Date();

  // Tạo sheet tổng quan
  const summarySheet = workbook.addWorksheet("Tổng quan");

  // Tiêu đề báo cáo
  summarySheet.addRow([
    `BÁO CÁO SỨC KHỎE THÁNG ${data.summary.month}/${data.summary.year}`,
  ]);
  summarySheet.mergeCells("A1:E1");
  const titleCell = summarySheet.getCell("A1");
  titleCell.font = {
    name: "Arial",
    size: 16,
    bold: true,
    color: { argb: "FF0070C0" },
  };
  titleCell.alignment = {
    vertical: "middle",
    horizontal: "center",
  };

  // Thông tin người dùng
  summarySheet.addRow([]);
  summarySheet.addRow(["Người dùng:", data.userInfo.username]);
  summarySheet.addRow(["Email:", data.userInfo.email]);
  summarySheet.addRow([
    "Thời gian:",
    `${format(data.summary.startDate, "dd/MM/yyyy", { locale: vi })} - ${format(
      data.summary.endDate,
      "dd/MM/yyyy",
      { locale: vi }
    )}`,
  ]);
  summarySheet.addRow([]);

  // Thống kê tổng quan
  summarySheet.addRow(["THỐNG KÊ TỔNG QUAN"]);
  summarySheet.getCell(
    `A${summarySheet.lastRow?.number ?? summarySheet.rowCount}`
  ).font = {
    bold: true,
    size: 14,
  };

  summarySheet.addRow(["Tổng số lần quét:", data.summary.totalScans]);
  summarySheet.addRow([]);

  // Chỉ số trung bình
  summarySheet.addRow(["CHỈ SỐ TRUNG BÌNH"]);
  summarySheet.getCell(
    `A${summarySheet.lastRow?.number ?? summarySheet.rowCount}`
  ).font = {
    bold: true,
    size: 14,
  };

  const avgData = [
    ["Nhịp tim:", `${data.summary.avgPulseRate} bpm`],
    [
      "Huyết áp:",
      `${data.summary.avgBloodPressureSystolic}/${data.summary.avgBloodPressureDiastolic} mmHg`,
    ],
    ["Độ bão hòa oxy:", `${data.summary.avgOxygenSaturation}%`],
    ["Mức độ stress:", getLevelText(data.summary.avgStressLevel)],
    ["Chỉ số sức khỏe:", `${data.summary.avgWellnessIndex}/10`],
  ];

  avgData.forEach((row) => summarySheet.addRow(row));

  // Điều chỉnh độ rộng cột
  summarySheet.getColumn(1).width = 25;
  summarySheet.getColumn(2).width = 30;

  // Tạo sheet chi tiết
  const detailSheet = workbook.addWorksheet("Chi tiết các lần quét");

  // Header cho bảng chi tiết
  const headers = [
    "STT",
    "Ngày giờ",
    "Nhịp tim\n(bpm)",
    "Huyết áp\n(mmHg)",
    "SpO2\n(%)",
    "Nhịp thở\n(lần/phút)",
    "Stress",
    "Wellness\nIndex",
    "Hemoglobin\n(g/dL)",
    "HbA1c\n(%)",
    "RMSSD\n(ms)",
    "SDNN\n(ms)",
  ];

  const headerRow = detailSheet.addRow(headers);

  // Style cho header
  headerRow.eachCell((cell, colNumber) => {
    cell.font = { bold: true, size: 11, color: { argb: "FFFFFFFF" } };
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF0070C0" },
    };
    cell.alignment = {
      vertical: "middle",
      horizontal: "center",
      wrapText: true,
    };
    cell.border = {
      top: { style: "thin" },
      left: { style: "thin" },
      bottom: { style: "thin" },
      right: { style: "thin" },
    };
  });

  // Thêm dữ liệu chi tiết
  data.details.forEach((scan, index) => {
    const row = detailSheet.addRow([
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
    ]);

    // Style cho các hàng dữ liệu
    row.eachCell((cell, colNumber) => {
      cell.border = {
        top: { style: "thin" },
        left: { style: "thin" },
        bottom: { style: "thin" },
        right: { style: "thin" },
      };

      // Căn giữa cho cột STT và các cột số
      if ([1, 3, 5, 6, 8, 9, 10, 11, 12].includes(colNumber)) {
        cell.alignment = { horizontal: "center" };
      }

      // Highlight các giá trị bất thường
      if (colNumber === 3 && typeof cell.value === "number") {
        // Nhịp tim
        if (cell.value < 60 || cell.value > 100) {
          cell.font = { color: { argb: "FFFF0000" } };
        }
      }

      if (colNumber === 5 && typeof cell.value === "number") {
        // SpO2
        if (cell.value < 95) {
          cell.font = { color: { argb: "FFFF0000" } };
        }
      }
    });

    // Tô màu xen kẽ các hàng
    if (index % 2 === 1) {
      row.eachCell((cell) => {
        cell.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: "FFF0F0F0" },
        };
      });
    }
  });

  // Set độ rộng cột cho sheet chi tiết
  detailSheet.getColumn(1).width = 8; // STT
  detailSheet.getColumn(2).width = 20; // Ngày giờ
  detailSheet.getColumn(3).width = 12; // Nhịp tim
  detailSheet.getColumn(4).width = 15; // Huyết áp
  detailSheet.getColumn(5).width = 10; // SpO2
  detailSheet.getColumn(6).width = 15; // Nhịp thở
  detailSheet.getColumn(7).width = 10; // Stress
  detailSheet.getColumn(8).width = 12; // Wellness
  detailSheet.getColumn(9).width = 15; // Hemoglobin
  detailSheet.getColumn(10).width = 12; // HbA1c
  detailSheet.getColumn(11).width = 12; // RMSSD
  detailSheet.getColumn(12).width = 12; // SDNN

  // Set chiều cao cho header row
  headerRow.height = 35;

  // Freeze panes
  detailSheet.views = [
    { state: "frozen", xSplit: 0, ySplit: 1, topLeftCell: "A2" },
  ];

  const buffer = await workbook.xlsx.writeBuffer();
  return buffer as Buffer;
}

// Helper function
function getLevelText(value: number | undefined): string {
  if (!value) return "N/A";
  switch (value) {
    case 1:
      return "Thấp";
    case 2:
      return "Bình thường";
    case 3:
      return "Cao";
    default:
      return "N/A";
  }
}

export async function exportExcel(data: any): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "JBAAI Health System";
  workbook.lastModifiedBy = "JBAAI Health System";
  workbook.created = new Date();
  workbook.modified = new Date();
  const reportSheet = workbook.addWorksheet("Health Report");

  // reportSheet.addRow([
  //   `HEALTH REPORT FOR ${data.month}/${data.year} - ${data.healthData[0].userId.username}`,
  // ]);
  reportSheet.mergeCells("A1:E1");
  const titleCell = reportSheet.getCell("A1");
  titleCell.font = {
    name: "Arial",
    size: 16,
    bold: true,
    color: { argb: "FF0070C0" },
  };
  titleCell.alignment = {
    vertical: "middle",
    horizontal: "center",
  };

  // Thông tin người dùng
  reportSheet.addRow([]);
  reportSheet.addRow(["Người dùng:", data.healthData[0].userId.username]);
  reportSheet.addRow(["Email:", data.healthData[0].userId.email]);
  reportSheet.addRow([
    "Thời gian:",
    `${format(data.healthData[0].createdAt, "dd/MM/yyyy", {
      locale: vi,
    })} - ${format(
      data.healthData[data.healthData.length - 1].createdAt,
      "dd/MM/yyyy"
      //   { locale: vi }
    )}`,
  ]);
  reportSheet.addRow(["Total number of scans: ", data.totalScans]);
  reportSheet.addRow([]);

  reportSheet.addRow(["Detailed statistics table of scans"]);
  reportSheet.columns = [
    { header: "No.", width: 5 },
    { header: "Time", key: "time", width: 20 },
    { header: "Pulse Rate (bpm)", key: "pulseRate", width: 15 },
    { header: "Blood Pressure (mmHg)", key: "bloodPressure", width: 20 },
    { header: "SpO2 (%)", key: "oxygenSaturation", width: 12 },
    { header: "Respiration Rate (bpm)", key: "respirationRate", width: 20 },
    { header: "Stress Level", key: "stressLevel", width: 15 },
    { header: "Wellness Index", key: "wellnessIndex", width: 15 },
    { header: "Hemoglobin (g/dL)", key: "hemoglobin", width: 18 },
    { header: "HbA1c (%)", key: "hemoglobinA1c", width: 12 },
    { header: "RMSSD (ms)", key: "rmssd", width: 12 },
    { header: "SDNN (ms)", key: "sdnn", width: 12 },
    { header: "Heart Age", key: "heartAge", width: 12 },
    { header: "ASCVD Risk (%)", key: "ascvdRisk", width: 15 },
    { header: "PNS Index", key: "pnsIndex", width: 12 },
    { header: "SNS Index", key: "snsIndex", width: 12 },
    { header: "PRQ", key: "prq", width: 12 },
    { header: "LFHF", key: "lfhf", width: 12 },
    { header: "SD1 (ms)", key: "sd1", width: 12 },
    { header: "SD2 (ms)", key: "sd2", width: 12 },
    { header: "Mean RRi (ms)", key: "meanRRi", width: 15 },
    {
      header: "Normalized Stress Index",
      key: "normalizedStressIndex",
      width: 20,
    },
    { header: "PNS Zone", key: "pnsZone", width: 12 },
    { header: "SNS Zone", key: "snsZone", width: 12 },
    { header: "Stress Index", key: "stressIndex", width: 15 },
    { header: "Wellness Level", key: "wellnessLevel", width: 15 },
    {
      header: "High Blood Pressure Risk",
      key: "highBloodPressureRisk",
      width: 15,
    },
    {
      header: "High Fasting Glucose Risk",
      key: "highFastingGlucoseRisk",
      width: 15,
    },
    {
      header: "High Hemoglobin A1c Risk",
      key: "highHemoglobinA1cRisk",
      width: 15,
    },
    {
      header: "High Total Cholesterol Risk",
      key: "highTotalCholesterolRisk",
      width: 15,
    },
    { header: "Low Hemoglobin Risk", key: "lowHemoglobinRisk", width: 15 },
    { header: "RRi", key: "rri", width: 15 },
  ];

  const headerRow = reportSheet.addRow([
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
    "High Blood Pressure Risk",
    "High Fasting Glucose Risk",
    "High Hemoglobin A1c Risk",
    "High Total Cholesterol Risk",
    "Low Hemoglobin Risk",
  ]);

  // Style cho header row
  headerRow.eachCell((cell) => {
    cell.font = {
      bold: true,
      color: { argb: "FFFFFFFF" },
    };
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF4472C4" },
    };
    cell.alignment = {
      horizontal: "center",
      vertical: "middle",
    };
    cell.border = {
      top: { style: "thin" },
      left: { style: "thin" },
      bottom: { style: "thin" },
      right: { style: "thin" },
    };
  });

  data.healthData.forEach((scan: any, index: number) => {
    const row = reportSheet.addRow([
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
      scan.pnsZone?.value || "N/A",
      scan.snsZone?.value || "N/A",
      scan.stressIndex?.value || "N/A",
      scan.wellnessLevel?.value || "N/A",
      scan.highBloodPressureRisk?.value || "N/A",
      scan.highFastingGlucoseRisk?.value || "N/A",
      scan.highHemoglobinA1cRisk?.value || "N/A",
      scan.highTotalCholesterolRisk?.value || "N/A",
      scan.lowHemoglobinRisk?.value || "N/A",
    ]);

    // Style cho các hàng dữ liệu
    row.eachCell((cell, colNumber) => {
      cell.border = {
        top: { style: "thin" },
        left: { style: "thin" },
        bottom: { style: "thin" },
        right: { style: "thin" },
      };

      // Căn giữa cho cột STT và các cột số
      if (
        [
          1, 3, 5, 6, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22,
          23, 24, 25, 26, 27, 28, 29, 30, 31, 32,
        ].includes(colNumber)
      ) {
        cell.alignment = { horizontal: "center" };
      }

      // Highlight các giá trị bất thường
      if (colNumber === 3 && typeof cell.value === "number") {
        // Nhịp tim
        if (cell.value < 60 || cell.value > 100) {
          cell.font = { color: { argb: "FFFF0000" } };
        }
      }

      if (colNumber === 5 && typeof cell.value === "number") {
        // SpO2
        if (cell.value < 95) {
          cell.font = { color: { argb: "FFFF0000" } };
        }
      }
    });

    // Tô màu xen kẽ các hàng
    if (index % 2 === 1) {
      row.eachCell((cell) => {
        cell.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: "FFF0F0F0" },
        };
      });
    }
  });

  // Set chiều cao cho header row
  headerRow.height = 35;

  // Freeze panes để giữ header khi scroll
  reportSheet.views = [
    {
      state: "frozen",
      xSplit: 0,
      ySplit: headerRow.number,
      topLeftCell: `A${headerRow.number + 1}`,
    },
  ];

  // Trả về buffer để download
  const buffer = await workbook.xlsx.writeBuffer();
  return buffer as Buffer;
}
