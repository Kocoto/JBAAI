import { Express } from "express";
const HomeRoute = require("./HomeRoute");
import AuthRoute from "./Auth.Route";

export function route(app: Express) {
  app.use("/api/v1/auth", AuthRoute);
  app.use("/", HomeRoute);
}
