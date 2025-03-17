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
    const otp = generateOTP();
    const hashedOtp = await hashOtp(otp);
    console.log(
      "Đây là log dòng số 28 để kiếm tra otp và hashedOtp " + otp,
      hashedOtp
    );
    res.send("Hello World");
  }
}

export default new HomeController();
