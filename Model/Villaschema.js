const mongoose = require("mongoose");

const VillaSchema = new mongoose.Schema(
  {
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Owner",
      required: true,
    },

    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category", // e.g. Villa, Cottage, Camping, Hotel
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

    foodOptions: {
      type: String,
      default: "Homely made food available on request",
    },

    isapproved: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
    },
    commission: {
      type: Number,
    },
    isLive: {
      type: Boolean,
      default: false,
    },
    deletedAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Villa", VillaSchema);
