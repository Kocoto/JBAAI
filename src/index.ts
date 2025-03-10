import express from "express";
import bodyParser from "body-parser";
import { route } from "./app/routes";
import { connect } from "./app/config/db";
import * as dotenv from "dotenv";
import errorHandler from "./app/middlewares/Error.Middleware";

dotenv.config();
const port = process.env.PORT || 3000;

const app = express();

// Middleware
app.use(express.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

// Database connection
connect();

// Routes
route(app);

// Error handling middleware
app.use(errorHandler);

app.listen(port, () => {
  console.log(`App listening at http://localhost:${port}`);
});
