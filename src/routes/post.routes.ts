
import { Router, Response } from "express";
import mongoose from "mongoose";
import Post from "../models/Post.js";
import Campaign from "../models/Campaign.js";
import {
  authenticateToken,
  AuthRequest
} from "../middleware/auth.middleware.js";
import { allowRoles } from "../middleware/role.middleware.js";

const router = Router();

router.post(
  "/:campaignId/submit",
  authenticateToken,
  allowRoles("creator"),
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const { campaignId } = req.params;
      const { postUrl } = req.body;

      if (!mongoose.isValidObjectId(campaignId)) {
        res.status(400).json({
          success: false,
          message: "Invalid campaign ID"
        });
        return;
      }

      if (typeof postUrl !== "string") {
        res.status(400).json({
          success: false,
          message: "Post URL is required"
        });
        return;
      }

      let parsedUrl: URL;

      try {
        parsedUrl = new URL(postUrl);
      } catch {
        res.status(400).json({
          success: false,
          message: "Please provide a valid post URL"
        });
        return;
      }

      if (
        parsedUrl.protocol !== "https:" &&
        parsedUrl.protocol !== "http:"
      ) {
        res.status(400).json({
          success: false,
          message: "Post URL must use HTTP or HTTPS"
        });
        return;
      }

      const campaign = await Campaign.findById(campaignId);

      if (!campaign) {
        res.status(404).json({
          success: false,
          message: "Campaign not found"
        });
        return;
      }

      const creatorId = new mongoose.Types.ObjectId(
        req.user!.userId
      );

      const hasJoined = campaign.creators.some(
        (id) => id.equals(creatorId)
      );

      if (!hasJoined) {
        res.status(403).json({
          success: false,
          message: "Join this campaign before submitting a post"
        });
        return;
      }

      const post = await Post.create({
        campaignId: campaign._id,
        creatorId,
        postUrl: parsedUrl.toString(),
        views: 0,
        status: "pending"
      });

      res.status(201).json({
        success: true,
        message: "Post submitted successfully",
        post
      });
    } catch (error) {
      console.error("Submit post error:", error);

      res.status(500).json({
        success: false,
        message: "Failed to submit post"
      });
    }
  }
);


router.patch(
  "/:postId/status",
  authenticateToken,
  allowRoles("brand"),
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const { postId } = req.params;
      const { status } = req.body;

      // 1. Validate the post ID
      if (!mongoose.isValidObjectId(postId)) {
        res.status(400).json({
          success: false,
          message: "Invalid post ID"
        });
        return;
      }

      // 2. Validate the requested status
      if (!["approved", "rejected"].includes(status)) {
        res.status(400).json({
          success: false,
          message: "Status must be approved or rejected"
        });
        return;
      }

      // 3. Find the submitted post
      const post = await Post.findById(postId);

      if (!post) {
        res.status(404).json({
          success: false,
          message: "Post not found"
        });
        return;
      }

      // 4. Find the campaign associated with this post
      const campaign = await Campaign.findById(post.campaignId);

      if (!campaign) {
        res.status(404).json({
          success: false,
          message: "Associated campaign not found"
        });
        return;
      }

      // 5. Only the campaign's owning brand can review the post
      if (campaign.brandId.toString() !== req.user!.userId) {
        res.status(403).json({
          success: false,
          message: "You can only review posts for your own campaigns"
        });
        return;
      }

      // 6. Only pending posts can be reviewed
      if (post.status !== "pending") {
        res.status(409).json({
          success: false,
          message: "This post has already been reviewed"
        });
        return;
      }

      // 7. Update and save the post status
      post.status = status;
      await post.save();

      res.status(200).json({
        success: true,
        message: `Post ${status} successfully`,
        post
      });
    } catch (error) {
      console.error("Error reviewing post:", error);

      res.status(500).json({
        success: false,
        message: "Failed to review post"
      });
    }
  }
);


router.patch(
  "/:postId/views",
  authenticateToken,
  allowRoles("brand"),
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const { postId } = req.params;
      const { views } = req.body;

      // 1. Validate the post ID
      if (!mongoose.isValidObjectId(postId)) {
        res.status(400).json({
          success: false,
          message: "Invalid post ID"
        });
        return;
      }

      // 2. Validate the view count
      if (
        typeof views !== "number" ||
        !Number.isSafeInteger(views) ||
        views < 0
      ) {
        res.status(400).json({
          success: false,
          message: "Views must be a non-negative integer"
        });
        return;
      }

      // 3. Find the post
      const post = await Post.findById(postId);

      if (!post) {
        res.status(404).json({
          success: false,
          message: "Post not found"
        });
        return;
      }

      // 4. Views can be updated only for approved posts
      if (post.status !== "approved") {
        res.status(400).json({
          success: false,
          message: "Only approved posts can have their views updated"
        });
        return;
      }

      // 5. Find the campaign
      const campaign = await Campaign.findById(post.campaignId);

      if (!campaign) {
        res.status(404).json({
          success: false,
          message: "Associated campaign not found"
        });
        return;
      }

      // 6. Verify campaign ownership
      if (campaign.brandId.toString() !== req.user!.userId) {
        res.status(403).json({
          success: false,
          message: "You can only update views for your own campaigns"
        });
        return;
      }

      // 7. Prevent views from decreasing
      if (views < post.views) {
        res.status(400).json({
          success: false,
          message: "New views cannot be less than the current views"
        });
        return;
      }

      if (post.payoutReserved) {
  res.status(409).json({
    success: false,
    message: "Views cannot be changed after payout reservation"
  });
  return;
}

      // 8. Update the view count
      post.views = views;
      await post.save();

      res.status(200).json({
        success: true,
        message: "Post views updated successfully",
        post: {
          id: post._id,
          campaignId: post.campaignId,
          views: post.views,
          status: post.status
        }
      });
    } catch (error) {
      console.error("Update post views error:", error);

      res.status(500).json({
        success: false,
        message: "Failed to update post views"
      });
    }
  }
);


router.get(
  "/:postId/payout",
  authenticateToken,
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const { postId } = req.params;

      // 1. Validate the post ID
      if (!mongoose.isValidObjectId(postId)) {
        res.status(400).json({
          success: false,
          message: "Invalid post ID"
        });
        return;
      }

      // 2. Find the post
      const post = await Post.findById(postId);

      if (!post) {
        res.status(404).json({
          success: false,
          message: "Post not found"
        });
        return;
      }

      // 3. Find the associated campaign
      const campaign = await Campaign.findById(post.campaignId);

      if (!campaign) {
        res.status(404).json({
          success: false,
          message: "Associated campaign not found"
        });
        return;
      }

      // 4. Allow only the post's creator or campaign's brand
      const userId = req.user!.userId;
      const isCreator = post.creatorId.toString() === userId;
      const isBrand = campaign.brandId.toString() === userId;

      if (!isCreator && !isBrand) {
        res.status(403).json({
          success: false,
          message: "You cannot view this payout"
        });
        return;
      }

      // 5. Only approved posts qualify
      if (post.status !== "approved") {
        res.status(400).json({
          success: false,
          message: "Payout is available only for approved posts"
        });
        return;
      }

      // 6. Calculate the estimated payout
      const rate = campaign.payoutPerThousandViews;
      const estimatedPayout =
        Math.round((post.views / 1000) * rate * 100) / 100;

      // 7. Return the estimate
      res.status(200).json({
        success: true,
        payout: {
          postId: post._id,
          campaignId: campaign._id,
          views: post.views,
          ratePerThousandViews: rate,
          estimatedPayout
        }
      });
    } catch (error) {
      console.error("Calculate payout error:", error);

      res.status(500).json({
        success: false,
        message: "Failed to calculate payout"
      });
    }
  }
);


router.get(
  "/creator/earnings",
  authenticateToken,
  allowRoles("creator"),
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      // 1. Get posts belonging to the logged-in creator
      const posts = await Post.find({
        creatorId: req.user!.userId
      }).sort({ createdAt: -1 });

      let totalViews = 0;
      let approvedPosts = 0;
      let estimatedEarnings = 0;

      // 2. Calculate earnings for approved posts
      const earnings = await Promise.all(
        posts.map(async (post) => {
          const campaign = await Campaign.findById(
            post.campaignId
          );

          const rate = campaign
            ? campaign.payoutPerThousandViews
            : 0;

          const eligible = post.status === "approved";

          const payout = eligible
            ? Math.round((post.views / 1000) * rate * 100) / 100
            : 0;

          totalViews += post.views;

          if (eligible) {
            approvedPosts += 1;
            estimatedEarnings += payout;
          }

          return {
            postId: post._id,
            campaignId: post.campaignId,
            campaignTitle: campaign?.title ?? "Campaign unavailable",
            postUrl: post.postUrl,
            views: post.views,
            status: post.status,
            ratePerThousandViews: rate,
            estimatedPayout: payout,
            submittedAt: post.createdAt
          };
        })
      );

      // 3. Return dashboard summary and post details
      res.status(200).json({
        success: true,
        summary: {
          totalPosts: posts.length,
          approvedPosts,
          pendingPosts: posts.filter(
            (post) => post.status === "pending"
          ).length,
          rejectedPosts: posts.filter(
            (post) => post.status === "rejected"
          ).length,
          totalViews,
          estimatedEarnings:
            Math.round(estimatedEarnings * 100) / 100
        },
        earnings
      });
    } catch (error) {
      console.error("Creator earnings error:", error);

      res.status(500).json({
        success: false,
        message: "Failed to fetch creator earnings"
      });
    }
  }
);


router.post(
  "/:postId/reserve-payout",
  authenticateToken,
  allowRoles("brand"),
  async (req: AuthRequest, res: Response): Promise<void> => {
    let claimedPostId: string | null = null;
    let reservedAmount = 0;

    try {
      const { postId } = req.params;

      // 1. Validate post ID
      if (!mongoose.isValidObjectId(postId)) {
        res.status(400).json({
          success: false,
          message: "Invalid post ID"
        });
        return;
      }

      // 2. Find post
      const post = await Post.findById(postId);

      if (!post) {
        res.status(404).json({
          success: false,
          message: "Post not found"
        });
        return;
      }

      // 3. Only approved posts can reserve payouts
      if (post.status !== "approved") {
        res.status(400).json({
          success: false,
          message: "Only approved posts can reserve payouts"
        });
        return;
      }

      // 4. Prevent duplicate reservations
      if (post.payoutReserved) {
        res.status(409).json({
          success: false,
          message: "Payout already reserved for this post"
        });
        return;
      }

      // 5. Find campaign
      const campaign = await Campaign.findById(post.campaignId);

      if (!campaign) {
        res.status(404).json({
          success: false,
          message: "Campaign not found"
        });
        return;
      }

      // 6. Verify campaign ownership
      if (campaign.brandId.toString() !== req.user!.userId) {
        res.status(403).json({
          success: false,
          message: "You do not own this campaign"
        });
        return;
      }

      // 7. Calculate payout
      reservedAmount =
        Math.round(
          (post.views / 1000) *
          campaign.payoutPerThousandViews *
          100
        ) / 100;

      if (reservedAmount <= 0) {
        res.status(400).json({
          success: false,
          message: "There is no payout amount to reserve"
        });
        return;
      }

      // 8. Atomically claim the post
      const claimedPost = await Post.findOneAndUpdate(
        {
          _id: post._id,
          status: "approved",
          payoutReserved: { $ne: true }
        },
        {
          $set: {
            payoutReserved: true,
            reservedPayout: reservedAmount,
            payoutStatus: "reserved"
          }
        },
        { new: true }
      );

      if (!claimedPost) {
        res.status(409).json({
          success: false,
          message: "This post has already been reserved"
        });
        return;
      }

      claimedPostId = claimedPost._id.toString();

      // 9. Atomically reserve campaign budget
      const updatedCampaign = await Campaign.findOneAndUpdate(
        {
          _id: campaign._id,
          brandId: req.user!.userId,
          $expr: {
            $lte: [
              {
                $add: [
                  { $ifNull: ["$reservedBudget", 0] },
                  reservedAmount
                ]
              },
              "$budget"
            ]
          }
        },
        {
          $inc: {
            reservedBudget: reservedAmount
          }
        },
        { new: true }
      );

      // 10. If budget is insufficient, release the claim
      if (!updatedCampaign) {
        await Post.updateOne(
          {
            _id: claimedPost._id,
            payoutReserved: true,
            payoutStatus: "reserved"
          },
          {
            $set: {
              payoutReserved: false,
              reservedPayout: 0,
              payoutStatus: "unreserved"
            }
          }
        );

        claimedPostId = null;

        res.status(409).json({
          success: false,
          message: "Insufficient campaign budget",
          requestedAmount: reservedAmount
        });
        return;
      }

      // 11. Reservation successful
      claimedPostId = null;

      res.status(200).json({
        success: true,
        message: "Payout reserved successfully",
        reservation: {
          postId: claimedPost._id,
          reservedAmount,
          payoutStatus: "reserved",
          totalBudget: updatedCampaign.budget,
          reservedBudget: updatedCampaign.reservedBudget,
          remainingBudget:
            Math.round(
              (
                updatedCampaign.budget -
                updatedCampaign.reservedBudget
              ) * 100
            ) / 100
        }
      });
    } catch (error) {
      // 12. Best-effort cleanup if an error occurs after claiming
      if (claimedPostId) {
        await Post.updateOne(
          {
            _id: claimedPostId,
            payoutReserved: true,
            payoutStatus: "reserved"
          },
          {
            $set: {
              payoutReserved: false,
              reservedPayout: 0,
              payoutStatus: "unreserved"
            }
          }
        ).catch((cleanupError) => {
          console.error(
            "Failed to clean up payout reservation:",
            cleanupError
          );
        });
      }

      console.error("Payout reservation error:", error);

      res.status(500).json({
        success: false,
        message: "Failed to reserve payout"
      });
    }
  }
);


router.post(
  "/:postId/release-payout",
  authenticateToken,
  allowRoles("brand"),
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const { postId } = req.params;

      // 1. Validate post ID
      if (!mongoose.isValidObjectId(postId)) {
        res.status(400).json({
          success: false,
          message: "Invalid post ID"
        });
        return;
      }

      // 2. Find the post
      const post = await Post.findById(postId);

      if (!post) {
        res.status(404).json({
          success: false,
          message: "Post not found"
        });
        return;
      }

      // 3. Find its campaign
      const campaign = await Campaign.findById(post.campaignId);

      if (!campaign) {
        res.status(404).json({
          success: false,
          message: "Campaign not found"
        });
        return;
      }

      // 4. Verify campaign ownership
      if (campaign.brandId.toString() !== req.user!.userId) {
        res.status(403).json({
          success: false,
          message: "You do not own this campaign"
        });
        return;
      }

      // 5. Ensure payout is currently reserved
      if (
        !post.payoutReserved ||
        post.payoutStatus !== "reserved"
      ) {
        res.status(409).json({
          success: false,
          message: "No active payout reservation to release"
        });
        return;
      }

      const amountToRelease = post.reservedPayout;

      if (
        !Number.isFinite(amountToRelease) ||
        amountToRelease <= 0
      ) {
        res.status(409).json({
          success: false,
          message: "Invalid reserved payout amount"
        });
        return;
      }

      // 6. Claim the release operation.
      // This prevents two requests from releasing the same post.
      const releasedPost = await Post.findOneAndUpdate(
        {
          _id: post._id,
          payoutReserved: true,
          payoutStatus: "reserved",
          reservedPayout: amountToRelease
        },
        {
          $set: {
            payoutReserved: false,
            payoutStatus: "released"
          }
        },
        { new: true }
      );

      if (!releasedPost) {
        res.status(409).json({
          success: false,
          message: "Reservation was already released or changed"
        });
        return;
      }

      // 7. Return the amount to the campaign budget.
      // Never allow reservedBudget to become negative.
      const updatedCampaign = await Campaign.findOneAndUpdate(
        {
          _id: campaign._id,
          brandId: req.user!.userId,
          reservedBudget: {
            $gte: amountToRelease
          }
        },
        {
          $inc: {
            reservedBudget: -amountToRelease
          }
        },
        { new: true }
      );

      // 8. If campaign update fails, restore the reservation.
      if (!updatedCampaign) {
        await Post.updateOne(
          {
            _id: releasedPost._id,
            payoutReserved: false,
            payoutStatus: "released"
          },
          {
            $set: {
              payoutReserved: true,
              payoutStatus: "reserved"
            }
          }
        );

        res.status(409).json({
          success: false,
          message:
            "Could not release budget. Reservation has been restored."
        });
        return;
      }

      // 9. Return updated budget details
      res.status(200).json({
        success: true,
        message: "Payout reservation released successfully",
        release: {
          postId: releasedPost._id,
          releasedAmount: amountToRelease,
          payoutStatus: "released",
          totalBudget: updatedCampaign.budget,
          reservedBudget: updatedCampaign.reservedBudget,
          remainingBudget:
            Math.round(
              (
                updatedCampaign.budget -
                updatedCampaign.reservedBudget
              ) * 100
            ) / 100
        }
      });
    } catch (error) {
      console.error("Payout release error:", error);

      res.status(500).json({
        success: false,
        message: "Failed to release payout"
      });
    }
  }
);



router.get(
  "/payout-history",
  authenticateToken,
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const userId = req.user!.userId;
      const role = req.user!.role;

      // 1. Read and validate pagination parameters
      const page = Number(req.query.page ?? 1);
      const limit = Number(req.query.limit ?? 10);

      if (
        !Number.isSafeInteger(page) ||
        page < 1 ||
        !Number.isSafeInteger(limit) ||
        limit < 1 ||
        limit > 100
      ) {
        res.status(400).json({
          success: false,
          message: "page must be >= 1 and limit must be between 1 and 100"
        });
        return;
      }

      // 2. Validate post status filter
      const status = req.query.status?.toString();
      const validStatuses = ["pending", "approved", "rejected"];

      if (status && !validStatuses.includes(status)) {
        res.status(400).json({
          success: false,
          message: "Invalid post status"
        });
        return;
      }

      // 3. Validate payout status filter
      const payoutStatus = req.query.payoutStatus?.toString();
      const validPayoutStatuses = [
        "unreserved",
        "reserved",
        "paid",
        "released"
      ];

      if (
        payoutStatus &&
        !validPayoutStatuses.includes(payoutStatus)
      ) {
        res.status(400).json({
          success: false,
          message: "Invalid payout status"
        });
        return;
      }

      // 4. Build the user's permitted campaign scope
      let allowedCampaignIds;

      if (role === "brand") {
        const campaigns = await Campaign.find({
          brandId: userId
        }).select("_id title");

        allowedCampaignIds = campaigns.map(
          (campaign) => campaign._id
        );

        if (allowedCampaignIds.length === 0) {
          res.status(200).json({
            success: true,
            pagination: {
              page,
              limit,
              totalRecords: 0,
              totalPages: 0
            },
            filters: {
              status: status ?? null,
              payoutStatus: payoutStatus ?? null,
              search: req.query.search?.toString() ?? ""
            },
            history: []
          });
          return;
        }
      } else if (role !== "creator") {
        res.status(403).json({
          success: false,
          message: "Access denied"
        });
        return;
      }

      // 5. Create the base query based on the logged-in role
      const filter: Record<string, any> =
        role === "creator"
          ? { creatorId: userId }
          : { campaignId: { $in: allowedCampaignIds } };

      if (status) {
        filter.status = status;
      }

      // Legacy documents may not have payoutStatus.
      if (payoutStatus) {
        if (payoutStatus === "unreserved") {
          filter.$or = [
            { payoutStatus: "unreserved" },
            { payoutStatus: { $exists: false }, payoutReserved: { $ne: true } }
          ];
        } else if (payoutStatus === "reserved") {
          filter.$or = [
            { payoutStatus: "reserved" },
            {
              payoutStatus: { $exists: false },
              payoutReserved: true
            }
          ];
        } else {
          filter.payoutStatus = payoutStatus;
        }
      }

      // 6. Search by post URL or campaign title
      const search = req.query.search?.toString().trim();

      if (search) {
        // Escape special regex characters supplied by the user.
        const escapedSearch = search.replace(
          /[.*+?^${}()|[\]\\]/g,
          "\\$&"
        );

        const matchingCampaigns = await Campaign.find({
          ...(role === "brand" ? { brandId: userId } : {}),
          title: { $regex: escapedSearch, $options: "i" }
        }).select("_id");

        const matchingCampaignIds = matchingCampaigns.map(
          (campaign) => campaign._id
        );

        const searchConditions = [
          { postUrl: { $regex: escapedSearch, $options: "i" } },
          { campaignId: { $in: matchingCampaignIds } }
        ];

        // Combine search with existing filters without overwriting them.
        filter.$and = [
          ...(filter.$and ?? []),
          { $or: searchConditions }
        ];
      }

      // 7. Count records before pagination
      const totalRecords = await Post.countDocuments(filter);
      const totalPages = Math.ceil(totalRecords / limit);
      const skip = (page - 1) * limit;

      // 8. Fetch only the requested page
      const posts = await Post.find(filter)
        .sort({ createdAt: -1, _id: -1 })
        .skip(skip)
        .limit(limit)
        .lean();

      // 9. Add campaign and payout details
      const history = await Promise.all(
        posts.map(async (post) => {
          const campaign = await Campaign.findById(
            post.campaignId
          ).select("title payoutPerThousandViews");

          const reserved = post.payoutReserved === true;

          const effectivePayoutStatus =
            post.payoutStatus ??
            (reserved ? "reserved" : "unreserved");

          const estimatedPayout =
            post.status === "approved"
              ? Math.round(
                  (
                    (post.views / 1000) *
                    (campaign?.payoutPerThousandViews ?? 0)
                  ) * 100
                ) / 100
              : 0;

          return {
            postId: post._id,
            campaignId: post.campaignId,
            campaignTitle:
              campaign?.title ?? "Campaign unavailable",
            creatorId: post.creatorId,
            postUrl: post.postUrl,
            views: post.views,
            postStatus: post.status,
            estimatedPayout,
            reservedPayout: post.reservedPayout ?? 0,
            payoutStatus: effectivePayoutStatus,
            submittedAt: post.createdAt,
            updatedAt: post.updatedAt
          };
        })
      );

      // 10. Return paginated results
      res.status(200).json({
        success: true,
        pagination: {
          page,
          limit,
          totalRecords,
          totalPages,
          hasNextPage: page < totalPages,
          hasPreviousPage: page > 1
        },
        filters: {
          status: status ?? null,
          payoutStatus: payoutStatus ?? null,
          search: search ?? ""
        },
        history
      });
    } catch (error) {
      console.error("Payout history error:", error);

      res.status(500).json({
        success: false,
        message: "Failed to fetch payout history"
      });
    }
  }
);




export default router;
