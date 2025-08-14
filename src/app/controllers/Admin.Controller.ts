import AdminService, { campaignFilter } from "../services/Admin.Service";
import { NextFunction, Request, Response } from "express";
import CustomError from "../utils/Error.Util";
import { Types } from "mongoose";
import {
  IInvitationCode,
  IInvitationCodeInput,
} from "../models/InvitationCode.Model";
import SubscriptionService from "../services/Subscription.Service";

class AdminController {
  /**
   * Create new Campaign
   */
  async createCampaign(req: Request, res: Response, next: NextFunction) {
    try {
      console.log("[AdminController] Starting to create new Campaign.");

      const {
        campaignName,
        franchiseOwnerId,
        totalAllocated,
        startDate,
        endDate,
        renewalRequirement,
        packageId,
      } = req.body;
      // Validate required fields
      if (
        !campaignName ||
        !franchiseOwnerId ||
        !totalAllocated ||
        !startDate ||
        !endDate ||
        !packageId
      ) {
        return res.status(400).json({
          success: false,
          message: "Missing required information",
          data: null,
        });
      }

      const newCampaign = await AdminService.createAndAllocateCampaign(
        campaignName,
        franchiseOwnerId,
        parseInt(totalAllocated),
        new Date(startDate),
        new Date(endDate),
        parseInt(renewalRequirement) || 0,
        req.user._id,
        packageId
      );

      console.log(
        `[AdminController] Successfully created Campaign with ID: ${newCampaign._id}`
      );

      return res.status(201).json({
        success: true,
        message: "Campaign created successfully",
        data: newCampaign,
      });
    } catch (error) {
      console.error(`[AdminController] Error creating Campaign: ${error}`);
      next(error);
    }
  }

  /**
   * Get all Campaigns with filters and pagination
   */
  async getAllCampaigns(req: Request, res: Response, next: NextFunction) {
    try {
      console.log("[AdminController] Starting to get Campaigns list.");

      const { status, ownerId, franchiseOwnerId } = req.query as campaignFilter;
      const { page, limit, search } = req.query;

      // Create filter object
      let filter: campaignFilter = {};

      // Filter by status - default is active if not provided
      if (status) {
        // Validate status values
        const validStatuses = ["active", "inactive", "expired", "deleted"];
        if (!validStatuses.includes(status)) {
          return res.status(400).json({
            success: false,
            message:
              "Invalid status. Accepted values: " + validStatuses.join(", "),
            data: null,
          });
        }
        filter.status = status;
      } else {
        filter.status = "active"; // Default to only active campaigns
      }

      // Filter by ownerId (deprecated, use franchiseOwnerId instead)
      if (ownerId) {
        filter.franchiseOwnerId = ownerId;
      }

      // Filter by franchiseOwnerId
      if (franchiseOwnerId) {
        filter.franchiseOwnerId = franchiseOwnerId;
      }

      // Parse page and limit
      const pageNumber = parseInt(page as string) || 1;
      const limitNumber = parseInt(limit as string) || 10;

      // Validate page and limit
      if (pageNumber < 1) {
        return res.status(400).json({
          success: false,
          message: "Page number must be greater than or equal to 1",
          data: null,
        });
      }

      if (limitNumber < 1 || limitNumber > 100) {
        return res.status(400).json({
          success: false,
          message: "Items per page must be between 1 and 100",
          data: null,
        });
      }

      const result = await AdminService.getAllCampaigns(
        filter,
        pageNumber,
        limitNumber
      );

      console.log(
        `[AdminController] Retrieved ${result.campaigns.length} Campaigns.`
      );

      return res.status(200).json({
        success: true,
        message: "Successfully retrieved Campaigns list",
        data: result,
        pagination: {
          currentPage: result.currentPage,
          totalPages: result.totalPages,
          totalItems: result.total,
          itemsPerPage: limitNumber,
          hasNextPage: result.hasNextPage,
          hasPrevPage: result.hasPrevPage,
        },
      });
    } catch (error) {
      console.error(
        `[AdminController] Error retrieving Campaigns list: ${error}`
      );
      next(error);
    }
  }

  /**
   * Get Campaign details by ID
   */
  async getCampaignById(req: Request, res: Response, next: NextFunction) {
    try {
      console.log("[AdminController] Starting to get Campaign details.");

      const { campaignId } = req.params;

      if (!campaignId) {
        return res.status(400).json({
          success: false,
          message: "Campaign ID cannot be empty",
          data: null,
        });
      }

      const campaign = await AdminService.getCampaignById(campaignId);

      console.log(
        `[AdminController] Successfully retrieved Campaign: ${campaign.campaignName}`
      );

      return res.status(200).json({
        success: true,
        message: "Successfully retrieved Campaign details",
        data: campaign,
      });
    } catch (error) {
      console.error(
        `[AdminController] Error retrieving Campaign details: ${error}`
      );
      next(error);
    }
  }

  /**
   * Update Campaign information
   */
  async updateCampaign(req: Request, res: Response, next: NextFunction) {
    try {
      console.log("[AdminController] Starting to update Campaign.");

      const { campaignId } = req.params;
      const updateData = req.body;

      if (!campaignId) {
        return res.status(400).json({
          success: false,
          message: "Campaign ID cannot be empty",
          data: null,
        });
      }

      // Validate and convert numbers if needed
      if (updateData.totalAllocated) {
        updateData.totalAllocated = parseInt(updateData.totalAllocated);
      }
      if (updateData.renewalRequirement !== undefined) {
        updateData.renewalRequirement = parseInt(updateData.renewalRequirement);
      }

      const updatedCampaign = await AdminService.updateCampaign(
        campaignId,
        updateData
      );

      console.log(
        `[AdminController] Successfully updated Campaign: ${updatedCampaign.campaignName}`
      );

      return res.status(200).json({
        success: true,
        message: "Campaign updated successfully",
        data: updatedCampaign,
      });
    } catch (error) {
      console.error(`[AdminController] Error updating Campaign: ${error}`);
      next(error);
    }
  }

  /**
   * Delete Campaign (soft delete)
   */
  async deleteCampaign(req: Request, res: Response, next: NextFunction) {
    try {
      console.log("[AdminController] Starting to delete Campaign.");

      const { campaignId } = req.params;

      if (!campaignId) {
        return res.status(400).json({
          success: false,
          message: "Campaign ID cannot be empty",
          data: null,
        });
      }

      const deletedCampaign = await AdminService.deleteCampaign(campaignId);

      console.log(
        `[AdminController] Successfully deleted Campaign: ${deletedCampaign.campaignName}`
      );

      return res.status(200).json({
        success: true,
        message: "Campaign deleted successfully",
        data: deletedCampaign,
      });
    } catch (error) {
      console.error(`[AdminController] Error deleting Campaign: ${error}`);
      next(error);
    }
  }

  /**
   * Change Campaign status
   */
  async changeCampaignStatus(req: Request, res: Response, next: NextFunction) {
    try {
      console.log("[AdminController] Starting to change Campaign status.");

      const { campaignId } = req.params;
      const { status } = req.body;

      if (!campaignId) {
        return res.status(400).json({
          success: false,
          message: "Campaign ID cannot be empty",
          data: null,
        });
      }

      if (!status) {
        return res.status(400).json({
          success: false,
          message: "New status cannot be empty",
          data: null,
        });
      }

      // Validate status
      const validStatuses = ["active", "inactive", "expired"];
      if (!validStatuses.includes(status)) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid status. Accepted values: " + validStatuses.join(", "),
          data: null,
        });
      }

      const updatedCampaign = await AdminService.updateCampaign(campaignId, {
        status,
      });

      console.log(
        `[AdminController] Successfully changed Campaign status: ${updatedCampaign.campaignName} -> ${status}`
      );

      return res.status(200).json({
        success: true,
        message: `Successfully changed Campaign status to '${status}'`,
        data: updatedCampaign,
      });
    } catch (error) {
      console.error(
        `[AdminController] Error changing Campaign status: ${error}`
      );
      next(error);
    }
  }

  /**
   * Get Campaign statistics
   */
  async getCampaignStatistics(req: Request, res: Response, next: NextFunction) {
    try {
      console.log("[AdminController] Starting to get Campaign statistics.");

      // Get statistics for each status type
      const activeResult = await AdminService.getAllCampaigns(
        { status: "active" },
        1,
        1
      );
      const inactiveResult = await AdminService.getAllCampaigns(
        { status: "inactive" },
        1,
        1
      );
      const expiredResult = await AdminService.getAllCampaigns(
        { status: "expired" },
        1,
        1
      );

      const statistics = {
        total: {
          active: activeResult.total,
          inactive: inactiveResult.total,
          expired: expiredResult.total,
          all: activeResult.total + inactiveResult.total + expiredResult.total,
        },
        percentage: {
          active: 0,
          inactive: 0,
          expired: 0,
        },
      };

      // Calculate percentages
      if (statistics.total.all > 0) {
        statistics.percentage.active = Math.round(
          (statistics.total.active / statistics.total.all) * 100
        );
        statistics.percentage.inactive = Math.round(
          (statistics.total.inactive / statistics.total.all) * 100
        );
        statistics.percentage.expired = Math.round(
          (statistics.total.expired / statistics.total.all) * 100
        );
      }

      console.log(
        `[AdminController] Successfully retrieved Campaign statistics.`
      );

      return res.status(200).json({
        success: true,
        message: "Successfully retrieved Campaign statistics",
        data: statistics,
      });
    } catch (error) {
      console.error(
        `[AdminController] Error retrieving Campaign statistics: ${error}`
      );
      next(error);
    }
  }

  async getCampaignPerformanceSummary(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      console.log(
        "[AdminController] Starting to get Campaign performance summary."
      );

      const { campaignId } = req.params;

      if (!campaignId) {
        return res.status(400).json({
          success: false,
          message: "Campaign ID cannot be empty",
          data: null,
        });
      }

      const performanceSummary =
        await AdminService.getCampaignPerformanceSummary(campaignId);

      console.log(
        `[AdminController] Successfully retrieved Campaign performance summary: ${performanceSummary.campaign.campaignName}`
      );

      return res.status(200).json({
        success: true,
        message: "Successfully retrieved Campaign performance summary",
        data: performanceSummary,
      });
    } catch (error) {
      console.error(
        `[AdminController] Error retrieving Campaign performance summary: ${error}`
      );
      next(error);
    }
  }

  //GET /franchises
  async getAllFranchises(req: Request, res: Response, next: NextFunction) {
    try {
      console.log("[AdminController] Starting to get Franchises list.");

      // Get query parameters
      const { page, limit, status, level } = req.query;

      // Parse and validate page and limit
      const pageNumber = parseInt(page as string) || 1;
      const limitNumber = parseInt(limit as string) || 10;

      // Parse level if provided
      let franchiseLevel: number | undefined;
      if (level !== undefined && level !== "") {
        franchiseLevel = parseInt(level as string);

        // Validate level is a valid number
        if (isNaN(franchiseLevel) || franchiseLevel < 0) {
          return res.status(400).json({
            success: false,
            message: "Franchise level must be a non-negative number",
            data: null,
          });
        }
      }

      // Validate status if provided
      const validStatuses = ["active", "inactive", "suspended"]; // Add valid statuses according to business logic
      console.log(`[AdminController] status: ${status}`);
      console.log(`[AdminController] validStatuses: ${validStatuses}`);
      if (status && !validStatuses.includes(status as string)) {
        return res.status(400).json({
          success: false,
          message: `Invalid status. Accepted values: ${validStatuses.join(
            ", "
          )}`,
          data: null,
        });
      }

      // Call service to get data
      const result = await AdminService.getAllFranchises(
        pageNumber,
        limitNumber,
        status as string,
        franchiseLevel
      );

      console.log(
        `[AdminController] Retrieved ${result.franchises.length} Franchises.`
      );

      // Format response data
      const formattedFranchises = result.franchises.map((franchise) => ({
        _id: franchise._id,
        userId: franchise.userId,
        parentId: franchise.parentId,
        franchiseLevel: franchise.franchiseLevel,
        ancestorPath: franchise.ancestorPath,
        userTrialQuotaLedger: franchise.userTrialQuotaLedger,
        totalActiveQuota:
          franchise.userTrialQuotaLedger
            ?.filter((ledger: any) => ledger.status === "active")
            ?.reduce((sum: number, ledger: any) => {
              const available =
                ledger.totalAllocated -
                ledger.consumedByOwnInvites -
                ledger.allocatedToChildren;
              return sum + Math.max(0, available);
            }, 0) || 0,
        createdAt: franchise.createdAt,
        updatedAt: franchise.updatedAt,
      }));

      return res.status(200).json({
        success: true,
        message: "Successfully retrieved Franchises list",
        data: {
          franchises: formattedFranchises,
          pagination: {
            currentPage: result.currentPage,
            totalPages: result.totalPages,
            totalItems: result.total,
            itemsPerPage: limitNumber,
            hasNextPage: result.hasNextPage,
            hasPrevPage: result.hasPrevPage,
          },
        },
      });
    } catch (error) {
      console.error(
        `[AdminController] Error retrieving Franchises list: ${error}`
      );
      next(error);
    }
  }

  async getFranchiseHierarchy(req: Request, res: Response, next: NextFunction) {
    try {
      console.log("[AdminController] Starting to get franchise hierarchy.");

      const { userId } = req.params;

      if (!userId) {
        return res.status(400).json({
          success: false,
          message: "User ID cannot be empty",
          data: null,
        });
      }

      // Validate userId format
      if (!Types.ObjectId.isValid(userId)) {
        return res.status(400).json({
          success: false,
          message: "Invalid User ID",
          data: null,
        });
      }

      const hierarchyData = await AdminService.getFranchiseHierarchy(userId);

      console.log(
        `[AdminController] Successfully retrieved franchise hierarchy for user: ${userId}`
      );

      return res.status(200).json({
        success: true,
        message: "Successfully retrieved franchise hierarchy",
        data: hierarchyData,
      });
    } catch (error) {
      console.error(
        `[AdminController] Error retrieving franchise hierarchy: ${error}`
      );
      next(error);
    }
  }

  async getFranchisePerformanceOverview(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      console.log(
        "[AdminController] Starting to get franchise performance overview."
      );

      const { userId } = req.params;
      const { startDate, endDate, rootCampaignId } = req.query;

      // Validate userId
      if (!userId) {
        return res.status(400).json({
          success: false,
          message: "User ID cannot be empty",
          data: null,
        });
      }

      if (!Types.ObjectId.isValid(userId)) {
        return res.status(400).json({
          success: false,
          message: "Invalid User ID",
          data: null,
        });
      }

      // Validate and parse dates if provided
      let parsedStartDate: Date | undefined;
      let parsedEndDate: Date | undefined;

      if (startDate) {
        parsedStartDate = new Date(startDate as string);
        if (isNaN(parsedStartDate.getTime())) {
          return res.status(400).json({
            success: false,
            message:
              "Invalid startDate format. Use ISO format (YYYY-MM-DD or YYYY-MM-DDTHH:mm:ss.sssZ)",
            data: null,
          });
        }
      }

      if (endDate) {
        parsedEndDate = new Date(endDate as string);
        if (isNaN(parsedEndDate.getTime())) {
          return res.status(400).json({
            success: false,
            message:
              "Invalid endDate format. Use ISO format (YYYY-MM-DD or YYYY-MM-DDTHH:mm:ss.sssZ)",
            data: null,
          });
        }
      }

      // Validate date range
      if (
        parsedStartDate &&
        parsedEndDate &&
        parsedStartDate >= parsedEndDate
      ) {
        return res.status(400).json({
          success: false,
          message: "startDate must be before endDate",
          data: null,
        });
      }

      // Validate rootCampaignId if provided
      if (rootCampaignId && !Types.ObjectId.isValid(rootCampaignId as string)) {
        return res.status(400).json({
          success: false,
          message: "Invalid Campaign ID",
          data: null,
        });
      }

      // Check if date range is too large (to avoid heavy queries)
      if (parsedStartDate && parsedEndDate) {
        const daysDifference = Math.ceil(
          (parsedEndDate.getTime() - parsedStartDate.getTime()) /
            (1000 * 60 * 60 * 24)
        );

        if (daysDifference > 365) {
          return res.status(400).json({
            success: false,
            message: "Maximum time range is 365 days",
            data: null,
          });
        }
      }

      // Call service method
      const performanceOverview =
        await AdminService.getFranchisePerformanceOverview(
          userId,
          parsedStartDate,
          parsedEndDate,
          rootCampaignId as string
        );

      console.log(
        `[AdminController] Successfully retrieved franchise performance overview for user: ${userId}`
      );

      return res.status(200).json({
        success: true,
        message: "Successfully retrieved franchise performance overview",
        data: performanceOverview,
        meta: {
          userId: userId,
          filters: {
            startDate: parsedStartDate?.toISOString() || null,
            endDate: parsedEndDate?.toISOString() || null,
            rootCampaignId: rootCampaignId || null,
          },
          queryTimestamp: new Date().toISOString(),
        },
      });
    } catch (error) {
      console.error(
        `[AdminController] Error retrieving franchise performance overview: ${error}`
      );
      next(error);
    }
  }

  async createInvitationCode(req: Request, res: Response, next: NextFunction) {
    try {
      let data: IInvitationCodeInput;
      const userId = req.user._id;
      const { code, packageId } = req.body;
      if (!code || !packageId) {
        throw new CustomError(400, "code and packageId are required");
      }
      data = {
        code,
        userId,
        status: "active",
        codeType: "USER_TRIAL",
        packageId,
      };
      const newInvitationCode = await AdminService.createInvitationCode(data);
      res.status(200).json({
        success: true,
        message: "Successfully created invitation code",
        data: newInvitationCode,
      });
    } catch (error) {
      next(error);
    }
  }

  async getAllUsers(req: Request, res: Response, next: NextFunction) {
    try {
      const { page, limit } = req.query;
      const users = await AdminService.getAllUsers(
        parseInt(page as string) || 1,
        parseInt(limit as string) || 10
      );
      res.status(200).json({
        success: true,
        message: "Successfully retrieved all users",
        data: users,
      });
    } catch (error) {
      next(error);
    }
  }

  async getUserById(req: Request, res: Response, next: NextFunction) {
    try {
      const { userId } = req.params;
      const user = await AdminService.getUserById(userId);
      res.status(200).json({
        success: true,
        message: "Successfully retrieved user by id",
        data: user,
      });
    } catch (error) {
      next(error);
    }
  }

  async updateUser(req: Request, res: Response, next: NextFunction) {
    try {
      const { userId } = req.params;
      const user = await AdminService.updateUser(userId, req.body);
      res.status(200).json({
        success: true,
        message: "Successfully updated user",
        data: user,
      });
    } catch (error) {
      next(error);
    }
  }

  async deleteUser(req: Request, res: Response, next: NextFunction) {
    try {
      const { userId } = req.params;
      const user = await AdminService.deleteUser(userId);
      res.status(200).json({
        success: true,
        message: "Successfully deleted user",
        data: user,
      });
    } catch (error) {
      next(error);
    }
  }

  async getSearchUsers(req: Request, res: Response, next: NextFunction) {
    try {
      const { query, page, limit } = req.query;
      const users = await AdminService.getSearchUsers(
        query as string,
        parseInt(page as string) || 1,
        parseInt(limit as string) || 10
      );
      res.status(200).json({
        success: true,
        message: "Successfully retrieved search users",
        data: users,
      });
    } catch (error) {
      next(error);
    }
  }

  async createSubscription(req: Request, res: Response, next: NextFunction) {
    try {
      const { userId, packageId } = req.body;
      const subscription = await SubscriptionService.createSubscription(
        userId,
        packageId
      );
      res.status(200).json({
        success: true,
        message: "Successfully created subscription",
        data: subscription,
      });
    } catch (error) {
      next(error);
    }
  }
}

export default new AdminController();
