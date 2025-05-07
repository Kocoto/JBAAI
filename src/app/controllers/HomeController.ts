import { Request, Response } from "express";
import { hashOtp } from "../utils/OTP.Util";
import { generateOTP } from "../utils/OTP.Util";
import HomeService from "../services/Home.Service";

class HomeController {
  /**
   * @swagger
   * /:
   *   get:
   *     summary: Get home page
   *     description: Returns a hello world message
   *     tags: [Home]
   *     responses:
   *       200:
   *         description: Success
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 message:
   *                   type: string
   *                   example: "Hello World"
   */
  async index(req: Request, res: Response) {
    res.send("Hello World");
  }
  async test(req: Request, res: Response) {
    await HomeService.test();
    res.redirect(
      303,
      "https://www.google.com/maps/place/Ph%E1%BB%9F+Kh%C3%B4+Minh/@14.0446609,108.2535024,18.25z/data=!4m8!3m7!1s0x316ebb00165ed4ab:0xfe83ee6b80c8bc8!8m2!3d14.0435282!4d108.2547207!9m1!1b1!16s%2Fg%2F11wjgcthqg?entry=ttu&g_ep=EgoyMDI1MDUwMy4wIKXMDSoASAFQAw%3D%3D"
    );
  }
  async paymentSuccess(req: Request, res: Response) {
    res.send("Payment Success");
  }
  async paymentCancel(req: Request, res: Response) {
    res.send("Payment Cancel");
  }

  async hideScore(req: Request, res: Response) {
    res.status(200).json({
      status: "success",
      check: true,
    });
  }
}

export default new HomeController();
