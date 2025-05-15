import * as nodemailer from "nodemailer";

export const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: "jbabrandsaqp@gmail.com",
    pass: "wjbm bjbx fmzb hcbd",
  },
});
