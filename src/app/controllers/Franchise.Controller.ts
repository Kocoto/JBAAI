import { Request, Response, NextFunction } from "express";
import FranchiseService from "../services/Franchise.Service";
import CustomError from "../utils/Error.Util";
import { Types } from "mongoose";
import InvitationCodeService from "../services/InvitationCode.Service";

class FranchiseController {
  /**
   * GET /me/details
   * Get FranchiseDetails of currently logged in franchise
   */
  async getMyFranchiseDetails(req: Request, res: Response, next: NextFunction) {
    try {
      console.log(
        "[FranchiseController] Start getting franchise details for logged in user"
      );

      // Get userId from req.user (set by checkLogin middleware)
      const userId = req.user?._id;

      if (!userId) {
        throw new CustomError(401, "Could not find logged in user information");
      }

      // Check user role
      const userRole = req.user?.role;
      if (userRole !== "franchise") {
        throw new CustomError(
          403,
          "You don't have permission to access this feature. Only franchise can view this information"
        );
      }

      // Call service to get information
      const franchiseDetails = await FranchiseService.getMyFranchiseDetails(
        userId
      );

      console.log(
        `[FranchiseController] Successfully got franchise details for user: ${userId}`
      );

      // Return response
      return res.status(200).json({
        success: true,
        message: "Successfully retrieved franchise information",
        data: franchiseDetails,
      });
    } catch (error) {
      console.error(
        `[FranchiseController] Error getting franchise details: ${error}`
      );
      next(error);
    }
  }

  /**
   * GET /me/quota
   * Get current quota information of franchise
   */
  async getMyQuota(req: Request, res: Response, next: NextFunction) {
    try {
      console.log(
        "[FranchiseController] Start getting quota information for franchise"
      );

      const userId = req.user?._id;

      if (!userId) {
        throw new CustomError(401, "Could not find logged in user information");
      }

      // Check role
      if (req.user?.role !== "franchise") {
        throw new CustomError(403, "Only franchise can view quota information");
      }

      // Get franchise details to extract quota info
      const franchiseDetails = await FranchiseService.getMyFranchiseDetails(
        userId
      );

      // Only return quota information
      const quotaInfo = {
        totalActiveQuota: franchiseDetails.quotaInfo.totalActiveQuota,
        activeQuotaDetails: franchiseDetails.quotaInfo.activeQuotaDetails,
        totalLedgerEntries: franchiseDetails.quotaInfo.totalLedgerEntries,
        statistics: {
          totalInvitations: franchiseDetails.statistics.totalInvitations,
          remainingQuota: franchiseDetails.quotaInfo.totalActiveQuota,
        },
      };

      console.log(
        `[FranchiseController] Successfully got quota information for user: ${userId}`
      );

      return res.status(200).json({
        success: true,
        message: "Successfully retrieved quota information",
        data: quotaInfo,
      });
    } catch (error) {
      console.error(
        `[FranchiseController] Error getting quota information: ${error}`
      );
      next(error);
    }
  }

  /**
   * GET /me/statistics
   * Get performance statistics of franchise
   */
  async getMyStatistics(req: Request, res: Response, next: NextFunction) {
    try {
      console.log("[FranchiseController] Start getting franchise statistics");

      const userId = req.user?._id;

      if (!userId) {
        throw new CustomError(401, "Could not find logged in user information");
      }

      // Check role
      if (req.user?.role !== "franchise") {
        throw new CustomError(403, "Only franchise can view statistics");
      }

      // Get franchise details to extract statistics
      const franchiseDetails = await FranchiseService.getMyFranchiseDetails(
        userId
      );

      // Format statistics with additional details
      const statistics = {
        ...franchiseDetails.statistics,
        quotaSummary: {
          totalActiveQuota: franchiseDetails.quotaInfo.totalActiveQuota,
          usedQuota: franchiseDetails.statistics.totalInvitations,
          remainingQuota: Math.max(
            0,
            franchiseDetails.quotaInfo.totalActiveQuota -
              franchiseDetails.statistics.totalInvitations
          ),
        },
        performanceMetrics: {
          conversionRate: franchiseDetails.statistics.conversionRate,
          renewalRate:
            franchiseDetails.statistics.totalTrialUsers > 0
              ? Math.round(
                  (franchiseDetails.statistics.totalRenewals /
                    franchiseDetails.statistics.totalTrialUsers) *
                    100 *
                    100
                ) / 100
              : 0,
          averagePerChild:
            franchiseDetails.statistics.directChildrenCount > 0
              ? Math.round(
                  franchiseDetails.statistics.totalInvitations /
                    franchiseDetails.statistics.directChildrenCount
                )
              : 0,
        },
      };

      console.log(
        `[FranchiseController] Successfully got statistics for user: ${userId}`
      );

      return res.status(200).json({
        success: true,
        message: "Successfully retrieved franchise statistics",
        data: statistics,
      });
    } catch (error) {
      console.error(`[FranchiseController] Error getting statistics: ${error}`);
      next(error);
    }
  }

  /**
   * GET /me/invitation-codes
   * Get list of invitation codes owned by currently logged in franchise
   */
  async getMyInvitationCodes(req: Request, res: Response, next: NextFunction) {
    try {
      console.log(
        "[FranchiseController] Start getting invitation codes list for franchise"
      );

      const userId = req.user?._id;

      if (!userId) {
        throw new CustomError(401, "Could not find logged in user information");
      }

      // Check role
      if (req.user?.role !== "franchise") {
        throw new CustomError(
          403,
          "Only franchise can view invitation codes list"
        );
      }

      // Call service to get invitation codes list
      const invitationCodes = await FranchiseService.getMyInvitationCodes(
        userId
      );

      console.log(
        `[FranchiseController] Successfully got invitation codes list for user: ${userId}`
      );

      return res.status(200).json({
        success: true,
        message: "Successfully retrieved invitation codes list",
        data: invitationCodes,
      });
    } catch (error) {
      console.error(
        `[FranchiseController] Error getting invitation codes list: ${error}`
      );
      next(error);
    }
  }

  /**
   * GET /me/user-trial-quota-ledger
   * Get list of ledger entries managing trial invitation quota of franchise
   */
  async getMyUserTrialQuotaLedger(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      console.log(
        "[FranchiseController] Start getting quota ledger list for franchise"
      );

      const userId = req.user?._id;

      if (!userId) {
        throw new CustomError(401, "Could not find logged in user information");
      }

      // Check role
      if (req.user?.role !== "franchise") {
        throw new CustomError(403, "Only franchise can view quota ledger list");
      }

      // Get query params
      const { status, rootCampaignId } = req.query;

      // Prepare filters
      const filters: {
        status?: string;
        rootCampaignId?: string;
      } = {};

      if (status && typeof status === "string") {
        filters.status = status;
      }

      if (rootCampaignId && typeof rootCampaignId === "string") {
        filters.rootCampaignId = rootCampaignId;
      }

      // Call service to get quota ledger list
      const quotaLedgerEntries =
        await FranchiseService.getMyUserTrialQuotaLedger(userId, filters);

      console.log(
        `[FranchiseController] Successfully got quota ledger list for user: ${userId}`
      );

      // Calculate quota summary
      const summary = {
        totalEntries: quotaLedgerEntries.length,
        totalAllocated: quotaLedgerEntries.reduce(
          (sum, entry) => sum + entry.totalAllocated,
          0
        ),
        totalConsumed: quotaLedgerEntries.reduce(
          (sum, entry) => sum + entry.consumedByOwnInvites,
          0
        ),
        totalAllocatedToChildren: quotaLedgerEntries.reduce(
          (sum, entry) => sum + entry.allocatedToChildren,
          0
        ),
        totalAvailable: quotaLedgerEntries.reduce(
          (sum, entry) => sum + entry.availableQuota,
          0
        ),
        statusBreakdown: {
          active: quotaLedgerEntries.filter(
            (entry) => entry.status === "active"
          ).length,
          exhausted: quotaLedgerEntries.filter(
            (entry) => entry.status === "exhausted"
          ).length,
          expired: quotaLedgerEntries.filter(
            (entry) => entry.status === "expired"
          ).length,
          paused: quotaLedgerEntries.filter(
            (entry) => entry.status === "paused"
          ).length,
        },
      };

      return res.status(200).json({
        success: true,
        message: "Successfully retrieved quota ledger list",
        data: quotaLedgerEntries,
        summary: summary,
        filters: filters,
      });
    } catch (error) {
      console.error(
        `[FranchiseController] Error getting quota ledger list: ${error}`
      );
      next(error);
    }
  }

  /**
   * POST /api/v1/franchise/manage-children-quota/allocate
   * Franchise Fn allocates (shares) a portion of trial invitation quota to child franchise Fn+1
   */
  async allocateQuotaToChild(req: Request, res: Response, next: NextFunction) {
    try {
      console.log(
        "[FranchiseController] Start allocating quota to child franchise"
      );

      // Get userId of logged in franchise
      const parentUserId = req.user?._id;

      if (!parentUserId) {
        throw new CustomError(401, "Could not find logged in user information");
      }

      // Check role
      if (req.user?.role !== "franchise") {
        throw new CustomError(403, "Only franchise can allocate quota");
      }

      // Get information from request body
      const { childFranchiseUserId, amountToAllocate, sourceLedgerEntryId } =
        req.body;

      // Validate input
      if (!childFranchiseUserId || !amountToAllocate || !sourceLedgerEntryId) {
        throw new CustomError(
          400,
          "Missing required information: childFranchiseUserId, amountToAllocate, sourceLedgerEntryId"
        );
      }

      if (!Types.ObjectId.isValid(childFranchiseUserId)) {
        throw new CustomError(400, "Invalid child franchise ID");
      }

      if (!Types.ObjectId.isValid(sourceLedgerEntryId)) {
        throw new CustomError(400, "Invalid ledger entry ID");
      }

      const amount = parseInt(amountToAllocate);
      if (isNaN(amount) || amount <= 0) {
        throw new CustomError(400, "Quota amount must be a positive integer");
      }

      // Call service to process quota allocation
      const result = await FranchiseService.allocateQuotaToChild(
        parentUserId,
        childFranchiseUserId,
        amount,
        sourceLedgerEntryId
      );

      console.log(
        `[FranchiseController] Successfully allocated quota to child franchise: ${childFranchiseUserId}`
      );

      return res.status(200).json({
        success: true,
        message: "Successfully allocated quota to child franchise",
        data: result,
      });
    } catch (error) {
      console.error(
        `[FranchiseController] Error allocating quota to child franchise: ${error}`
      );
      next(error);
    }
  }

  /**
   * PUT /api/v1/franchise/manage-children-quota/revoke-allocation/:childLedgerEntryId
   * Franchise Fn revokes quota allocated to Fn+1
   */
  async revokeQuotaFromChild(req: Request, res: Response, next: NextFunction) {
    try {
      console.log(
        "[FranchiseController] Start revoking quota from child franchise"
      );

      const parentUserId = req.user?._id;
      const { childLedgerEntryId } = req.params;

      if (!parentUserId) {
        throw new CustomError(401, "Could not find logged in user information");
      }

      if (req.user?.role !== "franchise") {
        throw new CustomError(403, "Only franchise can revoke quota");
      }

      if (!childLedgerEntryId) {
        throw new CustomError(400, "Ledger entry ID cannot be empty");
      }

      if (!Types.ObjectId.isValid(childLedgerEntryId)) {
        throw new CustomError(400, "Invalid ledger entry ID");
      }

      // Call service to process quota revocation
      const result = await FranchiseService.revokeQuotaFromChild(
        parentUserId,
        childLedgerEntryId
      );

      console.log(
        `[FranchiseController] Successfully revoked quota from ledger entry: ${childLedgerEntryId}`
      );

      return res.status(200).json({
        success: true,
        message: "Successfully revoked quota from child franchise",
        data: result,
      });
    } catch (error) {
      console.error(
        `[FranchiseController] Error revoking quota from child franchise: ${error}`
      );
      next(error);
    }
  }

  /**
   * GET /api/v1/franchise/manage-children-quota/allocation-history/child/:childFranchiseUserId
   * View history of Fn quota allocations to a specific childFranchiseUserId
   */
  async getChildAllocationHistory(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      console.log(
        "[FranchiseController] Start getting quota allocation history for child franchise"
      );

      const parentUserId = req.user?._id;
      const { childFranchiseUserId } = req.params;

      if (!parentUserId) {
        throw new CustomError(401, "Could not find logged in user information");
      }

      if (req.user?.role !== "franchise") {
        throw new CustomError(
          403,
          "Only franchise can view quota allocation history"
        );
      }

      if (!childFranchiseUserId) {
        throw new CustomError(400, "Child franchise ID cannot be empty");
      }

      if (!Types.ObjectId.isValid(childFranchiseUserId)) {
        throw new CustomError(400, "Invalid child franchise ID");
      }

      // Call service to get allocation history
      const allocationHistory =
        await FranchiseService.getChildAllocationHistory(
          parentUserId,
          childFranchiseUserId
        );

      console.log(
        `[FranchiseController] Successfully got quota allocation history for child franchise: ${childFranchiseUserId}`
      );

      return res.status(200).json({
        success: true,
        message: "Successfully retrieved quota allocation history",
        data: allocationHistory,
      });
    } catch (error) {
      console.error(
        `[FranchiseController] Error getting quota allocation history: ${error}`
      );
      next(error);
    }
  }

  /**
   * GET /api/v1/franchise/reports/my-trial-performance
   * Franchise views their own trial invitation performance
   */
  async getMyTrialPerformance(req: Request, res: Response, next: NextFunction) {
    try {
      console.log(
        "[FranchiseController] Start getting trial invitation performance for franchise"
      );

      const userId = req.user?._id;

      if (!userId) {
        throw new CustomError(401, "Could not find logged in user information");
      }

      // Get query params
      const { startDate, endDate, rootCampaignId } = req.query;

      // Validate dates if present
      let parsedStartDate: Date | undefined;
      let parsedEndDate: Date | undefined;

      if (startDate) {
        parsedStartDate = new Date(startDate as string);
        if (isNaN(parsedStartDate.getTime())) {
          throw new CustomError(
            400,
            "Invalid startDate format. Use YYYY-MM-DD"
          );
        }
      }

      if (endDate) {
        parsedEndDate = new Date(endDate as string);
        if (isNaN(parsedEndDate.getTime())) {
          throw new CustomError(400, "Invalid endDate format. Use YYYY-MM-DD");
        }
      }

      if (parsedStartDate && parsedEndDate && parsedStartDate > parsedEndDate) {
        throw new CustomError(400, "startDate must be before endDate");
      }

      // Validate rootCampaignId if present
      if (rootCampaignId && !Types.ObjectId.isValid(rootCampaignId as string)) {
        throw new CustomError(400, "Invalid Campaign ID");
      }

      // Call service
      const performanceData =
        await FranchiseService.getFranchiseTrialPerformance(
          userId,
          parsedStartDate,
          parsedEndDate,
          rootCampaignId as string
        );

      console.log(
        `[FranchiseController] Successfully got trial invitation performance for franchise: ${userId}`
      );

      return res.status(200).json({
        success: true,
        message: "Successfully retrieved trial invitation performance",
        data: performanceData,
      });
    } catch (error) {
      console.error(
        `[FranchiseController] Error getting trial invitation performance: ${error}`
      );
      next(error);
    }
  }

  /**
   * GET /api/v1/franchise/reports/children-trial-performance-summary
   * Franchise views aggregated performance of direct child franchises
   */
  async getChildrenTrialPerformanceSummary(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      console.log(
        "[FranchiseController] Start getting aggregated performance of child franchises"
      );

      const userId = req.user?._id;

      if (!userId) {
        throw new CustomError(401, "Could not find logged in user information");
      }

      // Parse query params
      const { startDate, endDate, rootCampaignId } = req.query;

      let parsedStartDate: Date | undefined;
      let parsedEndDate: Date | undefined;

      if (startDate) {
        parsedStartDate = new Date(startDate as string);
        if (isNaN(parsedStartDate.getTime())) {
          throw new CustomError(400, "Invalid startDate format");
        }
      }

      if (endDate) {
        parsedEndDate = new Date(endDate as string);
        if (isNaN(parsedEndDate.getTime())) {
          throw new CustomError(400, "Invalid endDate format");
        }
      }

      if (rootCampaignId && !Types.ObjectId.isValid(rootCampaignId as string)) {
        throw new CustomError(400, "Invalid Campaign ID");
      }

      // Call service
      const performanceSummary =
        await FranchiseService.getChildrenPerformanceSummary(
          userId,
          parsedStartDate,
          parsedEndDate,
          rootCampaignId as string
        );

      console.log(
        `[FranchiseController] Successfully got aggregated performance of child franchises`
      );

      return res.status(200).json({
        success: true,
        message:
          "Successfully retrieved aggregated performance of child franchises",
        data: performanceSummary,
      });
    } catch (error) {
      console.error(
        `[FranchiseController] Error getting aggregated performance of child franchises: ${error}`
      );
      next(error);
    }
  }

  /**
   * GET /api/v1/franchise/reports/child-trial-performance/:childFranchiseUserId
   * Franchise views detailed performance of a specific child franchise
   */
  async getSingleChildTrialPerformance(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      console.log(
        "[FranchiseController] Start getting detailed performance of child franchise"
      );

      const parentUserId = req.user?._id;
      const { childFranchiseUserId } = req.params;

      if (!parentUserId) {
        throw new CustomError(401, "Could not find logged in user information");
      }

      if (!childFranchiseUserId) {
        throw new CustomError(400, "Child franchise ID cannot be empty");
      }

      if (!Types.ObjectId.isValid(childFranchiseUserId)) {
        throw new CustomError(400, "Invalid child franchise ID");
      }

      // Parse query params
      const { startDate, endDate, rootCampaignId } = req.query;

      let parsedStartDate: Date | undefined;
      let parsedEndDate: Date | undefined;

      if (startDate) {
        parsedStartDate = new Date(startDate as string);
        if (isNaN(parsedStartDate.getTime())) {
          throw new CustomError(400, "Invalid startDate format");
        }
      }

      if (endDate) {
        parsedEndDate = new Date(endDate as string);
        if (isNaN(parsedEndDate.getTime())) {
          throw new CustomError(400, "Invalid endDate format");
        }
      }

      if (rootCampaignId && !Types.ObjectId.isValid(rootCampaignId as string)) {
        throw new CustomError(400, "Invalid Campaign ID");
      }

      // Call service
      const childPerformance = await FranchiseService.getSingleChildPerformance(
        parentUserId,
        childFranchiseUserId,
        parsedStartDate,
        parsedEndDate,
        rootCampaignId as string
      );

      console.log(
        `[FranchiseController] Successfully got detailed performance of child franchise: ${childFranchiseUserId}`
      );

      return res.status(200).json({
        success: true,
        message:
          "Successfully retrieved detailed performance of child franchise",
        data: childPerformance,
      });
    } catch (error) {
      console.error(
        `[FranchiseController] Error getting detailed performance of child franchise: ${error}`
      );
      next(error);
    }
  }

  /**
   * GET /api/v1/franchise/reports/full-hierarchy-performance/:rootCampaignId?
   * Franchise views performance of themselves and entire tree below
   */
  async getFullHierarchyPerformance(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      console.log(
        "[FranchiseController] Start getting full franchise tree performance"
      );

      const userId = req.user?._id;
      const { rootCampaignId } = req.params;

      if (!userId) {
        throw new CustomError(401, "Could not find logged in user information");
      }

      // Validate rootCampaignId if present
      if (rootCampaignId && !Types.ObjectId.isValid(rootCampaignId)) {
        throw new CustomError(400, "Invalid Campaign ID");
      }

      // Parse query params
      const { startDate, endDate } = req.query;

      let parsedStartDate: Date | undefined;
      let parsedEndDate: Date | undefined;

      if (startDate) {
        parsedStartDate = new Date(startDate as string);
        if (isNaN(parsedStartDate.getTime())) {
          throw new CustomError(400, "Invalid startDate format");
        }
      }

      if (endDate) {
        parsedEndDate = new Date(endDate as string);
        if (isNaN(parsedEndDate.getTime())) {
          throw new CustomError(400, "Invalid endDate format");
        }
      }

      // Call service
      const hierarchyPerformance =
        await FranchiseService.getFullHierarchyPerformance(
          userId,
          rootCampaignId,
          parsedStartDate,
          parsedEndDate
        );

      console.log(
        `[FranchiseController] Successfully got full franchise tree performance`
      );

      return res.status(200).json({
        success: true,
        message: "Successfully retrieved full franchise tree performance",
        data: hierarchyPerformance,
      });
    } catch (error) {
      console.error(
        `[FranchiseController] Error getting full franchise tree performance: ${error}`
      );
      next(error);
    }
  }

  /**
   * GET /api/v1/franchise/reports/quota-utilization
   * Franchise views quota utilization of themselves and direct children
   */
  async getQuotaUtilization(req: Request, res: Response, next: NextFunction) {
    try {
      console.log(
        "[FranchiseController] Start getting quota utilization information"
      );

      const userId = req.user?._id;

      if (!userId) {
        throw new CustomError(401, "Could not find logged in user information");
      }

      // Call service
      const quotaUtilization = await FranchiseService.getQuotaUtilization(
        userId
      );

      console.log(
        `[FranchiseController] Successfully got quota utilization information`
      );

      return res.status(200).json({
        success: true,
        message: "Successfully retrieved quota utilization information",
        data: quotaUtilization,
      });
    } catch (error) {
      console.error(
        `[FranchiseController] Error getting quota utilization information: ${error}`
      );
      next(error);
    }
  }
  async activeInvitationCode(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user._id;
      const activeCode = await InvitationCodeService.activeInvitationCode(
        userId
      );
      if (!activeCode) {
        throw new CustomError(400, "Could not activate invitation code");
      }
      res.status(200).json({
        success: true,
        message: "Successfully activated invitation code",
        data: activeCode,
      });
    } catch (error) {
      next(error);
    }
  }
}

export default new FranchiseController();
