const mongoose = require("mongoose");

// Cottage Unit Schema
const CottageUnitSchema = new mongoose.Schema({
  Cottages: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Cottages",
    required: true,
  },
  cottageType: {
    type: String,
    enum: ["Single", "Couple", "Family"],
    required: true,
  },
  totalcottage:Number,
  minCapacity: Number,
  maxCapacity: Number,
  pricePerNight: Number,
  bookedDates: [{ checkIn: Date, checkOut: Date }],
  status: { type: String, enum: ["available", "booked"], default: "available" },
  amenities: [String],
  cottageimages: [String],
  deletedAt: { type: Date, default: null },
});

// Cottage Schema
const CottageSchema = new mongoose.Schema({
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

  CottageRules: [String],

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
  cottages: [{ type: mongoose.Schema.Types.ObjectId, ref: "Cottage" }],
  deletedAt: { type: Date, default: null },
});

module.exports = {
  Cottages: mongoose.model("Cottages", CottageSchema),
  Cottage: mongoose.model("Cottage", CottageUnitSchema),
};
