const mongoose = require("mongoose");

const WishlistSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    propertyId: {
      type: mongoose.Schema.Types.ObjectId,
      refPath: "propertyType",
      required: true,
    },

    propertyType: {
      type: String,
      enum: ["Villa", "hotel", "cottage", "camping"],
      required: true,
    },

    deletedAt: {
      type: Date,
      default: null,
      index: true,
    },
  },
  { timestamps: true }
);

// prevent duplicate ACTIVE wishlist only
WishlistSchema.index(
  { userId: 1, propertyId: 1, propertyType: 1 },
  {
    unique: true,
    partialFilterExpression: { deletedAt: null },
  }
);

module.exports = mongoose.model("Wishlist", WishlistSchema);
