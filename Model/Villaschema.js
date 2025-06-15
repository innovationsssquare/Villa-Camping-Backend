const mongoose = require("mongoose");

const VillaSchema = new mongoose.Schema(
  {
    property: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Property",
      required: true,
    },
    bhkType: {
      type: String,
      enum: ["2BHK", "3BHK", "4BHK"],
      required: true,
    },
    maxCapacity: {
      type: Number,
      required: true,
    },
    pricePerNight: {
      type: Number,
      required: true,
    },
    seasonalPricing: [
      {
        season: { type: String },
        price: { type: Number },
      },
    ],
    bookedDates: [
      {
        checkIn: Date,
        checkOut: Date,
      },
    ],
    status: {
      type: String,
      enum: ["available", "booked"],
      default: "available",
    },
    amenities: [String],
    images: [String],
    houseRules: [String],
    checkInTime: {
      type: String,
      default: "1 PM",
    },
    checkOutTime: {
      type: String,
      default: "11 AM",
    },
    securityDeposit: {
      type: Number,
      default: 3000,
    },
    lateCheckoutCharge: {
      type: Number,
      default: 1000,
    },
    cancellationPolicy: {
      type: String,
      default: "No refund on cancellations.",
    },
    deletedAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Villa", VillaSchema);
