import HomeController from "../controllers/HomeController";
import { Router } from "express";
const router = Router();

router.get("/", HomeController.index);

module.exports = router;
