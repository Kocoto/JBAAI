import { Request, Response } from "express";
import { hashOtp } from "../utils/OTP.Util";
import { generateOTP } from "../utils/OTP.Util";

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
    res.send("Hello World");
  }
  async paymentSuccess(req: Request, res: Response) {
    res.send("Payment Success");
  }
  async paymentCancel(req: Request, res: Response) {
    res.send("Payment Cancel");
  }
}

export default new HomeController();
