import { Express } from "express";
const HomeRoute = require("./HomeRoute");
import AuthRoute from "./Auth.Route";
import ProfileRoute from "./Profile.Route";
import HealthDataRoute from "./HealthData.Route";
import PackageRoute from "./Package.Route";

export function route(app: Express) {
  app.use("/api/v1/health-data", HealthDataRoute);
  app.use("/api/v1/package", PackageRoute);
  app.use("/api/v1/profile", ProfileRoute);
  app.use("/api/v1/auth", AuthRoute);
  app.use("/", HomeRoute);
}
