const mongoose = require("mongoose");

const LocationSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true,
    },
    type: {
      type: String,
      enum: ["city", "area", "landmark"],
      required: true,
    },
    coordinates: {
      type: [Number],
      required: true,
    },
    description: {
      type: String,
    },
    features: [String],
    isPopular: {
      type: Boolean,
      default: false,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
    updatedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Location", LocationSchema);
