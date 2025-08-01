import { NextFunction, Request, Response } from "express";
import CustomError from "../utils/Error.Util";
import PackageService, { IQueryPayload } from "../services/Package.Service";
import { IPackage } from "../models/Package.Model";
import { geoIpDbBuffer } from "../config/geoip.config";
import { Reader as MaxMindGeoIPReader } from "@maxmind/geoip2-node";
import { getCountryInfoFromIp } from "../utils/GeoIp.util";

class PackageController {
  async createPackage(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user._id;
      const {
        name,
        price,
        description,
        duration,
        type,
        location,
        discount,
        status,
      } = req.body;

      // Validate required fields
      if (!userId || !name || !description || !price || !duration || !type) {
        throw new CustomError(400, "Missing required package fields");
      }

      // Validate price and duration are positive numbers
      if (price < 0 || duration < 0) {
        throw new CustomError(
          400,
          "Price and duration must be positive numbers"
        );
      }

      // Validate type is either standard or premium
      if (!["standard", "premium"].includes(type)) {
        throw new CustomError(400, "Invalid package type");
      }

      // Validate location if provided
      if (location && !["VN", "other"].includes(location)) {
        throw new CustomError(400, "Invalid location");
      }

      // Validate discount is a non-negative number if provided
      if (discount !== undefined && discount < 0) {
        throw new CustomError(400, "Discount must be a non-negative number");
      }

      const packageData: Partial<IPackage> = {
        userId,
        name,
        price,
        description,
        duration,
        type,
        currency: location === "VN" ? "VND" : "USD",
        location: location || "other",
        discount: discount || 0,
        status: status !== undefined ? status : true,
      };

      const result = await PackageService.createPackage(packageData);

      if (!result) {
        throw new CustomError(400, "Package creation failed");
      }

      res.status(201).json({
        success: true,
        message: "Package created successfully",
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get all packages with dynamic filters
   * Search conditions are only applied when client provides values
   */
  async getAllPackages(req: Request, res: Response, next: NextFunction) {
    try {
      // Create dynamic query payload - only add fields when they have values
      const queryPayload: IQueryPayload = {};

      // Only add type to query when client provides value
      if (req.query.type) {
        queryPayload.type = req.query.type as string;
      }

      // Only add location to query when client provides value
      if (req.query.location) {
        queryPayload.location = req.query.location as string;
      }

      // Only add status to query when client provides value
      if (req.query.status !== undefined) {
        queryPayload.status = req.query.status === "true";
      }

      // Fetch packages based on dynamic query parameters
      const packages = await PackageService.getAllPackages(queryPayload);

      // Return success response with packages
      return res.status(200).json({
        success: true,
        message: "Packages retrieved successfully",
        data: packages,
        filters: queryPayload, // Return applied filters for client reference
      });
    } catch (error) {
      next(error);
    }
  }

  async getPackageByType(req: Request, res: Response, next: NextFunction) {
    try {
      const { type } = req.body;
      const clientIp = req.ip ?? "8.8.8.8";

      // Check if GeoIP database is available
      if (!geoIpDbBuffer) {
        const errorMessage =
          "[PackageController] GeoIP Database Buffer is not available!";
        console.error(errorMessage);
        return res.status(503).json({
          success: false,
          error: "GeoIP service is temporarily unavailable",
          details: "Database buffer not loaded",
        });
      }

      // Get country information from IP address
      const countryInformation = getCountryInfoFromIp(clientIp);

      if (!countryInformation) {
        const errorMessage =
          "[PackageController] Unable to determine country from IP";
        console.error(errorMessage);
        throw new CustomError(400, "Could not determine your location");
      }

      const countryCode = countryInformation.countryCode;
      if (!countryCode) {
        const errorMessage =
          "[PackageController] Country code not found in location data";
        console.error(errorMessage);
        throw new CustomError(400, "Invalid location data");
      }

      if (!type) {
        throw new CustomError(400, "Package type is required");
      }

      const result = await PackageService.getPackageByType(type, countryCode);
      res.status(200).json({
        success: true,
        data: result,
        metadata: {
          location: countryCode,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  async getPackageById(req: Request, res: Response, next: NextFunction) {
    try {
      const packageId = req.params.id;

      if (!packageId) {
        throw new CustomError(400, "Package ID is required");
      }

      const result = await PackageService.getPackageById(packageId);
      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }
}

export default new PackageController();
