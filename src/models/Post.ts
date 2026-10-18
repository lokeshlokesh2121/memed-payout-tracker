
import mongoose, { Document, Schema } from "mongoose";

export interface IPost extends Document {
  campaignId: mongoose.Types.ObjectId;
  creatorId: mongoose.Types.ObjectId;
  postUrl: string;
  views: number;
  payoutReserved: boolean;
reservedPayout: number;
  status: "pending" | "approved" | "rejected";
  payoutStatus: "unreserved" | "reserved" | "paid" | "released";
  createdAt: Date;
  updatedAt: Date;
}

const postSchema = new Schema<IPost>(
  {
    campaignId: {
      type: Schema.Types.ObjectId,
      ref: "Campaign",
      required: true
    },
    creatorId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true
    },
    postUrl: {
      type: String,
      required: true,
      trim: true
    },
    views: {
      type: Number,
      default: 0,
      min: 0
    },
    status: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending"
    },
    payoutReserved: {
  type: Boolean,
  default: false
},
reservedPayout: {
  type: Number,
  default: 0,
  min: 0
},
payoutStatus: {
  type: String,
  enum: ["unreserved", "reserved", "paid", "released"],
  default: "unreserved"
},
  },
  { timestamps: true }
);


postSchema.index({ creatorId: 1, createdAt: -1 });

postSchema.index({ campaignId: 1, createdAt: -1 });

postSchema.index({
  campaignId: 1,
  status: 1,
  createdAt: -1
});

postSchema.index({
  creatorId: 1,
  status: 1,
  createdAt: -1
});


const Post = mongoose.model<IPost>("Post", postSchema);

export default Post;
