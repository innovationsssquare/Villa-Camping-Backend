const mongoose = require("mongoose");

const PropertySchema = new mongoose.Schema(
  {
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Owner",
      required: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    location: {
      type: String,
      required: true,
    },
    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
      required: true,
    },
    basePricePerNight: {
      type: Number,
      required: true,
    },
    minBookingAmount: {
      type: Number,
      required: true,
    },
    available: {
      type: Boolean,
      default: true,
    },
    specialOffers: [
      {
        description: String,
        discountPercentage: Number,
        validTill: Date,
      },
    ],
    villaDetails: { type: mongoose.Schema.Types.ObjectId, ref: "Villa" },
    cottageDetails: { type: mongoose.Schema.Types.ObjectId, ref: "Cottages" },
    campingDetails: { type: mongoose.Schema.Types.ObjectId, ref: "Camping" },
    hotelDetails: { type: mongoose.Schema.Types.ObjectId, ref: "Hotels" },

    deletedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Property", PropertySchema);
