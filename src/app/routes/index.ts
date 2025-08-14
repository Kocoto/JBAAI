import { Express } from "express";
const HomeRoute = require("./HomeRoute");
import AuthRoute from "./Auth.Route";
import ProfileRoute from "./Profile.Route";
import HealthDataRoute from "./HealthData.Route";
import PackageRoute from "./Package.Route";
import PaypalRoute from "./Paypal.Route";
import UpgradeRequestRoute from "./UpgradeRequest.Route";
import UserRoute from "./User.Route";
import InvitationCodeRoute from "./InvitationCode.Route";
import ReportRoute from "./Report.Route";
import AdminRoute from "./Admin.Route";
import FranchiseRoute from "./Franchise.Route";
import AiRoute from "./AI.Route";

export function route(app: Express) {
  app.use("/api/v1/invitation-code", InvitationCodeRoute);
  app.use("/api/v1/upgrade-request", UpgradeRequestRoute);
  app.use("/api/v1/health-data", HealthDataRoute);
  app.use("/api/v1/franchise", FranchiseRoute);
  app.use("/api/v1/package", PackageRoute);
  app.use("/api/v1/profile", ProfileRoute);
  app.use("/api/v1/report", ReportRoute);
  app.use("/api/v1/paypal", PaypalRoute);
  app.use("/api/v1/admin", AdminRoute);
  app.use("/api/v1/user", UserRoute);
  app.use("/api/v1/auth", AuthRoute);
  app.use("/api/v1/ai", AiRoute);
  app.use("/", HomeRoute);
}
