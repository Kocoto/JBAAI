import PackageModel from "../models/Package.Model";
import CustomError from "../utils/Error.Util";

interface IQueryPayload {
  type?: string;
  location?: string;
  status?: boolean;
}

class PackageService {
  async createPackage(packageData: any) {
    try {
      // Validate required fields
      if (
        !packageData.userId ||
        !packageData.name ||
        !packageData.description ||
        !packageData.price ||
        !packageData.duration ||
        !packageData.type ||
        !packageData.location ||
        !packageData.currency
      ) {
        throw new CustomError(400, "Missing required package fields");
      }

      // Validate price and duration are positive numbers
      if (packageData.price < 0 || packageData.duration < 0) {
        throw new CustomError(
          400,
          "Price and duration must be positive numbers"
        );
      }

      // Validate type is either standard or premium
      if (!["standard", "premium"].includes(packageData.type)) {
        throw new CustomError(400, "Invalid package type");
      }

      // Validate location is either VN or other
      if (
        packageData.location &&
        !["VN", "other"].includes(packageData.location)
      ) {
        throw new CustomError(400, "Invalid location");
      }

      const newPackage = await PackageModel.create(packageData);
      if (!newPackage) {
        throw new CustomError(400, "Package creation failed");
      }
      return newPackage;
    } catch (error) {
      if (error instanceof CustomError) {
        throw error;
      }
      throw new CustomError(500, error as string);
    }
  }

  async getAllPackages(isoCode: string, queryPayload: IQueryPayload) {
    try {
      if (!queryPayload.status) {
        queryPayload.status = true;
      }
      if (!queryPayload.location) {
        queryPayload.location = isoCode === "VN" ? "VN" : "other";
      }

      const packages = await PackageModel.find(queryPayload);
      if (!packages) {
        throw new CustomError(404, "Packages not found");
      }
      return packages;
    } catch (error) {
      if (error instanceof CustomError) {
        throw error;
      }
      throw new CustomError(500, error as string);
    }
  }

  async getPackageByType(type: string, isoCode: string) {
    try {
      const packages = await PackageModel.find({
        type,
        status: true,
        location: isoCode === "VN" ? "VN" : "other",
      });
      if (!packages) {
        throw new CustomError(404, "Packages not found");
      }
      return packages;
    } catch (error) {
      if (error instanceof CustomError) {
        throw error;
      }
      throw new CustomError(500, error as string);
    }
  }

  async getPackageById(id: string) {
    try {
      const packageData = await PackageModel.findById(id);
      if (!packageData) {
        throw new CustomError(404, "Package not found");
      }
      return packageData;
    } catch (error) {
      if (error instanceof CustomError) {
        throw error;
      }
      throw new CustomError(500, error as string);
    }
  }
}

export default new PackageService();
