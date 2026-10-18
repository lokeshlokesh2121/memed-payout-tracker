
import mongoose, { Document, Schema } from "mongoose";

export type CampaignStatus = "active" | "closed";

export interface ICampaign extends Document {
  title: string;
  description: string;
  budget: number;
  payoutPerThousandViews: number;
  brandId: mongoose.Types.ObjectId;
  reservedBudget: number;
  status: CampaignStatus;
  creators: mongoose.Types.ObjectId[];
  createdAt: Date;
  updatedAt: Date;
}

const campaignSchema = new Schema<ICampaign>(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      required: true,
      trim: true,
    },
    budget: {
      type: Number,
      required: true,
      min: 1,
    },
    reservedBudget: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
    },
    payoutPerThousandViews: {
      type: Number,
      required: true,
      min: 0,
    },
    brandId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    status: {
      type: String,
      enum: ["active", "closed"],
      default: "active",
      required: true,
    },
    creators: [
      {
        type: Schema.Types.ObjectId,
        ref: "User",
      },
    ],
  },
  { timestamps: true }
);

const Campaign = mongoose.model<ICampaign>(
  "Campaign",
  campaignSchema
);

export default Campaign;
