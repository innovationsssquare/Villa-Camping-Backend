const mongoose = require("mongoose");

// Room Unit Schema (aligning with the Cottage Unit Schema)
const RoomUnitSchema = new mongoose.Schema(
  {
    roomType: {
      type: String,
      enum: ["Single", "Double", "Family"],
      required: true,
    },
    roomNumber: {
      type: String,
      required: true,
    },
    totalRooms: {
      type: Number,
      default: 1,
    },
    maxCapacity: {
      type: Number,
      required: true,
    },
    pricePerNight: {
      type: Number,
      required: true,
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
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

// Hotel Schema (aligning with the Camping and Cottage schemas)
const HotelSchema = new mongoose.Schema(
  {
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
      required: true,
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
    HotelRules: [String],
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
    rooms: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Room",
      },
    ],
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

module.exports = {
  Hotels: mongoose.model("Hotels", HotelSchema),
  Room: mongoose.model("Room", RoomUnitSchema),
};
