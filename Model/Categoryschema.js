const mongoose = require("mongoose");

const CategorySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    description: String,
    features: [String],
    seasonalTrends: [{ season: String, demand: String }],
    popularityScore: { type: Number, default: 0 },
    icon: String, // optional
    isActive: { type: Boolean, default: true },
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Category", CategorySchema);
