import { Types } from "mongoose";
import { FranchiseDetailsModel } from "../models/FranchiseDetails.Model";
import UserModel from "../models/User.Model";
import CustomError from "../utils/Error.Util";
import InvitationModel from "../models/Invitation.Model";
import { TrialConversionLogModel } from "../models/TrialConversionLog.Model";
import CampaignModel from "../models/Campaign.Model";
import InvitationCodeModel from "../models/InvitationCode.Model";

class FranchiseService {
  /**
   * Get FranchiseDetails for the logged-in franchise
   * @param userId - ID of the user (franchise) who is logged in
   * @returns FranchiseDetails information with basic statistics
   */
  async getMyFranchiseDetails(userId: string) {
    try {
      console.log(
        `[FranchiseService] Getting franchise details for user: ${userId}`
      );

      // Validate userId
      // if (!userId?.trim()) {
      //   throw new CustomError(400, "User ID cannot be empty");
      // }

      if (!Types.ObjectId.isValid(userId)) {
        throw new CustomError(400, "Invalid user ID");
      }

      // Check if the user exists
      const user = await UserModel.findById(userId).lean();
      if (!user) {
        throw new CustomError(404, "User not found");
      }

      // Check if the user is a franchise
      if (user.role !== "franchise") {
        throw new CustomError(403, "User is not a franchise");
      }

      // Get FranchiseDetails information
      const franchiseDetails = await FranchiseDetailsModel.findOne({
        userId: new Types.ObjectId(userId),
      })
        .populate(
          "userId",
          "username email franchiseName phone role status type"
        )
        .populate("parentId", "username email franchiseName")
        .lean();

      if (!franchiseDetails) {
        throw new CustomError(404, "Franchise information not found");
      }

      // Calculate remaining quota
      const activeQuotaDetails =
        franchiseDetails.userTrialQuotaLedger
          ?.filter((ledger: any) => ledger.status === "active")
          ?.map((ledger: any) => {
            const available =
              ledger.totalAllocated -
              ledger.consumedByOwnInvites -
              ledger.allocatedToChildren;
            return {
              ledgerId: ledger._id,
              sourceCampaignId: ledger.sourceCampaignId,
              totalAllocated: ledger.totalAllocated,
              consumedByOwnInvites: ledger.consumedByOwnInvites,
              allocatedToChildren: ledger.allocatedToChildren,
              availableQuota: Math.max(0, available),
              status: ledger.status,
              createdAt: ledger.createdAt,
              updatedAt: ledger.updatedAt,
            };
          }) || [];

      const totalActiveQuota = activeQuotaDetails.reduce(
        (sum: number, ledger: any) => sum + ledger.availableQuota,
        0
      );

      // Get basic statistics
      const [
        totalInvitations,
        trialConversions,
        directChildrenCount,
        activeCampaigns,
      ] = await Promise.all([
        // Count total sent invitations
        InvitationModel.countDocuments({
          inviterUserId: new Types.ObjectId(userId),
        }),

        // Get conversion and renewal information
        TrialConversionLogModel.find({
          referringFranchiseId: new Types.ObjectId(userId),
        }).lean(),

        // Count direct child franchises
        FranchiseDetailsModel.countDocuments({
          parentId: new Types.ObjectId(userId),
        }),

        // Get list of related active campaigns
        CampaignModel.find({
          _id: {
            $in:
              franchiseDetails.userTrialQuotaLedger
                ?.map((ledger: any) => ledger.sourceCampaignId)
                ?.filter((id: any) => id) || [],
          },
          status: "active",
        })
          .select("campaignName status startDate endDate")
          .lean(),
      ]);

      // Calculate statistics
      const totalRenewals = trialConversions.filter(
        (log) => log.didRenew
      ).length;
      const conversionRate =
        totalInvitations > 0
          ? Math.round((totalRenewals / totalInvitations) * 100 * 100) / 100
          : 0;

      // Find the most recent activity
      const lastInvitation = await InvitationModel.findOne({
        inviterUserId: new Types.ObjectId(userId),
      })
        .sort({ createdAt: -1 })
        .select("createdAt invitedUserId")
        .lean();

      // Format the returned result
      const result = {
        franchiseInfo: {
          _id: franchiseDetails._id,
          userId: franchiseDetails.userId,
          parentId: franchiseDetails.parentId,
          franchiseLevel: franchiseDetails.franchiseLevel,
          ancestorPath: franchiseDetails.ancestorPath,
          createdAt: franchiseDetails.createdAt,
          updatedAt: franchiseDetails.updatedAt,
        },
        quotaInfo: {
          totalActiveQuota: totalActiveQuota,
          activeQuotaDetails: activeQuotaDetails,
          totalLedgerEntries:
            franchiseDetails.userTrialQuotaLedger?.length || 0,
        },
        statistics: {
          totalInvitations: totalInvitations,
          totalTrialUsers: trialConversions.length,
          totalRenewals: totalRenewals,
          conversionRate: conversionRate,
          directChildrenCount: directChildrenCount,
          lastActivityDate: lastInvitation?.createdAt || null,
        },
        activeCampaigns: activeCampaigns.map((campaign) => ({
          _id: campaign._id,
          campaignName: campaign.campaignName,
          status: campaign.status,
          startDate: campaign.startDate,
          endDate: campaign.endDate,
        })),
      };

      console.log(
        `[FranchiseService] Successfully retrieved franchise details for user: ${userId}`
      );
      return result;
    } catch (error) {
      if (error instanceof CustomError) {
        console.error(
          `[FranchiseService] CustomError when getting franchise details: ${error.message}`
        );
        throw error;
      }
      console.error(
        `[FranchiseService] Undefined error when getting franchise details: ${error}`
      );
      throw new CustomError(
        500,
        "Undefined error when getting franchise information"
      );
    }
  }

  /**
   * Check if a user is a franchise
   * @param userId - ID of the user to check
   * @returns true if the user is a franchise, false otherwise
   */
  async isUserFranchise(userId: string): Promise<boolean> {
    try {
      if (!userId || !Types.ObjectId.isValid(userId)) {
        return false;
      }

      const user = await UserModel.findById(userId).select("role").lean();
      return user?.role === "franchise";
    } catch (error) {
      console.error(
        `[FranchiseService] Error when checking user franchise: ${error}`
      );
      return false;
    }
  }

  /**
   * Get the list of invitation codes owned by the franchise
   * @param userId - ID of the logged-in franchise
   * @returns List of InvitationCode
   */
  async getMyInvitationCodes(userId: string) {
    try {
      console.log(
        `[FranchiseService] Getting invitation code list for franchise: ${userId}`
      );

      // Validate userId
      // if (!userId?.trim()) {
      //   throw new CustomError(400, "User ID cannot be empty");
      // }

      if (!Types.ObjectId.isValid(userId)) {
        throw new CustomError(400, "Invalid user ID");
      }

      // Check if the user is a franchise
      const isFranchise = await this.isUserFranchise(userId);
      if (!isFranchise) {
        throw new CustomError(403, "User is not a franchise");
      }

      // Get the list of invitation codes
      const invitationCodes = await InvitationCodeModel.find({
        userId: new Types.ObjectId(userId),
      })
        .sort({ createdAt: -1 })
        .lean();

      // Get additional statistical information for each code
      const codesWithStats = await Promise.all(
        invitationCodes.map(async (code) => {
          // Count the actual number of uses
          const actualUsageCount = await InvitationModel.countDocuments({
            invitationCodeId: code._id,
          });

          // Get current ledger entry information if it exists
          let currentLedgerInfo = null;
          if (code.currentActiveLedgerEntryId) {
            const franchiseDetails = await FranchiseDetailsModel.findOne({
              userId: new Types.ObjectId(userId),
              "userTrialQuotaLedger._id": code.currentActiveLedgerEntryId,
            }).lean();

            if (franchiseDetails) {
              const ledgerEntry = franchiseDetails.userTrialQuotaLedger?.find(
                (ledger: any) =>
                  ledger._id.toString() ===
                  code.currentActiveLedgerEntryId?.toString()
              );

              if (ledgerEntry) {
                const availableQuota =
                  ledgerEntry.totalAllocated -
                  ledgerEntry.consumedByOwnInvites -
                  ledgerEntry.allocatedToChildren;

                currentLedgerInfo = {
                  ledgerId: ledgerEntry._id,
                  totalAllocated: ledgerEntry.totalAllocated,
                  consumedByOwnInvites: ledgerEntry.consumedByOwnInvites,
                  allocatedToChildren: ledgerEntry.allocatedToChildren,
                  availableQuota: Math.max(0, availableQuota),
                  status: ledgerEntry.status,
                };
              }
            }
          }

          // Find the most recent invitation using this code
          const lastInvitation = await InvitationModel.findOne({
            invitationCodeId: code._id,
          })
            .sort({ createdAt: -1 })
            .select("createdAt invitedUserId")
            .populate("invitedUserId", "username email")
            .lean();

          return {
            _id: code._id,
            code: code.code,
            status: code.status,
            codeType: code.codeType,
            createdAt: code.createdAt,
            updatedAt: code.updatedAt,
            statistics: {
              totalCumulativeUses: code.totalCumulativeUses || 0,
              actualUsageCount: actualUsageCount,
              lastUsedDate: lastInvitation?.createdAt || null,
              lastInvitedUser: lastInvitation?.invitedUserId || null,
            },
            currentLedgerInfo: currentLedgerInfo,
          };
        })
      );

      console.log(
        `[FranchiseService] Retrieved ${codesWithStats.length} invitation codes for franchise: ${userId}`
      );
      return codesWithStats;
    } catch (error) {
      if (error instanceof CustomError) {
        console.error(
          `[FranchiseService] CustomError when getting invitation codes: ${error.message}`
        );
        throw error;
      }
      console.error(
        `[FranchiseService] Undefined error when getting invitation codes: ${error}`
      );
      throw new CustomError(500, "Undefined error when getting the list of invitation codes");
    }
  }

  /**
   * Get the user trial quota ledger list for a franchise
   * @param userId - ID of the logged-in franchise
   * @param filters - Optional filters (status, rootCampaignId)
   * @returns List of UserTrialQuotaLedger entries
   */
  async getMyUserTrialQuotaLedger(
    userId: string,
    filters?: {
      status?: string;
      rootCampaignId?: string;
    }
  ) {
    try {
      console.log(
        `[FranchiseService] Getting quota ledger list for franchise: ${userId}`
      );

      // // Validate userId
      // if (!userId?.trim()) {
      //   throw new CustomError(400, "User ID cannot be empty");
      // }

      if (!Types.ObjectId.isValid(userId)) {
        throw new CustomError(400, "Invalid user ID");
      }

      // Validate rootCampaignId if provided
      if (
        filters?.rootCampaignId &&
        !Types.ObjectId.isValid(filters.rootCampaignId)
      ) {
        throw new CustomError(400, "Invalid Campaign ID");
      }

      // Check if the user is a franchise
      const isFranchise = await this.isUserFranchise(userId);
      if (!isFranchise) {
        throw new CustomError(403, "User is not a franchise");
      }

      // Get franchise details
      const franchiseDetails = await FranchiseDetailsModel.findOne({
        userId: new Types.ObjectId(userId),
      }).lean();

      if (!franchiseDetails) {
        throw new CustomError(404, "Franchise information not found");
      }

      // Filter ledger entries by the provided filters
      let ledgerEntries = franchiseDetails.userTrialQuotaLedger || [];

      // Filter by status if provided
      if (filters?.status) {
        const validStatuses = ["active", "exhausted", "expired", "paused"];
        if (!validStatuses.includes(filters.status)) {
          throw new CustomError(
            400,
            `Invalid status. Only accepted values are: ${validStatuses.join(", ")}`
          );
        }
        ledgerEntries = ledgerEntries.filter(
          (entry: any) => entry.status === filters.status
        );
      }

      // Filter by rootCampaignId if provided
      if (filters?.rootCampaignId) {
        ledgerEntries = ledgerEntries.filter(
          (entry: any) =>
            entry.sourceCampaignId?.toString() === filters.rootCampaignId
        );
      }

      // Enhance ledger entries with additional information
      const enhancedLedgerEntries = await Promise.all(
        ledgerEntries.map(async (entry: any) => {
          // Calculate available quota
          const availableQuota =
            entry.totalAllocated -
            entry.consumedByOwnInvites -
            entry.allocatedToChildren;

          // Get campaign information
          let campaignInfo = null;
          if (entry.sourceCampaignId) {
            const campaign = await CampaignModel.findById(
              entry.sourceCampaignId
            )
              .select("campaignName status startDate endDate")
              .lean();

            if (campaign) {
              campaignInfo = {
                _id: campaign._id,
                campaignName: campaign.campaignName,
                status: campaign.status,
                startDate: campaign.startDate,
                endDate: campaign.endDate,
              };
            }
          }

          // Get parent ledger entry information if it exists
          let parentLedgerInfo = null;
          if (entry.sourceParentLedgerEntryId) {
            // Find the parent franchise that has this ledger entry
            const parentFranchise = await FranchiseDetailsModel.findOne({
              "userTrialQuotaLedger._id": entry.sourceParentLedgerEntryId,
            })
              .populate("userId", "username franchiseName")
              .lean();

            if (parentFranchise) {
              parentLedgerInfo = {
                parentFranchiseId: parentFranchise.userId._id,
                parentFranchiseName: (parentFranchise.userId as any)
                  .franchiseName,
                parentLedgerEntryId: entry.sourceParentLedgerEntryId,
              };
            }
          }

          // Get information about the user who allocated the quota
          let allocatorInfo = null;
          if (entry.allocatedByUserId) {
            const allocator = await UserModel.findById(entry.allocatedByUserId)
              .select("username email role franchiseName")
              .lean();

            if (allocator) {
              allocatorInfo = {
                _id: allocator._id,
                username: allocator.username,
                email: allocator.email,
                role: allocator.role,
                franchiseName: allocator.franchiseName,
              };
            }
          }

          // Calculate usage percentage
          const usagePercentage =
            entry.totalAllocated > 0
              ? Math.round(
                  ((entry.consumedByOwnInvites + entry.allocatedToChildren) /
                    entry.totalAllocated) *
                    100 *
                    100
                ) / 100
              : 0;

          return {
            _id: entry._id,
            sourceCampaignId: entry.sourceCampaignId,
            sourceParentLedgerEntryId: entry.sourceParentLedgerEntryId,
            allocatedByUserId: entry.allocatedByUserId,
            totalAllocated: entry.totalAllocated,
            consumedByOwnInvites: entry.consumedByOwnInvites,
            allocatedToChildren: entry.allocatedToChildren,
            availableQuota: Math.max(0, availableQuota),
            usagePercentage: usagePercentage,
            status: entry.status,
            createdAt: entry.createdAt,
            updatedAt: entry.updatedAt,
            originalCampaignStartDate: entry.originalCampaignStartDate,
            originalCampaignEndDate: entry.originalCampaignEndDate,
            // Additional information
            campaignInfo: campaignInfo,
            parentLedgerInfo: parentLedgerInfo,
            allocatorInfo: allocatorInfo,
          };
        })
      );

      // Sort by the most recent creation time
      enhancedLedgerEntries.sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );

      console.log(
        `[FranchiseService] Retrieved ${enhancedLedgerEntries.length} ledger entries for franchise: ${userId}`
      );
      return enhancedLedgerEntries;
    } catch (error) {
      if (error instanceof CustomError) {
        console.error(
          `[FranchiseService] CustomError when getting quota ledger: ${error.message}`
        );
        throw error;
      }
      console.error(
        `[FranchiseService] Undefined error when getting quota ledger: ${error}`
      );
      throw new CustomError(
        500,
        "Undefined error when getting the quota ledger list"
      );
    }
  }

  /**
   * Allocate quota to a child franchise
   * @param parentUserId - ID of the parent franchise (Fn)
   * @param childFranchiseUserId - ID of the child franchise (Fn+1)
   * @param amountToAllocate - The amount of quota to allocate
   * @param sourceLedgerEntryId - ID of the source ledger entry from the parent franchise
   */
  async allocateQuotaToChild(
    parentUserId: string,
    childFranchiseUserId: string,
    amountToAllocate: number,
    sourceLedgerEntryId: string
  ) {
    try {
      console.log(
        `[FranchiseService] Starting allocation of ${amountToAllocate} quota from parent ${parentUserId} to child ${childFranchiseUserId}`
      );

      // 1. Check if the parent franchise exists
      const parentFranchise = await FranchiseDetailsModel.findOne({
        userId: new Types.ObjectId(parentUserId),
      }).lean();

      if (!parentFranchise) {
        throw new CustomError(404, "Parent franchise information not found");
      }

      // 2. Check if the child franchise exists and is a direct child of the parent
      const childFranchise = await FranchiseDetailsModel.findOne({
        userId: new Types.ObjectId(childFranchiseUserId),
      }).lean();

      if (!childFranchise) {
        throw new CustomError(404, "Child franchise information not found");
      }

      // Check the parent-child relationship
      if (childFranchise.parentId?.toString() !== parentUserId) {
        throw new CustomError(
          403,
          "The child franchise is not a direct child of yours"
        );
      }

      // 3. Find and validate the source ledger entry
      const sourceLedgerEntry = parentFranchise.userTrialQuotaLedger?.find(
        (entry: any) => entry._id.toString() === sourceLedgerEntryId
      );

      if (!sourceLedgerEntry) {
        throw new CustomError(
          404,
          "Source ledger entry not found in your list"
        );
      }

      if (sourceLedgerEntry.status !== "active") {
        throw new CustomError(
          400,
          "The source ledger entry is not in 'active' status"
        );
      }

      // 4. Calculate available quota
      const availableQuota =
        sourceLedgerEntry.totalAllocated -
        sourceLedgerEntry.consumedByOwnInvites -
        sourceLedgerEntry.allocatedToChildren;

      if (availableQuota < amountToAllocate) {
        throw new CustomError(
          400,
          `Not enough available quota. Available: ${availableQuota}, Required: ${amountToAllocate}`
        );
      }

      // 5. Update the parent's ledger entry (increase allocatedToChildren)
      const updatedParentFranchise =
        await FranchiseDetailsModel.findOneAndUpdate(
          {
            userId: new Types.ObjectId(parentUserId),
            "userTrialQuotaLedger._id": new Types.ObjectId(sourceLedgerEntryId),
          },
          {
            $inc: {
              "userTrialQuotaLedger.$.allocatedToChildren": amountToAllocate,
            },
            $set: {
              "userTrialQuotaLedger.$.updatedAt": new Date(),
            },
          },
          { new: true }
        );

      if (!updatedParentFranchise) {
        throw new CustomError(
          500,
          "Error when updating the parent franchise's ledger entry"
        );
      }

      // 6. Create a new ledger entry for the child
      const newChildLedgerEntry = {
        _id: new Types.ObjectId(),
        sourceCampaignId: sourceLedgerEntry.sourceCampaignId,
        sourceParentLedgerEntryId: new Types.ObjectId(sourceLedgerEntryId),
        allocatedByUserId: new Types.ObjectId(parentUserId),
        totalAllocated: amountToAllocate,
        consumedByOwnInvites: 0,
        allocatedToChildren: 0,
        status: "active",
        originalCampaignStartDate: sourceLedgerEntry.originalCampaignStartDate,
        originalCampaignEndDate: sourceLedgerEntry.originalCampaignEndDate,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const updatedChildFranchise =
        await FranchiseDetailsModel.findOneAndUpdate(
          { userId: new Types.ObjectId(childFranchiseUserId) },
          {
            $push: { userTrialQuotaLedger: newChildLedgerEntry },
          },
          { new: true }
        );

      if (!updatedChildFranchise) {
        // Rollback if the child cannot be updated
        await FranchiseDetailsModel.findOneAndUpdate(
          {
            userId: new Types.ObjectId(parentUserId),
            "userTrialQuotaLedger._id": new Types.ObjectId(sourceLedgerEntryId),
          },
          {
            $inc: {
              "userTrialQuotaLedger.$.allocatedToChildren": -amountToAllocate,
            },
          }
        );

        throw new CustomError(
          500,
          "Error when creating the ledger entry for the child franchise"
        );
      }

      // 7. Get the updated information to return
      const updatedSourceLedger =
        updatedParentFranchise.userTrialQuotaLedger?.find(
          (entry: any) => entry._id.toString() === sourceLedgerEntryId
        );

      console.log(
        `[FranchiseService] Quota allocation successful. Parent ledger ${sourceLedgerEntryId} -> Child ledger ${newChildLedgerEntry._id}`
      );

      return {
        parentLedgerEntryUpdated: updatedSourceLedger,
        childLedgerEntryCreated: newChildLedgerEntry,
      };
    } catch (error) {
      if (error instanceof CustomError) {
        console.error(
          `[FranchiseService] CustomError when allocating quota: ${error.message}`
        );
        throw error;
      }
      console.error(
        `[FranchiseService] Undefined error when allocating quota: ${error}`
      );
      throw new CustomError(500, "Undefined error when allocating quota");
    }
  }

  /**
   * Revoke quota from a child franchise
   * @param parentUserId - ID of the parent franchise performing the revocation
   * @param childLedgerEntryId - ID of the ledger entry to be revoked
   */
  async revokeQuotaFromChild(parentUserId: string, childLedgerEntryId: string) {
    try {
      console.log(
        `[FranchiseService] Starting to revoke quota from child ledger entry: ${childLedgerEntryId}`
      );

      // 1. Find the child franchise that has this ledger entry
      const childFranchise = await FranchiseDetailsModel.findOne({
        "userTrialQuotaLedger._id": new Types.ObjectId(childLedgerEntryId),
      }).lean();

      if (!childFranchise) {
        throw new CustomError(404, "Ledger entry to be revoked not found");
      }

      // 2. Find the specific ledger entry
      const childLedgerEntry = childFranchise.userTrialQuotaLedger?.find(
        (entry: any) => entry._id.toString() === childLedgerEntryId
      );

      if (!childLedgerEntry) {
        throw new CustomError(
          404,
          "Ledger entry not found in the child franchise"
        );
      }

      // 3. Check revocation permission (the allocator must be parentUserId)
      if (childLedgerEntry.allocatedByUserId?.toString() !== parentUserId) {
        throw new CustomError(
          403,
          "You do not have permission to revoke this ledger entry"
        );
      }

      // 4. Check if the quota has been used
      const usedQuota =
        childLedgerEntry.consumedByOwnInvites +
        childLedgerEntry.allocatedToChildren;

      if (usedQuota > 0) {
        throw new CustomError(
          400,
          `Cannot revoke because ${usedQuota} quota has already been used. ` +
            `(${childLedgerEntry.consumedByOwnInvites} for invitations, ` +
            `${childLedgerEntry.allocatedToChildren} allocated to sub-levels)`
        );
      }

      // 5. Check the status
      if (childLedgerEntry.status !== "active") {
        throw new CustomError(
          400,
          `Cannot revoke a ledger entry with status ${childLedgerEntry.status}`
        );
      }

      // 6. Update the status of the child ledger entry to "paused" or delete it
      const updatedChildFranchise =
        await FranchiseDetailsModel.findOneAndUpdate(
          {
            userId: childFranchise.userId,
            "userTrialQuotaLedger._id": new Types.ObjectId(childLedgerEntryId),
          },
          {
            $set: {
              "userTrialQuotaLedger.$.status": "paused",
              "userTrialQuotaLedger.$.updatedAt": new Date(),
            },
          },
          { new: true }
        );

      if (!updatedChildFranchise) {
        throw new CustomError(
          500,
          "Error when updating the child franchise's ledger entry"
        );
      }

      // 7. Refund the quota to the parent ledger entry
      const parentLedgerEntryId = childLedgerEntry.sourceParentLedgerEntryId;
      const amountToReturn = childLedgerEntry.totalAllocated;

      if (parentLedgerEntryId) {
        const updatedParentFranchise =
          await FranchiseDetailsModel.findOneAndUpdate(
            {
              userId: new Types.ObjectId(parentUserId),
              "userTrialQuotaLedger._id": parentLedgerEntryId,
            },
            {
              $inc: {
                "userTrialQuotaLedger.$.allocatedToChildren": -amountToReturn,
              },
              $set: {
                "userTrialQuotaLedger.$.updatedAt": new Date(),
              },
            },
            { new: true }
          );

        if (!updatedParentFranchise) {
          // Rollback child update if parent update fails
          await FranchiseDetailsModel.findOneAndUpdate(
            {
              userId: childFranchise.userId,
              "userTrialQuotaLedger._id": new Types.ObjectId(
                childLedgerEntryId
              ),
            },
            {
              $set: {
                "userTrialQuotaLedger.$.status": "active",
                "userTrialQuotaLedger.$.updatedAt": new Date(),
              },
            }
          );

          throw new CustomError(
            500,
            "Error when refunding quota to the parent franchise"
          );
        }
      }

      console.log(
        `[FranchiseService] Successfully revoked quota from child ledger ${childLedgerEntryId}`
      );

      return {
        message: "Quota revoked successfully",
        revokedLedgerEntry: {
          _id: childLedgerEntryId,
          totalAllocated: amountToReturn,
          newStatus: "paused",
        },
        parentLedgerUpdated: parentLedgerEntryId ? true : false,
      };
    } catch (error) {
      if (error instanceof CustomError) {
        console.error(
          `[FranchiseService] CustomError when revoking quota: ${error.message}`
        );
        throw error;
      }
      console.error(
        `[FranchiseService] Undefined error when revoking quota: ${error}`
      );
      throw new CustomError(500, "Undefined error when revoking quota");
    }
  }

  /**
   * Get the quota allocation history for a specific child franchise
   * @param parentUserId - The ID of the parent franchise
   * @param childFranchiseUserId - The ID of the child franchise
   */
  async getChildAllocationHistory(
    parentUserId: string,
    childFranchiseUserId: string
  ) {
    try {
      console.log(
        `[FranchiseService] Getting quota allocation history from parent ${parentUserId} for child ${childFranchiseUserId}`
      );

      // 1. Verify parent-child relationship
      const childFranchise = await FranchiseDetailsModel.findOne({
        userId: new Types.ObjectId(childFranchiseUserId),
      })
        .populate("userId", "username email franchiseName")
        .lean();

      if (!childFranchise) {
        throw new CustomError(404, "Child franchise not found");
      }

      if (childFranchise.parentId?.toString() !== parentUserId) {
        throw new CustomError(
          403,
          "This franchise is not your direct child"
        );
      }

      // 2. Filter ledger entries allocated by the parent
      const allocationHistory =
        childFranchise.userTrialQuotaLedger?.filter(
          (entry: any) => entry.allocatedByUserId?.toString() === parentUserId
        ) || [];

      // 3. Enhance with campaign information
      const enhancedHistory = await Promise.all(
        allocationHistory.map(async (entry: any) => {
          let campaignInfo = null;
          if (entry.sourceCampaignId) {
            const campaign = await CampaignModel.findById(
              entry.sourceCampaignId
            )
              .select("campaignName status")
              .lean();

            if (campaign) {
              campaignInfo = {
                _id: campaign._id,
                campaignName: campaign.campaignName,
                status: campaign.status,
              };
            }
          }

          return {
            _id: entry._id,
            totalAllocated: entry.totalAllocated,
            consumedByOwnInvites: entry.consumedByOwnInvites,
            allocatedToChildren: entry.allocatedToChildren,
            availableQuota: Math.max(
              0,
              entry.totalAllocated -
                entry.consumedByOwnInvites -
                entry.allocatedToChildren
            ),
            status: entry.status,
            createdAt: entry.createdAt,
            updatedAt: entry.updatedAt,
            campaignInfo: campaignInfo,
            sourceParentLedgerEntryId: entry.sourceParentLedgerEntryId,
          };
        })
      );

      // 4. Sort by the latest creation time
      enhancedHistory.sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );

      console.log(
        `[FranchiseService] Found ${enhancedHistory.length} quota allocation(s)`
      );

      return {
        childFranchise: {
          _id: childFranchise._id,
          userId: childFranchise.userId,
          franchiseLevel: childFranchise.franchiseLevel,
        },
        allocationHistory: enhancedHistory,
        summary: {
          totalAllocations: enhancedHistory.length,
          totalQuotaAllocated: enhancedHistory.reduce(
            (sum, entry) => sum + entry.totalAllocated,
            0
          ),
          activeAllocations: enhancedHistory.filter(
            (entry) => entry.status === "active"
          ).length,
        },
      };
    } catch (error) {
      if (error instanceof CustomError) {
        console.error(
          `[FranchiseService] CustomError when getting allocation history: ${error.message}`
        );
        throw error;
      }
      console.error(
        `[FranchiseService] Undefined error when getting allocation history: ${error}`
      );
      throw new CustomError(
        500,
        "Undefined error when getting quota allocation history"
      );
    }
  }
  async getFranchiseTrialPerformance(
    userId: string,
    startDate?: Date,
    endDate?: Date,
    rootCampaignId?: string
  ) {
    try {
      console.log(
        `[FranchiseService] Getting trial invitation performance for franchise: ${userId}`
      );

      // Build filters for queries
      const invitationFilter: any = {
        inviterUserId: new Types.ObjectId(userId),
      };
      const trialLogFilter: any = {
        referringFranchiseId: new Types.ObjectId(userId),
      };

      if (startDate || endDate) {
        const dateFilter: any = {};
        if (startDate) dateFilter.$gte = startDate;
        if (endDate) dateFilter.$lte = endDate;

        invitationFilter.createdAt = dateFilter;
        trialLogFilter.trialStartDate = dateFilter;
      }

      if (rootCampaignId) {
        invitationFilter.linkedRootCampaignId = new Types.ObjectId(
          rootCampaignId
        );
        trialLogFilter.rootCampaignId = new Types.ObjectId(rootCampaignId);
      }

      // Get overall performance
      const [invitations, trialLogs] = await Promise.all([
        InvitationModel.find(invitationFilter).lean(),
        TrialConversionLogModel.find(trialLogFilter).lean(),
      ]);

      const totalInvites = invitations.length;
      const totalRenewals = trialLogs.filter((log) => log.didRenew).length;
      const renewalRate =
        totalInvites > 0
          ? Math.round((totalRenewals / totalInvites) * 100 * 100) / 100
          : 0;

      // Get franchise details for ledger entries
      const franchiseDetails = await FranchiseDetailsModel.findOne({
        userId: new Types.ObjectId(userId),
      }).lean();

      if (!franchiseDetails) {
        throw new CustomError(404, "Franchise information not found");
      }

      // Get performance by ledger entry
      const detailsByLedgerEntry = await Promise.all(
        (franchiseDetails.userTrialQuotaLedger || []).map(
          async (ledger: any) => {
            // Filter by campaign if specified
            if (
              rootCampaignId &&
              ledger.sourceCampaignId?.toString() !== rootCampaignId
            ) {
              return null;
            }

            // Count invitations and renewals linked to this ledger
            const ledgerInvitationFilter = {
              ...invitationFilter,
              linkedLedgerEntryId: ledger._id,
            };
            const ledgerTrialFilter = {
              ...trialLogFilter,
              ledgerEntryIdUsed: ledger._id,
            };

            const [ledgerInvitations, ledgerTrials] = await Promise.all([
              InvitationModel.find(ledgerInvitationFilter).lean(),
              TrialConversionLogModel.find(ledgerTrialFilter).lean(),
            ]);

            const ledgerInvites = ledgerInvitations.length;
            const ledgerRenewals = ledgerTrials.filter(
              (log) => log.didRenew
            ).length;
            const ledgerRenewalRate =
              ledgerInvites > 0
                ? Math.round((ledgerRenewals / ledgerInvites) * 100 * 100) / 100
                : 0;

            // Get campaign info
            let campaignInfo = null;
            if (ledger.sourceCampaignId) {
              const campaign = await CampaignModel.findById(
                ledger.sourceCampaignId
              )
                .select("campaignName status")
                .lean();
              if (campaign) {
                campaignInfo = {
                  _id: campaign._id,
                  campaignName: campaign.campaignName,
                  status: campaign.status,
                };
              }
            }

            return {
              ledgerEntryId: ledger._id,
              sourceCampaignId: ledger.sourceCampaignId,
              campaignInfo: campaignInfo,
              totalAllocated: ledger.totalAllocated,
              consumedByOwnInvites: ledger.consumedByOwnInvites,
              allocatedToChildren: ledger.allocatedToChildren,
              availableQuota: Math.max(
                0,
                ledger.totalAllocated -
                  ledger.consumedByOwnInvites -
                  ledger.allocatedToChildren
              ),
              status: ledger.status,
              performance: {
                totalInvites: ledgerInvites,
                totalRenewals: ledgerRenewals,
                renewalRate: ledgerRenewalRate,
              },
            };
          }
        )
      );

      // Filter out null entries
      const filteredDetailsByLedgerEntry = detailsByLedgerEntry.filter(
        (entry) => entry !== null
      );

      console.log(
        `[FranchiseService] Successfully retrieved performance: ${totalInvites} invites, ${totalRenewals} renewals`
      );

      return {
        overall: {
          totalInvites,
          totalRenewals,
          renewalRate,
        },
        detailsByLedgerEntry: filteredDetailsByLedgerEntry,
        filters: {
          startDate: startDate?.toISOString(),
          endDate: endDate?.toISOString(),
          rootCampaignId: rootCampaignId,
        },
      };
    } catch (error) {
      if (error instanceof CustomError) {
        console.error(
          `[FranchiseService] CustomError when getting performance: ${error.message}`
        );
        throw error;
      }
      console.error(
        `[FranchiseService] Undefined error when getting performance: ${error}`
      );
      throw new CustomError(
        500,
        "Undefined error when getting trial invitation performance"
      );
    }
  }

  async getChildrenPerformanceSummary(
    parentUserId: string,
    startDate?: Date,
    endDate?: Date,
    rootCampaignId?: string
  ) {
    try {
      console.log(
        `[FranchiseService] Getting child franchise performance summary for parent: ${parentUserId}`
      );

      // Get direct children
      const directChildren = await FranchiseDetailsModel.find({
        parentId: new Types.ObjectId(parentUserId),
      })
        .populate("userId", "username franchiseName email")
        .lean();

      if (directChildren.length === 0) {
        return {
          overallChildren: {
            totalInvites: 0,
            totalRenewals: 0,
            renewalRate: 0,
          },
          performanceByChild: [],
        };
      }

      // Collect performance data for each child
      const childrenIds = directChildren.map(
        (child) => child.userId as Types.ObjectId
      );

      // Build filters
      const invitationFilter: any = {
        inviterUserId: { $in: childrenIds },
      };
      const trialLogFilter: any = {
        referringFranchiseId: { $in: childrenIds },
      };

      if (startDate || endDate) {
        const dateFilter: any = {};
        if (startDate) dateFilter.$gte = startDate;
        if (endDate) dateFilter.$lte = endDate;

        invitationFilter.createdAt = dateFilter;
        trialLogFilter.trialStartDate = dateFilter;
      }

      if (rootCampaignId) {
        invitationFilter.linkedRootCampaignId = new Types.ObjectId(
          rootCampaignId
        );
        trialLogFilter.rootCampaignId = new Types.ObjectId(rootCampaignId);
      }

      // Get overall children performance
      const [allInvitations, allTrialLogs] = await Promise.all([
        InvitationModel.find(invitationFilter).lean(),
        TrialConversionLogModel.find(trialLogFilter).lean(),
      ]);

      const overallTotalInvites = allInvitations.length;
      const overallTotalRenewals = allTrialLogs.filter(
        (log) => log.didRenew
      ).length;
      const overallRenewalRate =
        overallTotalInvites > 0
          ? Math.round(
              (overallTotalRenewals / overallTotalInvites) * 100 * 100
            ) / 100
          : 0;

      // Get performance by each child
      const performanceByChild = await Promise.all(
        directChildren.map(async (child) => {
          const childUserId = child.userId as Types.ObjectId;

          const childInvitations = allInvitations.filter(
            (inv) => inv.inviterUserId.toString() === childUserId.toString()
          );
          const childTrialLogs = allTrialLogs.filter(
            (log) =>
              log.referringFranchiseId.toString() === childUserId.toString()
          );

          const childTotalInvites = childInvitations.length;
          const childTotalRenewals = childTrialLogs.filter(
            (log) => log.didRenew
          ).length;
          const childRenewalRate =
            childTotalInvites > 0
              ? Math.round(
                  (childTotalRenewals / childTotalInvites) * 100 * 100
                ) / 100
              : 0;

          const userInfo = child.userId as any;

          return {
            childFranchiseId: childUserId.toString(),
            childFranchiseName:
              userInfo?.franchiseName || userInfo?.username || "Unknown",
            franchiseLevel: child.franchiseLevel,
            totalInvites: childTotalInvites,
            totalRenewals: childTotalRenewals,
            renewalRate: childRenewalRate,
          };
        })
      );

      // Sort by performance
      performanceByChild.sort((a, b) => b.totalRenewals - a.totalRenewals);

      console.log(
        `[FranchiseService] Successfully retrieved performance for ${directChildren.length} child franchises`
      );

      return {
        overallChildren: {
          totalInvites: overallTotalInvites,
          totalRenewals: overallTotalRenewals,
          renewalRate: overallRenewalRate,
        },
        performanceByChild,
        filters: {
          startDate: startDate?.toISOString(),
          endDate: endDate?.toISOString(),
          rootCampaignId: rootCampaignId,
        },
      };
    } catch (error) {
      if (error instanceof CustomError) {
        console.error(
          `[FranchiseService] CustomError when getting child franchise performance: ${error.message}`
        );
        throw error;
      }
      console.error(
        `[FranchiseService] Undefined error when getting child franchise performance: ${error}`
      );
      throw new CustomError(
        500,
        "Undefined error when getting child franchise performance"
      );
    }
  }

  async getSingleChildPerformance(
    parentUserId: string,
    childFranchiseUserId: string,
    startDate?: Date,
    endDate?: Date,
    rootCampaignId?: string
  ) {
    try {
      console.log(
        `[FranchiseService] Getting detailed performance for child franchise: ${childFranchiseUserId}`
      );

      // Verify parent-child relationship
      const childFranchise = await FranchiseDetailsModel.findOne({
        userId: new Types.ObjectId(childFranchiseUserId),
      })
        .populate("userId", "username franchiseName email")
        .lean();

      if (!childFranchise) {
        throw new CustomError(404, "Child franchise not found");
      }

      if (childFranchise.parentId?.toString() !== parentUserId) {
        throw new CustomError(
          403,
          "This franchise is not your direct child"
        );
      }

      // Get child performance using the same logic as getFranchiseTrialPerformance
      const childPerformance = await this.getFranchiseTrialPerformance(
        childFranchiseUserId,
        startDate,
        endDate,
        rootCampaignId
      );

      const userInfo = childFranchise.userId as any;

      return {
        childInfo: {
          _id: childFranchise._id,
          userId: childFranchise.userId,
          franchiseName:
            userInfo?.franchiseName || userInfo?.username || "Unknown",
          franchiseLevel: childFranchise.franchiseLevel,
        },
        performance: childPerformance,
      };
    } catch (error) {
      if (error instanceof CustomError) {
        console.error(
          `[FranchiseService] CustomError when getting detailed child franchise performance: ${error.message}`
        );
        throw error;
      }
      console.error(
        `[FranchiseService] Undefined error when getting detailed child franchise performance: ${error}`
      );
      throw new CustomError(
        500,
        "Undefined error when getting detailed child franchise performance"
      );
    }
  }

  /**
   * Get the performance of the entire franchise tree (self and all descendants)
   * @param userId - The ID of the root franchise
   * @param rootCampaignId - The ID of the root campaign (optional)
   * @param startDate - The start date (optional)
   * @param endDate - The end date (optional)
   */
  async getFullHierarchyPerformance(
    userId: string,
    rootCampaignId?: string,
    startDate?: Date,
    endDate?: Date
  ) {
    try {
      console.log(
        `[FranchiseService] Getting full hierarchy performance for user: ${userId}`
      );

      // // Validate userId
      // if (!userId?.trim()) {
      //   throw new CustomError(400, "User ID cannot be empty");
      // }

      if (!Types.ObjectId.isValid(userId)) {
        throw new CustomError(400, "Invalid user ID");
      }

      // Check if the user is a franchise
      const isFranchise = await this.isUserFranchise(userId);
      if (!isFranchise) {
        throw new CustomError(403, "User is not a franchise");
      }

      // Get the root franchise information
      const rootFranchise = await FranchiseDetailsModel.findOne({
        userId: new Types.ObjectId(userId),
      })
        .populate("userId", "username email franchiseName")
        .lean();

      if (!rootFranchise) {
        throw new CustomError(404, "Franchise information not found");
      }

      // Recursive function to get all descendant franchises
      const getAllDescendants = async (
        parentId: Types.ObjectId,
        level: number = 0
      ): Promise<Types.ObjectId[]> => {
        const directChildren = await FranchiseDetailsModel.find({
          parentId: parentId,
        }).lean();

        let allDescendants: Types.ObjectId[] = [];

        for (const child of directChildren) {
          allDescendants.push(child.userId as Types.ObjectId);
          const childDescendants = await getAllDescendants(
            child.userId as Types.ObjectId,
            level + 1
          );
          allDescendants = allDescendants.concat(childDescendants);
        }

        return allDescendants;
      };

      // Get all IDs of descendant franchises
      const allDescendantIds = await getAllDescendants(
        rootFranchise.userId as Types.ObjectId
      );

      // All franchise IDs including the root
      const allFranchiseIds = [
        rootFranchise.userId as Types.ObjectId,
        ...allDescendantIds,
      ];

      // Build filters for queries
      const invitationFilter: any = {
        inviterUserId: { $in: allFranchiseIds },
      };
      const trialLogFilter: any = {
        referringFranchiseId: { $in: allFranchiseIds },
      };

      // Add time filters if provided
      if (startDate || endDate) {
        const dateFilter: any = {};
        if (startDate) dateFilter.$gte = startDate;
        if (endDate) dateFilter.$lte = endDate;

        invitationFilter.createdAt = dateFilter;
        trialLogFilter.trialStartDate = dateFilter;
      }

      // Add campaign filter if provided
      if (rootCampaignId) {
        invitationFilter.linkedRootCampaignId = new Types.ObjectId(
          rootCampaignId
        );
        trialLogFilter.rootCampaignId = new Types.ObjectId(rootCampaignId);
      }

      // Get all invitations and trial logs
      const [allInvitations, allTrialLogs] = await Promise.all([
        InvitationModel.find(invitationFilter).lean(),
        TrialConversionLogModel.find(trialLogFilter).lean(),
      ]);

      // Calculate overall metrics
      const totalInvites = allInvitations.length;
      const totalRenewals = allTrialLogs.filter((log) => log.didRenew).length;
      const renewalRate =
        totalInvites > 0
          ? Math.round((totalRenewals / totalInvites) * 100 * 100) / 100
          : 0;

      // Build performance breakdown by level
      const performanceByLevel = new Map<
        number,
        {
          level: number;
          franchiseCount: number;
          totalInvites: number;
          totalRenewals: number;
          renewalRate: number;
        }
      >();

      // Process root franchise
      const rootInvites = allInvitations.filter(
        (inv) => inv.inviterUserId.toString() === userId
      ).length;
      const rootRenewals = allTrialLogs.filter(
        (log) => log.referringFranchiseId.toString() === userId && log.didRenew
      ).length;

      performanceByLevel.set(rootFranchise.franchiseLevel, {
        level: rootFranchise.franchiseLevel,
        franchiseCount: 1,
        totalInvites: rootInvites,
        totalRenewals: rootRenewals,
        renewalRate:
          rootInvites > 0
            ? Math.round((rootRenewals / rootInvites) * 100 * 100) / 100
            : 0,
      });

      // Process descendants
      for (const descendantId of allDescendantIds) {
        const descendantFranchise = await FranchiseDetailsModel.findOne({
          userId: descendantId,
        }).lean();

        if (descendantFranchise) {
          const level = descendantFranchise.franchiseLevel;
          const invites = allInvitations.filter(
            (inv) => inv.inviterUserId.toString() === descendantId.toString()
          ).length;
          const renewals = allTrialLogs.filter(
            (log) =>
              log.referringFranchiseId.toString() === descendantId.toString() &&
              log.didRenew
          ).length;

          if (!performanceByLevel.has(level)) {
            performanceByLevel.set(level, {
              level: level,
              franchiseCount: 0,
              totalInvites: 0,
              totalRenewals: 0,
              renewalRate: 0,
            });
          }

          const levelData = performanceByLevel.get(level)!;
          levelData.franchiseCount++;
          levelData.totalInvites += invites;
          levelData.totalRenewals += renewals;
          levelData.renewalRate =
            levelData.totalInvites > 0
              ? Math.round(
                  (levelData.totalRenewals / levelData.totalInvites) * 100 * 100
                ) / 100
              : 0;
        }
      }

      // Convert map to array and sort by level
      const performanceByLevelArray = Array.from(
        performanceByLevel.values()
      ).sort((a, b) => a.level - b.level);

      // Get top performers
      const franchisePerformanceMap = new Map<
        string,
        {
          franchiseId: string;
          franchiseName: string;
          level: number;
          invites: number;
          renewals: number;
          renewalRate: number;
        }
      >();

      // Build performance map for all franchises
      for (const franchiseId of allFranchiseIds) {
        const franchise = await FranchiseDetailsModel.findOne({
          userId: franchiseId,
        })
          .populate("userId", "franchiseName username")
          .lean();

        if (franchise) {
          const invites = allInvitations.filter(
            (inv) => inv.inviterUserId.toString() === franchiseId.toString()
          ).length;
          const renewals = allTrialLogs.filter(
            (log) =>
              log.referringFranchiseId.toString() === franchiseId.toString() &&
              log.didRenew
          ).length;

          const userInfo = franchise.userId as any;
          franchisePerformanceMap.set(franchiseId.toString(), {
            franchiseId: franchiseId.toString(),
            franchiseName:
              userInfo?.franchiseName || userInfo?.username || "Unknown",
            level: franchise.franchiseLevel,
            invites: invites,
            renewals: renewals,
            renewalRate:
              invites > 0
                ? Math.round((renewals / invites) * 100 * 100) / 100
                : 0,
          });
        }
      }

      const allFranchisePerformance = Array.from(
        franchisePerformanceMap.values()
      );

      // Get top performers
      const topInviters = [...allFranchisePerformance]
        .sort((a, b) => b.invites - a.invites)
        .slice(0, 5);

      const topRenewers = [...allFranchisePerformance]
        .sort((a, b) => b.renewals - a.renewals)
        .slice(0, 5);

      console.log(
        `[FranchiseService] Successfully retrieved full franchise tree performance`
      );

      return {
        summary: {
          totalFranchises: allFranchiseIds.length,
          totalLevels: performanceByLevelArray.length,
          totalInvites: totalInvites,
          totalRenewals: totalRenewals,
          overallRenewalRate: renewalRate,
        },
        rootFranchise: {
          _id: rootFranchise._id,
          userId: rootFranchise.userId,
          franchiseLevel: rootFranchise.franchiseLevel,
          invites: rootInvites,
          renewals: rootRenewals,
          renewalRate:
            rootInvites > 0
              ? Math.round((rootRenewals / rootInvites) * 100 * 100) / 100
              : 0,
        },
        performanceByLevel: performanceByLevelArray,
        topPerformers: {
          topInviters: topInviters,
          topRenewers: topRenewers,
        },
        filters: {
          startDate: startDate?.toISOString(),
          endDate: endDate?.toISOString(),
          rootCampaignId: rootCampaignId,
        },
      };
    } catch (error) {
      if (error instanceof CustomError) {
        console.error(
          `[FranchiseService] CustomError when getting full tree performance: ${error.message}`
        );
        throw error;
      }
      console.error(
        `[FranchiseService] Undefined error when getting full tree performance: ${error}`
      );
      throw new CustomError(
        500,
        "Undefined error when getting full franchise tree performance"
      );
    }
  }

  /**
   * Get quota utilization information for a franchise and its direct children
   * @param userId - The ID of the franchise
   */
  async getQuotaUtilization(userId: string) {
    try {
      console.log(
        `[FranchiseService] Getting quota utilization information for franchise: ${userId}`
      );

      // Validate userId
      // if (!userId?.trim()) {
      //   throw new CustomError(400, "User ID cannot be empty");
      // }

      if (!Types.ObjectId.isValid(userId)) {
        throw new CustomError(400, "Invalid user ID");
      }

      // Check if the user is a franchise
      const isFranchise = await this.isUserFranchise(userId);
      if (!isFranchise) {
        throw new CustomError(403, "User is not a franchise");
      }

      // Get the current franchise information
      const currentFranchise = await FranchiseDetailsModel.findOne({
        userId: new Types.ObjectId(userId),
      })
        .populate("userId", "username email franchiseName")
        .lean();

      if (!currentFranchise) {
        throw new CustomError(404, "Franchise information not found");
      }

      // Calculate quota utilization for the current franchise
      const myQuotaUtilization = {
        totalAllocated: 0,
        consumedByOwnInvites: 0,
        allocatedToChildren: 0,
        availableQuota: 0,
        utilizationPercentage: 0,
        ledgerBreakdown: [] as any[],
      };

      // Process each ledger entry
      for (const ledger of currentFranchise.userTrialQuotaLedger || []) {
        myQuotaUtilization.totalAllocated += ledger.totalAllocated;
        myQuotaUtilization.consumedByOwnInvites += ledger.consumedByOwnInvites;
        myQuotaUtilization.allocatedToChildren += ledger.allocatedToChildren;

        const available = Math.max(
          0,
          ledger.totalAllocated -
            ledger.consumedByOwnInvites -
            ledger.allocatedToChildren
        );

        if (ledger.status === "active") {
          myQuotaUtilization.availableQuota += available;
        }

        // Get campaign info
        let campaignInfo = null;
        if (ledger.sourceCampaignId) {
          const campaign = await CampaignModel.findById(ledger.sourceCampaignId)
            .select("campaignName status")
            .lean();
          if (campaign) {
            campaignInfo = {
              _id: campaign._id,
              campaignName: campaign.campaignName,
              status: campaign.status,
            };
          }
        }

        myQuotaUtilization.ledgerBreakdown.push({
          ledgerId: ledger._id,
          sourceCampaignId: ledger.sourceCampaignId,
          campaignInfo: campaignInfo,
          totalAllocated: ledger.totalAllocated,
          consumedByOwnInvites: ledger.consumedByOwnInvites,
          allocatedToChildren: ledger.allocatedToChildren,
          availableQuota: available,
          status: ledger.status,
          utilizationPercentage:
            ledger.totalAllocated > 0
              ? Math.round(
                  ((ledger.consumedByOwnInvites + ledger.allocatedToChildren) /
                    ledger.totalAllocated) *
                    100 *
                    100
                ) / 100
              : 0,
        });
      }

      // Calculate overall utilization percentage
      myQuotaUtilization.utilizationPercentage =
        myQuotaUtilization.totalAllocated > 0
          ? Math.round(
              ((myQuotaUtilization.consumedByOwnInvites +
                myQuotaUtilization.allocatedToChildren) /
                myQuotaUtilization.totalAllocated) *
                100 *
                100
            ) / 100
          : 0;

      // Get direct children quota utilization
      const directChildren = await FranchiseDetailsModel.find({
        parentId: new Types.ObjectId(userId),
      })
        .populate("userId", "username email franchiseName")
        .lean();

      const childrenUtilization = await Promise.all(
        directChildren.map(async (child) => {
          const childQuotaData = {
            franchiseId: child.userId,
            franchiseLevel: child.franchiseLevel,
            totalAllocated: 0,
            consumedByOwnInvites: 0,
            allocatedToChildren: 0,
            availableQuota: 0,
            utilizationPercentage: 0,
          };

          // Sum up all ledger entries for this child
          for (const ledger of child.userTrialQuotaLedger || []) {
            childQuotaData.totalAllocated += ledger.totalAllocated;
            childQuotaData.consumedByOwnInvites += ledger.consumedByOwnInvites;
            childQuotaData.allocatedToChildren += ledger.allocatedToChildren;

            if (ledger.status === "active") {
              const available = Math.max(
                0,
                ledger.totalAllocated -
                  ledger.consumedByOwnInvites -
                  ledger.allocatedToChildren
              );
              childQuotaData.availableQuota += available;
            }
          }

          // Calculate utilization percentage
          childQuotaData.utilizationPercentage =
            childQuotaData.totalAllocated > 0
              ? Math.round(
                  ((childQuotaData.consumedByOwnInvites +
                    childQuotaData.allocatedToChildren) /
                    childQuotaData.totalAllocated) *
                    100 *
                    100
                ) / 100
              : 0;

          return childQuotaData;
        })
      );

      // Calculate overall statistics
      const overallStats = {
        totalFranchises: 1 + directChildren.length,
        totalQuotaAllocated:
          myQuotaUtilization.totalAllocated +
          childrenUtilization.reduce(
            (sum, child) => sum + child.totalAllocated,
            0
          ),
        totalQuotaUsed:
          myQuotaUtilization.consumedByOwnInvites +
          myQuotaUtilization.allocatedToChildren +
          childrenUtilization.reduce(
            (sum, child) =>
              sum + child.consumedByOwnInvites + child.allocatedToChildren,
            0
          ),
        totalAvailableQuota:
          myQuotaUtilization.availableQuota +
          childrenUtilization.reduce(
            (sum, child) => sum + child.availableQuota,
            0
          ),
      };

      overallStats.totalAvailableQuota = Math.max(
        0,
        overallStats.totalAvailableQuota
      );

      console.log(`[FranchiseService] Successfully retrieved quota utilization information`);

      return {
        myQuotaUtilization: myQuotaUtilization,
        childrenUtilization: childrenUtilization.sort(
          (a, b) => b.totalAllocated - a.totalAllocated
        ),
        overallStats: {
          ...overallStats,
          overallUtilizationPercentage:
            overallStats.totalQuotaAllocated > 0
              ? Math.round(
                  (overallStats.totalQuotaUsed /
                    overallStats.totalQuotaAllocated) *
                    100 *
                    100
                ) / 100
              : 0,
        },
      };
    } catch (error) {
      if (error instanceof CustomError) {
        console.error(
          `[FranchiseService] CustomError when getting quota utilization: ${error.message}`
        );
        throw error;
      }
      console.error(
        `[FranchiseService] Undefined error when getting quota utilization: ${error}`
      );
      throw new CustomError(
        500,
        "Undefined error when getting quota utilization information"
      );
    }
  }
}

export default new FranchiseService();
