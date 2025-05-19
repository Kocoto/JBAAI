import * as nodemailer from "nodemailer";
import { transporter } from "../config/nodemailer.config";
import * as fs from "fs/promises"; // Sử dụng fs.promises để đọc file bất đồng bộ
import * as path from "path";
import CustomError from "./Error.Util";
import { json } from "body-parser";
import { getLocalizedString } from "./Localization.Util"; // Thêm import này

export const sendMail = async (mailOptions: nodemailer.SendMailOptions) => {
  try {
    const info = await transporter.sendMail(mailOptions);
    console.log("[Mail] Mail sent successfully: %s", info.response);
    return info;
  } catch (error) {
    console.error("[Mail] Error sending email:", error);
  }
};

export const renderEmailTemplate = async (
  language: string,
  userName: string,
  healthData: any,
  rriChartImageUrl: string
) => {
  try {
    // Define base template directory path
    const templateBaseDir = path.join(__dirname, "..", "..", "..", "templates");

    // Define template file names
    const requestedTemplate = `HealthScanEmailTemplateV1.${language}.html`;
    const fallbackTemplate = "HealthScanEmailTemplateV1.en.html";

    // Get full template path with fallback to English if requested language not found
    const templatePath =
      path.join(templateBaseDir, requestedTemplate) ??
      path.join(templateBaseDir, fallbackTemplate);

    let htmlContent = await fs.readFile(templatePath, "utf-8");

    // Username
    htmlContent = htmlContent.replace(/\[Tên người dùng\]/g, userName);

    // Wellness Level
    htmlContent = htmlContent.replace(
      /\s*\[Wellness Level VALUE\]/g,
      `${
        healthData.wellnessLevel?.value === 1
          ? getLocalizedString(language, "low")
          : healthData.wellnessLevel?.value === 2
          ? getLocalizedString(language, "normal")
          : healthData.wellnessLevel?.value === 3
          ? getLocalizedString(language, "high")
          : getLocalizedString(language, "na")
      }`
    );

    // Wellness Index
    htmlContent = htmlContent.replace(
      /\s*\[Wellness Index VALUE\]/g,
      `${healthData.wellnessIndex?.value ?? getLocalizedString(language, "na")}`
    );

    // Blood Pressure
    htmlContent = htmlContent.replace(
      /\s*\[Blood Pressure VALUE\]/g,
      `${healthData.bpValue?.systolic ?? getLocalizedString(language, "na")}/${
        healthData.bpValue?.diastolic ?? getLocalizedString(language, "na")
      } mmHg`
    );

    // Heart Rate
    htmlContent = htmlContent.replace(
      /\s*\[Pulse Rate VALUE\]/g,
      `${healthData.pulseRate?.value ?? getLocalizedString(language, "na")} bpm`
    );

    // Oxygen Saturation
    htmlContent = htmlContent.replace(
      /\s*\[Oxygen Saturation VALUE\]/g,
      `${
        healthData.oxygenSaturation?.value ?? getLocalizedString(language, "na")
      } %`
    );

    // Respiration Rate
    htmlContent = htmlContent.replace(
      /\s*\[Respiration Rate VALUE\]/g,
      `${
        healthData.respirationRate?.value ?? getLocalizedString(language, "na")
      }`
    );

    // Hemoglobin
    htmlContent = htmlContent.replace(
      /\s*\[Hemoglobin VALUE\]/g,
      `${
        healthData.hemoglobin?.value ?? getLocalizedString(language, "na")
      } g/dL`
    );

    // HbA1c
    htmlContent = htmlContent.replace(
      /\s*\[Hemoglobin A1c VALUE\]/g,
      `${
        healthData.hemoglobinA1c?.value?.toFixed(2) ??
        getLocalizedString(language, "na")
      } %` // Làm tròn 2 chữ số thập phân
    );

    // High BP Risk
    htmlContent = htmlContent.replace(
      /\s*\[High Blood Pressure Risk VALUE\]/g,
      `${
        healthData.highBloodPressureRisk?.value === 1
          ? getLocalizedString(language, "low")
          : healthData.highBloodPressureRisk?.value === 2
          ? getLocalizedString(language, "normal")
          : healthData.highBloodPressureRisk?.value === 3
          ? getLocalizedString(language, "high")
          : getLocalizedString(language, "na")
      }` // Có thể thêm logic diễn giải mức ở đây
    );

    // High HbA1c Risk
    htmlContent = htmlContent.replace(
      /\s*\[High HbA1c Risk VALUE\]/g,
      `${
        healthData.highHemoglobinA1cRisk?.value === 1
          ? getLocalizedString(language, "low")
          : healthData.highHemoglobinA1cRisk?.value === 2 // Sửa lỗi logic ở đây, trước đó là 1
          ? getLocalizedString(language, "normal")
          : healthData.highHemoglobinA1cRisk?.value === 3
          ? getLocalizedString(language, "high")
          : getLocalizedString(language, "na")
      }`
    );

    // ASCVD Risk
    htmlContent = htmlContent.replace(
      /\s*\[ASCVD Risk VALUE\]/g,
      `${healthData.ascvdRisk?.value ?? getLocalizedString(language, "na")} %`
    );

    // Mean RRi
    htmlContent = htmlContent.replace(
      /\s*\[Mean RRi VALUE\]/g,
      `${healthData.meanRRi?.value ?? getLocalizedString(language, "na")} ms`
    );

    // RMSSD
    htmlContent = htmlContent.replace(
      /\s*\[RMSSD VALUE\]/g,
      `${healthData.rmssd?.value ?? getLocalizedString(language, "na")} ms`
    );

    // SDNN
    htmlContent = htmlContent.replace(
      /\s*\[SDNN VALUE\]/g,
      `${healthData.sdnn?.value ?? getLocalizedString(language, "na")} ms`
    );

    // SD1
    htmlContent = htmlContent.replace(
      /\s*\[SD1 VALUE\]/g,
      `${healthData.sd1?.value ?? getLocalizedString(language, "na")} ms`
    );

    // SD2
    htmlContent = htmlContent.replace(
      /\s*\[SD2 VALUE\]/g,
      `${healthData.sd2?.value ?? getLocalizedString(language, "na")} ms`
    );

    // LF/HF
    htmlContent = htmlContent.replace(
      /\s*\[LF\/HF VALUE\]/g,
      `${
        healthData.lfhf?.value?.toFixed(3) ?? getLocalizedString(language, "na")
      }` // Làm tròn 3 chữ số thập phân
    );

    // PNS Index
    htmlContent = htmlContent.replace(
      /\s*\[PNS Index VALUE\]/g,
      `${healthData.pnsIndex?.value ?? getLocalizedString(language, "na")}`
    );

    // PNS Zone
    htmlContent = htmlContent.replace(
      /\s*\[PNS Zone VALUE\]/g,
      `${
        healthData.pnsZone?.value === 1
          ? getLocalizedString(language, "low")
          : healthData.pnsZone?.value === 2
          ? getLocalizedString(language, "normal")
          : healthData.pnsZone?.value === 3
          ? getLocalizedString(language, "high")
          : getLocalizedString(language, "na")
      }`
    );

    // SNS Index
    htmlContent = htmlContent.replace(
      /\s*\[SNS Index VALUE\]/g,
      `${healthData.snsIndex?.value ?? getLocalizedString(language, "na")}`
    );

    // SNS Zone
    htmlContent = htmlContent.replace(
      /\s*\[SNS Zone VALUE\]/g,
      `${
        healthData.snsZone?.value === 1
          ? getLocalizedString(language, "low")
          : healthData.snsZone?.value === 2
          ? getLocalizedString(language, "normal")
          : healthData.snsZone?.value === 3
          ? getLocalizedString(language, "high")
          : getLocalizedString(language, "na")
      }`
    );

    // PRQ
    htmlContent = htmlContent.replace(
      /\s*\[PRQ VALUE\]/g,
      `${healthData.prq?.value ?? getLocalizedString(language, "na")}`
    );

    // Stress Level
    htmlContent = htmlContent.replace(
      /\s*\[Stress Level VALUE\]/g,
      `${
        healthData.stressLevel?.value === 1
          ? getLocalizedString(language, "low")
          : healthData.stressLevel?.value === 2
          ? getLocalizedString(language, "normal")
          : healthData.stressLevel?.value === 3
          ? getLocalizedString(language, "high")
          : getLocalizedString(language, "na")
      }`
    );

    // Stress Index
    htmlContent = htmlContent.replace(
      /\s*\[Stress Index VALUE\]/g,
      `${healthData.stressIndex?.value ?? getLocalizedString(language, "na")}`
    );

    // RRI Chart Image
    htmlContent = htmlContent.replace(
      /"placeholder_rri_chart\.png"/g,
      `"${rriChartImageUrl}"`
    );

    //lowHemoglobinRisk
    htmlContent = htmlContent.replace(
      /\s*\[Low Hemoglobin Risk VALUE\]/g,
      `${
        healthData.lowHemoglobinRisk?.value === 1
          ? getLocalizedString(language, "low")
          : healthData.lowHemoglobinRisk?.value === 2
          ? getLocalizedString(language, "normal")
          : healthData.lowHemoglobinRisk?.value === 3
          ? getLocalizedString(language, "high")
          : getLocalizedString(language, "na")
      }`
    );

    //Heart Age
    htmlContent = htmlContent.replace(
      /\s*\[Heart Age VALUE\]/g,
      `${healthData.heartAge?.value ?? getLocalizedString(language, "na")}`
    );

    //High Total Cholesterol Risk
    htmlContent = htmlContent.replace(
      /\s*\[Hight Total Cholesterol Risk VALUE\]/g,
      `${
        healthData.highTotalCholesterolRisk?.value === 1
          ? getLocalizedString(language, "low")
          : healthData.highTotalCholesterolRisk?.value === 2
          ? getLocalizedString(language, "normal")
          : healthData.highTotalCholesterolRisk?.value === 3
          ? getLocalizedString(language, "high")
          : getLocalizedString(language, "na")
      }`
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
      getLocalizedString(language, "errorCreatingEmail")
    );
  }
};
