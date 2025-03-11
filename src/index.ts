import express from "express";
import bodyParser from "body-parser";
import { route } from "./app/routes";
import { connect } from "./app/config/db";
import * as dotenv from "dotenv";
import errorHandler from "./app/middlewares/Error.Middleware";
import swaggerUi from "swagger-ui-express";
import { swaggerSpec } from "./app/config/swagger.config";

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

// Routes
route(app);

// Error handling middleware
app.use(errorHandler);

app.listen(port, () => {
  console.log(`App listening at http://localhost:${port}`);
});
