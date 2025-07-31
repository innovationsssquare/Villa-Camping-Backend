const mongoose = require("mongoose");

// Tent Schema
const TentSchema = new mongoose.Schema({
  camping: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Camping",
    required: true,
  },
  tentType: {
    type: String,
    enum: ["Single", "Couple", "Family","luxury","treehouse"],
    required: true,
  },
  totaltents: { type: Number, required: true },
  CampingRules:[String],
  minCapacity: Number,
  maxCapacity: Number,
  extraPersonCharge: Number,
  isAvailable: { type: Boolean, default: true },
  pricePerNight: Number,
  status: { type: String, enum: ["available", "booked"], default: "available" },
  amenities: [String],
  tentimages: [String],
  deletedAt: { type: Date, default: null },
});

// Camping Schema
const CampingSchema = new mongoose.Schema({
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Owner",
    required: true,
  },
  category: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Category",
    required: true,
  },
  name: {
    type: String,
  },

  description: {
    type: String,
  },

  location: {
    addressLine: { type: String },
    maplink: { type: String },
    coordinates: { type: String },
    city: { type: String },
    area: { type: String },
  },
  amenities: [String],

  images: [String],
  reelVideo: { type: String },

  CampingRules: [String],

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
  reviews: [
    {
      userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
      rating: { type: Number, required: true },
      comment: { type: String },
      images: [String],
      createdAt: { type: Date, default: Date.now },
    },
  ],
  averageRating: {
    type: Number,
    default: 0,
  },
  totalReviews: {
    type: Number,
    default: 0,
  },
  status: {
    type: String,
    enum: ["available", "fully_booked"],
    default: "available",
  },
   seasonalPricing: [
    {
      startDate: Date,
      endDate: Date,
      pricePerNight: Number,
    },
  ],
  tents: [{ type: mongoose.Schema.Types.ObjectId, ref: "Tent" }],
  deletedAt: { type: Date, default: null },
});

// Export both models correctly
module.exports = {
  Camping: mongoose.model("Camping", CampingSchema),
  Tent: mongoose.model("Tent", TentSchema),
};
