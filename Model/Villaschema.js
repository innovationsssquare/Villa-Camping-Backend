const mongoose = require("mongoose");

const VillaSchema = new mongoose.Schema(
  {
    property: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Property",
      required: true,
    },
    name: {
      type: String,
    },
    location: {
      addressLine: { type: String },
      city: { type: String },
      area: { type: String },
    },
    bhkType: {
      type: String,
      enum: ["1BHK", "2BHK", "3BHK", "4BHK"],
      default: "2BHK",
    },
    maxCapacity: {
      type: Number,
      default: 10,
    },
    basePricePerNight: {
      type: Number,
      default: 0,
    },
    seasonalPricing: [
      {
        season: { type: String },
        price: { type: Number },
      },
    ],
    extraPersonCharge: {
      type: Number,
      default: 1000,
    },
    kitchenCharge: {
      type: Number,
      default: 1000,
    },
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
    amenities: [
      {
        type: String,
      },
    ],
    images: [String],
    houseRules: {
      type: [String],
    },
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
    foodOptions: {
      type: String,
      default: "Homely made food available on request",
    },
    deletedAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Villa", VillaSchema);
