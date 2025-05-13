import * as dotenv from "dotenv";
dotenv.config();

// Core dependencies
import express, { Application } from "express";
import cors from "cors";
import path from "path";
import fs from "fs";
import mongoose from "mongoose";

// Middleware imports
import bodyParser from "body-parser";
import multer from "multer";
import errorHandler from "./app/middlewares/Error.Middleware";

// Configuration imports
import { connect } from "./app/config/db";
import { swaggerSpec } from "./app/config/swagger.config";
import { transporter } from "./app/config/nodemailer.config";
import client from "./app/config/paypal.config";
import { redisConnection } from "./app/config/redis.config";

// Route and service imports
import { route } from "./app/routes";
import swaggerUi from "swagger-ui-express";
import { initializeEmailWorker } from "./app/workers/Mail.Worker";

const PORT = process.env.PORT || 4000;
const DEEP_LINK_BASE_URL = "https://jbaai-y7mb.onrender.com";

async function configureWellKnownRoutes(app: Application) {
  const wellKnownPath = path.join(__dirname, "..", "public", ".well-known");

  const serveWellKnownFile =
    (filename: string) =>
    async (req: express.Request, res: express.Response) => {
      const filePath = path.join(wellKnownPath, filename);
      try {
        const data = await fs.promises.readFile(filePath, "utf8");
        res.setHeader("Content-Type", "application/json");
        res.setHeader("Cache-Control", "public, max-age=0, must-revalidate");
        res.status(200).send(data);
      } catch (err) {
        console.error(`Error reading ${filename}:`, err);
        res.status(404).send("Not Found");
      }
    };

  app.get(
    "/.well-known/apple-app-site-association",
    serveWellKnownFile("apple-app-site-association")
  );
  app.get(
    "/.well-known/assetlinks.json",
    serveWellKnownFile("assetlinks.json")
  );
}

function configurePaymentRedirects(app: Application) {
  const handlePaymentRedirect =
    (status: "success" | "failed") =>
    (req: express.Request, res: express.Response) => {
      const deepLinkUrl = `${DEEP_LINK_BASE_URL}/payment-${status}`;
      console.log(`Redirecting to Deep Link URL: ${deepLinkUrl}`);
      res.redirect(303, deepLinkUrl);
    };

  app.get("/api/payment-success-redirect", handlePaymentRedirect("success"));
  app.get("/api/payment-failed-redirect", handlePaymentRedirect("failed"));
}

async function startApplication() {
  console.log("[Application] Starting...");
  try {
    await connect();
    const app: Application = express();

    // Initialize Redis
    redisConnection;

    // Configure well-known routes for deep linking
    await configureWellKnownRoutes(app);
    configurePaymentRedirects(app);

    // Configure middleware
    app.use(cors());
    app.use(express.json());
    app.use(express.urlencoded({ extended: true }));
    app.use(bodyParser.urlencoded({ extended: true }));
    app.use(bodyParser.json());
    app.use(multer().any());

    // Initialize services
    initializeEmailWorker();
    app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));

    // Initialize PayPal
    client;

    // Verify email transport
    await new Promise((resolve, reject) => {
      transporter.verify((error) => {
        if (error) {
          console.error("[Nodemailer] Connection failed:", error);
          reject(error);
        } else {
          console.log("[Nodemailer] Connection established successfully");
          resolve(true);
        }
      });
    });

    // Configure routes and error handling
    route(app as express.Express);
    app.use(errorHandler);

    // Start server
    app.listen(PORT, () => {
      console.log(`[Server] Server is running on port ${PORT}`);
    });
  } catch (error) {
    console.error("[Application] Error starting application:", error);
    process.exit(1);
  }
}

async function gracefulShutdown() {
  try {
    await mongoose.disconnect();
    console.log("[Shutdown] Closing MongoDB connection...");

    if (initializeEmailWorker().close) {
      await initializeEmailWorker().close();
      console.log("[Shutdown] Closed BullMQ workers");
    }

    process.exit(0);
  } catch (error) {
    console.error("Error during shutdown:", error);
    process.exit(1);
  }
}

// Register shutdown handlers
process.on("SIGINT", gracefulShutdown);
process.on("SIGTERM", gracefulShutdown);

// Start the application
startApplication();
