import ExcelJS from "exceljs";
import PdfPrinter from "pdfmake";
import {
  TDocumentDefinitions,
  TableCell,
  Content,
  StyleDictionary,
} from "pdfmake/interfaces"; // Thêm StyleDictionary
import { RevenueReportItem } from "../services/PurchaseHistory.Service"; // Import interface đã định nghĩa ở PurchaseHistoryService
import { format } from "date-fns"; // Dùng để định dạng ngày tháng
import path from "path"; // Import path để xử lý đường dẫn font

// --- START: Excel Generation ---

/**
 * Tạo buffer chứa dữ liệu file Excel từ báo cáo doanh thu.
 * @param data Mảng các mục báo cáo doanh thu.
 * @param reportTitle Tiêu đề cho báo cáo (sẽ được dùng và làm sạch cho tên sheet).
 * @returns {Promise<Buffer>} Buffer chứa dữ liệu file Excel.
 */
export async function generateRevenueExcel(
  data: RevenueReportItem[],
  reportTitle: string = "Báo cáo doanh thu 2 tuần gần nhất"
): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "JBAAI System";
  workbook.lastModifiedBy = "JBAAI System";
  workbook.created = new Date();
  workbook.modified = new Date();

  // Làm sạch reportTitle để dùng làm tên sheet
  const sanitizedSheetName = reportTitle
    .replace(/[*?:\\\/\[\]]/g, "-")
    .substring(0, 30);

  const worksheet = workbook.addWorksheet(sanitizedSheetName);

  // Thêm tiêu đề cho báo cáo TRƯỚC KHI định nghĩa columns
  worksheet.addRow([reportTitle.toUpperCase()]);
  worksheet.mergeCells("A1:K1");
  const titleCell = worksheet.getCell("A1");
  titleCell.font = {
    name: "Times New Roman",
    size: 16,
    bold: true,
  };
  titleCell.alignment = {
    vertical: "middle",
    horizontal: "center",
  };

  // Thêm một dòng trống
  worksheet.addRow([]);

  // Thêm header row THỦ CÔNG thay vì dùng worksheet.columns
  const headerRow = worksheet.addRow([
    "Ngày Mua",
    "Mã Giao Dịch",
    "Tên Khách Hàng",
    "Email Khách Hàng",
    "Tên Gói",
    "Loại Gói",
    "Đơn Giá",
    "Giảm Giá",
    "Thành Tiền",
    "Tiền Tệ",
    "Phương Thức TT",
  ]);

  // Định dạng header row
  headerRow.eachCell((cell, colNumber) => {
    cell.font = { bold: true, size: 12, color: { argb: "FFFFFFFF" } }; // Chữ trắng
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF0070C0" }, // Màu nền xanh đậm
    };
    cell.alignment = { vertical: "middle", horizontal: "center" };
    cell.border = {
      top: { style: "thin" },
      left: { style: "thin" },
      bottom: { style: "thin" },
      right: { style: "thin" },
    };
  });

  // Thiết lập độ rộng cột SAU KHI đã có header
  worksheet.getColumn(1).width = 20; // Ngày Mua
  worksheet.getColumn(2).width = 30; // Mã Giao Dịch
  worksheet.getColumn(3).width = 25; // Tên Khách Hàng
  worksheet.getColumn(4).width = 30; // Email Khách Hàng
  worksheet.getColumn(5).width = 25; // Tên Gói
  worksheet.getColumn(6).width = 15; // Loại Gói
  worksheet.getColumn(7).width = 15; // Đơn Giá
  worksheet.getColumn(8).width = 15; // Giảm Giá
  worksheet.getColumn(9).width = 15; // Thành Tiền
  worksheet.getColumn(10).width = 10; // Tiền Tệ
  worksheet.getColumn(11).width = 20; // Phương Thức TT

  // Thêm dữ liệu vào worksheet
  let totalRevenueByCurrency: { [key: string]: number } = {};
  data.forEach((item) => {
    const dataRow = worksheet.addRow([
      format(new Date(item.purchaseDate), "dd/MM/yyyy HH:mm:ss"),
      item.transactionId,
      item.userName,
      item.userEmail,
      item.packageName,
      item.packageType,
      item.price,
      item.discount,
      item.finalAmount,
      item.currency,
      item.paymentMethod,
    ]);

    // Tính tổng doanh thu theo từng loại tiền tệ
    if (totalRevenueByCurrency[item.currency]) {
      totalRevenueByCurrency[item.currency] += item.finalAmount;
    } else {
      totalRevenueByCurrency[item.currency] = item.finalAmount;
    }
  });

  // Định dạng các ô dữ liệu
  worksheet.eachRow({ includeEmpty: false }, function (row, rowNumber) {
    if (rowNumber > 3) {
      // Bỏ qua hàng tiêu đề báo cáo, dòng trống và header bảng
      row.eachCell({ includeEmpty: true }, function (cell, colNumber) {
        // Thêm border cho tất cả các ô
        cell.border = {
          top: { style: "thin" },
          left: { style: "thin" },
          bottom: { style: "thin" },
          right: { style: "thin" },
        };

        // Căn giữa cho các cột: Ngày Mua, Loại Gói, Tiền tệ, Phương thức TT
        const centerColumns = [1, 6, 10, 11];
        if (centerColumns.includes(colNumber)) {
          cell.alignment = { horizontal: "center" };
        }

        // Căn phải và định dạng số cho các cột tiền tệ: Đơn giá, Giảm giá, Thành tiền
        const currencyColumns = [7, 8, 9];
        if (currencyColumns.includes(colNumber)) {
          cell.alignment = { horizontal: "right" };
          // Lấy ký hiệu tiền tệ từ cột 10
          const currencySymbol = row.getCell(10).value?.toString() || "";
          cell.numFmt = `#,##0.00 "${currencySymbol}"`;
        }
      });
    }
  });

  // Thêm dòng tổng cộng doanh thu
  worksheet.addRow([]); // Dòng trống

  Object.keys(totalRevenueByCurrency).forEach((currency) => {
    const totalRow = worksheet.addRow([
      `Tổng doanh thu (${currency}):`,
      "",
      "",
      "",
      "",
      "",
      "",
      "",
      totalRevenueByCurrency[currency],
      currency,
      "",
    ]);

    // Merge cells cho label
    worksheet.mergeCells(`A${totalRow.number}:H${totalRow.number}`);
    const mergedCell = worksheet.getCell(`A${totalRow.number}`);
    mergedCell.font = { bold: true, size: 12 };
    mergedCell.alignment = { horizontal: "right" };

    // Định dạng ô tổng tiền
    const totalCell = worksheet.getCell(`I${totalRow.number}`);
    totalCell.font = { bold: true, size: 12 };
    totalCell.numFmt = `#,##0.00 "${currency}"`;
    totalCell.alignment = { horizontal: "right" };
    totalCell.border = {
      top: { style: "thin" },
      left: { style: "thin" },
      bottom: { style: "thin" },
      right: { style: "thin" },
    };
  });

  // Tự động điều chỉnh độ rộng cột dựa trên nội dung (tùy chọn)
  for (let colNumber = 1; colNumber <= 11; colNumber++) {
    const column = worksheet.getColumn(colNumber);
    let maxLength = 0;

    column.eachCell({ includeEmpty: true }, (cell, rowNumber) => {
      if (rowNumber > 1) {
        // Bỏ qua title row
        let cellLength = 0;
        if (cell.value) {
          if (typeof cell.value === "number" && [7, 8, 9].includes(colNumber)) {
            // Tính độ dài cho số có định dạng tiền tệ
            const numStr = cell.value.toLocaleString(undefined, {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            });
            const currencySymbol =
              worksheet.getCell(rowNumber, 10).value?.toString() || "";
            cellLength = (numStr + " " + currencySymbol).length;
          } else {
            cellLength = cell.value.toString().length;
          }
        }

        if (cellLength > maxLength) {
          maxLength = cellLength;
        }
      }
    });

    // Đảm bảo độ rộng tối thiểu và thêm padding
    const minWidth = 12;
    const finalWidth = Math.max(maxLength + 3, minWidth);
    column.width = finalWidth;
  }

  const buffer = await workbook.xlsx.writeBuffer();
  return buffer as Buffer;
}

// --- END: Excel Generation ---

// --- START: PDF Generation ---

const fonts = {
  BeVietnamPro: {
    normal: path.join(
      __dirname,
      "../../../public/assets/fonts/BeVietnamPro-Regular.ttf"
    ),
    bold: path.join(
      __dirname,
      "../../../public/assets/fonts/BeVietnamPro-Bold.ttf"
    ),
    italics: path.join(
      __dirname,
      "../../../public/assets/fonts/BeVietnamPro-Italic.ttf"
    ),
    bolditalics: path.join(
      __dirname,
      "../../../public/assets/fonts/BeVietnamPro-BoldItalic.ttf"
    ),
  },
};

/**
 * Tạo buffer chứa dữ liệu file PDF từ báo cáo doanh thu.
 * @param data Mảng các mục báo cáo doanh thu.
 * @param reportTitle Tiêu đề cho báo cáo.
 * @returns {Promise<Buffer>} Buffer chứa dữ liệu file PDF.
 */
export async function generateRevenuePdf(
  data: RevenueReportItem[],
  reportTitle: string = "Báo cáo doanh thu 2 tuần gần nhất"
): Promise<Buffer> {
  const printer = new PdfPrinter(fonts);

  const tableHeader: TableCell[] = [
    { text: "Ngày Mua", style: "tableHeader", alignment: "center" },
    { text: "Mã GD", style: "tableHeader", alignment: "center" },
    { text: "Khách Hàng", style: "tableHeader" },
    { text: "Email", style: "tableHeader" },
    { text: "Gói", style: "tableHeader" },
    { text: "Loại", style: "tableHeader", alignment: "center" },
    { text: "Đ.Giá", style: "tableHeader", alignment: "right" },
    { text: "G.Giá", style: "tableHeader", alignment: "right" },
    { text: "T.Tiền", style: "tableHeader", alignment: "right" },
    { text: "Tiền Tệ", style: "tableHeader", alignment: "center" },
    { text: "P.Thức TT", style: "tableHeader", alignment: "center" },
  ];

  const tableBody: TableCell[][] = data.map((item) => [
    {
      text: format(new Date(item.purchaseDate), "dd/MM/yy HH:mm"),
      style: "tableCell",
      alignment: "center",
    },
    {
      text: item.transactionId.substring(0, 10) + "...",
      style: "tableCell",
      alignment: "center",
    },
    { text: item.userName || "N/A", style: "tableCell" },
    { text: item.userEmail || "N/A", style: "tableCell" },
    { text: item.packageName || "N/A", style: "tableCell" },
    {
      text: item.packageType || "N/A",
      style: "tableCell",
      alignment: "center",
    },
    {
      text: `${item.price.toLocaleString("vi-VN")}`,
      style: "tableCell",
      alignment: "right",
    },
    {
      text: `${item.discount.toLocaleString("vi-VN")}`,
      style: "tableCell",
      alignment: "right",
    },
    {
      text: `${item.finalAmount.toLocaleString("vi-VN")}`,
      style: "tableCell",
      alignment: "right",
    },
    { text: item.currency || "N/A", style: "tableCell", alignment: "center" },
    {
      text: item.paymentMethod || "N/A",
      style: "tableCell",
      alignment: "center",
    },
  ]);

  let totalRevenueByCurrency: { [key: string]: number } = {};
  data.forEach((item) => {
    if (totalRevenueByCurrency[item.currency]) {
      totalRevenueByCurrency[item.currency] += item.finalAmount;
    } else {
      totalRevenueByCurrency[item.currency] = item.finalAmount;
    }
  });

  const summaryRows: Content[] = [];
  Object.keys(totalRevenueByCurrency).forEach((currency) => {
    summaryRows.push({
      columns: [
        {
          text: `Tổng doanh thu (${currency}):`,
          style: "summaryLabel",
          alignment: "right",
          width: "*",
        },
        {
          text: `${totalRevenueByCurrency[currency].toLocaleString(
            "vi-VN"
          )} ${currency}`,
          style: "summaryValue",
          alignment: "right",
          width: "auto",
        },
      ],
      margin: [0, 5, 0, 0],
    });
  });

  const docDefinition: TDocumentDefinitions = {
    pageSize: "A4",
    pageOrientation: "landscape",
    pageMargins: [20, 60, 20, 40],

    header: {
      columns: [
        {
          text: `JBAAI - ${reportTitle.toUpperCase()}`,
          style: "header",
          alignment: "center",
          margin: [0, 20, 0, 0],
        },
      ],
    },

    footer: function (currentPage, pageCount) {
      return {
        columns: [
          {
            text: `Ngày xuất: ${format(new Date(), "dd/MM/yyyy HH:mm:ss")}`,
            alignment: "left",
            style: "footer",
            margin: [20, 0, 0, 0],
          },
          {
            text: `Trang ${currentPage.toString()} của ${pageCount}`,
            alignment: "right",
            style: "footer",
            margin: [0, 0, 20, 0],
          },
        ],
      };
    },

    content: [
      {
        table: {
          headerRows: 1,
          widths: [
            "auto",
            "auto",
            "*",
            "*",
            "auto",
            "auto",
            "auto",
            "auto",
            "auto",
            "auto",
            "auto",
          ],
          body: [tableHeader, ...tableBody],
        },
        layout: {
          fillColor: function (
            rowIndex: number,
            node: any,
            columnIndex: number
          ): string | null {
            return rowIndex === 0 ? "#CCCCCC" : null;
          },
          hLineWidth: function (i: number, node: any): number {
            return i === 0 || i === node.table.body.length ? 1 : 0.5;
          },
          vLineWidth: function (i: number, node: any): number {
            return i === 0 || i === node.table.widths!.length ? 1 : 0.5;
          },
          hLineColor: function (i: number, node: any): string {
            return i === 0 || i === node.table.body.length
              ? "black"
              : "#AAAAAA";
          },
          vLineColor: function (i: number, node: any): string {
            return i === 0 || i === node.table.widths!.length
              ? "black"
              : "#AAAAAA";
          },
          paddingLeft: function (i: number, node: any): number {
            return 4;
          },
          paddingRight: function (i: number, node: any): number {
            return 4;
          },
          paddingTop: function (i: number, node: any): number {
            return 3;
          },
          paddingBottom: function (i: number, node: any): number {
            return 3;
          },
        },
      },
      {
        stack: summaryRows,
        margin: [0, 20, 0, 0],
      },
    ],

    styles: {
      header: {
        fontSize: 16,
        bold: true,
        margin: [0, 0, 0, 15],
        font: "BeVietnamPro", // <<====== ÁP DỤNG FONT TIMES
      },
      tableHeader: {
        bold: true,
        fontSize: 8,
        color: "black",
        font: "BeVietnamPro", // <<====== ÁP DỤNG FONT TIMES
      },
      tableCell: {
        fontSize: 7,
        font: "BeVietnamPro", // <<====== ÁP DỤNG FONT TIMES
      },
      footer: {
        fontSize: 8,
        italics: true,
        font: "BeVietnamPro", // <<====== ÁP DỤNG FONT TIMES
      },
      summaryLabel: {
        bold: true,
        fontSize: 9,
        font: "BeVietnamPro", // <<====== ÁP DỤNG FONT TIMES
      },
      summaryValue: {
        fontSize: 9,
        font: "BeVietnamPro", // <<====== ÁP DỤNG FONT TIMES
      },
    } as StyleDictionary,
    defaultStyle: {
      font: "BeVietnamPro", // <<====== ĐẶT FONT MẶC ĐỊNH LÀ TIMES
    },
  };

  return new Promise((resolve, reject) => {
    try {
      const pdfDoc = printer.createPdfKitDocument(docDefinition);
      const chunks: Uint8Array[] = [];
      pdfDoc.on("data", (chunk) => {
        chunks.push(chunk);
      });
      pdfDoc.on("end", () => {
        resolve(Buffer.concat(chunks));
      });
      pdfDoc.on("error", (err) => {
        console.error("Lỗi trong quá trình tạo stream PDF:", err);
        reject(err);
      });
      pdfDoc.end();
    } catch (error) {
      console.error("Lỗi khi khởi tạo PDF document:", error);
      reject(error);
    }
  });
}

// --- END: PDF Generation ---
