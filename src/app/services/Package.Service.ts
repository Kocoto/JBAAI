import PackageModel from "../models/Package.Model";
import CustomError from "../utils/Error.Util";

class PackageService {
  async createPackage(packageData: any) {
    try {
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

  async getAllPackages() {
    try {
      const packages = await PackageModel.find({ status: true });
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

  async getPackageByType(type: string) {
    try {
      const packages = await PackageModel.find({ type, status: true });
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
