import express from "express";
import bodyParser from "body-parser";
import { route } from "./app/routes";
import { connect } from "./app/config/db";
import * as dotenv from "dotenv";
import errorHandler from "./app/middlewares/Error.Middleware";
import swaggerUi from "swagger-ui-express";
import { swaggerSpec } from "./app/config/swagger.config";
import { transporter } from "./app/config/nodemailer.config";

dotenv.config();
const port = process.env.PORT || 4000;

const app = express();

// Middleware
app.use(express.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

// Database connection
connect();

app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));

transporter.verify((error, success) => {
  if (error) {
    console.log("Nodemailer connection error:", error);
  } else {
    console.log("Nodemailer is ready to send emails");
    console.log("Server is ready to take our messages");
  }
});
// Routes
route(app);

// Error handling middleware
app.use(errorHandler);

app.listen(port, () => {
  console.log(`App listening at http://localhost:${port}`);
});
