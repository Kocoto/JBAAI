import * as dotenv from "dotenv";
dotenv.config();

import express from "express";
import bodyParser from "body-parser";
import { route } from "./app/routes";
import { connect } from "./app/config/db";
import errorHandler from "./app/middlewares/Error.Middleware";
import swaggerUi from "swagger-ui-express";
import { swaggerSpec } from "./app/config/swagger.config";
import { transporter } from "./app/config/nodemailer.config";
import multer from "multer";
import client from "./app/config/paypal.config";
import { transformIncomingData } from "./app/utils/FormatData.Util";
import UserHealthDataService from "./app/services/HealthData.Service";
const port = process.env.PORT || 4000;

const app = express();
const upload = multer();
// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(upload.any());

// Database connection
connect();

app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));
// const test = UserHealthDataService.createHealthData();
// console.log(
//   "Đây là log dòng số 32 trang index, kiểm tra transformer: " +
//     JSON.stringify(test)
// );
// console.log(
//   "Đây là log dòng số 32 trang index, kiểm tra chi tiết transformer: " + test
// );
client;
transporter.verify((error, success) => {
  if (error) {
    console.log("Nodemailer connection error:", error);
  } else {
    console.log("Nodemailer is ready to send emails");
  }
});
// Routes
route(app);

// Error handling middleware
app.use(errorHandler);

app.listen(port, () => {
  console.log(`App listening at http://localhost:${port}`);
});
