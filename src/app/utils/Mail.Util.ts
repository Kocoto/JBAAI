import * as nodemailer from "nodemailer";
import { transporter } from "../config/nodemailer.config";
import * as fs from "fs/promises"; // Sử dụng fs.promises để đọc file bất đồng bộ
import * as path from "path";
import CustomError from "./Error.Util";
import { json } from "body-parser";

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
      "..",
      "..",
      "templates",
      `HealthScanEmailTemplateV1.${language}.html`
    );

    let htmlContent = await fs.readFile(templatePath, "utf-8");

    // Username
    htmlContent = htmlContent.replace(/\[Tên người dùng\]/g, userName);

    // Wellness Level
    htmlContent = htmlContent.replace(
      /\s*\[Wellness Level VALUE\]/g,
      `${healthData.wellnessLevel?.value}`
    );

    // Wellness Index
    htmlContent = htmlContent.replace(
      /\s*\[Wellness Index VALUE\]/g,
      `${healthData.wellnessIndex?.value}`
    );

    // Blood Pressure
    htmlContent = htmlContent.replace(
      /\s*\[Blood Pressure VALUE\] mmHg/g,
      `${healthData.bpValue?.systolic ?? "N/A"}/${
        healthData.bpValue?.diastolic ?? "N/A"
      } mmHg`
    );

    // Heart Rate
    htmlContent = htmlContent.replace(
      /\s*\[Pulse Rate VALUE\] bpm/g,
      `${healthData.pulseRate?.value ?? "N/A"} bpm`
    );

    // Oxygen Saturation
    htmlContent = htmlContent.replace(
      /\s*\[Oxygen Saturation VALUE\] %/g,
      `${healthData.oxygenSaturation?.value ?? "N/A"} %`
    );

    // Respiration Rate
    htmlContent = htmlContent.replace(
      /\s*\[Respiration Rate VALUE\]/g,
      `${healthData.respirationRate?.value ?? "N/A"}`
    );

    // Hemoglobin
    htmlContent = htmlContent.replace(
      /\s*\[Hemoglobin VALUE\] g\/dL/g,
      `${healthData.hemoglobin?.value ?? "N/A"} g/dL`
    );

    // HbA1c
    htmlContent = htmlContent.replace(
      /\s*\[Hemoglobin A1c VALUE\] %/g,
      `${healthData.hemoglobinA1c?.value?.toFixed(2) ?? "N/A"} %` // Làm tròn 2 chữ số thập phân
    );

    // High BP Risk
    htmlContent = htmlContent.replace(
      /\s*\[High Blood Pressure Risk VALUE\]/g,
      `${
        healthData.highBloodPressureRisk?.value === 1
          ? "Low"
          : healthData.highBloodPressureRisk?.value === 2
          ? "Normal"
          : healthData.highBloodPressureRisk?.value === 3
          ? "High"
          : "N/A"
      }` // Có thể thêm logic diễn giải mức ở đây
    );

    // High HbA1c Risk
    htmlContent = htmlContent.replace(
      /\s*\[High HbA1c Risk VALUE\]/g,
      `${
        healthData.highHemoglobinA1cRisk?.value === 1
          ? "Low"
          : healthData.highHemoglobinA1cRisk?.value === 1
          ? "Normal"
          : healthData.highHemoglobinA1cRisk?.value === 3
          ? "High"
          : "N/A"
      }`
    );

    // ASCVD Risk
    htmlContent = htmlContent.replace(
      /\s*\[ASCVD Risk VALUE\] %/g,
      `${healthData.ascvdRisk?.value ?? "N/A"} %`
    );

    // Mean RRi
    htmlContent = htmlContent.replace(
      /\s*\[Mean RRi VALUE\] ms/g,
      `${healthData.meanRRi?.value ?? "N/A"} ms`
    );

    // RMSSD
    htmlContent = htmlContent.replace(
      /\s*\[RMSSD VALUE\] ms/g,
      `${healthData.rmssd?.value ?? "N/A"} ms`
    );

    // SDNN
    htmlContent = htmlContent.replace(
      /\s*\[SDNN VALUE\] ms/g,
      `${healthData.sdnn?.value ?? "N/A"} ms`
    );

    // SD1
    htmlContent = htmlContent.replace(
      /\s*\[SD1 VALUE\] ms/g,
      `${healthData.sd1?.value ?? "N/A"} ms`
    );

    // SD2
    htmlContent = htmlContent.replace(
      /\s*\[SD2 VALUE\] ms/g,
      `${healthData.sd2?.value ?? "N/A"} ms`
    );

    // LF/HF
    htmlContent = htmlContent.replace(
      /\s*\[LF\/HF VALUE\]/g,
      `${healthData.lfhf?.value?.toFixed(3) ?? "N/A"}` // Làm tròn 3 chữ số thập phân
    );

    // PNS Index
    htmlContent = htmlContent.replace(
      /\s*\[PNS Index VALUE\]/g,
      `${healthData.pnsIndex?.value ?? "N/A"}`
    );

    // PNS Zone
    htmlContent = htmlContent.replace(
      /\s*\[PNS Zone VALUE\]/g,
      `${
        healthData.pnsZone?.value === 1
          ? "Low"
          : healthData.pnsZone?.value === 2
          ? "Normal"
          : healthData.pnsZone?.value === 3
          ? "High"
          : "N/A"
      }`
    );

    // SNS Index
    htmlContent = htmlContent.replace(
      /\s*\[SNS Index VALUE\]/g,
      `${healthData.snsIndex?.value ?? "N/A"}`
    );

    // SNS Zone
    htmlContent = htmlContent.replace(
      /\s*\[SNS Zone VALUE\]/g,
      `${
        healthData.snsZone?.value === 1
          ? "Low"
          : healthData.snsZone?.value === 2
          ? "Normal"
          : healthData.snsZone?.value === 3
          ? "High"
          : "N/A"
      }`
    );

    // PRQ
    htmlContent = htmlContent.replace(
      /\s*\[PRQ VALUE\]/g,
      `${healthData.prq?.value ?? "N/A"}`
    );

    // Stress Level
    htmlContent = htmlContent.replace(
      /\s*\[Stress Level VALUE\]/g,
      `${
        healthData.stressLevel?.value === 1
          ? "Low"
          : healthData.stressLevel?.value === 2
          ? "Normal"
          : healthData.stressLevel?.value === 3
          ? "High"
          : "N/A"
      }`
    );

    // Stress Index
    htmlContent = htmlContent.replace(
      /\s*\[Stress Index VALUE\]/g,
      `${healthData.stressIndex?.value ?? "N/A"}`
    );

    // RRI Chart Image
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
