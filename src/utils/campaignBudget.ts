
import Campaign from "../models/Campaign.js";
import Post from "../models/Post.js";

export async function refreshCampaignBudgetStatus(
  campaignId: string
) {
  const campaign = await Campaign.findById(campaignId);

  if (!campaign) {
    return null;
  }

  const approvedPosts = await Post.find({
    campaignId: campaign._id,
    status: "approved",
  });

  const totalEstimatedPayout =
    Math.round(
      approvedPosts.reduce((total, post) => {
        return (
          total +
          (post.views / 1000) *
            campaign.payoutPerThousandViews
        );
      }, 0) * 100
    ) / 100;

  // Close when estimates reach or exceed the campaign budget.
  const shouldClose =
    totalEstimatedPayout >= campaign.budget;

  // Also close if no budget remains unreserved.
  const noAvailableBudget =
    campaign.budget - campaign.reservedBudget <= 0;

  if (
    (shouldClose || noAvailableBudget) &&
    campaign.status !== "closed"
  ) {
    campaign.status = "closed";
    await campaign.save();
  }

  return {
    campaign,
    totalEstimatedPayout,
    availableBudget: Math.max(
      0,
      Math.round(
        (campaign.budget - campaign.reservedBudget) * 100
      ) / 100
    ),
    overBudget:
      totalEstimatedPayout >
      campaign.budget - campaign.reservedBudget,
  };
}
