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
      required: true,
    },

    propertyType: {
      type: String,
      enum: ["villa", "hotel", "cottage", "camping"],
      required: true,
    },
  },
  { timestamps: true }
);

// Prevent duplicates
WishlistSchema.index(
  { userId: 1, propertyId: 1, propertyType: 1 },
  { unique: true }
);

module.exports = mongoose.model("Wishlist", WishlistSchema);
