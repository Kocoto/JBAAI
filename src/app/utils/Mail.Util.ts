import * as nodemailer from "nodemailer";
import { transporter } from "../config/nodemailer.config";
import * as fs from "fs/promises"; // Sử dụng fs.promises để đọc file bất đồng bộ
import * as path from "path";
import CustomError from "./Error.Util";

export const sendMail = async (mailOptions: nodemailer.SendMailOptions) => {
  try {
    const info = await transporter.sendMail(mailOptions);
    console.log("Email đã gửi:" + info.response);
    return info;
  } catch (error) {
    console.error("Lỗi:" + error);
  }
};

export const renderEmailTemplate = async (
  language: string,
  userName: string,
  healthData: any,
  rriChartImageUrl: string
) => {
  try {
    const templatePath = path.join(
      __dirname,
      "..",
      "templates",
      `HealthScanEmailTemplateV1.${language}.html`
    );

    let htmlContent = await fs.readFile(templatePath, "utf-8");

    // Wellness Score/Level
    htmlContent = htmlContent.replace(
      /\s*\[VALUE \/ Mức VALUE\]/g,
      `Mức ${healthData.wellnessLevel?.value ?? "N/A"} / ${
        healthData.wellnessIndex?.value ?? "N/A"
      }`
    );

    // Blood Pressure
    htmlContent = htmlContent.replace(
      /\s*\[VALUE\] mmHg/g,
      `${healthData.bpValue?.systolic ?? "N/A"}/${
        healthData.bpValue?.diastolic ?? "N/A"
      } mmHg`
    );

    // Heart Rate
    htmlContent = htmlContent.replace(
      /\s*\[VALUE\] bpm/g,
      `${healthData.pulseRate?.value ?? "N/A"} bpm`
    );

    // Oxygen Saturation
    htmlContent = htmlContent.replace(
      /\s*\[VALUE\] %/g,
      `${healthData.oxygenSaturation?.value ?? "N/A"} %`
    );

    // Respiration Rate
    htmlContent = htmlContent.replace(
      /\s*\[VALUE\] lần\/phút/g,
      `${healthData.respirationRate?.value ?? "N/A"} lần/phút`
    );

    // Hemoglobin
    htmlContent = htmlContent.replace(
      /\s*\[VALUE\] g\/dL/g,
      `${healthData.hemoglobin?.value ?? "N/A"} g/dL`
    );

    // HbA1c
    htmlContent = htmlContent.replace(
      /\s*\[VALUE\] %/g,
      `${healthData.hemoglobinA1c?.value?.toFixed(2) ?? "N/A"} %` // Làm tròn 2 chữ số thập phân
    );

    // High BP Risk
    htmlContent = htmlContent.replace(
      /\s*\[Mức VALUE\]/g,
      `Mức ${healthData.highBloodPressureRisk?.value ?? "N/A"}` // Có thể thêm logic diễn giải mức ở đây
    );

    // High HbA1c Risk
    htmlContent = htmlContent.replace(
      /\s*\[Mức VALUE\]/g,
      `Mức ${healthData.highHemoglobinA1cRisk?.value ?? "N/A"}`
    );

    // ASCVD Risk
    htmlContent = htmlContent.replace(
      /\s*\[VALUE\] %/g,
      `${healthData.ascvdRisk?.value ?? "N/A"} %`
    );

    // Mean RRi
    htmlContent = htmlContent.replace(
      /\s*\[VALUE\] ms/g,
      `${healthData.meanRRi?.value ?? "N/A"} ms`
    );

    // RMSSD
    htmlContent = htmlContent.replace(
      /\s*\[VALUE\] ms/g,
      `${healthData.rmssd?.value ?? "N/A"} ms`
    );

    // SDNN
    htmlContent = htmlContent.replace(
      /\s*\[VALUE\] ms/g,
      `${healthData.sdnn?.value ?? "N/A"} ms`
    );

    // SD1
    htmlContent = htmlContent.replace(
      /\s*\[VALUE\] ms/g,
      `${healthData.sd1?.value ?? "N/A"} ms`
    );

    // SD2
    htmlContent = htmlContent.replace(
      /\s*\[VALUE\] ms/g,
      `${healthData.sd2?.value ?? "N/A"} ms`
    );

    // LF/HF
    htmlContent = htmlContent.replace(
      /\s*\[VALUE\]/g,
      `${healthData.lfhf?.value?.toFixed(3) ?? "N/A"}` // Làm tròn 3 chữ số thập phân
    );

    // PNS Index
    htmlContent = htmlContent.replace(
      /\s*\[VALUE\]/g,
      `${healthData.pnsIndex?.value ?? "N/A"}`
    );

    // PNS Zone
    htmlContent = htmlContent.replace(
      /\s*\[Mức VALUE\]/g,
      `Mức ${healthData.pnsZone?.value ?? "N/A"}`
    );

    // SNS Index
    htmlContent = htmlContent.replace(
      /\s*\[VALUE\]/g,
      `${healthData.snsIndex?.value ?? "N/A"}`
    );

    // SNS Zone
    htmlContent = htmlContent.replace(
      /\s*\[Mức VALUE\]/g,
      `Mức ${healthData.snsZone?.value ?? "N/A"}`
    );

    // PRQ
    htmlContent = htmlContent.replace(
      /\s*\[VALUE\]/g,
      `${healthData.prq?.value ?? "N/A"}`
    );

    // Stress Level
    htmlContent = htmlContent.replace(
      /\s*\[Mức VALUE\]/g,
      `Mức ${healthData.stressLevel?.value ?? "N/A"}`
    );

    // Stress Index
    htmlContent = htmlContent.replace(
      /\s*\[VALUE\]/g,
      `${healthData.stressIndex?.value ?? "N/A"}`
    );

    htmlContent = htmlContent.replace(
      /"placeholder_rri_chart\.png"/g,
      `"${rriChartImageUrl}"`
    );

    return htmlContent;
  } catch (error) {
    console.error(
      `Error rendering email template for language ${language}:`,
      error
    );
    // return `<p>Lỗi khi tạo nội dung email. Vui lòng thử lại sau.</p>`;
    throw new CustomError(
      500,
      "Lỗi khi tạo nội dung email. Vui lòng thử lại sau."
    );
  }
};
