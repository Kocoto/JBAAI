import * as nodemailer from "nodemailer";

export const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    // user: "support@jbabrands.ai",
    // pass: "zz0352908946",
    user: "jbabrandsaqp@gmail.com",
    pass: "wjbm bjbx fmzb hcbd",
  },
});
