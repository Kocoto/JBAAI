import * as nodemailer from "nodemailer";

export const transporter = nodemailer.createTransport({
  host: "smtp-mail.outlook.com",
  port: 587,
  secure: false,
  auth: {
    user: "support@jbabrands.ai",
    pass: "zz0352908946",
    // user: "jbabrandsaqp@gmail.com",
    // pass: "wjbm bjbx fmzb hcbd",
  },
});
