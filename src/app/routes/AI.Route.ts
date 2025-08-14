import { Router } from "express";
import AiController from "../controllers/AI.Controller";
const router = Router();

router.post("/chat", AiController.chat);

export default router;
