import CampaignModel from "../models/Campaign.Model";
import { FranchiseDetailsModel } from "../models/FranchiseDetails.Model";
import InvitationModel from "../models/Invitation.Model";
import { TrialConversionLogModel } from "../models/TrialConversionLog.Model";
import UserModel from "../models/User.Model";
import CustomError from "../utils/Error.Util";
import { Types } from "mongoose";
import FranchiseService from "./Franchise.Service";
import InvitationCodeModel, {
  IInvitationCode,
  IInvitationCodeInput,
} from "../models/InvitationCode.Model";

export interface campaignFilter {
  status?: string;
  ownerId?: string;
  franchiseOwnerId?: string; // Add this field to filter by franchiseOwnerId
}

export interface CampaignResponse {
  campaigns: any[];
  totalPages: number;
  total: number;
  currentPage: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

export interface FranchisePerformanceOverview {
  franchise: {
    _id: string;
    userId: string;
    franchiseName: string;
    franchiseLevel: number;
    parentId: string | null;
    ancestorPath: string[];
  };
  performance: {
    // Overall performance (including child tree)
    totalInvitesSent: number;
    totalTrialUsers: number;
    totalRenewedUsers: number;
    totalActiveQuota: number;
    overallConversionRate: number;
    overallRenewalRate: number;

    // Individual franchise performance (excluding children)
    ownInvites: number;
    ownTrialUsers: number;
    ownRenewals: number;
    ownConversionRate: number;

    // Time analysis
    timeAnalysis: {
      periodStart: Date;
      periodEnd: Date;
      daysInPeriod: number;
      averageInvitesPerDay: number;
      averageRenewalsPerDay: number;
    };

    // Top performers in child tree
    topPerformers: {
      topInviters: Array<{
        franchiseId: string;
        franchiseName: string;
        level: number;
        invites: number;
        renewals: number;
        conversionRate: number;
      }>;
      topRenewers: Array<{
        franchiseId: string;
        franchiseName: string;
        level: number;
        invites: number;
        renewals: number;
        conversionRate: number;
      }>;
    };

    // Analysis by franchise level
    performanceByLevel: Array<{
      level: number;
      franchiseCount: number;
      totalInvites: number;
      totalRenewals: number;
      averageConversionRate: number;
    }>;

    // Analysis by campaign
    campaignBreakdown: Array<{
      campaignId: string;
      campaignName: string;
      invites: number;
      renewals: number;
      conversionRate: number;
    }>;
  };
  // Performance details of direct child franchises
  directChildren: Array<{
    franchiseId: string;
    franchiseName: string;
    level: number;
    invites: number;
    renewals: number;
    conversionRate: number;
    activeQuota: number;
    lastActivity: Date | null;
  }>;
}

export interface CampaignPerformanceSummary {
  campaign: {
    _id: string;
    campaignName: string;
    franchiseOwnerId: string;
    totalAllocated: number;
    consumedUses: number;
    totalRenewed: number;
    status: string;
    startDate: Date;
    endDate: Date;
    renewalRequirementPercentage: number;
  };
  performance: {
    // Overview
    totalInvitesSent: number; // Total invitations sent
    totalTrialUsers: number; // Total trial users
    totalRenewedUsers: number; // Total renewed users
    conversionRate: number; // Conversion rate (%)
    renewalRate: number; // Renewal rate (%)

    // Analysis by franchise level
    performanceByLevel: {
      level: number;
      franchiseName: string;
      totalInvites: number;
      totalRenewals: number;
      conversionRate: number;
    }[];

    // Renewal requirement progress
    renewalProgress: {
      required: number; // Required number of renewals
      achieved: number; // Achieved number of renewals
      percentage: number; // Completion percentage
      isQualified: boolean; // Qualified for new campaign
    };

    // Time statistics
    timeAnalysis: {
      daysActive: number; // Days campaign has been active
      daysRemaining: number; // Days remaining
      averageConversionTime: number; // Average conversion time (days)
    };
  };
  // List of child franchises and their performance
  franchiseBreakdown: {
    franchiseId: string;
    franchiseName: string;
    level: number;
    invitesSent: number;
    renewals: number;
    conversionRate: number;
  }[];
}

class AdminService {
  /**
   * Create and allocate new Campaign from Admin
   */
  async createAndAllocateCampaign(
    campaignName: string,
    franchiseOwnerId: string,
    totalAllocated: number,
    startDate: Date,
    endDate: Date,
    renewalRequirement: number,
    createdBy: string,
    packageId: string
  ) {
    try {
      console.log("[AdminService] Starting to create and allocate Campaign.");

      // Validate input parameters
      if (!campaignName?.trim()) {
        throw new CustomError(400, "Campaign name cannot be empty");
      }
      if (!franchiseOwnerId?.trim()) {
        throw new CustomError(
          400,
          "Franchise Owner ID cannot be empty"
        );
      }
      if (totalAllocated <= 0) {
        throw new CustomError(400, "Allocation amount must be greater than 0");
      }
      if (renewalRequirement < 0) {
        throw new CustomError(400, "Renewal requirement cannot be negative");
      }
      if (new Date(startDate) >= new Date(endDate)) {
        throw new CustomError(400, "Start date must be before end date");
      }

      // Check if franchiseOwnerId is valid
      if (!Types.ObjectId.isValid(franchiseOwnerId)) {
        throw new CustomError(400, "Invalid Franchise Owner ID");
      }

      // Create new Campaign
      const newCampaign = await CampaignModel.create({
        campaignName: campaignName.trim(),
        franchiseOwnerId: new Types.ObjectId(franchiseOwnerId),
        totalAllocated: totalAllocated,
        status: "active", // Default to active when created
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        renewalRequirementPercentage: renewalRequirement,
        packageId: packageId,
        createdBy: new Types.ObjectId(createdBy),
      });

      if (!newCampaign) {
        throw new CustomError(500, "Error creating Campaign in database");
      }

      console.log(
        `[AdminService] Successfully created Campaign with ID: ${newCampaign._id}`
      );

      console.log(
        `[AdminService] Starting to initialize first ledger for Campaign's Franchise`
      );

      // const newLedger = await FranchiseService.allocateQuotaToChild(
      //   newCampaign.franchiseOwnerId.toString(),
      //   newCampaign.franchiseOwnerId.toString(),
      //   newCampaign.totalAllocated,
      //   newCampaign._id.toString()
      // );
      // if (!newLedger) {
      //   throw new CustomError(500, "Lỗi khi tạo sổ cái cho Franchise");
      // }
      // console.log(
      //   `[AdminService] Tạo sổ cái thành công với ID: ${newLedger.childLedgerEntryCreated._id}`
      // );

      const newLedger = await this.adminAllocateQuotaToFranchise(
        newCampaign._id.toString(),
        createdBy,
        franchiseOwnerId,
        totalAllocated,
        startDate,
        endDate
      );
      if (!newLedger) {
        console.log(`[AdminService] Error creating ledger for Franchise`);
        throw new CustomError(500, "Error creating ledger for Franchise");
      }
      console.log(
        `[AdminService] Successfully created ledger with ID: ${newLedger._id}`
      );
      return newCampaign;
    } catch (error) {
      if (error instanceof CustomError) {
        console.error(
          `[AdminService] CustomError when creating Campaign: ${error.message}`
        );
        throw error;
      }
      console.error(
        `[AdminService] Undefined error when creating Campaign: ${error}`
      );
      throw new CustomError(500, "Undefined error when creating Campaign");
    }
  }

  /**
   * Get all Campaigns with filter and pagination
   */
  async getAllCampaigns(
    campaignFilter: campaignFilter,
    page: number = 1,
    limit: number = 10
  ): Promise<CampaignResponse> {
    try {
      console.log("[AdminService] Starting to get Campaigns list.");

      // Validate and normalize page and limit
      const validPage = Math.max(1, Math.floor(page) || 1);
      const validLimit = Math.min(Math.max(1, Math.floor(limit) || 10), 100); // Maximum 100 items

      // Create filter object for MongoDB
      const mongoFilter: any = {};

      if (campaignFilter.status) {
        mongoFilter.status = campaignFilter.status;
      }

      if (campaignFilter.franchiseOwnerId) {
        if (!Types.ObjectId.isValid(campaignFilter.franchiseOwnerId)) {
          throw new CustomError(400, "Invalid Franchise Owner ID");
        }
        mongoFilter.franchiseOwnerId = new Types.ObjectId(
          campaignFilter.franchiseOwnerId
        );
      }

      // Count total documents
      const countCampaigns = await CampaignModel.countDocuments(mongoFilter);

      if (countCampaigns === 0) {
        return {
          campaigns: [],
          totalPages: 0,
          total: 0,
          currentPage: validPage,
          hasNextPage: false,
          hasPrevPage: false,
        };
      }

      const totalPages = Math.ceil(countCampaigns / validLimit);
      const skip = (validPage - 1) * validLimit;

      // Get campaigns with populated franchise owner information
      const campaigns = await CampaignModel.find(mongoFilter)
        .populate("franchiseOwnerId") // Populate basic franchise owner information
        .sort({ createdAt: -1 }) // Sort by creation time, newest first
        .skip(skip)
        .limit(validLimit)
        .lean(); // Use lean() for better performance

      if (!campaigns) {
        throw new CustomError(404, "No Campaigns found");
      }

      console.log(`[AdminService] Retrieved ${campaigns.length} Campaigns.`);

      return {
        campaigns,
        totalPages,
        total: countCampaigns,
        currentPage: validPage,
        hasNextPage: validPage < totalPages,
        hasPrevPage: validPage > 1,
      };
    } catch (error) {
      if (error instanceof CustomError) {
        console.error(
          `[AdminService] CustomError when getting Campaign: ${error.message}`
        );
        throw error;
      }
      console.error(
        `[AdminService] Undefined error when getting Campaign: ${error}`
      );
      throw new CustomError(500, "Undefined error when getting Campaign");
    }
  }

  /**
   * Get Campaign details by ID
   */
  async getCampaignById(campaignId: string) {
    try {
      console.log(`[AdminService] Getting Campaign with ID: ${campaignId}`);

      if (!campaignId?.trim()) {
        throw new CustomError(400, "Campaign ID cannot be empty");
      }

      if (!Types.ObjectId.isValid(campaignId)) {
        throw new CustomError(400, "Invalid Campaign ID");
      }

      const campaign = await CampaignModel.findById(campaignId)
        .populate("franchiseOwnerId", "name email phone")
        .lean();

      if (!campaign) {
        throw new CustomError(404, "Campaign not found");
      }

      console.log(
        `[AdminService] Successfully retrieved Campaign: ${campaign.campaignName}`
      );
      return campaign;
    } catch (error) {
      if (error instanceof CustomError) {
        console.error(
          `[AdminService] CustomError when getting Campaign: ${error.message}`
        );
        throw error;
      }
      console.error(
        `[AdminService] Undefined error when getting Campaign: ${error}`
      );
      throw new CustomError(500, "Undefined error when getting Campaign");
    }
  }

  /**
   * Update Campaign information
   */
  async updateCampaign(
    campaignId: string,
    updateData: {
      campaignName?: string;
      totalAllocated?: number;
      status?: string;
      startDate?: Date;
      endDate?: Date;
      renewalRequirementPercentage?: number;
    }
  ) {
    try {
      console.log(`[AdminService] Updating Campaign with ID: ${campaignId}`);

      if (!campaignId?.trim()) {
        throw new CustomError(400, "Campaign ID cannot be empty");
      }

      if (!Types.ObjectId.isValid(campaignId)) {
        throw new CustomError(400, "Invalid Campaign ID");
      }

      // Validate update data
      if (
        updateData.campaignName !== undefined &&
        !updateData.campaignName?.trim()
      ) {
        throw new CustomError(400, "Campaign name cannot be empty");
      }
      if (
        updateData.totalAllocated !== undefined &&
        updateData.totalAllocated <= 0
      ) {
        throw new CustomError(400, "Allocation amount must be greater than 0");
      }
      if (
        updateData.renewalRequirementPercentage !== undefined &&
        updateData.renewalRequirementPercentage < 0
      ) {
        throw new CustomError(400, "Renewal requirement cannot be negative");
      }

      // Prepare update data
      const dataToUpdate: any = {
        updatedAt: new Date(),
      };

      if (updateData.campaignName) {
        dataToUpdate.campaignName = updateData.campaignName.trim();
      }
      if (updateData.totalAllocated !== undefined) {
        dataToUpdate.totalAllocated = updateData.totalAllocated;
      }
      if (updateData.status) {
        dataToUpdate.status = updateData.status;
      }
      if (updateData.startDate) {
        dataToUpdate.startDate = new Date(updateData.startDate);
      }
      if (updateData.endDate) {
        dataToUpdate.endDate = new Date(updateData.endDate);
      }
      if (updateData.renewalRequirementPercentage !== undefined) {
        dataToUpdate.renewalRequirementPercentage =
          updateData.renewalRequirementPercentage;
      }

      // Check valid dates if both startDate and endDate are being updated
      if (dataToUpdate.startDate && dataToUpdate.endDate) {
        if (dataToUpdate.startDate >= dataToUpdate.endDate) {
          throw new CustomError(400, "Start date must be before end date");
        }
      }

      const updatedCampaign = await CampaignModel.findByIdAndUpdate(
        campaignId,
        dataToUpdate,
        { new: true, runValidators: true }
      ).populate("franchiseOwnerId", "name email");

      if (!updatedCampaign) {
        throw new CustomError(404, "Campaign not found for update");
      }

      console.log(
        `[AdminService] Successfully updated Campaign: ${updatedCampaign.campaignName}`
      );
      return updatedCampaign;
    } catch (error) {
      if (error instanceof CustomError) {
        console.error(
          `[AdminService] CustomError when updating Campaign: ${error.message}`
        );
        throw error;
      }
      console.error(
        `[AdminService] Undefined error when updating Campaign: ${error}`
      );
      throw new CustomError(500, "Undefined error when updating Campaign");
    }
  }

  /**
   * Delete Campaign (soft delete - change status to 'deleted')
   */
  async deleteCampaign(campaignId: string) {
    try {
      console.log(`[AdminService] Deleting Campaign with ID: ${campaignId}`);

      if (!campaignId?.trim()) {
        throw new CustomError(400, "Campaign ID cannot be empty");
      }

      if (!Types.ObjectId.isValid(campaignId)) {
        throw new CustomError(400, "Invalid Campaign ID");
      }

      const deletedCampaign = await CampaignModel.findByIdAndUpdate(
        campaignId,
        {
          status: "deleted",
          updatedAt: new Date(),
        },
        { new: true }
      );

      if (!deletedCampaign) {
        throw new CustomError(404, "Campaign not found for deletion");
      }

      console.log(
        `[AdminService] Successfully deleted Campaign: ${deletedCampaign.campaignName}`
      );
      return deletedCampaign;
    } catch (error) {
      if (error instanceof CustomError) {
        console.error(
          `[AdminService] CustomError when deleting Campaign: ${error.message}`
        );
        throw error;
      }
      console.error(
        `[AdminService] Undefined error when deleting Campaign: ${error}`
      );
      throw new CustomError(500, "Undefined error when deleting Campaign");
    }
  }

  async getCampaignsByFranchiseOwnerId(franchiseOwnerId: string) {
    try {
      console.log(
        "[AdminService] Getting Campaigns list by Franchise Owner ID."
      );

      if (!franchiseOwnerId?.trim()) {
        throw new CustomError(400, "Franchise Owner ID cannot be empty");
      }

      if (!Types.ObjectId.isValid(franchiseOwnerId)) {
        throw new CustomError(400, "Invalid Franchise Owner ID");
      }

      const campaigns = await CampaignModel.find({ franchiseOwnerId })
        .populate("franchiseOwnerId", "name email phone")
        .lean();

      if (!campaigns) {
        throw new CustomError(404, "No Campaigns found");
      }

      console.log(
        `[AdminService] Successfully retrieved ${campaigns.length} Campaigns.`
      );
      return campaigns;
    } catch (error) {
      if (error instanceof CustomError) {
        console.error(
          `[AdminService] CustomError when getting Campaigns list: ${error.message}`
        );
        throw error;
      }
      console.error(
        `[AdminService] Undefined error when getting Campaigns list: ${error}`
      );
      throw new CustomError(
        500,
        "Undefined error when getting Campaigns list"
      );
    }
  }

  async getCampaignPerformanceSummary(
    campaignId: string
  ): Promise<CampaignPerformanceSummary> {
    try {
      console.log(
        `[AdminService] Getting Campaign performance summary with ID: ${campaignId}`
      );

      if (!campaignId?.trim()) {
        throw new CustomError(400, "Campaign ID cannot be empty");
      }

      if (!Types.ObjectId.isValid(campaignId)) {
        throw new CustomError(400, "Invalid Campaign ID");
      }

      // Get campaign information
      const campaign = await CampaignModel.findById(campaignId).lean();
      if (!campaign) {
        throw new CustomError(404, "Campaign not found");
      }

      // Get all invitations related to this campaign
      const invitations = await InvitationModel.find({
        linkedRootCampaignId: new Types.ObjectId(campaignId),
      }).lean();

      // Get all trial conversion logs related to the campaign
      const trialLogs = await TrialConversionLogModel.find({
        rootCampaignId: new Types.ObjectId(campaignId),
      }).lean();

      // Calculate basic metrics
      const totalInvitesSent = invitations.length;
      const totalTrialUsers = trialLogs.length;
      const totalRenewedUsers = trialLogs.filter((log) => log.didRenew).length;
      const conversionRate =
        totalInvitesSent > 0
          ? Math.round((totalTrialUsers / totalInvitesSent) * 100 * 100) / 100
          : 0;
      const renewalRate =
        totalTrialUsers > 0
          ? Math.round((totalRenewedUsers / totalTrialUsers) * 100 * 100) / 100
          : 0;

      // Calculate renewal progress
      const requiredRenewals = Math.ceil(
        (campaign.totalAllocated * campaign.renewalRequirementPercentage) / 100
      );
      const renewalProgress = {
        required: requiredRenewals,
        achieved: totalRenewedUsers,
        percentage:
          requiredRenewals > 0
            ? Math.round((totalRenewedUsers / requiredRenewals) * 100 * 100) /
              100
            : 0,
        isQualified: totalRenewedUsers >= requiredRenewals,
      };

      // Calculate time analysis
      const now = new Date();
      const startDate = new Date(campaign.startDate || campaign.createdAt);
      const endDate = campaign.endDate ? new Date(campaign.endDate) : null;

      const daysActive = Math.floor(
        (now.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)
      );
      const daysRemaining = endDate
        ? Math.max(
            0,
            Math.floor(
              (endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
            )
          )
        : -1; // -1 indicates no end date

      // Calculate average conversion time
      let averageConversionTime = 0;
      if (totalRenewedUsers > 0) {
        const conversionTimes = trialLogs
          .filter((log) => log.didRenew && log.renewalDate)
          .map((log) => {
            const trialStart = new Date(log.trialStartDate);
            const renewalDate = new Date(log.renewalDate!);
            return (
              (renewalDate.getTime() - trialStart.getTime()) /
              (1000 * 60 * 60 * 24)
            );
          });

        if (conversionTimes.length > 0) {
          const sum = conversionTimes.reduce((a, b) => a + b, 0);
          averageConversionTime =
            Math.round((sum / conversionTimes.length) * 10) / 10;
        }
      }

      // Get franchise breakdown information
      const franchisePerformanceMap = new Map<
        string,
        {
          franchiseId: string;
          franchiseName: string;
          level: number;
          invitesSent: number;
          renewals: number;
        }
      >();

      // Count invites by franchise
      for (const invitation of invitations) {
        const franchiseId = invitation.inviterUserId.toString();
        if (!franchisePerformanceMap.has(franchiseId)) {
          // Get franchise information
          const franchiseDetails = await FranchiseDetailsModel.findOne({
            userId: invitation.inviterUserId,
          })
            .populate("userId", "username franchiseName")
            .lean();

          franchisePerformanceMap.set(franchiseId, {
            franchiseId,
            franchiseName:
              (franchiseDetails?.userId as any)?.franchiseName || "Unknown",
            level: franchiseDetails?.franchiseLevel || 0,
            invitesSent: 0,
            renewals: 0,
          });
        }

        const franchiseData = franchisePerformanceMap.get(franchiseId)!;
        franchiseData.invitesSent++;
      }

      // Count renewals by franchise
      for (const trialLog of trialLogs) {
        if (trialLog.didRenew) {
          const franchiseId = trialLog.referringFranchiseId.toString();
          const franchiseData = franchisePerformanceMap.get(franchiseId);
          if (franchiseData) {
            franchiseData.renewals++;
          }
        }
      }

      // Convert map to array and calculate conversion rate
      const franchiseBreakdown = Array.from(
        franchisePerformanceMap.values()
      ).map((data) => ({
        ...data,
        conversionRate:
          data.invitesSent > 0
            ? Math.round((data.renewals / data.invitesSent) * 100 * 100) / 100
            : 0,
      }));

      // Calculate performance by level
      const performanceByLevelMap = new Map<
        number,
        {
          level: number;
          franchiseName: string;
          totalInvites: number;
          totalRenewals: number;
        }
      >();

      for (const franchise of franchiseBreakdown) {
        if (!performanceByLevelMap.has(franchise.level)) {
          performanceByLevelMap.set(franchise.level, {
            level: franchise.level,
            franchiseName: `Level ${franchise.level}`,
            totalInvites: 0,
            totalRenewals: 0,
          });
        }

        const levelData = performanceByLevelMap.get(franchise.level)!;
        levelData.totalInvites += franchise.invitesSent;
        levelData.totalRenewals += franchise.renewals;
      }

      const performanceByLevel = Array.from(performanceByLevelMap.values())
        .map((data) => ({
          ...data,
          conversionRate:
            data.totalInvites > 0
              ? Math.round(
                  (data.totalRenewals / data.totalInvites) * 100 * 100
                ) / 100
              : 0,
        }))
        .sort((a, b) => a.level - b.level);

      // Update totalRenewed in campaign if needed
      if (campaign.totalRenewed !== totalRenewedUsers) {
        await CampaignModel.findByIdAndUpdate(campaignId, {
          totalRenewed: totalRenewedUsers,
        });
      }

      const result: CampaignPerformanceSummary = {
        campaign: {
          _id: campaign._id.toString(),
          campaignName: campaign.campaignName,
          franchiseOwnerId: campaign.franchiseOwnerId.toString(),
          totalAllocated: campaign.totalAllocated,
          consumedUses: campaign.consumedUses,
          totalRenewed: totalRenewedUsers,
          status: campaign.status,
          startDate: campaign.startDate!,
          endDate: campaign.endDate!,
          renewalRequirementPercentage: campaign.renewalRequirementPercentage,
        },
        performance: {
          totalInvitesSent,
          totalTrialUsers,
          totalRenewedUsers,
          conversionRate,
          renewalRate,
          performanceByLevel,
          renewalProgress,
          timeAnalysis: {
            daysActive,
            daysRemaining,
            averageConversionTime,
          },
        },
        franchiseBreakdown: franchiseBreakdown.sort(
          (a, b) => b.renewals - a.renewals
        ),
      };

      console.log(`[AdminService] Successfully retrieved Campaign performance summary`);
      return result;
    } catch (error) {
      if (error instanceof CustomError) {
        console.error(
          `[AdminService] CustomError when getting performance summary: ${error.message}`
        );
        throw error;
      }
      console.error(
        `[AdminService] Undefined error when getting performance summary: ${error}`
      );
      throw new CustomError(
        500,
        "Undefined error when getting Campaign performance summary"
      );
    }
  }

  // Helper methods for top performers
  async getTopRenewersForCampaign(campaignId: string) {
    try {
      const topRenewers = await TrialConversionLogModel.aggregate([
        {
          $match: {
            rootCampaignId: new Types.ObjectId(campaignId),
            didRenew: true,
          },
        },
        {
          $group: {
            _id: "$referringFranchiseId",
            renewalCount: { $sum: 1 },
          },
        },
        {
          $sort: { renewalCount: -1 },
        },
        {
          $limit: 5,
        },
        {
          $lookup: {
            from: "users",
            localField: "_id",
            foreignField: "_id",
            as: "franchiseInfo",
          },
        },
        {
          $unwind: "$franchiseInfo",
        },
        {
          $project: {
            franchiseId: "$_id",
            renewalCount: 1,
            franchiseName: "$franchiseInfo.franchiseName",
            username: "$franchiseInfo.username",
            email: "$franchiseInfo.email",
          },
        },
      ]);

      return topRenewers;
    } catch (error) {
      console.error(`[AdminService] Error getting top renewers: ${error}`);
      return [];
    }
  }

  async getTopInvitersForCampaign(campaignId: string) {
    try {
      const topInviters = await InvitationModel.aggregate([
        {
          $match: {
            linkedRootCampaignId: new Types.ObjectId(campaignId),
          },
        },
        {
          $group: {
            _id: "$inviterUserId",
            invitationCount: { $sum: 1 },
          },
        },
        {
          $sort: { invitationCount: -1 },
        },
        {
          $limit: 5,
        },
        {
          $lookup: {
            from: "users",
            localField: "_id",
            foreignField: "_id",
            as: "franchiseInfo",
          },
        },
        {
          $unwind: "$franchiseInfo",
        },
        {
          $project: {
            franchiseId: "$_id",
            invitationCount: 1,
            franchiseName: "$franchiseInfo.franchiseName",
            username: "$franchiseInfo.username",
            email: "$franchiseInfo.email",
          },
        },
      ]);

      return topInviters;
    } catch (error) {
      console.error(`[AdminService] Error getting top inviters: ${error}`);
      return [];
    }
  }

  //GET /franchises
  async getAllFranchises(
    page: number,
    limit: number,
    status?: string,
    level?: number
  ) {
    try {
      const validPage = Math.max(1, Math.floor(page) || 1);
      const validLimit = Math.max(1, Math.floor(limit) || 10);

      let mongoFilter: any = {};

      if (status) {
        mongoFilter.status = status;
      }
      if (typeof level === "number") {
        mongoFilter.franchiseLevel = level;
      }

      const countFranchises = await FranchiseDetailsModel.countDocuments(
        mongoFilter
      );

      const totalPages = Math.ceil(countFranchises / validLimit);
      const skip = (validPage - 1) * validLimit;

      const franchises = await FranchiseDetailsModel.find(mongoFilter)
        .skip(skip)
        .limit(validLimit)
        .populate("userId")
        .lean();

      return {
        franchises,
        total: countFranchises,
        totalPages,
        currentPage: validPage,
        hasNextPage: validPage < totalPages,
        hasPrevPage: validPage > 1,
      };
    } catch (error) {
      if (error instanceof CustomError) {
        console.error(
          `[AdminService] Error when searching all franchises: ${error.message}`
        );
        throw error;
      }
      console.error(
        `[AdminService] Undefined error when searching all franchises: ${error}`
      );
      throw new CustomError(
        500,
        "Undefined error when searching all franchises"
      );
    }
  }

  /**
   * Get franchise hierarchy tree and statistics
   * @param userId - User ID to get hierarchy tree
   *
   * Process:
   * 1. Validate input and check user
   * 2. Get root franchise information
   * 3. Build hierarchy tree recursively:
   *    - Get list of direct child franchises
   *    - For each child franchise:
   *      + Calculate active quota
   *      + Count number of invitations
   *      + Calculate conversion rate
   *      + Recursively get child tree
   * 4. Calculate overall statistics for root franchise
   * 5. Calculate statistics by franchise level
   * 6. Package results for return
   */
  async getFranchiseHierarchy(userId: string) {
    try {
      console.log(
        `[AdminService] Getting franchise hierarchy tree for user: ${userId}`
      );

      // Validate input
      if (!userId?.trim()) {
        throw new CustomError(400, "User ID cannot be empty");
      }

      if (!Types.ObjectId.isValid(userId)) {
        throw new CustomError(400, "Invalid User ID");
      }

      // Check if user exists and is a franchise
      const user = await UserModel.findById(userId).lean();
      if (!user) {
        throw new CustomError(404, "User not found");
      }

      // Get root franchise details
      const rootFranchise = await FranchiseDetailsModel.findOne({
        userId: new Types.ObjectId(userId),
      })
        .populate("userId", "username email franchiseName role")
        .lean();

      if (!rootFranchise) {
        throw new CustomError(404, "User is not a franchise");
      }

      // Recursive function to build hierarchy tree
      const buildHierarchyTree = async (
        parentId: Types.ObjectId,
        level: number = 0
      ): Promise<any> => {
        // Get list of direct child franchises
        const childFranchises = await FranchiseDetailsModel.find({
          parentId: parentId,
        })
          .populate(
            "userId",
            "username email franchiseName role isSubscription type"
          )
          .lean();

        // Process each child franchise and build tree
        const childrenWithSubTree = await Promise.all(
          childFranchises.map(async (child) => {
            // Calculate active quota
            const activeQuota =
              child.userTrialQuotaLedger
                ?.filter((ledger: any) => ledger.status === "active")
                ?.reduce((sum: number, ledger: any) => {
                  const available =
                    ledger.totalAllocated -
                    ledger.consumedByOwnInvites -
                    ledger.allocatedToChildren;
                  return sum + Math.max(0, available);
                }, 0) || 0;

            // Count number of invitations
            const invitations = await InvitationModel.countDocuments({
              inviterUserId: child.userId,
            });

            // Calculate number of conversions and conversion rate
            const trialConversions = await TrialConversionLogModel.find({
              referringFranchiseId: child.userId,
            }).lean();

            const totalRenewals = trialConversions.filter(
              (log) => log.didRenew
            ).length;
            const conversionRate =
              invitations > 0
                ? Math.round((totalRenewals / invitations) * 100 * 100) / 100
                : 0;

            // Recursively get child tree
            const subTree = await buildHierarchyTree(
              child.userId as Types.ObjectId,
              level + 1
            );

            return {
              _id: child._id,
              userId: child.userId,
              parentId: child.parentId,
              franchiseLevel: child.franchiseLevel,
              ancestorPath: child.ancestorPath,
              activeQuota: activeQuota,
              totalInvites: invitations,
              totalRenewals: totalRenewals,
              conversionRate: conversionRate,
              createdAt: child.createdAt,
              updatedAt: child.updatedAt,
              children: subTree,
            };
          })
        );

        return childrenWithSubTree;
      };

      // Build tree from root franchise
      const hierarchyTree = await buildHierarchyTree(
        rootFranchise.userId as Types.ObjectId
      );

      // Calculate statistics for root franchise
      const rootInvitations = await InvitationModel.countDocuments({
        inviterUserId: rootFranchise.userId,
      });

      const rootTrialConversions = await TrialConversionLogModel.find({
        referringFranchiseId: rootFranchise.userId,
      }).lean();

      const rootTotalRenewals = rootTrialConversions.filter(
        (log) => log.didRenew
      ).length;
      const rootConversionRate =
        rootInvitations > 0
          ? Math.round((rootTotalRenewals / rootInvitations) * 100 * 100) / 100
          : 0;

      // Calculate active quota for root franchise
      const rootActiveQuota =
        rootFranchise.userTrialQuotaLedger
          ?.filter((ledger: any) => ledger.status === "active")
          ?.reduce((sum: number, ledger: any) => {
            const available =
              ledger.totalAllocated -
              ledger.consumedByOwnInvites -
              ledger.allocatedToChildren;
            return sum + Math.max(0, available);
          }, 0) || 0;

      // Function to count total descendants
      const countTotalDescendants = (children: any[]): number => {
        let count = children.length;
        for (const child of children) {
          count += countTotalDescendants(child.children || []);
        }
        return count;
      };

      // Function to calculate statistics by level
      const getLevelStatistics = (
        tree: any[],
        stats: Map<number, any> = new Map()
      ): Map<number, any> => {
        for (const node of tree) {
          const level = node.franchiseLevel;

          if (!stats.has(level)) {
            stats.set(level, {
              level: level,
              totalFranchises: 0,
              totalInvites: 0,
              totalRenewals: 0,
              averageConversionRate: 0,
            });
          }

          const levelStats = stats.get(level)!;
          levelStats.totalFranchises++;
          levelStats.totalInvites += node.totalInvites || 0;
          levelStats.totalRenewals += node.totalRenewals || 0;

          if (node.children && node.children.length > 0) {
            getLevelStatistics(node.children, stats);
          }
        }

        return stats;
      };

      // Calculate statistics by level and average conversion rate
      const levelStats = getLevelStatistics(hierarchyTree);
      const levelStatisticsArray = Array.from(levelStats.values()).map(
        (stat) => ({
          ...stat,
          averageConversionRate:
            stat.totalInvites > 0
              ? Math.round(
                  (stat.totalRenewals / stat.totalInvites) * 100 * 100
                ) / 100
              : 0,
        })
      );

      // Package results
      const result = {
        root: {
          _id: rootFranchise._id,
          userId: rootFranchise.userId,
          parentId: rootFranchise.parentId,
          franchiseLevel: rootFranchise.franchiseLevel,
          ancestorPath: rootFranchise.ancestorPath,
          activeQuota: rootActiveQuota,
          totalInvites: rootInvitations,
          totalRenewals: rootTotalRenewals,
          conversionRate: rootConversionRate,
          createdAt: rootFranchise.createdAt,
          updatedAt: rootFranchise.updatedAt,
        },
        hierarchy: hierarchyTree,
        statistics: {
          totalDescendants: countTotalDescendants(hierarchyTree),
          totalLevels:
            Math.max(
              ...Array.from(levelStats.keys()),
              rootFranchise.franchiseLevel
            ) -
            rootFranchise.franchiseLevel +
            1,
          levelBreakdown: levelStatisticsArray.sort(
            (a, b) => a.level - b.level
          ),
        },
      };

      console.log(`[AdminService] Successfully retrieved franchise hierarchy tree`);
      return result;
    } catch (error) {
      if (error instanceof CustomError) {
        console.error(
          `[AdminService] CustomError when getting franchise hierarchy tree: ${error.message}`
        );
        throw error;
      }
      console.error(
        `[AdminService] Undefined error when getting franchise hierarchy tree: ${error}`
      );
      throw new CustomError(
        500,
        "Undefined error when getting franchise hierarchy tree"
      );
    }
  }

  // Export reports
  async getFranchisePerformanceOverview(
    userId: string,
    startDate?: Date,
    endDate?: Date,
    rootCampaignId?: string
  ): Promise<FranchisePerformanceOverview> {
    try {
      console.log(
        `[AdminService] Getting franchise performance overview for user: ${userId}`
      );

      // Validate input
      if (!userId?.trim()) {
        throw new CustomError(400, "User ID cannot be empty");
      }

      if (!Types.ObjectId.isValid(userId)) {
        throw new CustomError(400, "Invalid User ID");
      }

      // Validate rootCampaignId if provided
      if (rootCampaignId && !Types.ObjectId.isValid(rootCampaignId)) {
        throw new CustomError(400, "Invalid Campaign ID");
      }

      // Validate dates
      if (startDate && endDate && startDate >= endDate) {
        throw new CustomError(400, "Start date must be before end date");
      }

      // Get root franchise information
      const rootFranchise = await FranchiseDetailsModel.findOne({
        userId: new Types.ObjectId(userId),
      })
        .populate("userId", "username email franchiseName")
        .lean();

      if (!rootFranchise) {
        throw new CustomError(404, "Franchise not found");
      }

      // Build filter for queries
      const timeFilter: any = {};
      if (startDate) timeFilter.$gte = startDate;
      if (endDate) timeFilter.$lte = endDate;

      const invitationFilter: any = {};
      const trialLogFilter: any = {};

      if (Object.keys(timeFilter).length > 0) {
        invitationFilter.createdAt = timeFilter;
        trialLogFilter.trialStartDate = timeFilter;
      }

      if (rootCampaignId) {
        invitationFilter.linkedRootCampaignId = new Types.ObjectId(
          rootCampaignId
        );
        trialLogFilter.rootCampaignId = new Types.ObjectId(rootCampaignId);
      }

      // Recursive function to get all descendant franchises
      const getAllDescendantIds = async (
        parentId: Types.ObjectId
      ): Promise<Types.ObjectId[]> => {
        const directChildren = await FranchiseDetailsModel.find({
          parentId: parentId,
        }).lean();

        let allDescendants: Types.ObjectId[] = [];

        for (const child of directChildren) {
          allDescendants.push(child.userId as Types.ObjectId);
          const childDescendants = await getAllDescendantIds(
            child.userId as Types.ObjectId
          );
          allDescendants = allDescendants.concat(childDescendants);
        }

        return allDescendants;
      };

      // Get all descendant franchise IDs
      const allDescendantIds = await getAllDescendantIds(
        rootFranchise.userId as Types.ObjectId
      );
      const allFranchiseIds = [
        rootFranchise.userId as Types.ObjectId,
        ...allDescendantIds,
      ];

      // Aggregate query for the entire tree
      const [totalInvitations, totalTrialLogs, directChildrenFranchises] =
        await Promise.all([
          InvitationModel.find({
            ...invitationFilter,
            inviterUserId: { $in: allFranchiseIds },
          }).lean(),

          TrialConversionLogModel.find({
            ...trialLogFilter,
            referringFranchiseId: { $in: allFranchiseIds },
          }).lean(),

          FranchiseDetailsModel.find({
            parentId: rootFranchise.userId,
          })
            .populate("userId", "username franchiseName")
            .lean(),
        ]);

      // Separate query for root franchise
      const [ownInvitations, ownTrialLogs] = await Promise.all([
        InvitationModel.find({
          ...invitationFilter,
          inviterUserId: rootFranchise.userId,
        }).lean(),

        TrialConversionLogModel.find({
          ...trialLogFilter,
          referringFranchiseId: rootFranchise.userId,
        }).lean(),
      ]);

      // Calculate aggregate metrics
      const totalInvitesSent = totalInvitations.length;
      const totalTrialUsers = totalTrialLogs.length;
      const totalRenewedUsers = totalTrialLogs.filter(
        (log) => log.didRenew
      ).length;
      const overallConversionRate =
        totalInvitesSent > 0
          ? Math.round((totalTrialUsers / totalInvitesSent) * 100 * 100) / 100
          : 0;
      const overallRenewalRate =
        totalTrialUsers > 0
          ? Math.round((totalRenewedUsers / totalTrialUsers) * 100 * 100) / 100
          : 0;

      // Calculate individual metrics
      const ownInvites = ownInvitations.length;
      const ownTrialUsers = ownTrialLogs.length;
      const ownRenewals = ownTrialLogs.filter((log) => log.didRenew).length;
      const ownConversionRate =
        ownInvites > 0
          ? Math.round((ownRenewals / ownInvites) * 100 * 100) / 100
          : 0;

      // Calculate remaining active quota
      const totalActiveQuota =
        rootFranchise.userTrialQuotaLedger
          ?.filter((ledger: any) => ledger.status === "active")
          ?.reduce((sum: number, ledger: any) => {
            const available =
              ledger.totalAllocated -
              ledger.consumedByOwnInvites -
              ledger.allocatedToChildren;
            return sum + Math.max(0, available);
          }, 0) || 0;

      // Time analysis
      const periodStart =
        startDate ||
        new Date(
          Math.min(
            ...totalInvitations.map(
              (inv) => inv.createdAt?.getTime() || Date.now()
            )
          )
        );
      const periodEnd = endDate || new Date();
      const daysInPeriod = Math.max(
        1,
        Math.ceil(
          (periodEnd.getTime() - periodStart.getTime()) / (1000 * 60 * 60 * 24)
        )
      );

      const timeAnalysis = {
        periodStart,
        periodEnd,
        daysInPeriod,
        averageInvitesPerDay:
          Math.round((totalInvitesSent / daysInPeriod) * 100) / 100,
        averageRenewalsPerDay:
          Math.round((totalRenewedUsers / daysInPeriod) * 100) / 100,
      };

      // Calculate performance by franchise
      const franchisePerformanceMap = new Map<
        string,
        {
          franchiseId: string;
          franchiseName: string;
          level: number;
          invites: number;
          renewals: number;
          conversionRate: number;
        }
      >();

      // Collect performance data for each franchise
      for (const invitation of totalInvitations) {
        const franchiseId = invitation.inviterUserId.toString();
        if (!franchisePerformanceMap.has(franchiseId)) {
          const franchiseDetails = await FranchiseDetailsModel.findOne({
            userId: invitation.inviterUserId,
          })
            .populate("userId", "franchiseName")
            .lean();

          franchisePerformanceMap.set(franchiseId, {
            franchiseId,
            franchiseName:
              (franchiseDetails?.userId as any)?.franchiseName || "Unknown",
            level: franchiseDetails?.franchiseLevel || 0,
            invites: 0,
            renewals: 0,
            conversionRate: 0,
          });
        }

        franchisePerformanceMap.get(franchiseId)!.invites++;
      }

      // Add renewal data
      for (const trialLog of totalTrialLogs) {
        if (trialLog.didRenew) {
          const franchiseId = trialLog.referringFranchiseId.toString();
          const franchiseData = franchisePerformanceMap.get(franchiseId);
          if (franchiseData) {
            franchiseData.renewals++;
          }
        }
      }

      // Calculate conversion rates
      franchisePerformanceMap.forEach((data) => {
        data.conversionRate =
          data.invites > 0
            ? Math.round((data.renewals / data.invites) * 100 * 100) / 100
            : 0;
      });

      const allFranchisePerformance = Array.from(
        franchisePerformanceMap.values()
      );

      // Top performers
      const topInviters = allFranchisePerformance
        .sort((a, b) => b.invites - a.invites)
        .slice(0, 5);

      const topRenewers = allFranchisePerformance
        .sort((a, b) => b.renewals - a.renewals)
        .slice(0, 5);

      // Performance by level
      const levelPerformanceMap = new Map<
        number,
        {
          level: number;
          franchiseCount: number;
          totalInvites: number;
          totalRenewals: number;
        }
      >();

      allFranchisePerformance.forEach((franchise) => {
        if (!levelPerformanceMap.has(franchise.level)) {
          levelPerformanceMap.set(franchise.level, {
            level: franchise.level,
            franchiseCount: 0,
            totalInvites: 0,
            totalRenewals: 0,
          });
        }

        const levelData = levelPerformanceMap.get(franchise.level)!;
        levelData.franchiseCount++;
        levelData.totalInvites += franchise.invites;
        levelData.totalRenewals += franchise.renewals;
      });

      const performanceByLevel = Array.from(levelPerformanceMap.values())
        .map((levelData) => ({
          ...levelData,
          averageConversionRate:
            levelData.totalInvites > 0
              ? Math.round(
                  (levelData.totalRenewals / levelData.totalInvites) * 100 * 100
                ) / 100
              : 0,
        }))
        .sort((a, b) => a.level - b.level);

      // Campaign breakdown
      const campaignPerformanceMap = new Map<
        string,
        {
          campaignId: string;
          campaignName: string;
          invites: number;
          renewals: number;
        }
      >();

      for (const invitation of totalInvitations) {
        const campaignId = invitation.linkedRootCampaignId?.toString();
        if (!campaignId) {
          continue;
        }
        if (!campaignPerformanceMap.has(campaignId)) {
          const campaign = await CampaignModel.findById(campaignId).lean();
          campaignPerformanceMap.set(campaignId, {
            campaignId,
            campaignName: campaign?.campaignName || "Unknown",
            invites: 0,
            renewals: 0,
          });
        }

        campaignPerformanceMap.get(campaignId)!.invites++;
      }

      for (const trialLog of totalTrialLogs) {
        if (trialLog.didRenew) {
          const campaignId = trialLog.rootCampaignId.toString();
          const campaignData = campaignPerformanceMap.get(campaignId);
          if (campaignData) {
            campaignData.renewals++;
          }
        }
      }

      const campaignBreakdown = Array.from(campaignPerformanceMap.values())
        .map((campaign) => ({
          ...campaign,
          conversionRate:
            campaign.invites > 0
              ? Math.round((campaign.renewals / campaign.invites) * 100 * 100) /
                100
              : 0,
        }))
        .sort((a, b) => b.invites - a.invites);

      // Direct children performance
      const directChildren = await Promise.all(
        directChildrenFranchises.map(async (child) => {
          const childInvites = totalInvitations.filter(
            (inv) => inv.inviterUserId.toString() === child.userId.toString()
          ).length;

          const childRenewals = totalTrialLogs.filter(
            (log) =>
              log.referringFranchiseId.toString() === child.userId.toString() &&
              log.didRenew
          ).length;

          const childActiveQuota =
            child.userTrialQuotaLedger
              ?.filter((ledger: any) => ledger.status === "active")
              ?.reduce((sum: number, ledger: any) => {
                const available =
                  ledger.totalAllocated -
                  ledger.consumedByOwnInvites -
                  ledger.allocatedToChildren;
                return sum + Math.max(0, available);
              }, 0) || 0;

          // Find most recent activity
          const lastInvitation = await InvitationModel.findOne({
            inviterUserId: child.userId,
          })
            .sort({ createdAt: -1 })
            .lean();

          return {
            franchiseId: child.userId.toString(),
            franchiseName: (child.userId as any)?.franchiseName || "Unknown",
            level: child.franchiseLevel,
            invites: childInvites,
            renewals: childRenewals,
            conversionRate:
              childInvites > 0
                ? Math.round((childRenewals / childInvites) * 100 * 100) / 100
                : 0,
            activeQuota: childActiveQuota,
            lastActivity: lastInvitation?.createdAt || null,
          };
        })
      );

      const result: FranchisePerformanceOverview = {
        franchise: {
          _id: rootFranchise._id.toString(),
          userId: rootFranchise.userId.toString(),
          franchiseName:
            (rootFranchise.userId as any)?.franchiseName || "Unknown",
          franchiseLevel: rootFranchise.franchiseLevel,
          parentId: rootFranchise.parentId?.toString() || null,
          ancestorPath: rootFranchise.ancestorPath.map((id) => id.toString()),
        },
        performance: {
          totalInvitesSent,
          totalTrialUsers,
          totalRenewedUsers,
          totalActiveQuota,
          overallConversionRate,
          overallRenewalRate,
          ownInvites,
          ownTrialUsers,
          ownRenewals,
          ownConversionRate,
          timeAnalysis,
          topPerformers: {
            topInviters,
            topRenewers,
          },
          performanceByLevel,
          campaignBreakdown,
        },
        directChildren: directChildren.sort((a, b) => b.invites - a.invites),
      };

      console.log(
        `[AdminService] Successfully retrieved franchise performance overview`
      );
      return result;
    } catch (error) {
      if (error instanceof CustomError) {
        console.error(
          `[AdminService] CustomError when getting franchise performance overview: ${error.message}`
        );
        throw error;
      }
      console.error(
        `[AdminService] Undefined error when getting franchise performance overview: ${error}`
      );
      throw new CustomError(
        500,
        "Undefined error when getting franchise performance overview"
      );
    }
  }

  async createInvitationCode(data: IInvitationCodeInput) {
    try {
      const code = await InvitationCodeModel.create({
        code: data.code,
        userId: new Types.ObjectId(data.userId),
        status: data.status,
        codeType: data.codeType,
        packageId: data.packageId,
        currentActiveLedgerEntryId: data.currentActiveLedgerEntryId
          ? new Types.ObjectId(data.currentActiveLedgerEntryId)
          : undefined,
      });
      if (!code) {
        throw new CustomError(500, "Undefined error after creating invitation code");
      }

      return code;
    } catch (error) {
      if (error instanceof CustomError) {
        console.error(
          `[AdminService] CustomError when creating invitation code: ${error.message}`
        );
        throw error;
      }
      console.error(
        `[AdminService] Undefined error when creating invitation code: ${error}`
      );
      throw new CustomError(500, "Undefined error when creating invitation code");
    }
  }

  async adminAllocateQuotaToFranchise(
    campaignId: string,
    adminId: string,
    childFranchiseUserId: string,
    amountToAllocate: number,
    startDate: Date,
    endDate: Date
  ) {
    try {
      const franchise = await FranchiseDetailsModel.findOne({
        userId: childFranchiseUserId,
      });
      if (!franchise) {
        console.log("[AdminService] Franchise not found for creation");
        throw new CustomError(404, "Franchise not found");
      }

      const newLedgerEntry = {
        _id: new Types.ObjectId(),
        sourceCampaignId: new Types.ObjectId(campaignId),
        allocatedByUserId: new Types.ObjectId(adminId),
        totalAllocated: amountToAllocate,
        consumedByOwnInvites: 0,
        allocatedToChildren: 0,
        status: "active",
        originalCampaignStartDate: startDate,
        originalCampaignEndDate: endDate,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      const updatedFranchise = await FranchiseDetailsModel.findOneAndUpdate(
        { userId: childFranchiseUserId },
        { $push: { userTrialQuotaLedger: newLedgerEntry } },
        { new: true }
      );
      if (!updatedFranchise) {
        throw new CustomError(500, "Undefined error after allocation");
      }
      return newLedgerEntry;
    } catch (error) {
      if (error instanceof CustomError) {
        console.error(
          `[AdminService] CustomError when allocating quota: ${error.message}`
        );
        throw error;
      }
      console.error(
        `[AdminService] Undefined error when allocating quota: ${error}`
      );
      throw new CustomError(500, "Undefined error when allocating quota");
    }
  }
}

export default new AdminService();
