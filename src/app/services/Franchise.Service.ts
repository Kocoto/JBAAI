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

  /**
   * Cấp phát quota cho franchise con
   * @param parentUserId - ID của franchise cha (Fn)
   * @param childFranchiseUserId - ID của franchise con (Fn+1)
   * @param amountToAllocate - Số lượng quota muốn cấp
   * @param sourceLedgerEntryId - ID của ledger entry nguồn của franchise cha
   */
  async allocateQuotaToChild(
    parentUserId: string,
    childFranchiseUserId: string,
    amountToAllocate: number,
    sourceLedgerEntryId: string
  ) {
    try {
      console.log(
        `[FranchiseService] Bắt đầu cấp phát ${amountToAllocate} quota từ parent ${parentUserId} cho child ${childFranchiseUserId}`
      );

      // 1. Kiểm tra parent franchise tồn tại
      const parentFranchise = await FranchiseDetailsModel.findOne({
        userId: new Types.ObjectId(parentUserId),
      }).lean();

      if (!parentFranchise) {
        throw new CustomError(404, "Không tìm thấy thông tin franchise cha");
      }

      // 2. Kiểm tra child franchise tồn tại và là con trực tiếp của parent
      const childFranchise = await FranchiseDetailsModel.findOne({
        userId: new Types.ObjectId(childFranchiseUserId),
      }).lean();

      if (!childFranchise) {
        throw new CustomError(404, "Không tìm thấy thông tin franchise con");
      }

      // Kiểm tra quan hệ cha-con
      if (childFranchise.parentId?.toString() !== parentUserId) {
        throw new CustomError(
          403,
          "Franchise con không phải là con trực tiếp của bạn"
        );
      }

      // 3. Tìm và validate source ledger entry
      const sourceLedgerEntry = parentFranchise.userTrialQuotaLedger?.find(
        (entry: any) => entry._id.toString() === sourceLedgerEntryId
      );

      if (!sourceLedgerEntry) {
        throw new CustomError(
          404,
          "Không tìm thấy ledger entry nguồn trong danh sách của bạn"
        );
      }

      if (sourceLedgerEntry.status !== "active") {
        throw new CustomError(
          400,
          "Ledger entry nguồn không ở trạng thái active"
        );
      }

      // 4. Tính toán quota khả dụng
      const availableQuota =
        sourceLedgerEntry.totalAllocated -
        sourceLedgerEntry.consumedByOwnInvites -
        sourceLedgerEntry.allocatedToChildren;

      if (availableQuota < amountToAllocate) {
        throw new CustomError(
          400,
          `Quota khả dụng không đủ. Khả dụng: ${availableQuota}, Yêu cầu: ${amountToAllocate}`
        );
      }

      // 5. Cập nhật ledger entry của parent (tăng allocatedToChildren)
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
          "Lỗi khi cập nhật ledger entry của franchise cha"
        );
      }

      // 6. Tạo ledger entry mới cho child
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
        // Rollback nếu không thể cập nhật child
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
          "Lỗi khi tạo ledger entry cho franchise con"
        );
      }

      // 7. Lấy thông tin đã cập nhật để trả về
      const updatedSourceLedger =
        updatedParentFranchise.userTrialQuotaLedger?.find(
          (entry: any) => entry._id.toString() === sourceLedgerEntryId
        );

      console.log(
        `[FranchiseService] Cấp phát quota thành công. Parent ledger ${sourceLedgerEntryId} -> Child ledger ${newChildLedgerEntry._id}`
      );

      return {
        parentLedgerEntryUpdated: updatedSourceLedger,
        childLedgerEntryCreated: newChildLedgerEntry,
      };
    } catch (error) {
      if (error instanceof CustomError) {
        console.error(
          `[FranchiseService] Lỗi CustomError khi cấp phát quota: ${error.message}`
        );
        throw error;
      }
      console.error(
        `[FranchiseService] Lỗi không xác định khi cấp phát quota: ${error}`
      );
      throw new CustomError(500, "Lỗi không xác định khi cấp phát quota");
    }
  }

  /**
   * Thu hồi quota từ franchise con
   * @param parentUserId - ID của franchise cha đang thực hiện thu hồi
   * @param childLedgerEntryId - ID của ledger entry cần thu hồi
   */
  async revokeQuotaFromChild(parentUserId: string, childLedgerEntryId: string) {
    try {
      console.log(
        `[FranchiseService] Bắt đầu thu hồi quota từ child ledger entry: ${childLedgerEntryId}`
      );

      // 1. Tìm child franchise có ledger entry này
      const childFranchise = await FranchiseDetailsModel.findOne({
        "userTrialQuotaLedger._id": new Types.ObjectId(childLedgerEntryId),
      }).lean();

      if (!childFranchise) {
        throw new CustomError(404, "Không tìm thấy ledger entry cần thu hồi");
      }

      // 2. Tìm ledger entry cụ thể
      const childLedgerEntry = childFranchise.userTrialQuotaLedger?.find(
        (entry: any) => entry._id.toString() === childLedgerEntryId
      );

      if (!childLedgerEntry) {
        throw new CustomError(
          404,
          "Không tìm thấy ledger entry trong franchise con"
        );
      }

      // 3. Kiểm tra quyền thu hồi (người cấp phải là parentUserId)
      if (childLedgerEntry.allocatedByUserId?.toString() !== parentUserId) {
        throw new CustomError(
          403,
          "Bạn không có quyền thu hồi ledger entry này"
        );
      }

      // 4. Kiểm tra xem quota đã được sử dụng chưa
      const usedQuota =
        childLedgerEntry.consumedByOwnInvites +
        childLedgerEntry.allocatedToChildren;

      if (usedQuota > 0) {
        throw new CustomError(
          400,
          `Không thể thu hồi vì đã có ${usedQuota} quota được sử dụng. ` +
            `(${childLedgerEntry.consumedByOwnInvites} cho lời mời, ` +
            `${childLedgerEntry.allocatedToChildren} phân bổ cho cấp dưới)`
        );
      }

      // 5. Kiểm tra status
      if (childLedgerEntry.status !== "active") {
        throw new CustomError(
          400,
          `Không thể thu hồi ledger entry ở trạng thái ${childLedgerEntry.status}`
        );
      }

      // 6. Cập nhật status của child ledger entry thành "paused" hoặc xóa
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
          "Lỗi khi cập nhật ledger entry của franchise con"
        );
      }

      // 7. Hoàn trả quota cho parent ledger entry
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
          // Rollback child update nếu không thể update parent
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
            "Lỗi khi hoàn trả quota cho franchise cha"
          );
        }
      }

      console.log(
        `[FranchiseService] Thu hồi quota thành công từ child ledger ${childLedgerEntryId}`
      );

      return {
        message: "Thu hồi quota thành công",
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
          `[FranchiseService] Lỗi CustomError khi thu hồi quota: ${error.message}`
        );
        throw error;
      }
      console.error(
        `[FranchiseService] Lỗi không xác định khi thu hồi quota: ${error}`
      );
      throw new CustomError(500, "Lỗi không xác định khi thu hồi quota");
    }
  }

  /**
   * Lấy lịch sử cấp phát quota cho một franchise con cụ thể
   * @param parentUserId - ID của franchise cha
   * @param childFranchiseUserId - ID của franchise con
   */
  async getChildAllocationHistory(
    parentUserId: string,
    childFranchiseUserId: string
  ) {
    try {
      console.log(
        `[FranchiseService] Lấy lịch sử cấp phát quota từ parent ${parentUserId} cho child ${childFranchiseUserId}`
      );

      // 1. Verify parent-child relationship
      const childFranchise = await FranchiseDetailsModel.findOne({
        userId: new Types.ObjectId(childFranchiseUserId),
      })
        .populate("userId", "username email franchiseName")
        .lean();

      if (!childFranchise) {
        throw new CustomError(404, "Không tìm thấy franchise con");
      }

      if (childFranchise.parentId?.toString() !== parentUserId) {
        throw new CustomError(
          403,
          "Franchise này không phải là con trực tiếp của bạn"
        );
      }

      // 2. Lọc các ledger entries được cấp bởi parent
      const allocationHistory =
        childFranchise.userTrialQuotaLedger?.filter(
          (entry: any) => entry.allocatedByUserId?.toString() === parentUserId
        ) || [];

      // 3. Enhance với thông tin campaign
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

      // 4. Sắp xếp theo thời gian tạo mới nhất
      enhancedHistory.sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );

      console.log(
        `[FranchiseService] Tìm thấy ${enhancedHistory.length} lần cấp phát quota`
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
          `[FranchiseService] Lỗi CustomError khi lấy lịch sử cấp phát: ${error.message}`
        );
        throw error;
      }
      console.error(
        `[FranchiseService] Lỗi không xác định khi lấy lịch sử cấp phát: ${error}`
      );
      throw new CustomError(
        500,
        "Lỗi không xác định khi lấy lịch sử cấp phát quota"
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
        `[FranchiseService] Lấy hiệu suất mời dùng thử cho franchise: ${userId}`
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
        throw new CustomError(404, "Không tìm thấy thông tin franchise");
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
        `[FranchiseService] Lấy hiệu suất thành công: ${totalInvites} lời mời, ${totalRenewals} gia hạn`
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
          `[FranchiseService] Lỗi CustomError khi lấy hiệu suất: ${error.message}`
        );
        throw error;
      }
      console.error(
        `[FranchiseService] Lỗi không xác định khi lấy hiệu suất: ${error}`
      );
      throw new CustomError(
        500,
        "Lỗi không xác định khi lấy hiệu suất mời dùng thử"
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
        `[FranchiseService] Lấy hiệu suất tổng hợp franchise con cho parent: ${parentUserId}`
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
        `[FranchiseService] Lấy hiệu suất ${directChildren.length} franchise con thành công`
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
          `[FranchiseService] Lỗi CustomError khi lấy hiệu suất franchise con: ${error.message}`
        );
        throw error;
      }
      console.error(
        `[FranchiseService] Lỗi không xác định khi lấy hiệu suất franchise con: ${error}`
      );
      throw new CustomError(
        500,
        "Lỗi không xác định khi lấy hiệu suất franchise con"
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
        `[FranchiseService] Lấy hiệu suất chi tiết franchise con: ${childFranchiseUserId}`
      );

      // Verify parent-child relationship
      const childFranchise = await FranchiseDetailsModel.findOne({
        userId: new Types.ObjectId(childFranchiseUserId),
      })
        .populate("userId", "username franchiseName email")
        .lean();

      if (!childFranchise) {
        throw new CustomError(404, "Không tìm thấy franchise con");
      }

      if (childFranchise.parentId?.toString() !== parentUserId) {
        throw new CustomError(
          403,
          "Franchise này không phải là con trực tiếp của bạn"
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
          `[FranchiseService] Lỗi CustomError khi lấy hiệu suất chi tiết franchise con: ${error.message}`
        );
        throw error;
      }
      console.error(
        `[FranchiseService] Lỗi không xác định khi lấy hiệu suất chi tiết franchise con: ${error}`
      );
      throw new CustomError(
        500,
        "Lỗi không xác định khi lấy hiệu suất chi tiết franchise con"
      );
    }
  }
}

export default new FranchiseService();
