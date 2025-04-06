import { Router } from "express";
import PackageCotroller from "../controllers/Package.Cotroller";
import { checkLogin } from "../middlewares/Auth.Middleware";
const router = Router();

router.post("/get-by-type", PackageCotroller.getPackageByType);
router.post("/create", checkLogin, PackageCotroller.createPackage);
router.post("/", PackageCotroller.getAllPackages);

export default router;
