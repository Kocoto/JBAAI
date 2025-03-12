import * as nodemailer from "nodemailer";

console.log(
  " đây là log dòng số 3 của file nodemailer để kiểm tra các biến trong env" +
    process.env.EMAIL_USER
);
export const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: "duoc6694@gmail.com",
    pass: "kgpm vvfc gxfm wbkk",
  },
});
