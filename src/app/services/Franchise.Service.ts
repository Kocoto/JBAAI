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
   * Lấy thông tin FranchiseDetails của franchise đang đăng nhập
   * @param userId - ID của user (franchise) đang đăng nhập
   * @returns Thông tin FranchiseDetails kèm theo thống kê cơ bản
   */
  async getMyFranchiseDetails(userId: string) {
    try {
      console.log(
        `[FranchiseService] Lấy thông tin franchise details cho user: ${userId}`
      );

      // Validate userId
      if (!userId?.trim()) {
        throw new CustomError(400, "ID người dùng không được để trống");
      }

      if (!Types.ObjectId.isValid(userId)) {
        throw new CustomError(400, "ID người dùng không hợp lệ");
      }

      // Kiểm tra user có tồn tại không
      const user = await UserModel.findById(userId).lean();
      if (!user) {
        throw new CustomError(404, "Không tìm thấy người dùng");
      }

      // Kiểm tra user có phải là franchise không
      if (user.role !== "franchise") {
        throw new CustomError(403, "Người dùng không phải là franchise");
      }

      // Lấy thông tin FranchiseDetails
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
        throw new CustomError(404, "Không tìm thấy thông tin franchise");
      }

      // Tính toán quota còn lại
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

      // Lấy thống kê cơ bản
      const [
        totalInvitations,
        trialConversions,
        directChildrenCount,
        activeCampaigns,
      ] = await Promise.all([
        // Đếm tổng số lời mời đã gửi
        InvitationModel.countDocuments({
          inviterUserId: new Types.ObjectId(userId),
        }),

        // Lấy thông tin chuyển đổi và gia hạn
        TrialConversionLogModel.find({
          referringFranchiseId: new Types.ObjectId(userId),
        }).lean(),

        // Đếm số franchise con trực tiếp
        FranchiseDetailsModel.countDocuments({
          parentId: new Types.ObjectId(userId),
        }),

        // Lấy danh sách campaign đang hoạt động liên quan
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

      // Tính toán thống kê
      const totalRenewals = trialConversions.filter(
        (log) => log.didRenew
      ).length;
      const conversionRate =
        totalInvitations > 0
          ? Math.round((totalRenewals / totalInvitations) * 100 * 100) / 100
          : 0;

      // Tìm hoạt động gần nhất
      const lastInvitation = await InvitationModel.findOne({
        inviterUserId: new Types.ObjectId(userId),
      })
        .sort({ createdAt: -1 })
        .select("createdAt invitedUserId")
        .lean();

      // Format kết quả trả về
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
        `[FranchiseService] Lấy thông tin franchise details thành công cho user: ${userId}`
      );
      return result;
    } catch (error) {
      if (error instanceof CustomError) {
        console.error(
          `[FranchiseService] Lỗi CustomError khi lấy franchise details: ${error.message}`
        );
        throw error;
      }
      console.error(
        `[FranchiseService] Lỗi không xác định khi lấy franchise details: ${error}`
      );
      throw new CustomError(
        500,
        "Lỗi không xác định khi lấy thông tin franchise"
      );
    }
  }

  /**
   * Kiểm tra user có phải là franchise hay không
   * @param userId - ID của user cần kiểm tra
   * @returns true nếu là franchise, false nếu không
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
        `[FranchiseService] Lỗi khi kiểm tra user franchise: ${error}`
      );
      return false;
    }
  }

  /**
   * Lấy danh sách các mã mời thuộc sở hữu của franchise
   * @param userId - ID của franchise đang đăng nhập
   * @returns Danh sách InvitationCode
   */
  async getMyInvitationCodes(userId: string) {
    try {
      console.log(
        `[FranchiseService] Lấy danh sách mã mời cho franchise: ${userId}`
      );

      // Validate userId
      if (!userId?.trim()) {
        throw new CustomError(400, "ID người dùng không được để trống");
      }

      if (!Types.ObjectId.isValid(userId)) {
        throw new CustomError(400, "ID người dùng không hợp lệ");
      }

      // Kiểm tra user có phải là franchise không
      const isFranchise = await this.isUserFranchise(userId);
      if (!isFranchise) {
        throw new CustomError(403, "Người dùng không phải là franchise");
      }

      // Lấy danh sách invitation codes
      const invitationCodes = await InvitationCodeModel.find({
        userId: new Types.ObjectId(userId),
      })
        .sort({ createdAt: -1 })
        .lean();

      // Lấy thêm thông tin thống kê cho mỗi code
      const codesWithStats = await Promise.all(
        invitationCodes.map(async (code) => {
          // Đếm số lượng sử dụng thực tế
          const actualUsageCount = await InvitationModel.countDocuments({
            invitationCodeId: code._id,
          });

          // Lấy thông tin ledger entry hiện tại nếu có
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

          // Tìm lời mời gần nhất sử dụng code này
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
        `[FranchiseService] Lấy được ${codesWithStats.length} mã mời cho franchise: ${userId}`
      );
      return codesWithStats;
    } catch (error) {
      if (error instanceof CustomError) {
        console.error(
          `[FranchiseService] Lỗi CustomError khi lấy invitation codes: ${error.message}`
        );
        throw error;
      }
      console.error(
        `[FranchiseService] Lỗi không xác định khi lấy invitation codes: ${error}`
      );
      throw new CustomError(500, "Lỗi không xác định khi lấy danh sách mã mời");
    }
  }

  /**
   * Lấy danh sách user trial quota ledger của franchise
   * @param userId - ID của franchise đang đăng nhập
   * @param filters - Các filter tùy chọn (status, rootCampaignId)
   * @returns Danh sách UserTrialQuotaLedger entries
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
        `[FranchiseService] Lấy danh sách quota ledger cho franchise: ${userId}`
      );

      // Validate userId
      if (!userId?.trim()) {
        throw new CustomError(400, "ID người dùng không được để trống");
      }

      if (!Types.ObjectId.isValid(userId)) {
        throw new CustomError(400, "ID người dùng không hợp lệ");
      }

      // Validate rootCampaignId nếu có
      if (
        filters?.rootCampaignId &&
        !Types.ObjectId.isValid(filters.rootCampaignId)
      ) {
        throw new CustomError(400, "ID Campaign không hợp lệ");
      }

      // Kiểm tra user có phải là franchise không
      const isFranchise = await this.isUserFranchise(userId);
      if (!isFranchise) {
        throw new CustomError(403, "Người dùng không phải là franchise");
      }

      // Lấy franchise details
      const franchiseDetails = await FranchiseDetailsModel.findOne({
        userId: new Types.ObjectId(userId),
      }).lean();

      if (!franchiseDetails) {
        throw new CustomError(404, "Không tìm thấy thông tin franchise");
      }

      // Lọc ledger entries theo filters
      let ledgerEntries = franchiseDetails.userTrialQuotaLedger || [];

      // Filter theo status nếu có
      if (filters?.status) {
        const validStatuses = ["active", "exhausted", "expired", "paused"];
        if (!validStatuses.includes(filters.status)) {
          throw new CustomError(
            400,
            `Status không hợp lệ. Chỉ chấp nhận: ${validStatuses.join(", ")}`
          );
        }
        ledgerEntries = ledgerEntries.filter(
          (entry: any) => entry.status === filters.status
        );
      }

      // Filter theo rootCampaignId nếu có
      if (filters?.rootCampaignId) {
        ledgerEntries = ledgerEntries.filter(
          (entry: any) =>
            entry.sourceCampaignId?.toString() === filters.rootCampaignId
        );
      }

      // Enhance ledger entries với thông tin thêm
      const enhancedLedgerEntries = await Promise.all(
        ledgerEntries.map(async (entry: any) => {
          // Tính quota khả dụng
          const availableQuota =
            entry.totalAllocated -
            entry.consumedByOwnInvites -
            entry.allocatedToChildren;

          // Lấy thông tin campaign
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

          // Lấy thông tin parent ledger entry nếu có
          let parentLedgerInfo = null;
          if (entry.sourceParentLedgerEntryId) {
            // Tìm parent franchise có ledger entry này
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

          // Lấy thông tin người cấp quota
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

          // Tính phần trăm sử dụng
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
            // Thông tin bổ sung
            campaignInfo: campaignInfo,
            parentLedgerInfo: parentLedgerInfo,
            allocatorInfo: allocatorInfo,
          };
        })
      );

      // Sắp xếp theo thời gian tạo mới nhất
      enhancedLedgerEntries.sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );

      console.log(
        `[FranchiseService] Lấy được ${enhancedLedgerEntries.length} ledger entries cho franchise: ${userId}`
      );
      return enhancedLedgerEntries;
    } catch (error) {
      if (error instanceof CustomError) {
        console.error(
          `[FranchiseService] Lỗi CustomError khi lấy quota ledger: ${error.message}`
        );
        throw error;
      }
      console.error(
        `[FranchiseService] Lỗi không xác định khi lấy quota ledger: ${error}`
      );
      throw new CustomError(
        500,
        "Lỗi không xác định khi lấy danh sách quota ledger"
      );
    }
  }
}

export default new FranchiseService();
