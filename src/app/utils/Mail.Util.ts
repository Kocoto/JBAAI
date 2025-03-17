import * as nodemailer from "nodemailer";
import { transporter } from "../config/nodemailer.config";

export const sendMail = async (mailOptions: nodemailer.SendMailOptions) => {
  try {
    const info = await transporter.sendMail(mailOptions);
    console.log("Email đã gửi:" + info.response);
    return info;
  } catch (error) {
    console.error("Lỗi:" + error);
  }
};
