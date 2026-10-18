
import { Router, Response } from "express";
import Campaign from "../models/Campaign.js";
import {
  authenticateToken,
  AuthRequest
} from "../middleware/auth.middleware.js";
import { allowRoles } from "../middleware/role.middleware.js";
import mongoose from "mongoose";
import Post from "../models/Post.js";
import { refreshCampaignBudgetStatus } from "../utils/campaignBudget.js";

const router = Router();

router.post(
  "/",
  authenticateToken,
  allowRoles("brand"),
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const {
        title,
        description,
        budget,
        payoutPerThousandViews
      } = req.body;

      if (
        typeof title !== "string" ||
        !title.trim() ||
        typeof description !== "string" ||
        !description.trim() ||
        typeof budget !== "number" ||
        !Number.isFinite(budget) ||
        budget <= 0 ||
        typeof payoutPerThousandViews !== "number" ||
        !Number.isFinite(payoutPerThousandViews) ||
        payoutPerThousandViews < 0
      ) {
        res.status(400).json({
          success: false,
          message: "Please provide valid campaign details"
        });
        return;
      }

      const campaign = await Campaign.create({
        title: title.trim(),
        description: description.trim(),
        budget,
        payoutPerThousandViews,
        brandId: req.user!.userId
      });

      res.status(201).json({
        success: true,
        message: "Campaign created successfully",
        campaign
      });
    } catch (error) {
      console.error("Create campaign error:", error);

      res.status(500).json({
        success: false,
        message: "Failed to create campaign"

      });
    }
  }
);



router.get(
  "/",
  authenticateToken,
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      let campaigns;

      if (req.user!.role === "brand") {
        // Brand ki tana campaigns maatrame chupinchali
        campaigns = await Campaign.find({
          brandId: req.user!.userId
        }).sort({ createdAt: -1 });
      } else {
        // Creator ki available campaigns anni chupinchali
        campaigns = await Campaign.find().sort({
          createdAt: -1
        });
      }

      res.status(200).json({
        success: true,
        count: campaigns.length,
        campaigns
      });
    } catch (error) {
      console.error("Get campaigns error:", error);

      res.status(500).json({
        success: false,
        message: "Failed to fetch campaigns"
      });
    }
  }
);



router.post(
  "/:campaignId/join",
  authenticateToken,
  allowRoles("creator"),
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const { campaignId } = req.params;

      if (!mongoose.isValidObjectId(campaignId)) {
        res.status(400).json({
          success: false,
          message: "Invalid campaign ID",
        });
        return;
      }

      const campaign = await Campaign.findById(campaignId);

      if (!campaign) {
        res.status(404).json({
          success: false,
          message: "Campaign not found",
        });
        return;
      }

      if (campaign.status === "closed") {
        res.status(400).json({
          success: false,
          message: "This campaign is closed and no longer accepts creators.",
        });
        return;
      }

      const creatorId = new mongoose.Types.ObjectId(
        req.user!.userId
      );

      const alreadyJoined = campaign.creators.some((id) =>
        id.equals(creatorId)
      );

      if (alreadyJoined) {
        res.status(409).json({
          success: false,
          message: "You have already joined this campaign",
        });
        return;
      }

      campaign.creators.push(creatorId);
      await campaign.save();

      res.status(200).json({
        success: true,
        message: "Campaign joined successfully",
        campaignId: campaign._id,
        creatorId,
      });
    } catch (error) {
      console.error("Join campaign error:", error);

      res.status(500).json({
        success: false,
        message: "Failed to join campaign",
      });
    }
  }
);




router.get(
  "/:campaignId/posts",
  authenticateToken,
  allowRoles("brand"),
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const { campaignId } = req.params;

      // 1. Validate campaign ID
      if (!mongoose.isValidObjectId(campaignId)) {
        res.status(400).json({
          success: false,
          message: "Invalid campaign ID",
        });
        return;
      }

      // 2. Find campaign
      const campaign = await Campaign.findById(campaignId);

      if (!campaign) {
        res.status(404).json({
          success: false,
          message: "Campaign not found",
        });
        return;
      }

      // 3. Verify campaign ownership
      if (campaign.brandId.toString() !== req.user!.userId) {
        res.status(403).json({
          success: false,
          message: "You can only view posts for your own campaigns",
        });
        return;
      }

      // 4. Fetch posts for this campaign
      const posts = await Post.find({
        campaignId: campaign._id,
      }).sort({ createdAt: -1 });

      // 5. Calculate total estimated payout for approved posts
      const approvedPosts = posts.filter(
        (post) => post.status === "approved"
      );

      const totalEstimatedPayout = approvedPosts.reduce(
        (total, post) => {
          const payout =
            (Number(post.views || 0) / 1000) *
            Number(campaign.payoutPerThousandViews);

          return total + payout;
        },
        0
      );

      // 6. Close campaign when estimated payout reaches or exceeds budget
      if (
        campaign.status !== "closed" &&
        totalEstimatedPayout >= Number(campaign.budget)
      ) {
        campaign.status = "closed";
        await campaign.save();
      }

      // 7. Return campaign status and posts
      res.status(200).json({
        success: true,
        count: posts.length,
        campaignStatus: campaign.status,
        budget: Number(campaign.budget),
        totalEstimatedPayout: Math.round(totalEstimatedPayout * 100) / 100,
        posts,
      });
    } catch (error) {
      console.error("Error fetching campaign posts:", error);

      res.status(500).json({
        success: false,
        message: "Failed to fetch campaign posts",
      });
    }
  }
);



router.get(
  "/:campaignId/budget",
  authenticateToken,
  allowRoles("brand"),
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const { campaignId } = req.params;

      // 1. Validate campaign ID
      if (!mongoose.isValidObjectId(campaignId)) {
        res.status(400).json({
          success: false,
          message: "Invalid campaign ID"
        });
        return;
      }

      // 2. Find campaign
      const campaign = await Campaign.findById(campaignId);

      if (!campaign) {
        res.status(404).json({
          success: false,
          message: "Campaign not found"
        });
        return;
      }

      // 3. Only the owning brand can view the budget
      if (campaign.brandId.toString() !== req.user!.userId) {
        res.status(403).json({
          success: false,
          message: "You can only view your own campaign budget"
        });
        return;
      }

      // 4. Find approved posts for this campaign
      const approvedPosts = await Post.find({
        campaignId: campaign._id,
        status: "approved"
      });

      // 5. Calculate estimated payouts
      const rate = campaign.payoutPerThousandViews;

      const totalEstimatedPayout = approvedPosts.reduce(
        (total, post) => total + (post.views / 1000) * rate,
        0
      );

      const roundedPayout =
        Math.round(totalEstimatedPayout * 100) / 100;

      // 6. Calculate remaining budget
      const remainingBudget = Math.max(
        0,
        Math.round((campaign.budget - roundedPayout) * 100) / 100
      );

      const overBudget = roundedPayout > campaign.budget;

      // 7. Return budget summary
      res.status(200).json({
        success: true,
        budget: {
          campaignId: campaign._id,
          campaignTitle: campaign.title,
          totalBudget: campaign.budget,
          approvedPosts: approvedPosts.length,
          totalEstimatedPayout: roundedPayout,
          remainingBudget,
          overBudget
        }
      });
    } catch (error) {
      console.error("Campaign budget error:", error);

      res.status(500).json({
        success: false,
        message: "Failed to calculate campaign budget"
      });
    }
  }
);







export default router;
