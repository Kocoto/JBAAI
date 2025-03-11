import { Request, Response } from "express";

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
  index(req: Request, res: Response) {
    res.send("Hello World");
  }
}

export default new HomeController();
