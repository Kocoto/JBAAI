import { NextFunction, Request, Response } from "express";
import { hashOtp } from "../utils/OTP.Util";
import { generateOTP } from "../utils/OTP.Util";
import HomeService from "../services/Home.Service";
// import { geoIpReaderInstance } from "../config/geoip.config";
import * as fs from "fs";
import { Reader } from "@maxmind/geoip2-node";
import { dirname } from "path";
import { geoIpDbBuffer } from "../config/geoip.config";
// Import lớp Reader từ thư viện
import { Reader as MaxMindGeoIPReader } from "@maxmind/geoip2-node";
import CustomError from "../utils/Error.Util";

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
    const ip = "8.8.8.8";
    console.log("[HomeController] Received request for /test. IP:", ip);

    // Kiểm tra xem buffer có được load không
    if (!geoIpDbBuffer) {
      console.error("[HomeController] GeoIP Database Buffer is not available!");
      return res
        .status(503)
        .json({ error: "GeoIP service (database buffer) is not available." });
    }

    if (!ip) {
      console.warn("[HomeController] Client IP is undefined.");
      return res.status(400).json({ error: "Could not determine client IP." });
    }

    try {
      // Tạo một instance Reader mới từ buffer
      // TypeScript sẽ suy luận kiểu của localReader một cách chính xác ở đây
      const localReader = MaxMindGeoIPReader.openBuffer(geoIpDbBuffer);
      console.log(
        "[HomeController] Local GeoIP Reader instance created from buffer."
      );

      // Sử dụng .country() vì file config đang tải GeoLite2-Country.mmdb
      const locationResponse = localReader.country(ip);

      const countryIsoCode = locationResponse?.country?.isoCode;
      const countryName = locationResponse?.country?.names.en;

      console.log(
        `[HomeController] GeoIP lookup for ${ip}: Code=${countryIsoCode}, Name=${countryName}`
      );

      if (countryIsoCode) {
        res.json({
          ip: ip,
          countryCode: countryIsoCode,
          countryName: countryName || "N/A",
        });
      } else {
        const registeredCountryIsoCode =
          locationResponse?.registeredCountry?.isoCode;
        const registeredCountryName =
          locationResponse?.registeredCountry?.names.en;
        if (registeredCountryIsoCode) {
          res.json({
            ip: ip,
            countryCode: registeredCountryIsoCode,
            countryName: registeredCountryName || "N/A",
            note: "Registered country information.",
          });
        } else {
          res.status(404).json({
            ip: ip,
            error: "Country information not found for this IP in the database.",
          });
        }
      }
    } catch (error: any) {
      console.error(
        `[HomeController] GeoIP lookup error for IP ${ip}:`,
        error.message,
        error
      );
      if (error.name === "AddressNotFoundError") {
        return res
          .status(404)
          .json({ ip: ip, error: "IP address not found in GeoIP database." });
      } else if (error.name === "ValueError") {
        return res
          .status(400)
          .json({ ip: ip, error: "Invalid IP address format." });
      }
      return res.status(500).json({ error: "Error during GeoIP lookup." });
    }
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

  async checkVersion(req: Request, res: Response, next: NextFunction) {
    try {
      const version = req.body.version;
      if (!version) {
        throw new CustomError(400, "Version is required");
      }
      const currentVersion = "2.0";
      if (version !== currentVersion) {
        res.status(200).json({
          latestVersion: currentVersion,
          isForceUpdate: true,
          releaseNote: "Cần cập nhật bản mới nhất",
        });
      }
      res.status(200).json({
        latestVersion: currentVersion,
        isForceUpdate: false,
        releaseNote: "Hiện tại đang là phiên bản mới nhất",
      });
    } catch (error) {
      if (error instanceof CustomError) {
        next(error);
      }
      next(error);
    }
  }
}

export default new HomeController();
